export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'tool_execution' | 'error';
  toolName?: string;
}

export interface AgentTextChunk {
  content: string;
}

export interface AgentToolEvent {
  tool_name: string;
  status: string;
  tool_input?: Record<string, unknown>;
}

export interface AgentError {
  message: string;
}

export type AgentStatus = 'idle' | 'thinking' | 'error';
export type ViewType = 'chat' | 'memory' | 'settings';
