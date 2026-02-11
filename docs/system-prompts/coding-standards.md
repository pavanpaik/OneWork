# Coding Standards — OneWork

## Language-Specific Conventions

### TypeScript (Frontend)

- Strict mode enabled (`"strict": true` in tsconfig)
- Functional React components only — no class components
- Props interfaces defined inline or co-located with the component
- Use `const` by default; `let` only when reassignment is necessary
- Prefer `async/await` over `.then()` chains

### Rust (Tauri Backend)

- Follow standard Rust formatting (`cargo fmt`)
- Use `Result<T, E>` for fallible operations — no panics in production paths
- Tauri commands return `Result<T, String>` for IPC error handling
- Keep Tauri command handlers thin — delegate to modules

### Python (Agent System)

- Type hints on all function signatures
- `async/await` for all I/O operations
- Docstrings on all public classes and functions
- Use `pathlib.Path` instead of string path manipulation
- Use `dataclasses` or plain dicts for data transfer — no heavy ORM-like patterns

## General Rules

- **Clarity over cleverness** — Write code that is easy to read. Avoid unnecessary abstractions.
- **Small functions** — Each function does one thing. If it needs a block comment, it should be split.
- **No dead code** — Remove unused imports, variables, and files. No commented-out code.
- **Fail fast** — Validate at boundaries. Return errors early.

## Naming Conventions

- **Booleans**: prefix with `is`, `has`, `can`, `should` (e.g., `is_completed`, `hasAccess`)
- **Event handlers (TS)**: prefix with `on` or `handle` (e.g., `onTaskCreated`, `handleSubmit`)
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **Files**: `kebab-case` for TypeScript/React, `snake_case` for Python and Rust

## File Organization

- One primary export per file
- Group by feature, not by type
- Co-locate tests with source (e.g., `file_tools.py` and `test_file_tools.py`)

## Error Handling

- Use typed error classes — not bare `Exception`, `Error()`, or string messages
- Errors at system boundaries (CLI subprocess, file I/O) must be caught and wrapped in domain errors
- Log with structured context (operation, entity, path) — never log secrets or user content

## Testing

- Unit tests for all business logic and pure functions
- Integration tests for the agent loop (mock the CLI subprocess, test tool routing)
- Test names describe behavior: "organizes files by type into subdirectories"
- Mock only external boundaries (org CLI, filesystem in unit tests) — not internal modules

## Dependencies

- Minimize third-party dependencies
- Pin exact versions (no `^` or `~`)
- Evaluate every new dependency for maintenance status, bundle size, license, and security
