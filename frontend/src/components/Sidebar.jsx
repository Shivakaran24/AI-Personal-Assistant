import React from 'react';
import { MessageSquare, Wrench, Database, Code, Plus, Trash2, Calendar, Mail, ShieldAlert, Users, Sparkles, Activity } from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  conversations,
  currentConvId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  pendingCount = 0
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">⚡</div>
        <div>
          <div className="brand-title">Multi-Agent Assistant</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supervisor & HITL v2.0</div>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNewConversation}>
        <Plus size={16} />
        <span>New Conversation</span>
      </button>

      <nav className="sidebar-nav">
        <div 
          className={`nav-tab-item ${activeTab === 'landing' ? 'active' : ''}`}
          onClick={() => setActiveTab('landing')}
        >
          <Sparkles size={16} color="#a855f7" />
          <span>Landing Page</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          <span>Chat Workspace</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'approval' ? 'active' : ''}`}
          onClick={() => setActiveTab('approval')}
        >
          <ShieldAlert size={16} color={pendingCount > 0 ? '#fca5a5' : 'currentColor'} />
          <span>Supervisor & HITL</span>
          {pendingCount > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: '#ef4444',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: '10px'
            }}>
              {pendingCount}
            </span>
          )}
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={16} />
          <span>Calendar Agent</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          <Mail size={16} />
          <span>Email Agent</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'mcp' ? 'active' : ''}`}
          onClick={() => setActiveTab('mcp')}
        >
          <Wrench size={16} />
          <span>MCP Tools Registry</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'rag' ? 'active' : ''}`}
          onClick={() => setActiveTab('rag')}
        >
          <Database size={16} />
          <span>Knowledge Base (RAG)</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          <Code size={16} />
          <span>Code Artifact Viewer</span>
        </div>
        <div 
          className={`nav-tab-item ${activeTab === 'observability' ? 'active' : ''}`}
          onClick={() => setActiveTab('observability')}
        >
          <Activity size={16} color="#38bdf8" />
          <span>Observability & Metrics</span>
        </div>
      </nav>

      <div style={{ padding: '16px 20px 6px 20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Chat Sessions ({conversations.length})
      </div>

      <div className="session-list">
        {conversations.length === 0 ? (
          <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            No saved sessions yet.
          </div>
        ) : (
          conversations.map(c => (
            <div
              key={c.id}
              className={`session-item ${c.id === currentConvId ? 'active' : ''}`}
              onClick={() => onSelectConversation(c.id)}
            >
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                {c.title || 'Untitled Session'}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(c.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Delete Session"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
