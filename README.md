# OneWork

A cross-platform desktop automation assistant powered by Claude. OneWork bundles a Tauri shell, a React frontend, and an embedded Python multi-agent system into a single installable app that provides AI-driven file management and task automation on your local machine.

## Why OneWork

Most AI assistant tools require cloud infrastructure, server deployments, or complex setup. OneWork ships as one binary: download, install, run. It talks to Claude through your organization's CLI (Messages API passthrough) and executes everything locally — file operations, shell automation, memory — with no external dependencies at runtime.

## Architecture at a Glance

```
┌─────────────────────────────────────────┐
│            Tauri App Bundle             │
│                                         │
│  React/TS UI  ←→  Rust Backend (IPC)    │
│                        ↕                │
│         Python Agent System             │
│   ┌─────────────────────────────┐       │
│   │ Orchestrator (Thinking Brain)│      │
│   │   ↕ Org CLI (Messages API)  │      │
│   │   ↕ Custom Agent Loop       │      │
│   └─────────────┬───────────────┘       │
│   ┌─────────────▼───────────────┐       │
│   │ Tool Executor (Doing Brains)│       │
│   │  File · Automation · Memory │       │
│   └─────────────────────────────┘       │
│                                         │
│  File-Based Memory (app data dir)       │
└─────────────────────────────────────────┘
```

## Documentation

All specifications live in `docs/`:

| Directory | Contents |
|---|---|
| `docs/system-prompts/` | AI development context — project overview, architecture principles, coding standards, soul definition |
| `docs/build-spec/` | Complete build specification — everything an agent team needs to implement the project end-to-end |

### Build Spec Reading Order

| # | File | What it covers |
|---|---|---|
| 00 | `executive-summary.md` | Vision, constraints, success criteria |
| 01 | `architecture.md` | System architecture and tech stack |
| 02 | `project-structure.md` | Full directory layout |
| 03 | `multi-agent-system.md` | Orchestrator, specialists, communication |
| 04 | `tool-definitions.md` | All tool JSON schemas |
| 05 | `agent-loop-spec.md` | Custom agent loop (the core innovation) |
| 06 | `tool-implementations.md` | File, automation, memory, system tools |
| 07 | `memory-system.md` | File-based persistence layer |
| 08 | `tauri-backend.md` | Rust IPC, Python bridge, state |
| 09 | `frontend-spec.md` | React components and UI |
| 10 | `build-and-distribution.md` | PyOxidizer, packaging, installers |
| 11 | `implementation-phases.md` | Phased rollout with checklists |

## Tech Stack

- **Shell**: Tauri (Rust)
- **Frontend**: React + TypeScript + Vite
- **Agent Layer**: Python 3.10+
- **LLM Access**: Org's internal Claude CLI (Messages API only)
- **Packaging**: PyOxidizer (embedded Python runtime)
- **Platforms**: macOS, Windows, Linux

## Getting Started

This project is in the specification phase. See `docs/build-spec/` for the complete implementation guide.
