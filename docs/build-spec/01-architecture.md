# 01 — Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri App Bundle                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Frontend (React/TypeScript/Vite)                      │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐ │ │
│  │  │ Chat UI  │  │ Memory View  │  │ Settings Panel   │ │ │
│  │  └──────────┘  └──────────────┘  └──────────────────┘ │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│               Tauri IPC │ (invoke + event listeners)         │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Tauri Backend (Rust)                                  │ │
│  │  ┌──────────────┐  ┌────────────────┐  ┌───────────┐  │ │
│  │  │ IPC Commands │  │ Python Bridge  │  │ App State │  │ │
│  │  └──────────────┘  └────────────────┘  └───────────┘  │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│              stdin/stdout│JSON-RPC (one line per message)    │
│                         │                                    │
│  ┌──────────────────────▼─────────────────────────────────┐ │
│  │  Python Agent System                                   │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Orchestrator (Thinking Brain)                   │  │ │
│  │  │  - Loads soul.md into system prompt              │  │ │
│  │  │  - Calls org CLI as subprocess                   │  │ │
│  │  │  - Implements agent loop (parse → execute → loop)│  │ │
│  │  └──────────────────┬───────────────────────────────┘  │ │
│  │                     │                                   │ │
│  │  ┌──────────────────▼───────────────────────────────┐  │ │
│  │  │  Tool Executor (Doing Brains)                    │  │ │
│  │  │  ┌───────────┐ ┌────────────┐ ┌──────────────┐  │  │ │
│  │  │  │File Tools │ │Auto. Tools │ │Memory Tools  │  │  │ │
│  │  │  └───────────┘ └────────────┘ └──────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Org CLI Wrapper (subprocess)                    │  │ │
│  │  │  - Sends Messages API requests                   │  │ │
│  │  │  - Receives streaming responses                  │  │ │
│  │  │  - NO tool execution capability                  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  File-Based Memory ($APP_DATA/memory/)                  │ │
│  │  ┌──────────────┐ ┌─────────┐ ┌───────┐ ┌───────────┐ │ │
│  │  │conversations/│ │context/ │ │tasks/ │ │learned/   │ │ │
│  │  └──────────────┘ └─────────┘ └───────┘ └───────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Communication Protocols

### Frontend ↔ Rust (Tauri IPC)

**Outbound (Frontend → Rust):** Tauri `invoke()` calls

| Command | Payload | Returns |
|---|---|---|
| `send_message` | `{ message: string }` | `void` (streaming via events) |
| `get_status` | none | `string` |
| `get_context` | `{ limit?: number }` | `string` |
| `get_preferences` | none | `object` |

**Inbound (Rust → Frontend):** Tauri event emissions

| Event | Payload | When |
|---|---|---|
| `agent-text-chunk` | `{ content: string }` | Assistant text streams in |
| `agent-tool-execution` | `{ tool_name: string, status: string }` | Tool starts/completes |
| `agent-status` | `"idle" \| "thinking" \| "error"` | Agent state changes |
| `agent-done` | `{}` | Response complete |
| `agent-error` | `{ message: string }` | Unrecoverable error |

### Rust ↔ Python (stdin/stdout JSON-RPC)

One JSON object per line. Newline-delimited.

**Outbound (Rust → Python stdin):**

```json
{"command": "process_message", "message": "organize my downloads folder"}
{"command": "shutdown"}
```

**Inbound (Python stdout → Rust):**

```json
{"type": "status", "content": "Thinking (iteration 1)..."}
{"type": "text_chunk", "content": "I'll help you organize"}
{"type": "tool_start", "tool_name": "list_files", "tool_input": {"path": "~/Downloads"}}
{"type": "tool_complete", "tool_name": "list_files", "status": "success"}
{"type": "done", "conversation_id": "abc-123"}
{"type": "error", "content": "Failed to reach Claude API"}
```

### Python ↔ Org CLI (subprocess)

The org CLI is invoked as a subprocess. Input is a JSON Messages API request on stdin. Output is streaming SSE-style JSON chunks on stdout.

**Request format:**

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "<soul.md content + memory context>",
  "messages": [{"role": "user", "content": "..."}],
  "tools": [<tool definitions from tool_definitions.json>],
  "stream": true
}
```

**Response chunks follow the Anthropic streaming format:**
- `content_block_start` — New content block (text or tool_use)
- `content_block_delta` — Incremental text
- `content_block_stop` — Block complete
- `message_delta` — Contains `stop_reason`
- `message_stop` — End of message

## Data Flow: Complete Request Lifecycle

```
1. User types "organize my downloads"
2. React calls invoke("send_message", { message: "organize my downloads" })
3. Rust writes {"command":"process_message","message":"organize my downloads"}\n to Python stdin
4. Python orchestrator:
   a. Loads soul.md + recent memory into system prompt
   b. Formats Messages API request with tool definitions
   c. Spawns org CLI subprocess, sends request
   d. Reads streaming response
5. Claude responds with tool_use: list_files({path: "~/Downloads"})
6. Python agent loop:
   a. Parses tool_use block
   b. Writes {"type":"tool_start","tool_name":"list_files",...}\n to stdout
   c. Executes list_files via FileTools
   d. Writes {"type":"tool_complete",...}\n to stdout
   e. Formats tool_result, appends to messages
   f. Sends next API call via org CLI
7. Claude responds with tool_use: organize_files({...dry_run:true})
8. Agent loop executes, sends results, loops again
9. Claude responds with final text (stop_reason: end_turn)
10. Python writes text chunks to stdout, then {"type":"done"}\n
11. Rust reads stdout, emits Tauri events for each chunk
12. React updates message list with streamed text
```

## Technology Stack Details

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Desktop shell | Tauri | 1.x | Window management, IPC, bundling, FS access |
| Frontend framework | React | 18.x | Component-based UI |
| Frontend language | TypeScript | 5.x | Type safety |
| Build tool | Vite | 5.x | Fast dev server and bundling |
| Backend language | Rust | stable | Tauri backend, process management |
| Agent language | Python | 3.10+ | Agent logic, tool execution |
| Python embedding | PyOxidizer | latest | Bundle Python into app binary |
| LLM access | Org Claude CLI | internal | Messages API passthrough |

## Security Considerations

- **Filesystem scope**: Tauri allowlist restricts FS access to `$HOME`, `$APPDATA`, `$LOCALAPPDATA`
- **Shell execution**: Automation tools check for dangerous patterns (`rm -rf`, `mkfs`, etc.) and require `safe_mode=false` confirmation
- **No network**: The Python agent has no direct network access. Only the org CLI subprocess makes API calls.
- **CSP**: Content Security Policy configured in Tauri to prevent XSS in the webview
- **Memory isolation**: Each conversation's memory is stored in the app data directory, not in the project directory
