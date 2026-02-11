# Development Workflow — OneWork

## Branch Strategy

- `main` — Stable, deployable code. All merges go through pull requests.
- `claude/*` — AI-assisted development branches for specific features or tasks.
- Feature branches should be short-lived and focused on a single deliverable.

## Commit Messages

Use conventional commit format:

```
<type>(<scope>): <short description>

<optional body with details>
```

Scopes: `frontend`, `tauri`, `agents`, `tools`, `memory`, `build`, `docs`

Types:
- `feat` — New feature or capability
- `fix` — Bug fix
- `refactor` — Code restructuring without behavior change
- `test` — Adding or updating tests
- `docs` — Documentation changes
- `chore` — Build, tooling, or dependency updates

Examples:
- `feat(agents): implement custom agent loop with tool_use parsing`
- `fix(tauri): handle Python process crash with restart logic`
- `feat(frontend): add streaming message display to chat interface`

## Pull Request Process

1. Branch from `main`
2. Implement the change with tests
3. Ensure all checks pass (lint, type check, tests) across all three languages
4. Open a PR with a clear description of what and why
5. Address review feedback
6. Squash-merge into `main`

## Code Review Checklist

- [ ] Does it solve the stated problem?
- [ ] Are there tests covering the new behavior?
- [ ] Is the code clear without excessive comments?
- [ ] Are error cases handled?
- [ ] Does it follow the coding standards for the relevant language(s)?
- [ ] Are IPC interfaces consistent across layers?
- [ ] No unnecessary changes outside the scope of the PR

## Definition of Done

A task/feature is "done" when:
- Code is written and passes all linting and type checks
- Tests are written and passing
- IPC contracts are verified across layers
- The feature works end-to-end (user action → UI → Rust → Python → back)
- PR is approved and merged to `main`
