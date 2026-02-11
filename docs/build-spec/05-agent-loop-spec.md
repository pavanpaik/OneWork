# 05 — Agent Loop Specification

## Why This Exists

The organization's internal Claude CLI is a thin wrapper around the Anthropic Messages API. It handles authentication and request routing, but provides **no** agent infrastructure:

- No tool execution
- No MCP server support
- No agent loop
- No conversation state management

This means we must implement the entire agent loop ourselves. This document specifies exactly how.

## The Agent Loop

### Entry Point

`agents/orchestrator/agent_loop.py` contains the `AgentLoop` class. It is instantiated once at startup and processes one user message at a time.

### Initialization

On construction, the AgentLoop:

1. Creates an `OrgCLIWrapper` instance (for calling the org CLI)
2. Creates a `ToolExecutor` instance (for running tools)
3. Creates a `MemoryManager` instance (for persistence)
4. Loads `resources/soul.md` into memory
5. Loads `resources/tool_definitions.json` and extracts the `tools` array

### Message Processing Flow

```python
async def process_message(user_message, conversation_id) -> AsyncIterator[dict]:
```

This is an async generator that yields progress events as it works.

**Step 1: Build Messages Array**

For the MVP, start fresh each request:

```python
messages = [{"role": "user", "content": user_message}]
```

Future enhancement: load recent conversation history for multi-turn context.

**Step 2: Build System Prompt**

Assemble from three sources:

```
{soul.md contents}

## Current Context
{last 10 conversation turns from today's memory file}

## User Preferences
{JSON dump of learned/preferences.json}

## Instructions
You have access to tools for file operations, automation, and memory management.
Use them to help the user accomplish their tasks efficiently.
Always explain what you're doing and why.
For destructive operations, use dry_run first to preview changes.
Ask for confirmation before executing irreversible actions.
When you learn something about the user's preferences, store it using the store_memory tool.
```

**Step 3: Agent Loop (max 10 iterations)**

```
for iteration in range(1, 11):
    yield status("Thinking (iteration {iteration})...")

    # Send to org CLI
    response_content = []
    stop_reason = None

    async for chunk in cli.send_message(messages, tools, system):
        # Accumulate text blocks and tool_use blocks
        # Yield text_chunk events for streaming

    # Append assistant message to history
    messages.append({"role": "assistant", "content": response_content})

    if stop_reason == "end_turn":
        yield done(conversation_id)
        break

    elif stop_reason == "tool_use":
        tool_results = []
        for block in response_content where type == "tool_use":
            yield tool_start(block.name, block.input)
            result = await tool_executor.execute(block.name, block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result.content,
                "is_error": result.status == "error"
            })
            yield tool_complete(block.name, result.status)

        # Append tool results as user message
        messages.append({"role": "user", "content": tool_results})
        continue  # next iteration

    else:
        yield error(f"Unexpected stop reason: {stop_reason}")
        break

# After loop: store conversation
await memory.store_conversation(messages, conversation_id)
```

## Org CLI Wrapper

### Location

`agents/orchestrator/cli_wrapper.py`

### Responsibility

Wraps the org's internal Claude CLI as a subprocess. The wrapper:

1. Spawns the CLI binary as an async subprocess
2. Writes a JSON Messages API request to stdin
3. Reads streaming JSON chunks from stdout
4. Yields parsed chunks to the caller

### Interface

```python
class OrgCLIWrapper:
    def __init__(self, cli_path: str = "claude"):
        self.cli_path = cli_path

    async def send_message(
        self,
        messages: list[dict],
        tools: list[dict],
        system: str | None = None,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096
    ) -> AsyncIterator[dict]:
        """Yields streaming response chunks from Claude."""
```

### Request Format

