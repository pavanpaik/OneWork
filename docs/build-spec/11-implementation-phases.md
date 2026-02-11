# 11 — Implementation Phases

## Overview

The build is organized into 7 phases. Each phase produces a working (if incomplete) system. Test each phase before moving to the next. The end-to-end flow should work at the end of Phase 2 — everything after that is refinement.

---

## Phase 1: Foundation (Priority: Critical)

**Goal:** Get the skeleton up. Frontend talks to Rust. Rust talks to Python. Python responds.

### Tasks

- [ ] Initialize Tauri project (`npm create tauri-app`)
- [ ] Set up React with TypeScript and Vite
- [ ] Create the `agents/` Python package structure with `__init__.py` files
- [ ] Implement `agents/orchestrator/main.py` — stdin/stdout JSON-RPC loop
  - Reads `{"command": "process_message", "message": "..."}` from stdin
  - Writes `{"type": "text_chunk", "content": "Echo: <message>"}` to stdout (hardcoded echo for testing)
  - Writes `{"type": "done"}` to stdout
- [ ] Implement `src-tauri/src/python_bridge/` — spawn Python process, write to stdin, read from stdout
- [ ] Implement `src-tauri/src/commands/agent.rs` — `send_message` command that forwards to Python
- [ ] Implement `src-tauri/src/state.rs` — `AppState` with Python process handle
- [ ] Implement basic `App.tsx` with sidebar and chat view
- [ ] Implement `ChatInterface.tsx` with `MessageList`, `Message`, `InputBox`
- [ ] Wire up Tauri event listeners for `agent-text-chunk` and `agent-done`
- [ ] Add basic CSS styling

### Acceptance Criteria

- User types a message in the UI
- Message flows: React → Rust → Python → Rust → React
- The echoed message appears in the chat
- The UI shows "thinking" status while processing

### Files Created

```
src-tauri/src/main.rs
src-tauri/src/state.rs
src-tauri/src/commands/mod.rs
src-tauri/src/commands/agent.rs
src-tauri/src/python_bridge/mod.rs
src-tauri/src/python_bridge/runtime.rs
src-tauri/Cargo.toml
src-tauri/tauri.conf.json
src/main.tsx
src/App.tsx
src/components/Chat/ChatInterface.tsx
src/components/Chat/MessageList.tsx
src/components/Chat/Message.tsx
src/components/Chat/InputBox.tsx
src/types/index.ts
src/styles/main.css
agents/orchestrator/__init__.py
agents/orchestrator/main.py
agents/shared/__init__.py
agents/shared/protocol.py
package.json
tsconfig.json
vite.config.ts
index.html
```

---

## Phase 2: Agent Loop (Priority: Critical)

**Goal:** Replace the echo with a real Claude conversation that can call and execute tools.

### Tasks

- [ ] Create `resources/soul.md` (copy from `docs/system-prompts/soul.md`)
- [ ] Create `resources/tool_definitions.json` with all 8 tool schemas
- [ ] Implement `agents/orchestrator/cli_wrapper.py` — org CLI subprocess wrapper
- [ ] Implement `agents/orchestrator/agent_loop.py` — full agent loop with:
  - System prompt assembly (soul.md + hardcoded context for now)
  - Messages API request building
  - Streaming response parsing
  - `tool_use` block extraction
  - `tool_result` formatting
  - Multi-iteration loop (max 10)
- [ ] Implement `agents/orchestrator/tool_executor.py` — routing table
- [ ] Implement `agents/tools/file_tools.py` — all 5 file operations
- [ ] Implement `agents/tools/automation_tools.py` — shell, applescript, launch_app
- [ ] Implement `agents/shared/types.py` — ToolResult, AgentEvent dataclasses
- [ ] Implement `agents/shared/utils.py` — path expansion, timestamp helpers
- [ ] Update `agents/orchestrator/main.py` to use `AgentLoop` instead of echo
- [ ] Wire tool execution events through to the frontend (`tool_start`, `tool_complete`)

### Acceptance Criteria

- User asks "list files in my downloads folder"
- Orchestrator calls Claude via org CLI
- Claude responds with `tool_use: list_files`
- Agent loop executes `list_files` and sends result back
- Claude responds with a text summary of the files
- Full response streams to the UI with tool execution indicators

### Files Created

```
resources/soul.md
resources/tool_definitions.json
agents/orchestrator/cli_wrapper.py
agents/orchestrator/agent_loop.py
agents/orchestrator/tool_executor.py
agents/orchestrator/thinking_brain.py
agents/tools/__init__.py
agents/tools/file_tools.py
agents/tools/automation_tools.py
agents/shared/types.py
agents/shared/utils.py
```

---

## Phase 3: Memory System (Priority: High)

**Goal:** The assistant remembers things across conversations.

### Tasks

- [ ] Implement `agents/memory/memory_manager.py` — full MemoryManager class
- [ ] Implement `agents/memory/file_store.py` — JSON/JSONL I/O utilities
- [ ] Implement `agents/tools/memory_tools.py` — store and query tools
- [ ] Add memory tools to the tool executor routing table
- [ ] Update `agent_loop.py` to:
  - Call `memory.get_recent_context()` for system prompt
  - Call `memory.get_preferences()` for system prompt
  - Call `memory.store_conversation()` after each request completes
- [ ] Create the memory directory structure on first run
- [ ] Implement `src-tauri/src/commands/memory.rs` — `get_context`, `get_preferences`

### Acceptance Criteria

- User says "I prefer organizing files by type"
- Claude calls `store_memory` with the preference
- In a new conversation, user asks to organize files
- The system prompt includes the stored preference
- Claude uses `by_type` strategy without asking

### Files Created

