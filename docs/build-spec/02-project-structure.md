# 02 — Project Structure

## Complete Directory Layout

```
onework/
│
├── src-tauri/                          # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs                     # App entry point, plugin registration, setup hook
│   │   ├── state.rs                    # AppState struct (Python process handle, config)
│   │   ├── commands/                   # Tauri IPC command handlers
│   │   │   ├── mod.rs                  # Re-exports all command modules
│   │   │   ├── agent.rs                # send_message, get_status
│   │   │   ├── file_ops.rs             # Direct file operation commands (if needed)
│   │   │   └── memory.rs               # get_context, get_preferences
│   │   └── python_bridge/              # Embedded Python process management
│   │       ├── mod.rs                  # Public API: initialize, start, stop, send, receive
│   │       └── runtime.rs              # Process lifecycle, stdin/stdout streaming, restart logic
│   ├── Cargo.toml                      # Rust dependencies
│   ├── tauri.conf.json                 # Tauri config: window, allowlist, bundle, resources
│   ├── icons/                          # App icons for all platforms
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.icns                   # macOS
│   │   └── icon.ico                    # Windows
│   └── binaries/                       # External binaries bundled with the app
│       └── python-runtime              # PyOxidizer output (platform-specific)
│
├── src/                                # React frontend
│   ├── main.tsx                        # React entry point, mount App
│   ├── App.tsx                         # Root component: sidebar nav + view router
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── ChatInterface.tsx       # Main chat container: message list + input
│   │   │   ├── MessageList.tsx         # Scrollable message list
│   │   │   ├── Message.tsx             # Single message bubble (user/assistant/system)
│   │   │   └── InputBox.tsx            # Text input with send button
│   │   ├── Memory/
│   │   │   ├── MemoryViewer.tsx        # Browse stored memories by type
│   │   │   └── ContextDisplay.tsx      # Show current conversation context
│   │   └── Settings/
│   │       └── SettingsPanel.tsx        # CLI path, model selection, preferences
│   ├── hooks/
│   │   ├── useAgent.ts                 # Hook: send messages, listen for events
│   │   └── useMemory.ts               # Hook: fetch context and preferences
│   ├── types/
│   │   └── index.ts                    # Shared TypeScript types (Message, AgentEvent, etc.)
│   └── styles/
│       └── main.css                    # Global styles
│
├── agents/                             # Python agent system (embedded in app)
│   ├── orchestrator/
│   │   ├── __init__.py
│   │   ├── main.py                     # Entry point: stdin/stdout JSON-RPC loop
│   │   ├── thinking_brain.py           # System prompt assembly, delegation logic
│   │   ├── agent_loop.py              # Core agent loop: call CLI → parse → execute → loop
│   │   ├── tool_executor.py            # Routes tool_use blocks to tool implementations
│   │   └── cli_wrapper.py             # Org CLI subprocess management
│   │
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── file_tools.py              # list_files, organize_files, move_files, search_files, get_metadata
│   │   ├── automation_tools.py         # execute_automation (shell, applescript, launch_app)
│   │   ├── memory_tools.py            # store_memory, query_memory
│   │   └── system_tools.py            # System info, monitoring (future)
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── memory_manager.py          # High-level memory API: store, query, get_context
│   │   └── file_store.py              # Low-level file I/O for JSON/JSONL
│   │
│   └── shared/
│       ├── __init__.py
│       ├── protocol.py                # JSON-RPC message types and serialization
│       ├── types.py                   # Shared dataclasses (ToolResult, AgentMessage, etc.)
│       └── utils.py                   # Path expansion, timestamp formatting, etc.
│
├── resources/                          # Static resources bundled with app
│   ├── soul.md                         # Assistant personality definition
│   └── tool_definitions.json           # Tool schemas sent to Claude API
│
├── docs/                               # Documentation
│   ├── system-prompts/                 # AI development context
│   │   ├── project-overview.md
│   │   ├── architecture.md
│   │   ├── coding-standards.md
│   │   ├── development-workflow.md
│   │   ├── ai-development-guide.md
│   │   └── soul.md
│   └── build-spec/                     # Complete build specification
│       ├── 00-executive-summary.md
│       ├── 01-architecture.md
│       ├── ... (this file and others)
│       └── 11-implementation-phases.md
│
├── package.json                        # npm scripts, frontend dependencies
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite config for Tauri
├── index.html                          # Vite entry HTML
├── pyoxidizer.bzl                      # PyOxidizer config for Python embedding
└── README.md
```

## Directory Responsibilities

### `src-tauri/` — Rust Backend

The stable shell layer. Changes here should be infrequent after initial setup.

- **`commands/`**: Thin IPC handlers. Receive a request from the frontend, delegate to the Python bridge or state, return a result or emit events. No business logic.
- **`python_bridge/`**: Manages the embedded Python subprocess lifecycle. Handles spawning, writing to stdin, reading from stdout line-by-line, restarting on crash, and graceful shutdown.
- **`state.rs`**: Holds the `AppState` struct shared across commands via Tauri's managed state. Contains the Python child process handle and any config values.

### `src/` — React Frontend

The user-facing layer. Communicates exclusively through Tauri IPC.

- **`components/Chat/`**: The primary view. Renders streaming messages, tool execution indicators, and the input box.
- **`components/Memory/`**: Read-only view into the memory system for debugging and transparency.
- **`components/Settings/`**: Configuration panel (CLI path, model, etc.).
- **`hooks/`**: Custom React hooks that encapsulate Tauri `invoke()` calls and event listeners.
- **`types/`**: Shared TypeScript interfaces used across components.

### `agents/` — Python Agent System

Where all the intelligence lives. Changes here are frequent.

- **`orchestrator/`**: The brain. `main.py` is the entry point (stdin/stdout loop). `agent_loop.py` is the core innovation — it implements the full tool-calling loop that the org CLI cannot provide. `cli_wrapper.py` wraps the org CLI subprocess.
- **`tools/`**: Pure execution. Each tool module implements deterministic operations. No LLM calls. No network access. Just Python operating on the filesystem, running subprocesses, or reading/writing memory files.
- **`memory/`**: File-based persistence layer. `memory_manager.py` provides the high-level API; `file_store.py` handles raw JSON/JSONL I/O.
- **`shared/`**: Types, protocols, and utilities shared across the agent system.

### `resources/` — Static Assets

Bundled into the app at build time.

- **`soul.md`**: Loaded into the system prompt for every Claude API call. Defines the assistant's personality, behavioral guidelines, and values.
- **`tool_definitions.json`**: The complete list of tool schemas in Anthropic API format. Sent with every API call so Claude knows what tools are available.

### Runtime Memory Directory

Not in the repo. Created at runtime in the OS app data directory:

```
~/.automation-assistant/memory/    # Linux/macOS
%APPDATA%/automation-assistant/memory/    # Windows
```

Subdirectories:
- `conversations/` — JSONL files, one per day (`2026-02-11.jsonl`)
- `context/` — `facts.json` for stored factual context
- `tasks/` — One JSON file per completed task workflow
- `learned/` — `preferences.json` for user preferences
