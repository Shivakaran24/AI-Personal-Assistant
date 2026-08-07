import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  FileText, 
  Bell, 
  Inbox, 
  Search, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Sparkles,
  User,
  ShieldAlert,
  Edit3
} from 'lucide-react';

export default function EmailDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('inbox'); // 'inbox' | 'compose' | 'drafts' | 'notifications'
  
  // Inbox state
  const [emails, setEmails] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxQuery, setInboxQuery] = useState('');

  // Drafts state
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  // Notifications log state
  const [notifications, setNotifications] = useState([]);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    fetchInbox();
    fetchDrafts();
    fetchNotifications();
  }, []);

  const fetchInbox = async () => {
    setInboxLoading(true);
    const start = Date.now();
    try {
      const q = inboxQuery ? encodeURIComponent(inboxQuery) : 'all';
      const res = await fetch(`/api/email/inbox?query=${q}&limit=10&t=${start}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (err) {
      console.error("Fetch inbox error:", err);
    } finally {
      setInboxLoading(false);
    }
  };

  const fetchDrafts = async () => {
    setDraftsLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(`/api/email/drafts?t=${start}`);
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (err) {
      console.error("Fetch drafts error:", err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/email/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  const handleSaveDraft = async () => {
    if (!composeTo || !composeBody) return;
    setSending(true);
    try {
      const res = await fetch('/api/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject || 'Draft Message',
          body: composeBody
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSendResult({
          type: 'success',
          message: `Draft created for '${composeTo}' and saved to Drafts.`
        });
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        fetchDrafts();
      }
    } catch (err) {
      console.error("Save draft error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeBody) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject || 'Update from Email Agent',
          body: composeBody
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'pending_approval') {
          setSendResult({
            type: 'hitl',
            message: `Outbound email queued for Human-in-the-Loop review! Please approve or edit in the HITL Approval Queue.`
          });
        } else {
          setSendResult({
            type: 'success',
            message: data.message || `Email sent successfully to '${composeTo}'.`
          });
        }
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
      }
    } catch (err) {
      setSendResult({
        type: 'error',
        message: `Failed to send email: ${err.message}`
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      const res = await fetch(`/api/email/drafts/${draftId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDrafts();
      }
    } catch (err) {
      console.error("Delete draft error:", err);
    }
  };

  return (
    <div style={{ padding: '28px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Mail size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
              Email & Communication Agent Workspace
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Manages inbox communication, drafts messages, and dispatches notifications with Human-in-the-Loop review.
            </p>
          </div>
        </div>

        <button
          onClick={() => { setActiveSubTab('compose'); setSendResult(null); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            border: 'none',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)'
          }}
        >
          <Plus size={16} />
          <span>Draft New Email</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', pb: '12px' }}>
        <button
          onClick={() => setActiveSubTab('inbox')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            background: activeSubTab === 'inbox' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'inbox' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeSubTab === 'inbox' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Inbox size={16} />
          <span>Inbox & Communication</span>
        </button>

        <button
          onClick={() => setActiveSubTab('compose')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            background: activeSubTab === 'compose' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'compose' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeSubTab === 'compose' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Edit3 size={16} />
          <span>Draft Composer</span>
        </button>

        <button
          onClick={() => setActiveSubTab('drafts')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            background: activeSubTab === 'drafts' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'drafts' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeSubTab === 'drafts' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} />
          <span>Saved Drafts ({drafts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notifications')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            background: activeSubTab === 'notifications' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeSubTab === 'notifications' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeSubTab === 'notifications' ? '#38bdf8' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Bell size={16} />
          <span>Notifications Outbox</span>
        </button>
      </div>

      {/* 1. INBOX TAB */}
      {activeSubTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '8px 14px'
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search inbox messages by keyword, subject, or sender..."
                value={inboxQuery}
                onChange={(e) => setInboxQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchInbox()}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.88rem', outline: 'none', width: '100%' }}
              />
            </div>

            <button
              onClick={fetchInbox}
              disabled={inboxLoading}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} style={{ animation: inboxLoading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Fetch Inbox</span>
            </button>
          </div>

          {/* Email Messages List */}
          {emails.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              No messages found in inbox. Configure `EMAIL_USER` & `EMAIL_PASSWORD` in `backend/.env` for live IMAP fetch.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {emails.map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                      {msg.subject}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{msg.date}</span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#a5b4fc', fontWeight: 600 }}>
                    From: {msg.sender}
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                    {msg.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. DRAFT COMPOSER TAB */}
      {activeSubTab === 'compose' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#38bdf8" />
            Email Message Composer (With HITL Review Protection)
          </h3>

          {sendResult && (
            <div style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: sendResult.type === 'hitl' ? 'rgba(245, 158, 11, 0.15)' : sendResult.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${sendResult.type === 'hitl' ? 'rgba(245, 158, 11, 0.4)' : sendResult.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: sendResult.type === 'hitl' ? '#fbbf24' : sendResult.type === 'success' ? '#34d399' : '#fca5a5',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {sendResult.type === 'hitl' ? <ShieldAlert size={18} /> : sendResult.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{sendResult.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a5b4fc' }}>Recipient Email Address *</label>
              <input
                type="email"
                placeholder="e.g. client@company.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                style={{ background: 'rgba(10, 13, 20, 0.7)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', color: 'white', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a5b4fc' }}>Subject Line</label>
              <input
                type="text"
                placeholder="e.g. Project Proposal & Meeting Confirmation"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                style={{ background: 'rgba(10, 13, 20, 0.7)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', color: 'white', fontSize: '0.88rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a5b4fc' }}>Email Message Content Body *</label>
              <textarea
                rows={6}
                placeholder="Type your message content here..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                style={{ background: 'rgba(10, 13, 20, 0.7)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', color: 'white', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              onClick={handleSaveDraft}
              disabled={sending || !composeTo || !composeBody}
              style={{
                padding: '11px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={16} />
              <span>Save to Drafts</span>
            </button>

            <button
              onClick={handleSendEmail}
              disabled={sending || !composeTo || !composeBody}
              style={{
                padding: '11px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                border: 'none',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.35)'
              }}
            >
              <Send size={16} />
              <span>Send Message (With HITL Review)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. DRAFTS TAB */}
      {activeSubTab === 'drafts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {drafts.length === 0 ? (
            <div style={{ padding: '50px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              No email drafts saved. Create drafts in the Composer.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {drafts.map(d => (
                <div
                  key={d.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      DRAFT
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.created_at}</span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{d.subject}</h4>
                    <div style={{ fontSize: '0.82rem', color: '#38bdf8', marginTop: '2px' }}>To: {d.to}</div>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', background: 'rgba(10, 13, 20, 0.6)', padding: '10px 12px', borderRadius: '8px', margin: 0 }}>
                    {d.body}
                  </p>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      onClick={() => handleDeleteDraft(d.id)}
                      style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '6px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setComposeTo(d.to);
                        setComposeSubject(d.subject);
                        setComposeBody(d.body);
                        setActiveSubTab('compose');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Open in Composer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. NOTIFICATIONS TAB */}
      {activeSubTab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              No notification alerts sent yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bell size={20} color="#34d399" />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{n.subject}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To: {n.to} | Channel: {n.channel}</div>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '8px', fontWeight: 600 }}>
                    SENT ({n.dispatched_at})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
