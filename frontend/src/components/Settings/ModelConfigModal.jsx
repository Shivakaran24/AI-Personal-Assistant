import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api.js';
import { X, Key, Cpu, Check } from 'lucide-react';

export default function ModelConfigModal({ isOpen, onClose, selectedModel, setSelectedModel }) {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE}/api/settings`)
        .then(res => res.json())
        .then(data => {
          setOllamaUrl(data.ollama_base_url || 'http://localhost:11434');
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: geminiKey || undefined,
          openai_api_key: openaiKey || undefined,
          ollama_base_url: ollamaUrl,
          default_llm_provider: selectedModel
        })
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error("Save settings failed:", e);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="#a5b4fc" /> LLM Provider Settings
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Active LLM Routing Engine:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          >
            <option value="auto">Auto / Built-in MCP Smart Fallback</option>
            <option value="gemini">Google Gemini 1.5 Flash</option>
            <option value="openai">OpenAI GPT-4o Mini</option>
            <option value="ollama">Local Ollama (Llama 3 / DeepSeek)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Key size={14} /> Gemini API Key:
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Key size={14} /> OpenAI API Key:
          </label>
          <input
            type="password"
            placeholder="sk-proj-..."
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Ollama Endpoint URL:
          </label>
          <input
            type="text"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <button
          onClick={handleSave}
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            color: 'white',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {saved ? <Check size={16} /> : null}
          <span>{saved ? 'Saved Configuration!' : 'Save & Update'}</span>
        </button>
      </div>
    </div>
  );
}
