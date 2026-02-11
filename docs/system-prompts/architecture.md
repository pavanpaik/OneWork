# Architecture — OneWork

## High-Level Architecture

OneWork follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│              Client (Frontend)          │
│  ┌───────┐ ┌──────┐ ┌───────────────┐  │
│  │ Views │ │ State│ │ Offline Store │  │
│  └───────┘ └──────┘ └───────────────┘  │
└──────────────────┬──────────────────────┘
                   │ API
┌──────────────────▼──────────────────────┐
│              Server (Backend)           │
│  ┌──────┐ ┌────────┐ ┌──────────────┐  │
│  │ API  │ │ Domain │ │ Integrations │  │
│  └──────┘ └────────┘ └──────────────┘  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│             Data Layer                  │
│  ┌──────────┐ ┌───────┐ ┌───────────┐  │
│  │ Database │ │ Cache │ │ File Store│  │
│  └──────────┘ └───────┘ └───────────┘  │
└─────────────────────────────────────────┘
```

## Design Decisions

### Data Model

- **Entity-based** — Core objects are Tasks, Projects, Workflows, and Users
- **Soft deletes** — Nothing is permanently deleted immediately; use a trash/archive model
- **Audit trail** — All mutations are logged with actor, timestamp, and change details

### API Design

- RESTful endpoints for CRUD operations
- WebSocket connections for real-time collaboration and updates
- All endpoints return consistent response envelopes with `data`, `error`, and `meta` fields

### State Management

- Client-side state is the source of truth for UI
- Optimistic updates for responsiveness; reconcile with server on sync
- Conflict resolution uses last-write-wins with optional manual merge for collaborative edits

### Storage

- Primary database for structured data (tasks, projects, users)
- Object/file storage for attachments and media
- Client-side indexed storage for offline capability

## Module Boundaries

| Module         | Responsibility                                    |
|----------------|---------------------------------------------------|
| `core`         | Domain entities, business rules, validation       |
| `api`          | HTTP/WebSocket handlers, request parsing, auth    |
| `storage`      | Database access, migrations, query builders       |
| `sync`         | Offline sync, conflict resolution, event sourcing |
| `integrations` | Third-party connectors (calendar, git, chat)      |
| `ui`           | Components, layouts, theming, accessibility       |
