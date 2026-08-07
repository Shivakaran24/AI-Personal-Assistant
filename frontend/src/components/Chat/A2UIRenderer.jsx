import React from 'react';
import InteractiveMeetingForm from '../Calendar/InteractiveMeetingForm';
import InteractiveEventForm from '../Calendar/InteractiveEventForm';
import { Mail, Calendar, Terminal, Sun, Github, Search, Folder, FileText, CheckCircle, ShieldAlert } from 'lucide-react';

export default function A2UIRenderer({ payload, fallbackMessage }) {
  if (!payload && !fallbackMessage) return null;

  let targetPayload = payload;
  if (typeof payload === 'string') {
    try {
      targetPayload = JSON.parse(payload);
    } catch (e) {
      console.warn("A2UI Payload is not valid JSON string", e);
    }
  }

  // 1. Direct A2UI Protocol Payload Handling
  if (targetPayload && targetPayload.component) {
    const props = targetPayload.props || {};

    switch (targetPayload.component) {
      case 'InteractiveMeetingCollector':
        return (
          <div className="a2ui-container" style={{ marginTop: '14px', animation: 'a2uiPulseScale 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            <style>{`
              @keyframes a2uiPulseScale {
                0% { opacity: 0; transform: scale(0.94) translateY(12px); filter: blur(4px); }
                70% { transform: scale(1.01) translateY(-2px); filter: blur(0px); }
                100% { opacity: 1; transform: scale(1) translateY(0px); }
              }
            `}</style>
            <InteractiveMeetingForm 
              initialData={{
                person: props.person || 'Contact',
                email: props.email || 'contact@company.com',
                date: props.date || '',
                time: props.time || '3:00 PM',
                duration: props.duration || 30,
                timezone: props.timezone || 'IST (UTC+5:30)',
                meeting_type: props.meeting_type || 'Virtual (Google Meet)',
                title: props.title || '',
                location: props.location || 'Google Meet Video Call',
                description: props.description || ''
              }}
            />
          </div>
        );

      case 'InteractiveEventCollector':
        return (
          <div className="a2ui-container" style={{ marginTop: '14px' }}>
            <InteractiveEventForm 
              initialData={{
                title: props.title || 'New Event',
                date: props.date || '',
                start_time: props.start_time || '06:00 PM',
                end_time: props.end_time || '07:00 PM',
                duration: props.duration || 60,
                category: props.category || 'Work Event',
                location: props.location || 'Google Meet Video Call',
                attendees: props.attendees || [],
                description: props.description || ''
              }}
            />
          </div>
        );

      case 'EventConfirmationCard':
        return (
          <div className="a2ui-card a2ui-event-confirmation" style={{ marginTop: '14px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.9))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(129, 140, 248, 0.4)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="#ffffff" />
                </div>
                <div>
                  <h4 style={{ color: '#f8fafc', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{props.title || 'Event Confirmation'}</h4>
                  <span style={{ fontSize: '0.78rem', color: '#a5b4fc' }}>📅 {props.date} • ⏰ {props.start_time} - {props.end_time || '4:00 PM'} ({props.duration || '1 hour'})</span>
                </div>
              </div>
              <span style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#34d399', padding: '4px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle size={12} /> Ready to Create
              </span>
            </div>

            <div style={{ background: 'rgba(2, 6, 23, 0.6)', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <span style={{ color: '#818cf8', fontWeight: 600, minWidth: '85px' }}>📍 Location:</span>
                <span>{props.location || 'Google Meet Video Call'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                <span style={{ color: '#818cf8', fontWeight: 600, minWidth: '85px' }}>👥 Attendees:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {props.attendees?.map((att, idx) => (
                    <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.18)', border: '1px solid rgba(99, 102, 241, 0.35)', color: '#c7d2fe', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                      👤 {typeof att === 'object' ? `${att.name} (${att.email})` : att}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => alert(`Event "${props.title}" successfully confirmed & scheduled!`)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }}
              >
                <CheckCircle size={15} />
                <span>Confirm & Create Event</span>
              </button>
            </div>
          </div>
        );

      case 'InteractiveDataTable':
        return (
          <div className="a2ui-card a2ui-data-table" style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99, 102, 241, 0.35)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
            {props.title && (
              <h4 style={{ color: '#a5b4fc', marginBottom: '12px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#818cf8" />
                <span>{props.title}</span>
              </h4>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', color: '#c7d2fe' }}>
                    {props.columns?.map((col, idx) => (
                      <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.rows?.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#f8fafc' }}>
                      {props.columns?.map((col, cIdx) => (
                        <td key={cIdx} style={{ padding: '8px 12px' }}>{String(row[col] || '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'EmailInboxViewer':
        return (
          <div className="a2ui-card a2ui-inbox" style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <h4 style={{ color: '#a5b4fc', marginBottom: '12px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="#818cf8" />
              <span>{props.title || 'Gmail Inbox'}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {props.emails?.map((em, idx) => (
                <div key={idx} style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>{em.subject}</div>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>From: {em.sender} • {em.date}</div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px' }}>{em.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'PythonExecutionCard':
        return (
          <div className="a2ui-card a2ui-python" style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(52, 211, 153, 0.35)' }}>
            <h4 style={{ color: '#34d399', marginBottom: '10px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={16} color="#34d399" />
              <span>Python Execution Result ({props.status?.toUpperCase()})</span>
            </h4>
            {props.stdout && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Standard Output:</div>
                <pre style={{ background: 'rgba(2, 6, 23, 0.7)', padding: '10px', borderRadius: '8px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.82rem', overflowX: 'auto', marginTop: '4px' }}>{props.stdout}</pre>
              </div>
            )}
            {props.stderr && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '0.74rem', color: '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>Error Output:</div>
                <pre style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', color: '#fca5a5', fontFamily: 'monospace', fontSize: '0.82rem', overflowX: 'auto', marginTop: '4px' }}>{props.stderr}</pre>
              </div>
            )}
          </div>
        );

      case 'WeatherCard':
        return (
          <div className="a2ui-card a2ui-weather" style={{ marginTop: '14px', background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.8))', borderRadius: '14px', padding: '18px', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
            <h4 style={{ color: '#38bdf8', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sun size={20} color="#38bdf8" />
              <span>Weather for {props.location}</span>
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginTop: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Temperature</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>{props.temperature}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Condition</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>{props.condition}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Wind Speed</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>{props.wind}</div>
              </div>
            </div>
          </div>
        );

      case 'GitHubReposCard':
        return (
          <div className="a2ui-card a2ui-github" style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(168, 85, 247, 0.35)' }}>
            <h4 style={{ color: '#c084fc', marginBottom: '12px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Github size={18} color="#c084fc" />
              <span>GitHub Repositories ({props.owner})</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {props.repos?.map((r, idx) => (
                <div key={idx} style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.86rem' }}>{r.name}</div>
                  <div style={{ fontSize: '0.76rem', color: '#a5b4fc' }}>{r.language} • ⭐ {r.stars}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'SearchResultsCard':
        return (
          <div className="a2ui-card a2ui-search" style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
            <h4 style={{ color: '#38bdf8', marginBottom: '12px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} color="#38bdf8" />
              <span>Web Search Results for "{props.query}"</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {props.results?.slice(0, 5).map((res, idx) => (
                <div key={idx} style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '10px 14px', borderRadius: '8px' }}>
                  <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>{idx + 1}. {res.title}</a>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>{res.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'CalendarEventsListCard':
        return (
          <div className="a2ui-card a2ui-calendar-events" style={{ marginTop: '14px', background: 'rgba(15, 23, 42, 0.85)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <h4 style={{ color: '#a5b4fc', marginBottom: '12px', fontSize: '0.94rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#818cf8" />
              <span>Upcoming Schedule (Next {props.days || 7} Days)</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {props.events?.map((ev, idx) => (
                <div key={idx} style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '10px 14px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.86rem' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>⏰ {ev.start} ({ev.duration})</div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        break;
    }
  }

  // 2. Fallback Heuristic Inspection for legacy assistant message strings
  if (fallbackMessage && typeof fallbackMessage === 'string') {
    const isEventContent = 
      fallbackMessage.includes('Interactive Event Form') ||
      fallbackMessage.includes('Interactive Event Creator Form') ||
      fallbackMessage.includes('Interactive Event');

    if (isEventContent) {
      return (
        <div className="a2ui-container-fallback" style={{ marginTop: '14px' }}>
          <InteractiveEventForm 
            initialData={{
              title: 'New Event',
              date: '',
              start_time: '06:00 PM'
            }}
          />
        </div>
      );
    }

    const isMeetingContent = 
      fallbackMessage.includes('Interactive Meeting Form') ||
      fallbackMessage.includes('Interactive Meeting') ||
      fallbackMessage.includes('Meeting Options') ||
      fallbackMessage.includes('Time Slots') ||
      fallbackMessage.includes('time slot') ||
      fallbackMessage.includes('open slot') ||
      fallbackMessage.includes('Meeting Information Checklist') ||
      fallbackMessage.includes('calendar_create_event') ||
      fallbackMessage.includes('calendar_schedule_meeting') ||
      fallbackMessage.includes('calendar_check_availability') ||
      fallbackMessage.includes('Meeting Request Pending') ||
      fallbackMessage.toLowerCase().includes('schedule a meet') ||
      fallbackMessage.toLowerCase().includes('schedule a meeting') ||
      fallbackMessage.toLowerCase().includes('schedule meeting') ||
      fallbackMessage.toLowerCase().includes('schedule it') ||
      fallbackMessage.toLowerCase().includes('interactive meeting form');

    if (isMeetingContent) {
      const match = fallbackMessage.match(/for\s+\*\*([^*]+)\*\*/i) || fallbackMessage.match(/Person\s*\|\s*([^|\n]+)/i) || fallbackMessage.match(/Meeting with\s+([A-Za-z0-9\._\s-]+)/i);
      let p = match && match[1] ? match[1].replace(/[`*]/g, '').trim() : "Karan";
      if (p.toLowerCase().startsWith('with ')) p = p.slice(5).trim();

      const emMatch = fallbackMessage.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      const email = emMatch ? emMatch[0] : `${p.toLowerCase()}@company.com`;

      return (
        <div className="a2ui-container-fallback" style={{ marginTop: '14px' }}>
          <InteractiveMeetingForm 
            initialData={{
              person: p,
              email: email
            }}
          />
        </div>
      );
    }
  }

  return null;
}
