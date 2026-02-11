# Architecture — OneWork

## System Layers

OneWork is a three-layer application bundled into a single Tauri binary:

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri App Bundle                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Layer 1: Frontend (React/TypeScript)              │ │
│  │  - Chat interface with streaming                   │ │
│  │  - Memory viewer                                   │ │
│  │  - Settings panel                                  │ │
│  └──────────────────┬─────────────────────────────────┘ │
│                     │ Tauri IPC (invoke/events)         │
│  ┌──────────────────▼─────────────────────────────────┐ │
│  │  Layer 2: Tauri Backend (Rust)                     │ │
│  │  - IPC command handlers                            │ │
│  │  - Python process lifecycle management             │ │
│  │  - Application state                               │ │
│  └──────────────────┬─────────────────────────────────┘ │
│                     │ stdin/stdout JSON-RPC              │
│  ┌──────────────────▼─────────────────────────────────┐ │
│  │  Layer 3: Python Agent System (Embedded)           │ │
│  │  - Orchestrator (thinking brain + agent loop)      │ │
│  │  - Tool executor (doing brains)                    │ │
│  │  - Org CLI wrapper (subprocess → Messages API)     │ │
│  │  - Memory manager (file-based)                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  File-Based Memory (in app data directory)         │ │
│  │  conversations/ · context/ · tasks/ · learned/     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Communication Flow

1. **User → Frontend**: User types a message in the chat UI
2. **Frontend → Rust**: Tauri `invoke("send_message", { message })` IPC call
3. **Rust → Python**: Write JSON to Python subprocess stdin
4. **Python Orchestrator**: Builds system prompt (soul.md + memory), sends to org CLI with tool definitions
5. **Org CLI → Claude API**: Messages API call with tools in the request body
6. **Claude Response**: Returns text and/or `tool_use` blocks
7. **Python Agent Loop**: Parses `tool_use` blocks, executes tools locally, formats `tool_result` blocks, sends back to CLI for next turn
8. **Python → Rust → Frontend**: Stream chunks back via stdout → Tauri events → React state

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Shell | Tauri 1.x | Cross-platform desktop wrapper, IPC, bundling |
| Frontend | React 18 + TypeScript + Vite 5 | Chat UI, memory viewer, settings |
| Backend | Rust (via Tauri) | Process management, IPC handlers, state |
| Agent | Python 3.10+ | Orchestrator, tool execution, memory |
| LLM | Org's Claude CLI | Messages API passthrough (subprocess) |
| Packaging | PyOxidizer | Embed Python runtime in app bundle |

## Key Design Decisions

- **Python for agents, not Rust**: Agent logic changes frequently during development. Python allows rapid iteration. Rust handles the stable shell layer.
- **stdin/stdout JSON-RPC**: Simplest reliable IPC between Rust and Python. No sockets, no HTTP server, no shared memory.
- **File-based memory**: JSON/JSONL files are human-readable, debuggable, and need zero infrastructure. Good enough for single-user local app.
- **Streaming via Tauri events**: The Rust backend emits events to the frontend as Python chunks arrive, enabling real-time UI updates.
- **Tool definitions sent to API but executed locally**: Claude sees the tool schemas in the request and responds with `tool_use` blocks. Our code intercepts and executes them — the org CLI never touches them.
