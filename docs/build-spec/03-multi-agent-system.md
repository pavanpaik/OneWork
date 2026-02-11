# 03 — Multi-Agent System

## Overview

OneWork uses a "thinking brain / doing brain" architecture. One orchestrator agent reasons and plans using Claude. Multiple specialist agents execute operations deterministically without any LLM involvement.

```
                    ┌─────────────────────┐
                    │   User Message      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Thinking Brain     │
                    │  (Orchestrator)     │
                    │                     │
                    │  - Reads soul.md    │
                    │  - Loads memory     │
                    │  - Calls Claude API │
                    │  - Plans actions    │
                    │  - Selects tools    │
                    └──────────┬──────────┘
                               │ tool_use blocks
                    ┌──────────▼──────────┐
                    │  Tool Executor      │
                    │  (Router)           │
                    └──┬───┬───┬───┬──────┘
                       │   │   │   │
              ┌────────┘   │   │   └────────┐
              │            │   │            │
    ┌─────────▼──┐  ┌─────▼───▼──┐  ┌──────▼─────┐
    │ File Agent │  │ Auto Agent │  │Memory Agent│
    │            │  │            │  │            │
    │ list_files │  │ shell      │  │ store      │
    │ organize   │  │ applescript│  │ query      │
    │ move       │  │ launch_app │  │            │
    │ search     │  │            │  │            │
    │ metadata   │  │            │  │            │
    └────────────┘  └────────────┘  └────────────┘
```

## Agent Roles

### Thinking Brain (Orchestrator)

**Location**: `agents/orchestrator/`

The orchestrator is the only component that communicates with Claude. It:

1. **Assembles context** — Loads `soul.md`, recent conversation memory, and user preferences into the system prompt
2. **Sends requests** — Calls the org CLI with the user message, conversation history, and tool definitions
3. **Parses responses** — Extracts `tool_use` blocks from Claude's response
4. **Delegates execution** — Routes each `tool_use` to the appropriate specialist via the ToolExecutor
5. **Loops** — Sends `tool_result` blocks back to Claude and repeats until Claude returns a final text answer (`stop_reason: end_turn`)
6. **Streams** — Emits progress updates to stdout throughout the process

**Key behaviors:**
- Maximum 10 iterations per user message (prevents infinite loops)
- Streams text chunks as they arrive from Claude
- Emits `tool_start` and `tool_complete` events for UI feedback
- Stores the full conversation in memory after completion

### Doing Brains (Specialists)

**Location**: `agents/tools/`

Specialist agents are pure Python implementations. They:

- Receive structured input (the `tool_input` from Claude's `tool_use` block)
- Execute the operation deterministically
- Return a structured result (JSON-serializable dict)
- Never make LLM calls
- Never access the network

#### File Operations Agent (`file_tools.py`)

| Tool | Operation |
|---|---|
| `list_files` | List directory contents with optional glob pattern and recursion |
| `organize_files` | Sort files into subdirectories by type or date, with dry-run preview |
| `move_files` | Move files to a destination directory |
| `search_files` | Search by filename or file content with recursive traversal |
| `get_file_metadata` | Return size, dates, permissions, type for given paths |

#### Automation Agent (`automation_tools.py`)

| Tool | Operation |
|---|---|
| `execute_automation` (shell) | Run a shell command with timeout and safety checks |
| `execute_automation` (applescript) | Run AppleScript on macOS |
| `execute_automation` (launch_app) | Launch an application by name |

**Safety mechanisms:**
- Dangerous command patterns are blocked (`rm -rf`, `mkfs`, `dd if=`, `> /dev/`, `format`)
- `safe_mode=true` (default) validates without executing — user must explicitly confirm
- All commands have a configurable timeout (default 30s)

#### Memory Agent (`memory_tools.py`)

| Tool | Operation |
|---|---|
| `store_memory` | Persist a preference, context fact, or task record |
| `query_memory` | Search stored memories by keyword and type |

#### System Agent (`system_tools.py`)

Reserved for future expansion:
- System resource monitoring (CPU, memory, disk)
- Process listing
- Network status
- OS-specific capabilities

## Communication Between Agents

There is no direct communication between specialist agents. All coordination flows through the orchestrator:

1. Claude (via orchestrator) decides which tools to call and in what order
2. The orchestrator executes them sequentially via the ToolExecutor
3. Results flow back to Claude, which decides the next step
4. This continues until Claude produces a final text response

This means Claude acts as the "scheduler" — it sees tool results and decides whether more tool calls are needed, or whether it can answer the user.

## Orchestrator Decision Flow

```
receive user_message
│
├─ build system prompt (soul.md + memory + preferences)
├─ build messages array [{ role: "user", content: user_message }]
│
└─ LOOP (max 10 iterations):
    │
    ├─ send messages + tools to org CLI
    ├─ collect streaming response
    │
    ├─ if stop_reason == "end_turn":
    │   ├─ stream final text to UI
    │   ├─ store conversation in memory
    │   └─ DONE
    │
    ├─ if stop_reason == "tool_use":
    │   ├─ for each tool_use block in response:
    │   │   ├─ emit tool_start event
    │   │   ├─ execute tool via ToolExecutor
    │   │   ├─ emit tool_complete event
    │   │   └─ collect tool_result
    │   ├─ append assistant message (with tool_use blocks) to messages
    │   ├─ append user message (with tool_result blocks) to messages
    │   └─ CONTINUE LOOP
    │
    └─ if unexpected stop_reason:
        ├─ emit error
        └─ DONE
```

## Tool Executor Routing

The ToolExecutor is a simple router — no intelligence, just dispatch:

```
tool_name → handler mapping:

  "list_files"          → FileTools.list_files()
  "organize_files"      → FileTools.organize_files()
  "move_files"          → FileTools.move_files()
  "search_files"        → FileTools.search_files()
  "get_file_metadata"   → FileTools.get_metadata()
  "execute_automation"   → AutomationTools.execute()
  "store_memory"        → MemoryTools.store()
  "query_memory"        → MemoryTools.query()
  <unknown>             → return error result
```

Every tool execution is wrapped in a try/except. Errors are returned as `tool_result` with `is_error: true` so Claude can adapt its plan rather than crashing the loop.

## System Prompt Assembly

The orchestrator builds the system prompt for every API call:

```
{soul.md content}

## Current Context
{recent conversation turns from today's JSONL file}

## User Preferences
{contents of learned/preferences.json}

## Instructions
You have access to tools for file operations, automation, and memory management.
Use them to help the user accomplish their tasks efficiently.

Always explain what you're doing and why.
For destructive operations, use dry_run first to preview changes.
Ask for confirmation before executing irreversible actions.

When you learn something about the user's preferences, store it using the store_memory tool.
```

This ensures Claude always has the full behavioral context plus any learned information from previous sessions.
