import React, { useState } from 'react';
import { API_BASE } from '../../config/api';
import { Code, Terminal, Copy, Check, Play } from 'lucide-react';

export default function CodeArtifactViewer() {
  const [code, setCode] = useState(`# Python Sandbox Script
import math

def calculate_fibonacci(n):
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

fib_15 = calculate_fibonacci(15)
print("Fibonacci (15 terms):", fib_15)
print("Golden Ratio Approximation:", fib_15[-1] / fib_15[-2])
`);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRunCode = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API_BASE}/api/tools/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: 'run_python_code',
          arguments: { code: code }
        })
      });
      const data = await res.json();
      if (data.result) {
        setOutput(data.result.stdout || data.result.stderr || JSON.stringify(data.result));
      }
    } catch (e) {
      setOutput("Execution error: " + e.message);
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
    <div style={{ padding: '24px', display: 'flex', gap: '20px', height: '100%', overflow: 'hidden' }}>
      {/* Code Editor Side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={18} color="#a5b4fc" /> Python Code Sandbox
          </h3>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopy}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleRunCode}
              disabled={running}
              style={{
                background: 'var(--accent-gradient)',
                border: 'none',
                color: 'white',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Play size={14} />
              <span>{running ? 'Executing...' : 'Run Sandbox Code'}</span>
            </button>
          </div>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            flex: 1,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            color: '#e2e8f0',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            outline: 'none',
            resize: 'none'
          }}
        />
      </div>

      {/* Execution Output Side */}
      <div style={{
        width: '400px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="#34d399" /> Output Terminal
        </h4>

        <pre style={{
          flex: 1,
          background: 'rgba(10, 13, 20, 0.9)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          color: '#34d399',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}>
          {output || "# Console stdout/stderr output will appear here after clicking 'Run Sandbox Code'."}
        </pre>
      </div>
    </div>
  );
}
