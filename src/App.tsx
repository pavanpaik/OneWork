import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import ChatInterface from './components/Chat/ChatInterface';
import type { AgentStatus, ViewType } from './types';

function App() {
  const [view, setView] = useState<ViewType>('chat');
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');

  useEffect(() => {
    const unlisten = listen<string>('agent-status', (event) => {
      setAgentStatus(event.payload as AgentStatus);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const statusColor =
    agentStatus === 'idle'
      ? '#4caf50'
      : agentStatus === 'thinking'
        ? '#2196f3'
        : '#f44336';

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">OneWork</h1>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-button ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            Chat
          </button>
          <button
            className={`nav-button ${view === 'memory' ? 'active' : ''}`}
            onClick={() => setView('memory')}
          >
            Memory
          </button>
          <button
            className={`nav-button ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="status-indicator">
            <span
              className={`status-dot ${agentStatus === 'thinking' ? 'pulsing' : ''}`}
              style={{ backgroundColor: statusColor }}
            />
            <span className="status-text">{agentStatus}</span>
          </div>
        </div>
      </aside>
      <main className="content">
        {view === 'chat' && <ChatInterface />}
        {view === 'memory' && (
          <div className="placeholder-view">
            <h2>Memory Viewer</h2>
            <p>Coming in Phase 3</p>
          </div>
        )}
        {view === 'settings' && (
          <div className="placeholder-view">
            <h2>Settings</h2>
            <p>Coming in Phase 4</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
