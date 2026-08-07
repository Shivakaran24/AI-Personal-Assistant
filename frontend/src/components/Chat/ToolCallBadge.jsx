import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function ToolCallBadge({ toolCall }) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCall) return null;

  const { tool_name, name, server_name, arguments: args, result, status, execution_time_ms } = toolCall;
  const displayName = tool_name || name || 'Tool';
  const isSuccess = status === 'success' || (result && result.status === 'success') || (result && !result.error && result.status !== 'error');

  return (
    <div className="tool-badge-container">
      <div 
        className="tool-badge"
        onClick={() => setExpanded(!expanded)}
      >
        <Terminal size={14} color="#818cf8" />
        <span>MCP Tool: <strong>{displayName}</strong></span>
        {server_name && <span style={{ opacity: 0.6 }}>({server_name})</span>}
        
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {execution_time_ms && (
            <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {execution_time_ms}ms
            </span>
          )}
          {isSuccess ? (
            <CheckCircle2 size={14} color="#34d399" />
          ) : (
            <AlertTriangle size={14} color="#f87171" />
          )}
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {expanded && (
        <div style={{
          background: 'rgba(10, 13, 20, 0.85)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          fontSize: '0.82rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {args && Object.keys(args).length > 0 && (
            <div>
              <div style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Tool Input Parameters:
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                {Object.entries(args).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '8px', margin: '4px 0', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>{k.replace(/_/g, ' ')}:</span>
                    <span style={{ color: '#f8fafc', wordBreak: 'break-word' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div>
              <div style={{ color: '#34d399', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Tool Response Output:
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', maxHeight: '240px', overflowY: 'auto' }}>
                {typeof result === 'string' ? (
                  <div style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{result}</div>
                ) : (
                  Object.entries(result).map(([k, v]) => {
                    if (k === 'status') return null;
                    const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                      <div key={k} style={{ margin: '6px 0', fontSize: '0.8rem' }}>
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>• {label}: </span>
                        <span style={{ color: '#e2e8f0', wordBreak: 'break-word' }}>
                          {Array.isArray(v) 
                            ? v.map(item => typeof item === 'object' ? (item.title || item.name || item.recipient || JSON.stringify(item)) : String(item)).join(', ')
                            : (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))
                          }
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
