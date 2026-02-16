import type { Message } from '../../types';

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageComponent({ role, content, timestamp, type, toolName }: Message) {
  const className = [
    'message',
    `message-${role}`,
    type === 'tool_execution' ? 'message-tool' : '',
    type === 'error' ? 'message-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="message-bubble">
        {type === 'tool_execution' && toolName && (
          <span className="tool-badge">{toolName}</span>
        )}
        <div className="message-content">{content}</div>
        <span className="message-time">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}

export default MessageComponent;
