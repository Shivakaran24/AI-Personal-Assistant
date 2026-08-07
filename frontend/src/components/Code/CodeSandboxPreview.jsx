import React, { useState } from 'react';
import { Code, Terminal, Copy, Check, Play, Eye, RefreshCw, Layers } from 'lucide-react';

const TEMPLATES = {
  python: `# Python Sandbox & Math Computation Script
import math

def generate_fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

fib_15 = generate_fibonacci(15)
print("Fibonacci (15 terms):", fib_15)
print("Golden Ratio Approx:", round(fib_15[-1] / fib_15[-2], 6))
`,
  html_preview: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      text-align: center;
      max-width: 340px;
    }
    .btn {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 14px;
      transition: transform 0.2s;
    }
    .btn:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin: 0; color: #a5b4fc;">⚡ Live Interactive Sandbox</h2>
    <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 8px;">
      Render real-time HTML, CSS animations, and JavaScript dynamically.
    </p>
    <button class="btn" onclick="alert('Interactive JavaScript executed inside Sandbox iframe!')">
      Click Interactive Trigger
    </button>
  </div>
</body>
</html>`
};

export default function CodeSandboxPreview() {
  const [activeTab, setActiveTab] = useState('html_preview'); // 'python' or 'html_preview'
  const [code, setCode] = useState(TEMPLATES.html_preview);
  const [pythonOutput, setPythonOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleTemplateChange = (type) => {
    setActiveTab(type);
    setCode(TEMPLATES[type]);
  };

  const handleRunPython = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tools/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'run_python_code',
          arguments: { code: code }
        })
      });
      const data = await res.json();
      if (data.result) {
        setPythonOutput(data.result.stdout || data.result.stderr || JSON.stringify(data.result));
      }
    } catch (e) {
      setPythonOutput("Execution error: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>
      {/* Sandbox Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex' }}>
            <Code size={20} color="#818cf8" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Interactive Code Sandbox & Live Artifact Preview
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Real-time Python execution terminal & isolated HTML/JS live preview iframe.
            </span>
          </div>
        </div>

        {/* Template Selector & Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.8)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => handleTemplateChange('html_preview')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'html_preview' ? 'var(--accent-gradient)' : 'transparent',
                color: activeTab === 'html_preview' ? 'white' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Eye size={14} /> Live HTML/JS Preview
            </button>

            <button
              onClick={() => handleTemplateChange('python')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'python' ? 'var(--accent-gradient)' : 'transparent',
                color: activeTab === 'python' ? 'white' : '#94a3b8',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Terminal size={14} /> Python Sandbox
            </button>
          </div>

          <button
            onClick={handleCopy}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {activeTab === 'python' && (
            <button
              onClick={handleRunPython}
              disabled={running}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} />
              <span>{running ? 'Executing...' : 'Run Python'}</span>
            </button>
          )}

          {activeTab === 'html_preview' && (
            <button
              onClick={() => setIframeKey(prev => prev + 1)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} /> Refresh Preview
            </button>
          )}
        </div>
      </div>

      {/* Main Sandbox Split View */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        {/* Code Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} /> Source Code Editor
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '14px',
              padding: '16px',
              color: '#f1f5f9',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              outline: 'none',
              resize: 'none',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
            }}
          />
        </div>

        {/* Live Output / Preview Side */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeTab === 'html_preview' ? <Eye size={14} color="#38bdf8" /> : <Terminal size={14} color="#34d399" />}
            <span>{activeTab === 'html_preview' ? 'Live Interactive Preview (srcDoc iframe)' : 'Python Terminal Output'}</span>
          </div>

          {activeTab === 'html_preview' ? (
            <iframe
              key={iframeKey}
              title="Live Sandbox Preview"
              srcDoc={code}
              sandbox="allow-scripts allow-modals allow-forms"
              style={{
                flex: 1,
                width: '100%',
                background: '#0f172a',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '14px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
              }}
            />
          ) : (
            <pre style={{
              flex: 1,
              background: 'rgba(2, 6, 23, 0.95)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '16px',
              color: '#34d399',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.84rem',
              lineHeight: 1.5,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {pythonOutput || "# Output stdout/stderr will appear here after clicking 'Run Python'."}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
