# Project Overview — OneWork

## Vision

OneWork is a cross-platform desktop automation assistant that brings AI-powered file management and task automation to your local machine. It bundles a Tauri shell (Rust), a React frontend, and an embedded Python multi-agent system into a single installable application.

The core idea: a "thinking brain" orchestrator plans tasks using Claude (via the org's internal CLI), then delegates execution to deterministic "doing brain" specialist agents that operate on files, run scripts, and manage memory — all locally, all offline-capable.

## Critical Constraints

1. **Everything bundled** — Frontend, Rust backend, Python runtime, and agent code ship as one `.app` / `.exe` / `.AppImage`. No external Python install required.
2. **Org CLI limitation** — The organization's internal Claude CLI is a Messages API passthrough only. It provides NO MCP support, NO tool execution, NO agent SDK features. All agent loop logic and tool execution must be implemented externally.
3. **No database** — All persistence is file-based (JSON/JSONL). No SQLite, no Postgres, no Redis.
4. **Local-only** — The assistant works with local files and applications. No internet access beyond the Claude API call.

## Core Principles

1. **Safety first** — Always confirm before destructive operations. Use dry-run previews. Prefer reversible actions.
2. **Transparent execution** — Stream progress to the user. Explain what each tool does and why it was chosen.
3. **Personality-driven** — The assistant loads its personality from `soul.md`, making behavior consistent and configurable.
4. **Learning** — The assistant remembers user preferences, corrections, and workflows across sessions via the file-based memory system.

## Target Users

- Power users who want AI-assisted file organization and automation
- Developers looking for a local, private AI assistant
- Teams using an org-managed Claude CLI who want a desktop interface

## Key Capabilities

- **File Operations** — List, search, organize, and move files with glob patterns and metadata
- **Automation** — Execute shell commands, AppleScript (macOS), and launch applications
- **Memory** — Persistent preferences, conversation history, and learned workflows
- **Multi-Agent** — Orchestrator decomposes complex tasks; specialists execute deterministically
- **Streaming UI** — Real-time response streaming with tool execution progress indicators
