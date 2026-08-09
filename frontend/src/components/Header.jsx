import React from 'react';
import { Settings, Cpu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ selectedModel, onOpenSettings, activeTab, activeTabName }) {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {activeTabName}
        </h2>
        <div className="status-badge">
          <div className="dot-indicator"></div>
          <span>MCP Client: Operational</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)'
        }}>
          <Cpu size={14} color="#a5b4fc" />
          <span>Provider: <strong style={{ color: '#c7d2fe' }}>{selectedModel.toUpperCase()}</strong></span>
        </div>

        <button 
          onClick={onOpenSettings}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-fast)'
          }}
          title="Settings & API Keys"
        >
          <Settings size={18} />
        </button>

        {user && (
          <div className="user-profile-badge">
            <div className="user-avatar" title={user.email}>
              {getInitials(user.name)}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
            </div>
            <button 
              onClick={logout} 
              className="logout-btn"
              title="Logout of session"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
