import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import MessageList from './MessageList';
import InputBox from './InputBox';
import type { Message, AgentTextChunk, AgentToolEvent, AgentError } from '../../types';

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const listeners = [
      listen<AgentTextChunk>('agent-text-chunk', (event) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.type === 'text') {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + event.payload.content,
            };
            return updated;
          }
          return [
            ...prev,
            {
              role: 'assistant',
              content: event.payload.content,
              timestamp: new Date().toISOString(),
              type: 'text',
            },
          ];
        });
      }),
      listen<AgentToolEvent>('agent-tool-execution', (event) => {
        const { tool_name, status } = event.payload;
        setMessages((prev) => [
          ...prev,
          {
            role: 'system',
            content: `Tool: ${tool_name} — ${status}`,
            timestamp: new Date().toISOString(),
            type: 'tool_execution',
            toolName: tool_name,
          },
        ]);
      }),
      listen('agent-done', () => {
        setIsProcessing(false);
      }),
      listen<AgentError>('agent-error', (event) => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'system',
            content: event.payload.message,
            timestamp: new Date().toISOString(),
            type: 'error',
          },
        ]);
        setIsProcessing(false);
      }),
    ];

    return () => {
      listeners.forEach((p) => p.then((fn) => fn()));
    };
  }, []);

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim() || isProcessing) return;

      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
          type: 'text',
        },
      ]);
      setIsProcessing(true);

      try {
        await invoke('send_message', { message });
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'system',
            content: `Error: ${err}`,
            timestamp: new Date().toISOString(),
            type: 'error',
          },
        ]);
        setIsProcessing(false);
      }
    },
    [isProcessing],
  );

  return (
    <div className="chat-interface">
      <MessageList messages={messages} />
      <InputBox onSend={handleSend} disabled={isProcessing} />
    </div>
  );
}

export default ChatInterface;
