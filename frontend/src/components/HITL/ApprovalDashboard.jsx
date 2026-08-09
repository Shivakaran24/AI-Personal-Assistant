import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Clock, 
  Send, 
  RefreshCw, 
  AlertTriangle,
  FileText,
  User,
  Check,
  X,
  Sparkles,
  ChevronRight,
  Sliders
} from 'lucide-react';

import { wsService } from '../../services/websocket';
import { API_BASE } from '../../config/api.js';

export default function ApprovalDashboard() {
  const [pendingActions, setPendingActions] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ pending_count: 0, approved_count: 0, rejected_count: 0, edited_count: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  
  // Edit Modal State
  const [editingAction, setEditingAction] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovals();

    // Subscribe to real-time WebSocket push updates (< 1ms latency)
    const unsubscribe = wsService.on('hitl_queue_updated', (payload) => {
      console.log("⚡ [WebSocket Push] HITL Queue Updated:", payload);
      fetchApprovals();
    });

    return () => unsubscribe();
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const fetchApprovals = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      const [resPending, resHist] = await Promise.all([
        fetch(`${API_BASE}/api/approval/pending?t=${start}`),
        fetch(`${API_BASE}/api/approval/history?t=${start}`)
      ]);

      if (resPending.ok) {
        const dataP = await resPending.json();
        setPendingActions(dataP.pending_actions || []);
        setSummary(dataP.summary || {});
      }

      if (resHist.ok) {
        const dataH = await resHist.json();
        setHistory(dataH.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch HITL approvals:", err);
    } finally {
      const elapsed = Date.now() - start;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, delay);
    }
  };

  const [toast, setToast] = useState(null);

  const handleApprove = async (actionId, edits = null) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/approval/${actionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits })
      });
      if (res.ok) {
        const data = await res.json();
        const resObj = data.result || {};
        const atts = resObj.attendees || [];
        setToast({
          type: 'success',
          message: `⚡ Action Approved & Executed! HTML Email Invitation & Notification dispatched to: ${atts.join(', ') || 'recipients'}.`
        });
        setEditingAction(null);
        fetchApprovals();
      }
    } catch (err) {
      console.error("Approve action failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (actionId) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/approval/${actionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by user via HITL panel' })
      });
      if (res.ok) {
        fetchApprovals();
      }
    } catch (err) {
      console.error("Reject action failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (action) => {
    setEditingAction(action);
    setEditFields({ ...action.payload });
  };

  const handleSaveAndApprove = () => {
    if (editingAction) {
      handleApprove(editingAction.id, editFields);
    }
  };

  return (
    <div style={{ padding: '28px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                Human-in-the-Loop Action Approval Queue
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Review, edit parameters, approve, or reject sensitive outbound actions generated by AI Workers.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchApprovals}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: refreshing ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Queue'}</span>
        </button>
      </div>

      {/* Toast Notification Alert Box */}
      {toast && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '14px',
          padding: '14px 18px',
          color: '#34d399',
          fontWeight: 600,
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.2)'
        }}>
          <CheckCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Summary Telemetry Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fca5a5' }}>{summary.pending_count || 0}</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Approved & Sent</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{summary.approved_count || 0}</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <Edit3 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Edited Before Approval</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24' }}>{summary.edited_count || 0}</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(100, 116, 139, 0.08)',
          border: '1px solid rgba(100, 116, 139, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(100, 116, 139, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Rejected & Cancelled</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94a3b8' }}>{summary.rejected_count || 0}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', pb: '12px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            background: activeTab === 'pending' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'pending' ? '#a5b4fc' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Pending Approvals</span>
          {pendingActions.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
              {pendingActions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px 10px 0 0',
            background: activeTab === 'history' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'history' ? '#a5b4fc' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>Approval Audit Log</span>
        </button>
      </div>

      {/* Pending Actions View */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingActions.length === 0 ? (
            <div style={{
              padding: '60px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle size={40} color="#34d399" />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Actions Pending Approval</div>
              <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: 0 }}>
                All outbound emails, notifications, and event modifications have been processed or approved.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '18px' }}>
              {pendingActions.map(action => (
                <div
                  key={action.id}
                  style={{
                    background: 'rgba(18, 24, 38, 0.95)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '20px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #ef4444 0%, #f59e0b 100%)'
                  }} />

                  {/* Header Badge & Agent Info */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: action.action_type === 'create_event' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: action.action_type === 'create_event' ? '#e9d5ff' : '#fca5a5',
                      border: action.action_type === 'create_event' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                    }}>
                      ⚡ {action.action_type === 'create_event' ? 'CREATE EVENT' : action.action_type.replace('_', ' ').toUpperCase()}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={13} /> {action.created_at}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {action.title}
                    </h3>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-line' }}>
                      {action.description}
                    </p>
                  </div>

                  {/* Payload Details Box */}
                  <div style={{
                    background: 'rgba(10, 13, 20, 0.8)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.84rem'
                  }}>
                    {Object.entries(action.payload || {}).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                          {k.replace('_', ' ')}:
                        </span>
                        <span style={{ color: '#a5b4fc', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all', maxWidth: '240px' }}>
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px', pt: '6px' }}>
                    <button
                      onClick={() => handleApprove(action.id)}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Check size={16} />
                      <span>Approve & Send</span>
                    </button>

                    <button
                      onClick={() => openEditModal(action)}
                      disabled={submitting}
                      style={{
                        padding: '11px 16px',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#fbbf24',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Edit3 size={15} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleReject(action.id)}
                      disabled={submitting}
                      style={{
                        padding: '11px 16px',
                        borderRadius: '12px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#fca5a5',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={15} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Log / History View */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              No historical action records available yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map(item => {
                const isApproved = item.status === 'approved';
                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isApproved ? '#34d399' : '#fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isApproved ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ID: {item.id} | Action: {item.action_type} {item.was_edited ? '(Edited before approval)' : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isApproved ? '#34d399' : '#fca5a5'
                      }}>
                        {item.status.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {item.approved_at || item.rejected_at}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#121824',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#fbbf24" />
                Edit Action Parameters Before Approval
              </h3>
              <button
                onClick={() => setEditingAction(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Modify the fields below. Once submitted, the action will execute immediately with your edits.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '350px', overflowY: 'auto' }}>
              {Object.keys(editFields).map(key => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc', textTransform: 'capitalize' }}>
                    {key.replace('_', ' ')}
                  </label>
                  {key === 'body' || key === 'description' ? (
                    <textarea
                      rows={4}
                      value={editFields[key] || ''}
                      onChange={(e) => setEditFields({ ...editFields, [key]: e.target.value })}
                      style={{
                        background: 'rgba(10, 13, 20, 0.7)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'white',
                        fontSize: '0.88rem',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editFields[key] || ''}
                      onChange={(e) => setEditFields({ ...editFields, [key]: e.target.value })}
                      style={{
                        background: 'rgba(10, 13, 20, 0.7)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: 'white',
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setEditingAction(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleSaveAndApprove}
                disabled={submitting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                Save & Approve Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
