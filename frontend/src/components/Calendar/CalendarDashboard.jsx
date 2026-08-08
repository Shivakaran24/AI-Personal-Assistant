import React, { useState, useEffect } from 'react';
import InteractiveMeetingForm from './InteractiveMeetingForm';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Bell, 
  Zap, 
  RefreshCw, 
  Check, 
  X,
  Sparkles,
  Trash2,
  BarChart2,
  Clock,
  Search,
  AlertTriangle,
  ShieldAlert,
  CalendarCheck,
  UserCheck,
  UserX,
  UserMinus
} from 'lucide-react';

import { wsService } from '../../services/websocket';
import { API_BASE } from '../../config/api';

export default function CalendarDashboard() {
  const [metrics, setMetrics] = useState({
    total_events: 0,
    total_accepted: 0,
    total_rejected: 0,
    total_pending: 0,
    total_responses: 0,
    acceptance_rate: '0%'
  });
  const [events, setEvents] = useState([]);
  const [acceptedAttendees, setAcceptedAttendees] = useState([]);
  const [rejectedAttendees, setRejectedAttendees] = useState([]);
  const [pendingAttendees, setPendingAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [notificationToast, setNotificationToast] = useState(null);
  const [attendeeEmail, setAttendeeEmail] = useState('user@company.com');
  const [activeViewTab, setActiveViewTab] = useState('all'); // 'all' | 'accepted' | 'rejected'

  // Availability Checker state
  const [availDate, setAvailDate] = useState('');
  const [availTime, setAvailTime] = useState('');
  const [availChecking, setAvailChecking] = useState(false);
  const [availResult, setAvailResult] = useState(null);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time WebSocket push updates (< 1ms latency)
    const unsubRsvp = wsService.on('calendar_rsvp_updated', (data) => {
      console.log("⚡ [WebSocket Push] Calendar RSVP Updated:", data);
      fetchDashboardData();
    });

    const unsubHitl = wsService.on('hitl_queue_updated', (data) => {
      console.log("⚡ [WebSocket Push] HITL Event Approved/Queued:", data);
      fetchDashboardData();
    });

    return () => {
      unsubRsvp();
      unsubHitl();
    };
  }, []);

  const fetchDashboardData = async (manual = false) => {
    setLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/calendar/dashboard?t=${start}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.dashboard_metrics || {});
        setEvents(data.events || []);
        setAcceptedAttendees(data.accepted_attendees || []);
        setRejectedAttendees(data.rejected_attendees || []);
        setPendingAttendees(data.pending_attendees || []);
        if (manual) {
          setNotificationToast({
            action: 'refresh',
            event_title: 'Dashboard Metrics Refreshed',
            immediate: `Successfully re-synced ${(data.events || []).length} calendar events and latest RSVP records.`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch calendar dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAvailability = async () => {
    setAvailChecking(true);
    try {
      const params = new URLSearchParams();
      if (availDate) params.append('date', availDate);
      if (availTime) params.append('start_time', availTime);

      const res = await fetch(`${API_BASE}/api/calendar/availability?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAvailResult(data);
      }
    } catch (err) {
      console.error("Check availability error:", err);
    } finally {
      setAvailChecking(false);
    }
  };

  const handleCancelEvent = async (eventId) => {
    try {
      const res = await fetch(`${API_BASE}/api/calendar/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, action: 'cancel' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'pending_approval') {
          setNotificationToast({
            action: 'reject',
            event_title: `Cancellation Pending HITL Approval`,
            immediate: `Calendar event cancellation queued for Human-in-the-Loop review. Please approve in HITL Queue.`,
            timestamp: new Date().toLocaleTimeString()
          });
        } else {
          fetchDashboardData();
        }
      }
    } catch (err) {
      console.error("Cancel event error:", err);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/calendar/clear`, { method: 'DELETE' });
      if (res.ok) {
        setMetrics({
          total_events: 0,
          total_accepted: 0,
          total_rejected: 0,
          total_pending: 0,
          total_responses: 0,
          acceptance_rate: '0%'
        });
        setEvents([]);
        setAcceptedAttendees([]);
        setRejectedAttendees([]);
        setPendingAttendees([]);
        setNotificationToast({
          action: 'clear',
          event_title: 'Calendar History Cleared',
          immediate: 'All telemetry metrics and event history records have been completely reset to 0.',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      console.error("Clear history failed:", err);
    }
  };

  const handleRSVPResponse = async (eventId, action) => {
    setRespondingId(`${eventId}-${action}`);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          action: action,
          attendee: attendeeEmail || 'user@company.com'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.result || data;

        setNotificationToast({
          action: action,
          event_title: result.title || 'Calendar Event',
          immediate: result.immediate_notification || `Invitation for '${result.title}' marked as ${action.toUpperCase()}.`,
          reminder_30min: result.reminder_30min_prior,
          timestamp: new Date().toLocaleTimeString()
        });

        fetchDashboardData();
      }
    } catch (err) {
      console.error("RSVP action failed:", err);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div style={{ padding: '28px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', color: '#ffffff', letterSpacing: '-0.3px' }}>
            <CalendarIcon size={24} color="#a5b4fc" />
            Calendar Agent & RSVP Telemetry Workspace
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Interactive event scheduling, live RSVP response buttons, attendee status tracking (Accepted / Rejected), and availability checking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '7px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active RSVP Email:</label>
            <input 
              type="email" 
              value={attendeeEmail} 
              onChange={(e) => setAttendeeEmail(e.target.value)}
              placeholder="user@company.com"
              style={{ background: 'transparent', border: 'none', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 600, outline: 'none', width: '160px' }}
            />
          </div>

          <button 
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button 
            onClick={handleClearHistory}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Notification Toast Alert */}
      {notificationToast && (
        <div style={{
          background: notificationToast.action === 'accept' ? 'rgba(16, 185, 129, 0.12)' : notificationToast.action === 'reject' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(99, 102, 241, 0.12)',
          border: `1px solid ${notificationToast.action === 'accept' ? 'rgba(16, 185, 129, 0.35)' : notificationToast.action === 'reject' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: '0.88rem',
              fontWeight: 700,
              color: notificationToast.action === 'accept' ? '#34d399' : notificationToast.action === 'reject' ? '#fca5a5' : '#a5b4fc',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Zap size={16} />
              {notificationToast.event_title}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{notificationToast.timestamp}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.83rem', color: 'var(--text-primary)', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={14} color="#34d399" />
              <span><strong>Status:</strong> {notificationToast.immediate}</span>
            </div>

            {notificationToast.reminder_30min && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc' }}>
                <Bell size={14} />
                <span><strong>30-Min Prior Notification:</strong> {notificationToast.reminder_30min}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive 11-Field Meeting Collector Form & Time Slot Picker */}
      <InteractiveMeetingForm onSubmitted={() => fetchDashboardData(true)} />

      {/* Top Telemetry Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div 
          onClick={() => setActiveViewTab(activeViewTab === 'accepted' ? 'all' : 'accepted')}
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: activeViewTab === 'accepted' ? '2px solid #34d399' : '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Who Accepted</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{metrics.total_accepted || 0}</div>
          </div>
        </div>

        <div 
          onClick={() => setActiveViewTab(activeViewTab === 'rejected' ? 'all' : 'rejected')}
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: activeViewTab === 'rejected' ? '2px solid #fca5a5' : '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5' }}>
            <UserX size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Who Rejected</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fca5a5' }}>{metrics.total_rejected || 0}</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Responses</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>{(metrics.total_accepted || 0) + (metrics.total_rejected || 0)}</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Acceptance Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a5b4fc' }}>{metrics.acceptance_rate || '0%'}</div>
          </div>
        </div>
      </div>

      {/* DEDICATED RSVP ATTENDEE LIST (WHO ACCEPTED & WHO REJECTED) */}
      <div style={{
        background: 'rgba(18, 24, 38, 0.95)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#a5b4fc" />
            Attendees RSVP Response Status breakdown
          </h3>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveViewTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: activeViewTab === 'all' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: activeViewTab === 'all' ? '1px solid #6366f1' : '1px solid var(--border-color)',
                color: activeViewTab === 'all' ? '#a5b4fc' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              All Attendees
            </button>
            <button
              onClick={() => setActiveViewTab('accepted')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: activeViewTab === 'accepted' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                border: activeViewTab === 'accepted' ? '1px solid #10b981' : '1px solid var(--border-color)',
                color: activeViewTab === 'accepted' ? '#34d399' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <UserCheck size={14} />
              <span>Who Accepted ({acceptedAttendees.length})</span>
            </button>
            <button
              onClick={() => setActiveViewTab('rejected')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: activeViewTab === 'rejected' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                border: activeViewTab === 'rejected' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                color: activeViewTab === 'rejected' ? '#fca5a5' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <UserX size={14} />
              <span>Who Rejected ({rejectedAttendees.length})</span>
            </button>
          </div>
        </div>

        {/* Breakdown Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Accepted Column */}
          {(activeViewTab === 'all' || activeViewTab === 'accepted') && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} />
                <span>ACCEPTED RECEIVERS ({acceptedAttendees.length})</span>
              </div>

              {acceptedAttendees.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                  No receivers have accepted yet.
                </div>
              ) : (
                acceptedAttendees.map((att, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={14} color="#34d399" />
                        {att.attendee}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600, background: 'rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                        ACCEPTED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Event: <strong>{att.event_title}</strong> ({att.date} at {att.time})
                    </div>
                    {att.responded_at && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Responded: {att.responded_at}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Rejected Column */}
          {(activeViewTab === 'all' || activeViewTab === 'rejected') && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserX size={16} />
                <span>REJECTED RECEIVERS ({rejectedAttendees.length})</span>
              </div>

              {rejectedAttendees.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                  No receivers have rejected yet.
                </div>
              ) : (
                rejectedAttendees.map((att, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <X size={14} color="#fca5a5" />
                        {att.attendee}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 600, background: 'rgba(239, 68, 68, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                        REJECTED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      Event: <strong>{att.event_title}</strong> ({att.date} at {att.time})
                    </div>
                    {att.responded_at && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Responded: {att.responded_at}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Availability Checker Section */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarCheck size={20} color="#34d399" />
          Calendar Availability & Free Slot Checker
        </h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Date</label>
            <input
              type="text"
              placeholder="e.g. 2026-08-10 or 'tomorrow'"
              value={availDate}
              onChange={(e) => setAvailDate(e.target.value)}
              style={{ background: 'rgba(10, 13, 20, 0.7)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px', color: 'white', fontSize: '0.85rem', width: '200px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Start Time (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 09:00 AM"
              value={availTime}
              onChange={(e) => setAvailTime(e.target.value)}
              style={{ background: 'rgba(10, 13, 20, 0.7)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px', color: 'white', fontSize: '0.85rem', width: '160px', outline: 'none' }}
            />
          </div>

          <button
            onClick={handleCheckAvailability}
            disabled={availChecking}
            style={{
              marginTop: '18px',
              padding: '9px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            <Search size={15} />
            <span>Check Availability</span>
          </button>
        </div>

        {availResult && (
          <div style={{
            background: availResult.is_available ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${availResult.is_available ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: availResult.is_available ? '#34d399' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {availResult.is_available ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {availResult.summary}
              </span>
            </div>

            {availResult.suggested_free_slots && availResult.suggested_free_slots.length > 0 && (
              <div style={{ fontSize: '0.83rem', color: '#a5b4fc', marginTop: '4px' }}>
                <strong>Open Suggested Free Slots:</strong> {availResult.suggested_free_slots.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Events List & Event Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={18} color="#a5b4fc" />
          Scheduled Events & Interactive RSVP Controls ({events.length})
        </h3>

        {events.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            No scheduled events recorded yet. Use the Chat Assistant or Calendar tools to schedule a meeting.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '18px' }}>
            {events.map((evt) => {
              const isCanceled = evt.calendar_status === 'canceled';
              const rsvps = evt.rsvps || {};

              const accAttendees = Object.entries(rsvps).filter(([_, r]) => r.status === 'accepted').map(([att]) => att);
              const rejAttendees = Object.entries(rsvps).filter(([_, r]) => r.status === 'rejected').map(([att]) => att);
              const penAttendees = Object.entries(rsvps).filter(([_, r]) => r.status === 'pending').map(([att]) => att);

              return (
                <div 
                  key={evt.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '18px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    opacity: isCanceled ? 0.6 : 1
                  }}
                >
                  {/* Event Title & Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>{evt.title}</h4>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: isCanceled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                      color: isCanceled ? '#fca5a5' : '#34d399',
                      fontWeight: 700
                    }}>
                      {(evt.calendar_status || 'Confirmed').toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <span>📅 {evt.date}</span>
                    <span>⏰ {evt.start_time} ({evt.duration_minutes || 30} mins)</span>
                  </div>

                  {/* Attendee Badges Breakdown */}
                  <div style={{
                    background: 'rgba(10, 13, 20, 0.6)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {accAttendees.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>Accepted ({accAttendees.length}):</span>
                        {accAttendees.map(att => (
                          <span key={att} style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            ✓ {att}
                          </span>
                        ))}
                      </div>
                    )}

                    {rejAttendees.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5' }}>Rejected ({rejAttendees.length}):</span>
                        {rejAttendees.map(att => (
                          <span key={att} style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            ✗ {att}
                          </span>
                        ))}
                      </div>
                    )}

                    {penAttendees.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>Pending ({penAttendees.length}):</span>
                        {penAttendees.map(att => (
                          <span key={att} style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            ⏳ {att}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Buttons */}
                  {!isCanceled && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        onClick={() => handleRSVPResponse(evt.id, 'accept')}
                        disabled={respondingId === `${evt.id}-accept`}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                          transition: 'transform 0.1s ease'
                        }}
                      >
                        <Check size={16} />
                        <span>Accept Invitation</span>
                      </button>

                      <button
                        onClick={() => handleRSVPResponse(evt.id, 'reject')}
                        disabled={respondingId === `${evt.id}-reject`}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#fca5a5',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'transform 0.1s ease'
                        }}
                      >
                        <X size={16} />
                        <span>Reject Invitation</span>
                      </button>

                      <button
                        onClick={() => handleCancelEvent(evt.id)}
                        title="Cancel Event (Triggers HITL Review)"
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fbbf24',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <ShieldAlert size={16} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
