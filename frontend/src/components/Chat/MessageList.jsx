import React, { useState } from 'react';
import { API_BASE } from '../../config/api';
import ToolCallBadge from './ToolCallBadge';
import InteractiveMeetingForm from '../Calendar/InteractiveMeetingForm';
import A2UIRenderer from './A2UIRenderer';
import { Bot, User, Sparkles, Download, FileText, ExternalLink, Globe, Link2, Calendar, Check, X, Bell, Clock } from 'lucide-react';

export default function MessageList({ messages, loading, onQuickStarterSelect }) {
  const [rsvpFeedback, setRsvpFeedback] = useState({});
  const [respondingId, setRespondingId] = useState(null);

  const handleMessageRSVP = async (eventId, eventTitle, action) => {
    setRespondingId(`${eventId}-${action}`);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          action: action,
          attendee: 'user@company.com'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const result = data.result || data;
        setRsvpFeedback(prev => ({
          ...prev,
          [eventId]: {
            action,
            eventTitle,
            immediate: result.immediate_notification,
            reminder30min: result.reminder_30min_prior,
            time: new Date().toLocaleTimeString()
          }
        }));
      }
    } catch (err) {
      console.error("Chat RSVP failed:", err);
    } finally {
      setRespondingId(null);
    }
  };

  const extractCalendarEvents = (message) => {
    const events = [];
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      message.tool_calls.forEach(tc => {
        const res = tc.result || {};
        if (tc.name === 'calendar_create_event' && (res.event_id || res.title)) {
          events.push({
            id: res.event_id || 'evt-201',
            title: res.title || 'Calendar Event',
            date: res.date || '',
            start_time: res.start_time || '',
            attendees: res.attendees || []
          });
        } else if (tc.name === 'calendar_list_events' && Array.isArray(res.events)) {
          res.events.forEach(e => {
            events.push({
              id: e.id,
              title: e.title,
              date: e.date,
              start_time: e.start_time || e.start,
              attendees: e.attendees || []
            });
          });
        }
      });
    }
    return events;
  };

  const renderFormattedContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');

    const formatInline = (text) => {
      const tokenRegex = /(\[[^\]]+\]\((?:https?:\/\/[^\s)]+|\/api\/downloads\/[^\s)]+)\)|https?:\/\/[^\s<)]+|\*\*[^*]+\*\*|`[^`]+`)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = tokenRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(text.substring(lastIndex, match.index));
        }

        const token = match[0];

        if (token.startsWith('[') && token.includes('](')) {
          const lMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
          if (lMatch) {
            const label = lMatch[1];
            const url = lMatch[2];
            const isDownload = url.includes('/api/downloads/');
            parts.push(
              <a
                key={`link-${match.index}`}
                href={url}
                target={isDownload ? "_self" : "_blank"}
                rel="noopener noreferrer"
                download={isDownload ? label : undefined}
                className="beautiful-link-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 12px',
                  margin: '2px 4px',
                  borderRadius: '8px',
                  background: isDownload 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))' 
                    : 'rgba(99, 102, 241, 0.16)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#a5b4fc',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  verticalAlign: 'middle'
                }}
              >
                {isDownload ? <FileText size={14} color="#818cf8" /> : <Globe size={14} color="#a5b4fc" />}
                <span>{label}</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>
            );
          }
        } else if (token.startsWith('http://') || token.startsWith('https://')) {
          let displayUrl = token.replace(/^https?:\/\//, '');
          if (displayUrl.length > 35) displayUrl = displayUrl.substring(0, 32) + '...';
          parts.push(
            <a
              key={`rawlink-${match.index}`}
              href={token}
              target="_blank"
              rel="noopener noreferrer"
              className="beautiful-link-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 12px',
                margin: '2px 4px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontWeight: 500,
                fontSize: '0.84rem',
                textDecoration: 'none',
                verticalAlign: 'middle'
              }}
            >
              <Link2 size={13} color="#38bdf8" />
              <span>{displayUrl}</span>
              <ExternalLink size={12} style={{ opacity: 0.8 }} />
            </a>
          );
        } else if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(
            <strong key={`bold-${match.index}`} style={{ color: '#f8fafc', fontWeight: 700 }}>
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(
            <code
              key={`code-${match.index}`}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                fontFamily: 'var(--font-mono)',
                padding: '2px 7px',
                borderRadius: '5px',
                fontSize: '0.84rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {token.slice(1, -1)}
            </code>
          );
        }

        lastIndex = tokenRegex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }

      return parts.length > 0 ? parts : text;
    };

    return lines.map((line, lineIdx) => {
      if (line.startsWith('### ')) {
        return (
          <h4
            key={lineIdx}
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#a5b4fc',
              marginTop: '16px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              paddingBottom: '6px'
            }}
          >
            {formatInline(line.slice(4))}
          </h4>
        );
      } else if (line.startsWith('## ')) {
        return (
          <h3
            key={lineIdx}
            style={{
              fontSize: '1.18rem',
              fontWeight: 700,
              color: '#c7d2fe',
              marginTop: '18px',
              marginBottom: '10px'
            }}
          >
            {formatInline(line.slice(3))}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        return (
          <div
            key={lineIdx}
            style={{
              borderLeft: '3px solid #6366f1',
              background: 'rgba(99, 102, 241, 0.08)',
              padding: '8px 14px',
              borderRadius: '0 8px 8px 0',
              margin: '8px 0',
              color: '#cbd5e1',
              fontStyle: 'italic'
            }}
          >
            {formatInline(line.slice(2))}
          </div>
        );
      }

      return (
        <div key={lineIdx} style={{ minHeight: '1.2em' }}>
          {formatInline(line)}
        </div>
      );
    });
  };

  const extractDownloadLinks = (content, toolCalls) => {
    const downloads = [];
    
    // Check tool_calls
    if (toolCalls && Array.isArray(toolCalls)) {
      toolCalls.forEach(tc => {
        const res = tc.result || {};
        if (res.download_url && res.filename) {
          downloads.push({
            filename: res.filename,
            url: res.download_url
          });
        }
      });
    }
    
    // Also parse links from message text if not already included
    if (content && typeof content === 'string') {
      const linkRegex = /\[([^\]]+)\]\(([^)]*\/api\/downloads\/[^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const label = match[1];
        const url = match[2];
        const fname = url.split('/').pop() || label;
        if (!downloads.some(d => d.url === url)) {
          downloads.push({ filename: fname, url });
        }
      }
    }
    
    return downloads;
  };

  if (!messages || messages.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-glow)'
        }}>
          ⚡
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>
          MCP AI Assistant Workspace
        </h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '28px' }}>
          Welcome! I am equipped with the <strong>Model Context Protocol (MCP)</strong> to dynamically discover tools, interact with files, Google Workspace, GitHub, databases, and execute sandboxed code.
        </p>

        <div className="quick-starters">
          <div className="starter-chip" onClick={() => onQuickStarterSelect("Summarize my top 10 Gmail inbox emails and generate a Word document")}>
            📧 Summarize Emails & Make Word Document
          </div>
          <div className="starter-chip" onClick={() => onQuickStarterSelect("Summarize my top 10 Gmail inbox emails and generate a PDF document")}>
            📄 Summarize Emails & Make PDF Document
          </div>
          <div className="starter-chip" onClick={() => onQuickStarterSelect("Run a Python script to calculate Fibonacci numbers up to 100")}>
            🐍 Python Code Sandbox
          </div>
          <div className="starter-chip" onClick={() => onQuickStarterSelect("Check GitHub repositories and list recent issue templates")}>
            🐙 GitHub Integration
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {messages.map((m, idx) => {
        const isUser = m.role === 'user';
        const downloads = extractDownloadLinks(m.content, m.tool_calls);

        return (
          <div key={idx} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
            <div className={`avatar ${isUser ? 'user' : 'assistant'}`}>
              {isUser ? <User size={18} /> : <Bot size={18} />}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '100%' }}>
              {/* Tool Execution Badges if present */}
              {m.tool_calls && m.tool_calls.map((tc, tcIdx) => (
                <ToolCallBadge key={tcIdx} toolCall={tc} />
              ))}

              <div className="message-bubble">
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{renderFormattedContent(m.content)}</div>

                {/* Interactive Download Buttons */}
                {downloads.length > 0 && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {downloads.map((dl, dIdx) => (
                      <div
                        key={dIdx}
                        style={{
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={22} color="#a5b4fc" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc' }}>
                              {dl.filename}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Generated file ready for download
                            </div>
                          </div>
                        </div>

                        <a
                          href={dl.url}
                          download={dl.filename}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--accent-gradient)',
                            color: '#ffffff',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            textDecoration: 'none',
                            boxShadow: 'var(--shadow-glow)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Download size={16} />
                          <span>Download {dl.filename.endsWith('.pdf') ? 'PDF' : dl.filename.endsWith('.docx') ? 'Word Document' : 'File'}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive Calendar RSVP Event Cards */}
                {extractCalendarEvents(m).map((calEvt, cIdx) => {
                  const fb = rsvpFeedback[calEvt.id];
                  return (
                    <div 
                      key={cIdx} 
                      style={{ 
                        marginTop: '14px', 
                        background: 'rgba(18, 24, 36, 0.85)', 
                        border: '1px solid rgba(99, 102, 241, 0.35)', 
                        borderRadius: '16px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem', color: '#a5b4fc' }}>
                          <Calendar size={18} />
                          <span>{calEvt.title}</span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{calEvt.date} {calEvt.start_time}</span>
                      </div>

                      {fb ? (
                        <div style={{
                          background: fb.action === 'accept' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          border: `1px solid ${fb.action === 'accept' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                          padding: '10px 14px',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          color: fb.action === 'accept' ? '#34d399' : '#fca5a5'
                        }}>
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {fb.action === 'accept' ? <Check size={16} /> : <X size={16} />}
                            RSVP Status Updated: {fb.action.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                            ⚡ {fb.immediate}
                          </div>
                          {fb.reminder30min && (
                            <div style={{ fontSize: '0.78rem', color: '#c084fc', marginTop: '2px' }}>
                              ⏰ {fb.reminder30min}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleMessageRSVP(calEvt.id, calEvt.title, 'accept')}
                            disabled={respondingId === `${calEvt.id}-accept`}
                            style={{
                              flex: 1,
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              border: 'none',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <Check size={14} />
                            <span>Accept Invitation</span>
                          </button>

                          <button
                            onClick={() => handleMessageRSVP(calEvt.id, calEvt.title, 'reject')}
                            disabled={respondingId === `${calEvt.id}-reject`}
                            style={{
                              flex: 1,
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              color: '#fca5a5',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <X size={14} />
                            <span>Reject Invitation</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* A2UI Component Protocol Renderer (Assistant Responses Only) */}
                {m.role === 'assistant' && (
                  <A2UIRenderer payload={m.a2ui} fallbackMessage={m.content} />
                )}

                {m.model_used && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
                    Model: {m.model_used}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="message-row assistant">
          <div className="avatar assistant">
            <Sparkles size={18} />
          </div>
          <div className="message-bubble" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Orchestrating MCP tools & querying LLM...</span>
          </div>
        </div>
      )}
    </div>
  );
}
