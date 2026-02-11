# Coding Standards — OneWork

## General Rules

- **Clarity over cleverness** — Write code that is easy to read and understand. Avoid unnecessary abstractions.
- **Small functions** — Each function should do one thing. If a function needs a comment to explain what it does, it should be split.
- **No dead code** — Remove unused imports, variables, functions, and files. Do not comment out code "for later."
- **Fail fast** — Validate inputs at boundaries. Return errors early. Do not silently swallow exceptions.

## Naming Conventions

- Use descriptive, unambiguous names
- Boolean variables/functions: prefix with `is`, `has`, `can`, `should` (e.g., `isCompleted`, `hasAccess`)
- Event handlers: prefix with `on` or `handle` (e.g., `onTaskCreated`, `handleSubmit`)
- Constants: UPPER_SNAKE_CASE for true constants, camelCase for derived values

## File Organization

- One primary export per file
- Group related files in directories by feature, not by type
- Keep test files co-located with the code they test (e.g., `task.ts` and `task.test.ts`)

```
src/
├── features/
│   ├── tasks/
│   │   ├── task.ts
│   │   ├── task.test.ts
│   │   ├── task-list.ts
│   │   └── index.ts
│   ├── projects/
│   └── workflows/
├── shared/
│   ├── types/
│   ├── utils/
│   └── constants/
└── infrastructure/
    ├── database/
    ├── http/
    └── config/
```

## Error Handling

- Use typed error classes, not generic `Error` or string messages
- Errors at system boundaries (API, DB) must be caught and translated into domain errors
- Log errors with structured context (user, operation, entity ID) — never log sensitive data

## Testing

- Every feature must have tests before merging
- Unit tests for business logic and pure functions
- Integration tests for API endpoints and database operations
- No mocking of internal modules — only mock external dependencies
- Test names should describe the behavior, not the implementation (e.g., "marks task as completed when all subtasks are done")

## Dependencies

- Minimize third-party dependencies — prefer standard library or small, focused packages
- Pin dependency versions exactly (no `^` or `~` ranges)
- Evaluate every new dependency for: maintenance status, bundle size, license, and security
