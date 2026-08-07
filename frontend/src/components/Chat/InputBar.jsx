import React, { useState } from 'react';
import { Send, Paperclip, Wrench } from 'lucide-react';

export default function InputBar({ onSendMessage, loading, mcpEnabled, setMcpEnabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading || !text.trim()) return;
    onSendMessage(text, mcpEnabled);
    setText('');
  };

  return (
    <div className="input-container">
      <form onSubmit={handleSubmit}>
        <div className="input-box-wrapper">
          <button
            type="button"
            onClick={() => setMcpEnabled(!mcpEnabled)}
            style={{
              background: mcpEnabled ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: `1px solid ${mcpEnabled ? 'rgba(99, 102, 241, 0.4)' : 'transparent'}`,
              color: mcpEnabled ? '#a5b4fc' : 'var(--text-muted)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              marginRight: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem'
            }}
            title="Toggle MCP Protocol Tools"
          >
            <Wrench size={14} />
            <span>MCP Tools {mcpEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder="Ask a question or issue an MCP tool command (e.g. 'Summarize inbox', 'Run python code')..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />

          <button type="submit" className="send-btn" disabled={loading || !text.trim()}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
