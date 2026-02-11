# 04 — Tool Definitions

## Overview

Tool definitions are stored in `resources/tool_definitions.json` and sent with every Claude API request. Claude uses these schemas to decide when and how to call tools. The actual execution happens in our Python code — the org CLI never processes them.

Each tool definition follows the [Anthropic tool use format](https://docs.anthropic.com/en/docs/build-with-claude/tool-use):

```json
{
  "name": "tool_name",
  "description": "What the tool does and when to use it",
  "input_schema": {
    "type": "object",
    "properties": { ... },
    "required": [...]
  }
}
```

## Complete Tool Definitions

### 1. list_files

```json
{
  "name": "list_files",
  "description": "List files in a directory with optional filtering. Use this to understand what files exist before organizing or searching.",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Directory path to list. Use ~ for home directory."
      },
      "recursive": {
        "type": "boolean",
        "description": "Whether to list files recursively in subdirectories",
        "default": false
      },
      "pattern": {
        "type": "string",
        "description": "Optional glob pattern to filter files (e.g., '*.pdf', '*.js')"
      }
    },
    "required": ["path"]
  }
}
```

**Return format:**
```json
{
  "count": 15,
  "path": "/Users/name/Downloads",
  "files": [
    {
      "path": "/Users/name/Downloads/report.pdf",
      "name": "report.pdf",
      "size": 245760,
      "modified": "2026-02-10T14:30:00",
      "is_directory": false,
      "extension": ".pdf"
    }
  ]
}
```

### 2. organize_files

```json
{
  "name": "organize_files",
  "description": "Organize files in a directory by type or date. Always use dry_run first to preview changes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "source_path": {
        "type": "string",
        "description": "Source directory containing files to organize"
      },
      "strategy": {
        "type": "string",
        "enum": ["by_type", "by_date", "custom"],
        "description": "Organization strategy: by_type (Images, Documents, etc), by_date (YYYY-MM folders), or custom"
      },
      "dry_run": {
        "type": "boolean",
        "description": "Preview changes without executing. ALWAYS use true first.",
        "default": true
      },
      "custom_rules": {
        "type": "array",
        "description": "Custom organization rules (only used with 'custom' strategy)",
        "items": {
          "type": "object",
          "properties": {
            "pattern": { "type": "string" },
            "destination": { "type": "string" }
          }
        }
      }
    },
    "required": ["source_path", "strategy"]
  }
}
```

**Return format:**
```json
{
  "dry_run": true,
  "strategy": "by_type",
  "operations_count": 12,
  "operations": [
    {
      "file": "photo.jpg",
      "from": "/Users/name/Downloads/photo.jpg",
      "to": "/Users/name/Downloads/Images/photo.jpg",
      "category": "Images",
      "size": 3145728
    }
  ],
  "message": "Preview only - no files moved"
}
```

**Type categories for `by_type` strategy:**

| Category | Extensions |
|---|---|
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`, `.heic`, `.bmp` |
| Documents | `.pdf`, `.doc`, `.docx`, `.txt`, `.md`, `.rtf`, `.odt` |
| Videos | `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.flv` |
| Audio | `.mp3`, `.wav`, `.flac`, `.m4a`, `.aac`, `.ogg` |
| Archives | `.zip`, `.tar`, `.gz`, `.rar`, `.7z`, `.bz2` |
| Code | `.py`, `.js`, `.ts`, `.java`, `.cpp`, `.rs`, `.go`, `.rb` |
| Spreadsheets | `.xlsx`, `.xls`, `.csv`, `.numbers`, `.ods` |
| Presentations | `.pptx`, `.ppt`, `.key`, `.odp` |
| Executables | `.exe`, `.app`, `.dmg`, `.deb`, `.rpm` |
| Other | Everything else |

### 3. move_files

```json
{
  "name": "move_files",
  "description": "Move one or more files to a destination. Use for precise file movements.",
  "input_schema": {
    "type": "object",
    "properties": {
      "source_paths": {
        "type": "array",
        "items": { "type": "string" },
        "description": "List of file paths to move"
      },
      "destination": {
        "type": "string",
        "description": "Destination directory"
      },
      "create_destination": {
        "type": "boolean",
        "description": "Create destination directory if it doesn't exist",
        "default": true
      }
    },
    "required": ["source_paths", "destination"]
  }
}
```

**Return format:**
```json
{
  "moved": 3,
  "failed": 0,
  "results": [
    {
      "file": "report.pdf",
      "from": "/Users/name/Downloads/report.pdf",
      "to": "/Users/name/Documents/report.pdf",
      "status": "success"
    }
  ]
}
```

### 4. search_files

```json
{
  "name": "search_files",
  "description": "Search for files by name, content, or metadata",
  "input_schema": {
    "type": "object",
    "properties": {
      "root_path": {
        "type": "string",
        "description": "Root directory to search from"
      },
      "search_term": {
        "type": "string",
        "description": "Term to search for in filenames or content"
      },
      "search_content": {
        "type": "boolean",
        "description": "Whether to search file contents (slower)",
        "default": false
      },
      "max_results": {
        "type": "integer",
        "description": "Maximum number of results to return",
        "default": 50
      }
    },
    "required": ["root_path", "search_term"]
  }
}
```

**Return format:**
```json
{
  "count": 5,
  "search_term": "budget",
  "results": [
    {
      "path": "/Users/name/Documents/budget-2026.xlsx",
      "name": "budget-2026.xlsx",
      "match_type": "filename",
      "size": 45056,
      "modified": "2026-01-15T09:00:00"
    }
  ],
  "truncated": false
}
```

**Content search** is limited to text-readable file types: `.txt`, `.md`, `.py`, `.js`, `.json`, `.xml`, `.html`, `.css`, `.ts`, `.rs`, `.go`, `.java`, `.rb`, `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg`, `.log`, `.csv`.

### 5. get_file_metadata

```json
{
  "name": "get_file_metadata",
  "description": "Get detailed metadata about one or more files",
  "input_schema": {
    "type": "object",
    "properties": {
      "paths": {
        "type": "array",
        "items": { "type": "string" },
        "description": "File paths to get metadata for"
      }
    },
    "required": ["paths"]
  }
}
```

**Return format:**
```json
{
  "count": 1,
  "files": [
    {
      "path": "/Users/name/Downloads/report.pdf",
      "name": "report.pdf",
      "size": 245760,
      "created": "2026-02-01T10:00:00",
      "modified": "2026-02-10T14:30:00",
      "is_directory": false,
      "is_symlink": false,
      "extension": ".pdf",
      "permissions": "644"
    }
  ]
}
```

### 6. execute_automation

```json
{
  "name": "execute_automation",
  "description": "Execute automation task like AppleScript, shell command, or launch application. Use with caution.",
  "input_schema": {
    "type": "object",
    "properties": {
      "task_type": {
        "type": "string",
        "enum": ["applescript", "shell", "launch_app"],
        "description": "Type of automation to execute"
      },
      "script": {
        "type": "string",
        "description": "Script or command to execute"
      },
      "safe_mode": {
        "type": "boolean",
        "description": "Require user confirmation for execution",
        "default": true
      },
      "timeout": {
        "type": "integer",
        "description": "Timeout in seconds",
        "default": 30
      }
    },
    "required": ["task_type", "script"]
  }
}
```

**Return format (safe_mode=true):**
```json
{
  "task": "shell",
  "script": "ls -la ~/Documents",
  "safe_mode": true,
  "message": "Command validated. Set safe_mode=false to execute."
}
```

**Return format (safe_mode=false, executed):**
```json
{
  "task": "shell",
  "stdout": "total 48\ndrwxr-xr-x  12 user  staff  384 Feb 10 14:30 .\n...",
  "stderr": "",
  "returncode": 0,
  "success": true
}
```

### 7. store_memory

```json
{
  "name": "store_memory",
  "description": "Store information in long-term memory for future reference",
  "input_schema": {
    "type": "object",
    "properties": {
      "memory_type": {
        "type": "string",
        "enum": ["preference", "context", "task"],
        "description": "Type of memory: preference (user likes/dislikes), context (factual info), task (completed workflow)"
      },
      "key": {
        "type": "string",
        "description": "Unique key for this memory"
      },
      "value": {
        "type": "object",
        "description": "Memory content (can be any JSON-serializable object)"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Tags for easier retrieval"
      }
    },
    "required": ["memory_type", "key", "value"]
  }
}
```

**Return format:**
```json
{
  "stored": true,
  "memory_type": "preference",
  "key": "file_organization_style",
  "message": "Stored preference memory: file_organization_style"
}
```

### 8. query_memory

```json
{
  "name": "query_memory",
  "description": "Query stored memory and context for relevant information",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "What to search for in memory"
      },
      "memory_type": {
        "type": "string",
        "enum": ["preference", "context", "task", "all"],
        "description": "Which type of memory to search",
        "default": "all"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results",
        "default": 10
      }
    },
    "required": ["query"]
  }
}
```

**Return format:**
```json
{
  "query": "file organization",
  "memory_type": "all",
  "count": 2,
  "results": [
    {
      "memory_type": "preference",
      "key": "file_organization_style",
      "value": { "preferred_strategy": "by_type", "keep_originals": false },
      "tags": ["files", "organization"],
      "stored_at": "2026-02-09T16:00:00",
      "updated_at": "2026-02-10T11:00:00"
    }
  ]
}
```

## Tool Definitions File

The complete `resources/tool_definitions.json` wraps all definitions above in:

```json
{
  "tools": [
    { "name": "list_files", ... },
    { "name": "organize_files", ... },
    { "name": "move_files", ... },
    { "name": "search_files", ... },
    { "name": "get_file_metadata", ... },
    { "name": "execute_automation", ... },
    { "name": "store_memory", ... },
    { "name": "query_memory", ... }
  ]
}
```

The `tools` array value (not the wrapper object) is what gets sent in the `tools` field of the Messages API request.
