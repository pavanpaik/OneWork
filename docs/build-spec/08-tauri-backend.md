# 08 — Tauri Backend

## Overview

The Rust/Tauri layer serves three purposes:

1. **IPC bridge** — Expose commands that the React frontend can call
2. **Python process manager** — Spawn, communicate with, and restart the embedded Python agent
3. **State container** — Hold the Python child process handle and configuration

The Rust layer should be thin. Business logic lives in Python. Rust handles process lifecycle and message routing.

## Application Entry Point

### `src-tauri/src/main.rs`

```
fn main():
    1. Build Tauri app with:
       - Managed state: AppState
       - Command handlers: send_message, get_status, get_context, get_preferences
       - Setup hook: initialize Python runtime on app launch
    2. Run the app
```

**Setup hook:**
- Called once when the app window is created
- Starts the embedded Python subprocess
- Stores the child process handle in AppState

**On exit:**
- Send `{"command": "shutdown"}` to Python stdin
- Wait for process to exit (with timeout)
- Kill if it doesn't exit gracefully

## Application State

### `src-tauri/src/state.rs`

```rust
pub struct AppState {
    pub python_process: Mutex<Option<Child>>,
}
```

The `Mutex<Option<Child>>` holds the Python subprocess handle. It's `Option` because the process might not be running (startup failure, crash). The `Mutex` allows safe access from multiple Tauri command handlers.

Future extensions:
- Add a `config` field for user settings (CLI path, model, etc.)
- Add a `status` field to track agent state without querying Python

## IPC Commands

### `src-tauri/src/commands/agent.rs`

#### `send_message(message: String) -> Result<(), String>`

**Flow:**
1. Lock `AppState.python_process`.
2. If Python process is not running, attempt to restart it.
3. Write `{"command": "process_message", "message": "<message>"}\n` to Python stdin.
4. Spawn a background task to read Python stdout line by line.
5. For each line, parse JSON and emit the appropriate Tauri event:
   - `{"type": "text_chunk", ...}` → emit `"agent-text-chunk"`
   - `{"type": "tool_start", ...}` → emit `"agent-tool-execution"` with status `"started"`
   - `{"type": "tool_complete", ...}` → emit `"agent-tool-execution"` with status `"completed"`
   - `{"type": "status", ...}` → emit `"agent-status"` with `"thinking"`
   - `{"type": "done", ...}` → emit `"agent-done"` and `"agent-status"` with `"idle"`
   - `{"type": "error", ...}` → emit `"agent-error"` and `"agent-status"` with `"error"`
6. Return Ok immediately (streaming happens asynchronously via events).

**Important:** The command itself returns quickly. The actual response streams back through Tauri events. The frontend listens for these events and updates the UI in real time.

#### `get_status() -> Result<String, String>`

Returns the current agent status. For the MVP, this can simply check if the Python process is running:
- Process alive → `"ready"`
- Process dead → `"error"`

### `src-tauri/src/commands/memory.rs`

#### `get_context(limit: Option<u32>) -> Result<String, String>`

Reads the recent context from memory. Two approaches:

**Option A (simple):** Send a command to Python and wait for the response.
```json
{"command": "get_context", "limit": 10}
```

**Option B (direct):** Read the JSONL file directly from Rust. This avoids a round-trip through Python but requires Rust to know the memory file format.

For the MVP, Option A is recommended — keep all memory logic in Python.

#### `get_preferences() -> Result<String, String>`

Same pattern as `get_context`. Send a command to Python or read `preferences.json` directly.

## Python Bridge

### `src-tauri/src/python_bridge/mod.rs`

Public API:

```rust
pub fn initialize() -> Result<(), String>
pub fn start_agent() -> Result<Child, String>
pub fn stop_agent(child: &mut Child) -> Result<(), String>
```

### `src-tauri/src/python_bridge/runtime.rs`

#### `initialize()`

Called during app setup. Validates that the embedded Python binary exists at the expected path. For development, this might use the system Python. For production, it uses the PyOxidizer-built binary.

#### `start_agent() -> Result<Child, String>`

1. Determine the path to the Python binary:
   - Development: `python3 -m agents.orchestrator.main`
   - Production: `./binaries/python-runtime` (platform-specific, bundled by Tauri)
2. Spawn the process with:
   - `stdin`: `Stdio::piped()`
   - `stdout`: `Stdio::piped()`
   - `stderr`: `Stdio::piped()`
3. Return the `Child` handle.

#### `stop_agent(child: &mut Child)`

1. Write `{"command": "shutdown"}\n` to stdin.
2. Wait up to 5 seconds for the process to exit.
3. If still running, kill it.

### Reading stdout

The main reading loop runs in a Tokio task spawned by `send_message`:

```rust
// Pseudocode
tokio::spawn(async move {
    let reader = BufReader::new(child_stdout);
    for line in reader.lines() {
        if let Ok(json) = serde_json::from_str::<Value>(&line) {
            match json["type"].as_str() {
                Some("text_chunk") => app_handle.emit_all("agent-text-chunk", &json),
                Some("tool_start") => app_handle.emit_all("agent-tool-execution", &json),
                Some("tool_complete") => app_handle.emit_all("agent-tool-execution", &json),
                Some("status") => app_handle.emit_all("agent-status", "thinking"),
                Some("done") => {
                    app_handle.emit_all("agent-done", &json);
                    app_handle.emit_all("agent-status", "idle");
                },
                Some("error") => {
                    app_handle.emit_all("agent-error", &json);
                    app_handle.emit_all("agent-status", "error");
                },
                _ => {} // ignore unknown types
            }
        }
    }
});
```

### Error Recovery

If the Python process crashes (detected by stdout EOF or process exit):

1. Emit `"agent-error"` event with message "Agent process crashed"
2. Emit `"agent-status"` with `"error"`
3. Attempt to restart the process after a 2-second delay
4. If restart succeeds, emit `"agent-status"` with `"idle"`
5. If restart fails 3 times, give up and show a persistent error in the UI

## Tauri Configuration

### `src-tauri/tauri.conf.json`

Key configuration sections:

**Window:**
```json
{
  "title": "OneWork",
  "width": 1200,
  "height": 800,
  "minWidth": 800,
  "minHeight": 600,
  "resizable": true,
  "fullscreen": false
}
```

**Allowlist:**
```json
{
  "all": false,
  "shell": { "all": false, "open": true },
  "fs": {
    "all": true,
    "scope": ["$HOME/**", "$APPDATA/**", "$LOCALAPPDATA/**"]
  }
}
```

- Filesystem access scoped to user's home and app data directories
- Shell `open` allowed (for opening URLs in browser)
- All other APIs disabled by default

**Bundle:**
```json
{
  "active": true,
  "targets": ["dmg", "msi", "appimage"],
  "identifier": "com.onework.app",
  "resources": ["resources/*", "agents/**"],
  "externalBin": ["binaries/python-runtime"]
}
```

- `resources`: Static files (soul.md, tool_definitions.json) bundled into the app
- `externalBin`: The PyOxidizer-built Python binary
- `targets`: Platform-specific installers

## Cargo Dependencies

### `src-tauri/Cargo.toml`

Required crates:
- `tauri` — Framework
- `serde` + `serde_json` — JSON serialization
- `tokio` — Async runtime (already included by Tauri)

No additional crates should be needed for the MVP. The Rust layer intentionally stays minimal.