```
agents/memory/__init__.py
agents/memory/memory_manager.py
agents/memory/file_store.py
agents/tools/memory_tools.py
src-tauri/src/commands/memory.rs
```

---

## Phase 4: Frontend Polish (Priority: High)

**Goal:** The UI is pleasant to use and shows everything the agent is doing.

### Tasks

- [ ] Add tool execution progress display (tool name, spinning indicator, completion status)
- [ ] Implement `MemoryViewer.tsx` — browse preferences, context, recent conversations
- [ ] Implement `ContextDisplay.tsx` — show what context the agent loaded
- [ ] Implement `SettingsPanel.tsx` — CLI path, model selection
- [ ] Implement `useAgent.ts` hook — extract agent logic from ChatInterface
- [ ] Implement `useMemory.ts` hook — memory fetching
- [ ] Add error message display (styled differently from normal messages)
- [ ] Add loading/thinking animation
- [ ] Refine CSS: typography, spacing, colors, transitions
- [ ] Keyboard shortcut: Enter to send, Shift+Enter for newline

### Acceptance Criteria

- Tool executions show as distinct UI elements with status
- Memory viewer displays stored preferences and context
- Settings panel allows changing CLI path and model
- Error states are clearly communicated
- UI feels responsive and polished

### Files Created/Updated

```
src/components/Memory/MemoryViewer.tsx
src/components/Memory/ContextDisplay.tsx
src/components/Settings/SettingsPanel.tsx
src/hooks/useAgent.ts
src/hooks/useMemory.ts
```

---

## Phase 5: Integration Testing (Priority: High)

**Goal:** Everything works end-to-end. Edge cases are handled.

### Tasks

- [ ] Test multi-tool conversations (Claude calls 3+ tools in sequence)
- [ ] Test tool error recovery (tool fails, Claude adapts)
- [ ] Test memory persistence (quit and relaunch, preferences survive)
- [ ] Test the `organize_files` dry-run → confirm → execute flow
- [ ] Test `execute_automation` safety: dangerous commands blocked, safe_mode works
- [ ] Test agent loop iteration limit (max 10)
- [ ] Test Python process crash recovery (kill Python, verify Rust restarts it)
- [ ] Test empty/missing memory files (first run scenario)
- [ ] Test large file listings (1000+ files)
- [ ] Handle Claude API errors gracefully (timeout, rate limit, auth failure)
- [ ] Handle org CLI not found on PATH
- [ ] Write Python unit tests for file_tools, automation_tools, memory_manager
- [ ] Write Python integration tests for agent_loop (mock CLI subprocess)

### Acceptance Criteria

- No crashes on any tested scenario
- Errors produce user-friendly messages, not stack traces
- Agent recovers from tool failures without losing conversation state
- Memory persists across app restarts

---

## Phase 6: Build and Package (Priority: High)

**Goal:** Ship a single installable binary per platform.

### Tasks

- [ ] Install and configure PyOxidizer
- [ ] Create `pyoxidizer.bzl` configuration
- [ ] Build Python agent binary for current platform
- [ ] Update `python_bridge/runtime.rs` to use bundled binary in release mode
- [ ] Configure `tauri.conf.json` bundle settings (resources, externalBin, icons)
- [ ] Generate app icons from source image (`npx tauri icon`)
- [ ] Run `npm run build:all` and verify the output
- [ ] Test the built app on macOS (if available)
- [ ] Test the built app on Windows (if available)
- [ ] Test the built app on Linux (if available)
- [ ] Verify bundled Python finds resources (soul.md, tool_definitions.json)
- [ ] Verify memory directory is created in the correct OS app data location

### Acceptance Criteria

- `npm run build:all` produces a working installer
- Installed app launches without errors
- All features work in the packaged app (not just dev mode)
- Bundle size is under 100 MB

### Files Created

```
pyoxidizer.bzl
src-tauri/icons/ (generated)
```

---

## Phase 7: Polish and Extras (Priority: Nice-to-Have)

**Goal:** Quality-of-life improvements.

### Tasks

- [ ] Add system tray integration (minimize to tray)
- [ ] Add keyboard shortcuts (Cmd/Ctrl+N for new conversation, etc.)
- [ ] Add conversation history sidebar (list past conversations by date)
- [ ] Add markdown rendering for assistant messages
- [ ] Add code syntax highlighting in messages
- [ ] Add copy-to-clipboard for assistant responses
- [ ] Optimize Python startup time
- [ ] Add auto-update mechanism (future)
- [ ] Add onboarding flow for first-time users (set CLI path, test connection)
- [ ] Add `system_tools.py` implementations (system info, disk usage)
- [ ] Performance profiling and optimization

---

## Dependency Order

```
Phase 1 (Foundation)
  └─→ Phase 2 (Agent Loop)     ← This is the MVP
        ├─→ Phase 3 (Memory)
        │     └─→ Phase 5 (Testing)
        ├─→ Phase 4 (Frontend)
        │     └─→ Phase 5 (Testing)
        └─→ Phase 6 (Build)
              └─→ Phase 7 (Polish)
```

Phases 3 and 4 can be done in parallel. Phase 5 should happen after both. Phase 6 can begin once Phase 2 is working. Phase 7 is ongoing.

## Success Metrics

| Metric | Target | How to Measure |
|---|---|---|
| End-to-end latency | < 2s for simple queries | Time from send to first text chunk |
| Tool execution success | 99% for file operations | Run 100 file operations, count failures |
| Memory persistence | 100% across restarts | Store preference, restart, verify present |
| Error recovery | Graceful for all tested cases | No crashes or data loss on error scenarios |
| Platform support | macOS + 1 other | Build and test on at least 2 platforms |
| Bundle size | < 100 MB | Check installer file size |
