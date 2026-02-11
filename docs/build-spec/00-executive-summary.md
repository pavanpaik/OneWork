# 00 — Executive Summary

## What We're Building

OneWork is a cross-platform desktop application that provides an AI-powered automation assistant. The user interacts through a chat interface. Behind the scenes, a multi-agent Python system plans tasks using Claude (via the org's CLI) and executes them locally using deterministic tool implementations.

The app ships as a single installable binary (`.app` / `.exe` / `.AppImage`) with no external dependencies.

## The Core Problem

The organization provides an internal Claude CLI that acts as a Messages API passthrough. It handles authentication and API routing but provides **zero** agent infrastructure: no tool execution, no MCP servers, no agent loops. This means we must build the entire agent execution layer ourselves.

## Hard Constraints

| Constraint | Implication |
|---|---|
| Org CLI = Messages API only | We implement the agent loop, tool parsing, tool execution, and result formatting entirely in our code |
| Single installable app | Python runtime must be embedded via PyOxidizer. No `pip install`, no system Python dependency |
| No database | All persistence is JSON/JSONL files in the app data directory |
| Local-only execution | No internet access except the Claude API call through the org CLI |
| Cross-platform | Must work on macOS, Windows, and Linux |

## Architecture Summary

```
User ↔ React UI ↔ Rust (Tauri IPC) ↔ Python Agent ↔ Org CLI → Claude API
                                         ↕
                                    Tool Executor
                                    (file ops, automation, memory)
```

Three layers, three languages:
1. **Frontend** — React/TypeScript: chat UI, memory viewer, settings
2. **Backend** — Rust/Tauri: IPC commands, Python process lifecycle, state
3. **Agent** — Python: orchestrator, agent loop, tool execution, memory

## Success Criteria

| Metric | Target |
|---|---|
| End-to-end message latency | < 2 seconds for simple queries |
| Tool execution success rate | 99% for file operations |
| Memory persistence | Context retained across app restarts |
| Error resilience | Graceful degradation — never lose user data, never crash silently |
| Platform support | Builds and runs on macOS, Windows, Linux |
| Bundle size | < 200 MB installed |

## What Makes This Different

- **Not a web app** — It's a native desktop application with full local filesystem access
- **Not using Claude's built-in tools** — We send tool schemas to the API but execute everything ourselves
- **Not a chatbot** — It's an automation assistant that can actually do things: move files, run scripts, remember context
- **Personality-driven** — The assistant's behavior is defined in a `soul.md` file that gets loaded into every system prompt

## Document Map

| Spec | What it covers |
|---|---|
| `01-architecture.md` | Detailed system architecture, communication protocols, data flow |
| `02-project-structure.md` | Complete file and directory layout with descriptions |
| `03-multi-agent-system.md` | Orchestrator design, specialist agents, delegation patterns |
| `04-tool-definitions.md` | JSON schemas for all tools sent to the Claude API |
| `05-agent-loop-spec.md` | The custom agent loop — the core of the system |
| `06-tool-implementations.md` | How each tool is implemented (file, automation, memory, system) |
| `07-memory-system.md` | File-based persistence: conversations, preferences, tasks, context |
| `08-tauri-backend.md` | Rust IPC commands, Python process management, state |
| `09-frontend-spec.md` | React components, streaming display, Tauri event listeners |
| `10-build-and-distribution.md` | PyOxidizer config, Tauri bundling, platform-specific builds |
| `11-implementation-phases.md` | Phased rollout plan with checklists |
