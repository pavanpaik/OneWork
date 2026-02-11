# AI-Assisted Development Guide — OneWork

## Purpose

This document defines how AI agents building OneWork should approach the codebase. It serves as the primary context for AI-driven development sessions.

## Context Loading Order

When starting a development session, load context in this order:

1. `docs/system-prompts/project-overview.md` — What the product is, its constraints
2. `docs/system-prompts/architecture.md` — How the layers connect
3. `docs/system-prompts/coding-standards.md` — Style expectations per language
4. `docs/build-spec/` — The specific spec for whatever you're implementing

## The Build Spec is the Source of Truth

The `docs/build-spec/` directory contains the complete implementation specification. When building a component:

1. Read the relevant build-spec document first
2. Follow the spec's requirements, interfaces, and data formats exactly
3. If the spec is ambiguous, check adjacent spec documents for clarification
4. If still ambiguous, ask the user — do not guess

## Multi-Language Project Awareness

This project spans three languages. When making changes:

- **TypeScript changes** may require corresponding Tauri IPC updates in Rust
- **Rust changes** to command signatures must match frontend `invoke()` calls
- **Python protocol changes** must match the JSON-RPC format Rust writes/reads on stdin/stdout
- Always check the interface boundary when modifying any layer

## Decision-Making Guidelines

### Ask the user when:

- The build spec doesn't cover the scenario
- A design decision has cross-layer impact
- The requested change conflicts with the spec
- There are multiple valid approaches with meaningful trade-offs

### Decide autonomously when:

- The build spec is clear and specific
- The decision follows established patterns already in the codebase
- The change is small, reversible, and within a single layer
- It's a naming, formatting, or structural choice covered by coding standards

## Code Quality Checks

Before committing, verify:

- No lint errors (`cargo clippy`, `eslint`, `pyright`/`mypy`)
- No type errors across all three languages
- All existing tests pass
- New code has test coverage
- No secrets, credentials, or user data in the commit
- IPC interfaces are consistent across layers

## Implementation Approach

For each feature or component:

1. **Read the spec** — Find the relevant build-spec document
2. **Identify boundaries** — What other layers does this touch?
3. **Implement the interface first** — Types, protocols, command signatures
4. **Fill in the implementation** — Business logic, tool execution, UI rendering
5. **Test at boundaries** — Does the JSON-RPC match? Do Tauri commands resolve?
6. **Verify end-to-end** — Does a user message flow through all layers and back?
