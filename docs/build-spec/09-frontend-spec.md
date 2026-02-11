# 09 — Frontend Specification

## Overview

The frontend is a React/TypeScript application that runs inside the Tauri webview. It communicates with the Rust backend exclusively through Tauri's IPC (`invoke` for commands, `listen` for events).

The UI has three views: Chat (primary), Memory (debug/transparency), and Settings.

## Entry Points

### `index.html`

Standard Vite entry HTML. Contains a `<div id="root">` mount point.

### `src/main.tsx`

Mounts `<App />` to the root div.

### `src/App.tsx`

Root component with:
- A sidebar (fixed left, 250px) with navigation buttons and agent status indicator
- A main content area that renders one of: `ChatInterface`, `MemoryViewer`, `SettingsPanel`

**State:**
- `view: 'chat' | 'memory' | 'settings'` — Current view (default: `'chat'`)
- `agentStatus: 'idle' | 'thinking' | 'error'` — Updated by `agent-status` events

**On mount:**
- Listen for `agent-status` events and update `agentStatus`

## Shared Types

### `src/types/index.ts`

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'tool_execution' | 'error';
  toolName?: string;
}

interface AgentTextChunk {
  content: string;
}

interface AgentToolEvent {
  tool_name: string;
  status: string;
  tool_input?: Record<string, unknown>;
}

interface AgentError {
  message: string;
}
```

## Chat Components

### `ChatInterface` (`src/components/Chat/ChatInterface.tsx`)

The main chat container. Manages message state and Tauri event listeners.

**State:**
- `messages: Message[]` — All messages in the current session
- `isProcessing: boolean` — Whether the agent is currently working

**Event Listeners (set up on mount):**

| Event | Handler |
|---|---|
| `agent-text-chunk` | Append text to the last assistant message, or create a new one |
| `agent-tool-execution` | Add a system message showing tool execution |
| `agent-done` | Set `isProcessing = false` |
| `agent-error` | Add an error message, set `isProcessing = false` |

**Text chunk handling (critical for streaming):**

When a `text_chunk` arrives:
1. Check if the last message in `messages` is an assistant text message.
2. If yes, append the chunk to that message's content.
3. If no, create a new assistant message with the chunk as content.

This produces a smooth streaming effect where the assistant's response builds character by character.

**Send message:**
1. Guard: return if empty or `isProcessing`.
2. Add user message to `messages`.
3. Set `isProcessing = true`.
4. Call `invoke('send_message', { message })`.
5. Errors from `invoke` are caught and displayed as system error messages.

**Auto-scroll:**
After every `messages` update, scroll to the bottom of the message list.

### `MessageList` (`src/components/Chat/MessageList.tsx`)

Renders a scrollable container of `Message` components.

**Props:** `messages: Message[]`

Simple mapping: `messages.map((msg, index) => <Message key={index} {...msg} />)`

### `Message` (`src/components/Chat/Message.tsx`)

Renders a single message bubble.

**Props:** `role`, `content`, `timestamp`, `type?`, `toolName?`

**Rendering logic:**
- User messages: right-aligned, blue background
- Assistant messages: left-aligned, gray background
- System messages: centered, orange/amber background, smaller text
- Tool execution messages: purple background with tool icon indicator
- Error messages: red/orange background

**Content:** Render as preformatted text (`white-space: pre-wrap`) to preserve formatting from Claude's responses.

**Timestamp:** Show `HH:MM` format, extracted from the ISO timestamp.

### `InputBox` (`src/components/Chat/InputBox.tsx`)

Text input with send button.

**Props:** `onSend: (message: string) => void`, `disabled?: boolean`

**Behavior:**
- Submit on Enter key or click Send button
- Clear input after send
- Disable input and button when `disabled=true` (agent is processing)
- Auto-focus on mount
- Placeholder text: "What would you like to do?"

## Memory Components

### `MemoryViewer` (`src/components/Memory/MemoryViewer.tsx`)

Browse the assistant's stored memories. Provides transparency into what the agent remembers.

**On mount:** Call `invoke('get_preferences')` to load preferences. Call `invoke('get_context')` to load recent context.

**Display:**
- Tab or section for each memory type: Preferences, Context, Recent Conversations
- Each memory entry shown as a card with key, value, tags, and timestamps
- Read-only — no editing from the UI (memory is managed by the agent)

### `ContextDisplay` (`src/components/Memory/ContextDisplay.tsx`)

Shows the current conversation context that will be included in the next system prompt.

**Props:** `context: string`

Renders the context as formatted text, showing the user what the agent "remembers" about recent interactions.

## Settings Components

### `SettingsPanel` (`src/components/Settings/SettingsPanel.tsx`)

Configuration panel for the app.

**Settings fields:**
- **CLI Path**: Text input for the org CLI binary path (default: `"claude"`)
- **Model**: Dropdown to select Claude model (default: `"claude-sonnet-4-20250514"`)
- **Memory Path**: Text input showing the memory directory location

**Behavior:**
- Load current settings on mount
- Save on change (debounced) or on explicit Save button
- Settings are stored in Tauri's app data directory (separate from memory)

## Custom Hooks

### `useAgent` (`src/hooks/useAgent.ts`)

Encapsulates agent communication logic. Could be extracted from ChatInterface to make the component cleaner.

```typescript
function useAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'thinking' | 'error'>('idle');

  // Sets up event listeners
  // Provides sendMessage function
  // Returns { messages, isProcessing, status, sendMessage }
}
```

### `useMemory` (`src/hooks/useMemory.ts`)

Encapsulates memory fetching.

```typescript
function useMemory() {
  const [context, setContext] = useState<string>('');
  const [preferences, setPreferences] = useState<Record<string, unknown>>({});

  // Fetches on mount and provides refresh function
  // Returns { context, preferences, refresh }
}
```

## Styling

### Design System

- **Font**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`)
- **Sidebar**: Dark background (`#1e1e1e`), white text, 250px wide
- **Content area**: White background
- **Status indicator**: Green (idle), blue pulsing (thinking), red (error)
- **Message colors**: Blue (user), gray (assistant), orange (system), purple (tool execution)
- **Input**: Rounded pill shape, blue send button

### Layout

```
┌──────────┬──────────────────────────────┐
│          │                              │
│  Sidebar │     Main Content             │
│          │                              │
│  [Chat]  │  ┌────────────────────────┐  │
│  [Memory]│  │  Message List          │  │
│  [Settin]│  │  (scrollable)          │  │
│          │  │                        │  │
│          │  │                        │  │
│          │  └────────────────────────┘  │
│          │  ┌────────────────────────┐  │
│  Status: │  │ [Input box]    [Send]  │  │
│  ● idle  │  └────────────────────────┘  │
└──────────┴──────────────────────────────┘
```

### Responsive Behavior

- Minimum window size: 800x600
- Sidebar is always visible (no collapse for MVP)
- Message bubbles max-width 80% of content area
- Input box stretches to fill available width

## Build Configuration

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
```

### `tsconfig.json`

- `strict: true`
- `target: "ESNext"`
- `jsx: "react-jsx"`
- `moduleResolution: "bundler"`

### `package.json` Scripts

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "tauri": "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build"
}
```

### `package.json` Dependencies

**Runtime:**
- `@tauri-apps/api` — Tauri IPC (invoke, listen)
- `react`, `react-dom` — UI framework

**Dev:**
- `@tauri-apps/cli` — Tauri CLI
- `@types/react`, `@types/react-dom` — Type definitions
- `@vitejs/plugin-react` — Vite React plugin
- `typescript` — Type checker
- `vite` — Build tool
