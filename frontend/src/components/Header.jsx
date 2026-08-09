import React, { useState, useEffect } from 'react';
import { Settings, Cpu, LogOut, User as UserIcon, Bell, Mail, CheckCircle2, Clock, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { wsService } from '../services/websocket';
import { API_BASE } from '../config/api.js';

export default function Header({ selectedModel, onOpenSettings, activeTab, activeTabName }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time WebSocket push notifications (< 1ms latency)
    const unsub1 = wsService.on('notification_received', (data) => {
      console.log("⚡ [Header WS Push] Notification Received:", data);
      const newNotif = {
        id: `notif-${Date.now()}`,
        to: data.to || 'recipient',
        subject: data.subject || 'New Notification',
        body: data.body || 'You have received an update.',
        channel: data.channel || 'email',
        timestamp: data.timestamp || new Date().toLocaleTimeString(),
        unread: true
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(c => c + 1);
    });

    const unsub2 = wsService.on('hitl_queue_updated', (data) => {
      if (data.type === 'approved') {
        const action = data.action || {};
        const newNotif = {
          id: `hitl-${Date.now()}`,
          to: action.payload?.to || action.payload?.attendees || 'recipients',
          subject: `Approved: ${action.title || 'Action Executed'}`,
          body: `HITL action '${action.title}' was approved and dispatched to recipient(s).`,
          channel: 'email',
          timestamp: new Date().toLocaleTimeString(),
          unread: true
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(c => c + 1);
      }
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/email/notifications`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.notifications || []).map(n => ({
          ...n,
          unread: false
        }));
        setNotifications(list);
      }
    } catch (e) {
      console.error("Failed to fetch notification history:", e);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  return (
    <header className="top-header" style={{ position: 'relative' }}>
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

        {/* Real-time Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen && unreadCount > 0) markAllAsRead();
            }}
            style={{
              background: isOpen ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: unreadCount > 0 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)',
              color: unreadCount > 0 ? '#34d399' : 'var(--text-primary)',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            title="Notification Center"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                fontSize: '0.68rem',
                fontWeight: 800,
                borderRadius: '10px',
                padding: '1px 5px',
                border: '2px solid #0f172a'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Center Dropdown */}
          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: 0,
              width: '380px',
              maxHeight: '480px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#818cf8" />
                  <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>Real-time Notifications</strong>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                    <Mail size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p style={{ fontSize: '0.85rem' }}>No notifications received yet.</p>
                  </div>
                ) : (
                  notifications.map((n, idx) => (
                    <div
                      key={n.id || idx}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: n.unread ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: n.unread ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a5b4fc' }}>{n.subject}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{n.timestamp}</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '4px 0 6px 0', lineHeight: '1.4' }}>{n.body}</p>
                      <div style={{ fontSize: '0.72rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} />
                        <span>To: {Array.isArray(n.to) ? n.to.join(', ') : n.to}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
