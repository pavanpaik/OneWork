"""
JSON-RPC message types for the Rust <-> Python communication protocol.

All messages are newline-delimited JSON objects on stdin/stdout.
"""

import json
from dataclasses import dataclass, asdict
from typing import Optional, Any


# -- Inbound (Rust -> Python via stdin) --

@dataclass
class ProcessMessageRequest:
    """Request to process a user message."""
    command: str  # "process_message"
    message: str


@dataclass
class ShutdownRequest:
    """Request to shut down the agent."""
    command: str  # "shutdown"


# -- Outbound (Python -> Rust via stdout) --

@dataclass
class StatusEvent:
    """Agent status update."""
    type: str = "status"
    content: str = ""


@dataclass
class TextChunkEvent:
    """Streaming text chunk from the assistant."""
    type: str = "text_chunk"
    content: str = ""


@dataclass
class ToolStartEvent:
    """Notification that a tool is starting execution."""
    type: str = "tool_start"
    tool_name: str = ""
    tool_input: Optional[dict[str, Any]] = None


@dataclass
class ToolCompleteEvent:
    """Notification that a tool finished execution."""
    type: str = "tool_complete"
    tool_name: str = ""
    status: str = "success"


@dataclass
class DoneEvent:
    """Signals that the response is complete."""
    type: str = "done"
    conversation_id: Optional[str] = None


@dataclass
class ErrorEvent:
    """Signals an error."""
    type: str = "error"
    content: str = ""


def serialize(event: Any) -> str:
    """Serialize an event dataclass to a JSON string."""
    return json.dumps(asdict(event))


def parse_request(line: str) -> dict:
    """Parse a JSON-RPC request line."""
    return json.loads(line)
