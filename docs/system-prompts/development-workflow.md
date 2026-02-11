# Development Workflow — OneWork

## Branch Strategy

- `main` — Stable, deployable code. All merges go through pull requests.
- `claude/*` — AI-assisted development branches for specific features or tasks.
- Feature branches should be short-lived and focused on a single deliverable.

## Commit Messages

Use conventional commit format:

```
<type>: <short description>

<optional body with details>
```

Types:
- `feat` — New feature or capability
- `fix` — Bug fix
- `refactor` — Code restructuring without behavior change
- `test` — Adding or updating tests
- `docs` — Documentation changes
- `chore` — Build, tooling, or dependency updates

## Pull Request Process

1. Branch from `main`
2. Implement the change with tests
3. Ensure all checks pass (lint, type check, tests)
4. Open a PR with a clear description of what and why
5. Address review feedback
6. Squash-merge into `main`

## Code Review Checklist

- [ ] Does it solve the stated problem?
- [ ] Are there tests covering the new behavior?
- [ ] Is the code clear without excessive comments?
- [ ] Are error cases handled?
- [ ] Does it follow the coding standards?
- [ ] No unnecessary changes outside the scope of the PR

## Definition of Done

A task/feature is "done" when:
- Code is written and passes all linting and type checks
- Tests are written and passing
- Documentation is updated if user-facing behavior changed
- PR is approved and merged to `main`
