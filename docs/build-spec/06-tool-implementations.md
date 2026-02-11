# 06 — Tool Implementations

## Design Principles

All tool implementations follow these rules:

1. **Pure execution** — No LLM calls. No network access. Deterministic input → output.
2. **Async** — All methods are `async def` to support non-blocking I/O.
3. **pathlib** — Use `pathlib.Path` for all path operations. Call `.expanduser()` on user-provided paths to resolve `~`.
4. **Error containment** — Catch exceptions and return error dicts. Never raise exceptions that would escape to the agent loop.
5. **Structured output** — Return JSON-serializable dicts that Claude can interpret.

---

## File Tools (`agents/tools/file_tools.py`)

### Class: `FileTools`

No constructor arguments. Stateless.

### `list_files(path, recursive=False, pattern=None) -> dict`

**Logic:**
1. Expand `path` with `Path(path).expanduser()`
2. Validate: exists and is a directory. Return error dict if not.
3. If `recursive`, use `path_obj.rglob(pattern or '*')`. Otherwise `path_obj.glob(pattern or '*')`.
4. For each item, call `.stat()` to get size and modification time. Skip items that raise `PermissionError` or `OSError`.
5. Build file info dict: `path`, `name`, `size` (0 for dirs), `modified` (ISO format), `is_directory`, `extension` (`.suffix`).
6. Sort results by `name` (case-insensitive).
7. Return `{"count": N, "path": str, "files": [...]}`.

### `organize_files(source_path, strategy, dry_run=True, custom_rules=None) -> dict`

**Logic:**
1. Expand and validate `source_path`.
2. Dispatch to `_organize_by_type`, `_organize_by_date`, or `_organize_custom` based on `strategy`.
3. Each sub-method iterates files in the source directory (non-recursive, files only).

**`_organize_by_type`:**
- Map file extensions to category names (Images, Documents, Videos, Audio, Archives, Code, Spreadsheets, Presentations, Executables, Other).
- For each file, determine its category. Build an operation record: `file`, `from`, `to`, `category`, `size`.
- If `dry_run=False`, create the category subdirectory and move the file with `shutil.move`.
- Return operations list with `dry_run` flag and count.

**`_organize_by_date`:**
- For each file, read `st_mtime` and format as `YYYY-MM`.
- Destination is `source / YYYY-MM / filename`.
- Same dry_run logic as above.

**`_organize_custom`:**
- Require `custom_rules` to be non-empty.
- For each file, iterate rules in order. If `rule.pattern` is a substring of the filename, it matches.
- First matching rule wins. Destination is `source / rule.destination / filename`.
- Same dry_run logic.

### `move_files(source_paths, destination, create_destination=True) -> dict`

**Logic:**
1. Expand `destination`. If it doesn't exist and `create_destination` is true, create it with `mkdir(parents=True, exist_ok=True)`.
2. Validate destination is a directory.
3. For each source path: expand, check existence, attempt `shutil.move`. Record success or error.
4. Return `{"moved": N, "failed": N, "results": [...]}`.

### `search_files(root_path, search_term, search_content=False, max_results=50) -> dict`

**Logic:**
1. Expand and validate `root_path`.
2. Recursively walk with `root.rglob('*')`, files only.
3. For each file, check if `search_term` (case-insensitive) is in `file.name`.
4. If not matched by name and `search_content=True`, check if the file has a text-readable extension. If so, open with `encoding='utf-8', errors='ignore'` and search content.
5. Stop after `max_results` matches.
6. Return `{"count": N, "search_term": str, "results": [...], "truncated": bool}`.

### `get_metadata(paths) -> dict`

**Logic:**
1. For each path, expand and check existence.
2. Call `.stat()` for size, creation time, modification time, permissions.
3. Check `.is_dir()`, `.is_symlink()`, `.suffix`.
4. Return `{"count": N, "files": [...]}`.

---

## Automation Tools (`agents/tools/automation_tools.py`)

### Class: `AutomationTools`

No constructor arguments. Stateless.

### `execute(task_type, script, safe_mode=True, timeout=30) -> dict`

Dispatches to `_run_applescript`, `_run_shell`, or `_launch_app`.

### `_run_applescript(script, safe_mode, timeout) -> dict`

**Logic:**
1. Check `platform.system() == "Darwin"`. Return error if not macOS.
2. If `safe_mode=True`, return a preview message without executing.
3. Spawn `osascript -e <script>` as async subprocess.
4. Wait with `asyncio.wait_for(timeout=timeout)`.
5. Return stdout, stderr, returncode, success flag.
6. Catch `asyncio.TimeoutError` and return timeout error.

### `_run_shell(script, safe_mode, timeout) -> dict`

**Logic:**
1. Check for dangerous patterns: `rm -rf`, `mkfs`, `dd if=`, `> /dev/`, `format`. If found, return error immediately (even with `safe_mode=False`).
2. If `safe_mode=True`, return preview without executing.
3. Spawn via `asyncio.create_subprocess_shell`.
4. Wait with timeout.
5. Return stdout, stderr, returncode, success flag.

### `_launch_app(app_name) -> dict`

**Logic:**
1. Platform-specific launch:
   - macOS: `subprocess.Popen(['open', '-a', app_name])`
   - Windows: `subprocess.Popen(['start', app_name], shell=True)`
   - Linux: `subprocess.Popen([app_name])`
2. Return success or error.

---

## Memory Tools (`agents/tools/memory_tools.py`)

### Class: `MemoryTools`

**Constructor:** Takes `memory_path: str`. Creates a `MemoryManager` instance.

### `store(memory_type, key, value, tags=None) -> dict`

Delegates to `MemoryManager.store()`. Returns `{"stored": True, "memory_type": ..., "key": ..., "message": ...}`.

### `query(query, memory_type="all", limit=10) -> dict`

Delegates to `MemoryManager.query()`. Returns `{"query": ..., "memory_type": ..., "count": N, "results": [...]}`.

---

## System Tools (`agents/tools/system_tools.py`)

### Class: `SystemTools`

Placeholder for future expansion. Initial implementation can be empty or provide basic system info:

- `get_system_info() -> dict` — Returns OS, platform, Python version, home directory
- Extensible for future tools: process listing, disk usage, etc.

---

## Shared Types (`agents/shared/types.py`)

Define dataclasses or TypedDicts for consistent type usage across the agent system:

```python
@dataclass
class ToolResult:
    status: str     # "success" | "error"
    content: str    # JSON string of result

@dataclass
class AgentEvent:
    type: str       # "status" | "text_chunk" | "tool_start" | "tool_complete" | "done" | "error"
    content: str | None = None
    tool_name: str | None = None
    tool_input: dict | None = None
    conversation_id: str | None = None
```

## Shared Utilities (`agents/shared/utils.py`)

Common helper functions:

- `expand_path(path: str) -> Path` — `Path(path).expanduser().resolve()`
- `iso_now() -> str` — `datetime.now().isoformat()`
- `safe_json_dumps(obj) -> str` — `json.dumps(obj, indent=2, default=str)` to handle datetime and Path objects
