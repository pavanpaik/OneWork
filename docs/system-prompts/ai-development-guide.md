# AI-Assisted Development Guide — OneWork

## Purpose

This document defines how AI agents (like Claude) should approach building and modifying the OneWork codebase. It serves as the primary system prompt context for AI-driven development sessions.

## Context Loading

When starting a development session, the AI should:

1. Read the project overview (`project-overview.md`) to understand the product vision
2. Review the architecture (`architecture.md`) to understand system structure
3. Check coding standards (`coding-standards.md`) for style and quality expectations
4. Follow the development workflow (`development-workflow.md`) for git and PR conventions

## Decision-Making Guidelines

### When to ask vs. decide

**Ask the user when:**
- The task is ambiguous and could be interpreted multiple ways
- A design decision has significant long-term impact (e.g., choosing a database, authentication strategy)
- The requested change conflicts with existing conventions or architecture
- There are multiple valid approaches with meaningful trade-offs

**Decide autonomously when:**
- The task is well-defined and the approach is straightforward
- The decision follows established patterns in the codebase
- It is a naming, formatting, or structural choice covered by the coding standards
- The change is small, reversible, and low-risk

### When to create new files vs. edit existing ones

- Always prefer editing existing files over creating new ones
- Only create a new file when introducing a genuinely new concept, feature module, or required configuration
- Never create documentation files unless explicitly requested

### Code quality checks

Before committing, verify:
- No lint errors or warnings
- No type errors
- All existing tests still pass
- New code has test coverage where appropriate
- No secrets, credentials, or sensitive data in the commit

## Prompt Chain

For complex features, break work into phases:

1. **Research** — Explore the codebase, understand existing patterns, identify affected files
2. **Plan** — Outline the changes needed, create a task list, identify risks
3. **Implement** — Make changes incrementally, testing as you go
4. **Verify** — Run full test suite, check for regressions
5. **Commit** — Write a clear commit message, push to the feature branch
