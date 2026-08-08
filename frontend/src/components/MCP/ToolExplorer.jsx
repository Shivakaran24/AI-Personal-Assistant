import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api.js';
import { Terminal, Server, Play, CheckCircle, Code, Layers, RefreshCw } from 'lucide-react';

export default function ToolExplorer({ onExecuteTool, currentConvId }) {
  const [tools, setTools] = useState([]);
  const [servers, setServers] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [testArgs, setTestArgs] = useState('{}');
  const [testResult, setTestResult] = useState(null);
  const [executing, setExecuting] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchToolsAndServers();
  }, []);

  const fetchToolsAndServers = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/tools?t=${start}`),
        fetch(`${API_BASE}/api/mcp/servers?t=${start}`)
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTools(tData.tools || []);
      setServers(sData.servers || []);
      if (tData.tools && tData.tools.length > 0 && !selectedTool) {
        setSelectedTool(tData.tools[0]);
      }
    } catch (e) {
      console.error("Failed to fetch MCP registry data:", e);
    } finally {
      const elapsed = Date.now() - start;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => setRefreshing(false), delay);
    }
  };

  const handleTestTool = async () => {
    if (!selectedTool) return;
    setExecuting(true);
    setTestResult(null);

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(testArgs);
      } catch (err) {
        try {
          const sanitized = testArgs.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
          parsedArgs = JSON.parse(sanitized);
        } catch (healErr) {
          setTestResult({
            error: "Invalid JSON format in arguments input.",
            details: err.message,
            tip: "For Windows file paths, use forward slashes (e.g. C:/Users/...) or double backslashes (C:\\\\Users\\\\...)."
          });
          setExecuting(false);
          return;
        }
      }

      const res = await fetch(`${API_BASE}/api/tools/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: selectedTool.function.name,
          arguments: parsedArgs,
          conversation_id: currentConvId
        })
      });
      const data = await res.json();
      setTestResult(data);

      if (onExecuteTool) {
        onExecuteTool({
          tool_name: selectedTool.function.name,
          server_name: selectedTool.server_name,
          arguments: parsedArgs,
          data: data
        });
      }
    } catch (e) {
      setTestResult({ error: e.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', gap: '24px', height: '100%', overflow: 'hidden' }}>
      {/* Left Column: Registered MCP Tools List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#6366f1" />
            Registered MCP Tools ({tools.length})
          </h3>
          <button
            onClick={fetchToolsAndServers}
            disabled={refreshing}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Discovered Dynamically via MCP Client</span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {tools.map((t, idx) => {
            const fn = t.function;
            const isSelected = selectedTool?.function.name === fn.name;
            return (
              <div 
                key={idx}
                className="tool-card"
                onClick={() => {
                  setSelectedTool(t);
                  setTestArgs(JSON.stringify(fn.parameters.properties ? Object.keys(fn.parameters.properties).reduce((acc, k) => ({ ...acc, [k]: fn.parameters.properties[k].default || "" }), {}) : {}, null, 2));
                  setTestResult(null);
                }}
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="tool-name">{fn.name}</div>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}>
                    {t.server_name || 'MCP Server'}
                  </span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {fn.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Schema Inspection & Testing Sandbox */}
      <div style={{
        width: '420px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto'
      }}>
        {selectedTool ? (
          <>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', uppercase: true }}>Selected Tool Schema</div>
              <h3 style={{ fontSize: '1.1rem', color: '#a5b4fc', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {selectedTool.function.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                {selectedTool.function.description}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Test Parameters (JSON Format):
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Paths: use <code style={{ color: '#a5b4fc' }}>/</code> or <code style={{ color: '#a5b4fc' }}>\\</code>
                </span>
              </div>
              <textarea
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                style={{
                  width: '100%',
                  height: '140px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: '#e2e8f0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  padding: '10px',
                  outline: 'none'
                }}
              />
            </div>

            <button
              onClick={handleTestTool}
              disabled={executing}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Play size={16} />
              <span>{executing ? "Invoking MCP Tool..." : "Execute MCP Tool"}</span>
            </button>

            {testResult && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', marginBottom: '6px' }}>
                  Execution Response:
                </div>
                <pre style={{
                  background: 'rgba(10, 13, 20, 0.8)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#94a3b8',
                  overflowX: 'auto',
                  maxHeight: '220px'
                }}>
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
            Click any MCP Tool card on the left to inspect JSON parameters and execute live test invocations.
          </div>
        )}
      </div>
    </div>
  );
}
