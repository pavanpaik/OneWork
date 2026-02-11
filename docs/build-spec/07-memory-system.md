# 07 — Memory System

## Overview

OneWork uses a file-based memory system. No database. All data is stored as JSON or JSONL files in the OS app data directory. The system is designed for a single user on a single machine.

## Storage Location

```
~/.automation-assistant/memory/        # Linux / macOS
%APPDATA%/automation-assistant/memory/  # Windows
```

The path is passed to the `MemoryManager` constructor at startup. All subdirectories are created automatically if they don't exist.

## Directory Structure

```
memory/
├── conversations/          # Conversation history
│   ├── 2026-02-10.jsonl   # One file per day
│   └── 2026-02-11.jsonl
├── context/                # Factual information
│   └── facts.json          # Key-value store of facts
├── tasks/                  # Completed task records
│   ├── organize-downloads.json
│   └── backup-documents.json
└── learned/                # User preferences
    └── preferences.json    # Key-value store of preferences
```

## File Formats

### Conversations (`conversations/{YYYY-MM-DD}.jsonl`)

One JSON object per line. Each line is a single conversation turn.

```jsonl
{"timestamp":"2026-02-11T09:15:00","conversation_id":"abc-123","role":"user","content":"organize my downloads"}
{"timestamp":"2026-02-11T09:15:02","conversation_id":"abc-123","role":"assistant","content":[{"type":"text","text":"I'll help..."},{"type":"tool_use","name":"list_files","id":"tu_1","input":{"path":"~/Downloads"}}]}
{"timestamp":"2026-02-11T09:15:05","conversation_id":"abc-123","role":"user","content":[{"type":"tool_result","tool_use_id":"tu_1","content":"{\"count\":15,...}"}]}
```

**Why JSONL:** Append-only. No need to read and rewrite the entire file for each new turn. Efficient for daily logs that grow throughout the day.

### Preferences (`learned/preferences.json`)

Standard JSON file. Keys are preference identifiers, values are metadata-wrapped objects.

```json
{
  "file_organization_style": {
    "value": {
      "preferred_strategy": "by_type",
      "keep_originals": false
    },
    "tags": ["files", "organization"],
    "stored_at": "2026-02-09T16:00:00",
    "updated_at": "2026-02-10T11:00:00"
  },
  "default_search_path": {
    "value": {
      "path": "~/Documents"
    },
    "tags": ["search", "defaults"],
    "stored_at": "2026-02-11T09:00:00",
    "updated_at": "2026-02-11T09:00:00"
  }
}
```

### Context (`context/facts.json`)

Same format as preferences. Stores factual information the assistant has learned.

```json
{
  "project_directory": {
    "value": {
      "path": "~/Projects/webapp",
      "language": "TypeScript"
    },
    "tags": ["project", "location"],
    "stored_at": "2026-02-10T14:00:00",
    "updated_at": "2026-02-10T14:00:00"
  }
}
```

### Tasks (`tasks/{task-key}.json`)

One JSON file per completed task. Stores the task's name, steps taken, and outcome.

```json
{
  "task_name": {
    "value": {
      "description": "Organized downloads folder by file type",
      "steps": ["Listed 47 files", "Organized into 6 categories", "Moved 47 files"],
      "outcome": "success"
    },
    "tags": ["automation", "file-organization"],
    "stored_at": "2026-02-11T09:20:00",
    "updated_at": "2026-02-11T09:20:00"
  }
}
```

## Memory Manager API

### Location

`agents/memory/memory_manager.py`

### Class: `MemoryManager`

```python
class MemoryManager:
    def __init__(self, memory_path: str = "./memory"):
        # Creates all subdirectories if they don't exist
```

### Methods

#### `store_conversation(messages, conversation_id=None)`

Appends all messages to today's JSONL file.

**Logic:**
1. Generate `conversation_id` if not provided (UUID4).
2. Determine today's date for filename: `conversations/{YYYY-MM-DD}.jsonl`.
3. Open file in append mode.
4. For each message in `messages`, write a JSON line with: `timestamp`, `conversation_id`, `role`, `content`.

#### `get_recent_context(limit=10) -> str`

Returns the last N conversation turns from today as a formatted string.

**Logic:**
1. Open today's JSONL file. If it doesn't exist, return "No recent context available".
2. Read all lines, take the last `limit` lines.
3. For each line, parse JSON. Extract text from `content`:
   - If `content` is a string, use it directly.
   - If `content` is a list of blocks, extract text from `type: "text"` blocks and `[Used tool: name]` from `type: "tool_use"` blocks.
4. Format as `"role: content"` lines joined by newlines.

#### `store(memory_type, key, value, tags=None)`

Stores a key-value pair in the appropriate file.

**Logic:**
1. Determine file path based on `memory_type`:
   - `"preference"` → `learned/preferences.json`
   - `"context"` → `context/facts.json`
   - `"task"` → `tasks/{key}.json`
2. Load existing data from the file (empty dict if file doesn't exist).
3. Set `data[key]` with: `value`, `tags`, `stored_at` (now, or existing), `updated_at` (now).
4. Write the entire dict back to the file with `json.dump(indent=2)`.

#### `query(query, memory_type="all", limit=10) -> list[dict]`

Searches memory files by keyword.

**Logic:**
1. Determine which files to search based on `memory_type` (or all if `"all"`).
2. For each file, load JSON and iterate key-value pairs.
3. For each entry, serialize the entire entry to a string and check if `query.lower()` appears (case-insensitive substring match).
4. Matching entries get added to results with `memory_type` and `key` fields.
5. Sort by `updated_at` descending (most recent first).
6. Return first `limit` results.

**Future enhancement:** Replace keyword search with embedding-based semantic search.

#### `get_preferences() -> dict`

Returns the entire contents of `learned/preferences.json`. Returns empty dict if file doesn't exist.

## File Store (`agents/memory/file_store.py`)

Low-level file I/O utilities used by MemoryManager:

### `read_json(path: Path) -> dict`
Load and parse a JSON file. Return empty dict if file doesn't exist.

### `write_json(path: Path, data: dict)`
Write a dict to a JSON file with `indent=2`.

### `append_jsonl(path: Path, entry: dict)`
Append a single JSON object as a line to a JSONL file.

### `read_jsonl(path: Path, limit: int = None) -> list[dict]`
Read a JSONL file. If `limit` is provided, return only the last `limit` entries.

## Concurrency Considerations

- The app is single-user, so file contention is minimal.
- JSONL append is atomic at the OS level for single-line writes.
- JSON file read-modify-write is not atomic. For the MVP this is acceptable — only one agent loop runs at a time.
- Future enhancement: use file locking (`fcntl.flock`) if concurrent access becomes possible.

## Data Migration

No migration system for the MVP. If the memory format changes:
1. Bump a version field in each file.
2. On startup, check versions and migrate in place.
3. Always back up before migrating.

## Privacy

- Memory files are stored in the user's app data directory with standard OS permissions.
- No telemetry. No cloud sync. Everything stays local.
- The user can delete the entire `memory/` directory to reset the assistant's knowledge.
