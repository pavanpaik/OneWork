"""
Entry point for the Python agent system.

Reads JSON-RPC commands from stdin and writes JSON events to stdout.
For Phase 1, this is a simple echo implementation that demonstrates
the full communication pipeline: React -> Rust -> Python -> Rust -> React.
"""

import json
import sys


def emit(event: dict) -> None:
    """Write a JSON event to stdout (one line)."""
    print(json.dumps(event), flush=True)


def process_message(message: str) -> None:
    """Process a user message and emit response events."""
    emit({"type": "status", "content": "Processing..."})

    # Phase 1: Echo the message back
    response = f"Echo: {message}"
    emit({"type": "text_chunk", "content": response})
    emit({"type": "done", "conversation_id": None})


def main() -> None:
    """Main stdin/stdout JSON-RPC loop."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            emit({"type": "error", "content": f"Invalid JSON: {line}"})
            continue

        command = request.get("command")

        if command == "process_message":
            message = request.get("message", "")
            process_message(message)
        elif command == "shutdown":
            break
        else:
            emit({"type": "error", "content": f"Unknown command: {command}"})


if __name__ == "__main__":
    main()