The wrapper builds a standard Messages API request:

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "<system prompt>",
  "messages": [<conversation history>],
  "tools": [<tool definitions>],
  "stream": true
}
```

This JSON is written to the CLI's stdin, followed by a newline and EOF (stdin close).

### Response Parsing

The CLI outputs streaming chunks, one JSON object per line. The wrapper parses each line and yields the parsed dict. Key chunk types:

| Chunk type | Contains | What to do |
|---|---|---|
| `content_block_start` | `content_block.type == "text"` | Start accumulating text |
| `content_block_start` | `content_block.type == "tool_use"` | Start accumulating tool_use block (has `id` and `name`) |
| `content_block_delta` | `delta.type == "text_delta"` | Append `delta.text` to current text block |
| `content_block_delta` | `delta.type == "input_json_delta"` | Append `delta.partial_json` to tool input |
| `content_block_stop` | — | Close current block |
| `message_delta` | `delta.stop_reason` | Capture the stop reason |
| `message_stop` | — | End of message |

### Error Handling

- If the CLI process exits with a non-zero code, read stderr and raise an exception
- If the CLI fails to start (binary not found), raise with a clear error message
- If a line cannot be parsed as JSON, skip it (some CLIs output log lines)

### Important Notes

- The CLI path may vary by installation. It should be configurable in settings.
- The CLI flags (`--api-mode`, `--json`) are placeholders — the actual flags depend on the org's CLI implementation. The implementer must adapt to the specific CLI interface.
- The `model` parameter should also be configurable.

## Tool Executor

### Location

`agents/orchestrator/tool_executor.py`

### Responsibility

Routes `tool_use` blocks to the correct tool implementation and returns formatted results.

### Interface

```python
class ToolExecutor:
    def __init__(self, memory_path: str):
        self.file_tools = FileTools()
        self.automation_tools = AutomationTools()
        self.memory_tools = MemoryTools(memory_path)
        self.system_tools = SystemTools()

    async def execute(self, tool_name: str, tool_input: dict) -> dict:
        """Returns {"status": "success"|"error", "content": "<JSON string>"}"""
```

### Routing Table

| tool_name | Handler |
|---|---|
| `list_files` | `self.file_tools.list_files(**tool_input)` |
| `organize_files` | `self.file_tools.organize_files(**tool_input)` |
| `move_files` | `self.file_tools.move_files(**tool_input)` |
| `search_files` | `self.file_tools.search_files(**tool_input)` |
| `get_file_metadata` | `self.file_tools.get_metadata(**tool_input)` |
| `execute_automation` | `self.automation_tools.execute(**tool_input)` |
| `store_memory` | `self.memory_tools.store(**tool_input)` |
| `query_memory` | `self.memory_tools.query(**tool_input)` |
| unknown | Return error result |

### Result Format

The executor always returns a dict with `status` and `content` keys:

```json
{"status": "success", "content": "{\"count\": 15, \"files\": [...]}"}
{"status": "error", "content": "Tool execution failed: Permission denied"}
```

The `content` value is a JSON string that gets placed into the `tool_result` block sent back to Claude. On success, it's the JSON-serialized tool output. On error, it's a human-readable error message.

### Error Wrapping

Every tool execution is wrapped in try/except at the executor level. This prevents a single tool failure from crashing the entire agent loop. Failed tools return an error result, and Claude can adapt its plan based on the error message.

## Conversation State

### During a Request

The `messages` array is the conversation state. It grows as the agent loop executes:

1. Start: `[{role: "user", content: "..."}]`
2. After Claude responds: `+ [{role: "assistant", content: [text + tool_use blocks]}]`
3. After tool execution: `+ [{role: "user", content: [tool_result blocks]}]`
4. After Claude responds again: `+ [{role: "assistant", content: [...]}]`
5. Repeat until `end_turn`

### After a Request

The full messages array is stored via `MemoryManager.store_conversation()` as JSONL entries in `conversations/{date}.jsonl`.

### Across Requests (MVP)

For the MVP, each request starts fresh. The system prompt includes recent context from memory, but the messages array does not carry over between requests.

Future enhancement: load the last N turns from the same `conversation_id` to enable true multi-turn conversations.
