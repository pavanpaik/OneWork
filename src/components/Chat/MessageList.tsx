import { useEffect, useRef } from 'react';
import MessageComponent from './Message';
import type { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
}

function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-state">
          <h2>Welcome to OneWork</h2>
          <p>Your AI-powered desktop automation assistant.</p>
          <p>Type a message to get started.</p>
        </div>
      )}
      {messages.map((msg, index) => (
        <MessageComponent key={index} {...msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export default MessageList;
