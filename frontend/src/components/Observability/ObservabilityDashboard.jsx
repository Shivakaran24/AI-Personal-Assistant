import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, DollarSign, Zap, Database, CheckCircle2, 
  AlertTriangle, RefreshCw, BarChart2, Shield, Layers, Clock, TrendingUp 
} from 'lucide-react';
import { API_BASE } from '../../config/api';

export default function ObservabilityDashboard() {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTelemetry = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/telemetry/stats?t=${start}`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error("Failed to fetch telemetry:", err);
    } finally {
      const elapsed = Date.now() - start;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, delay);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !telemetry) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Activity size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <p>Loading Agent Observability & Telemetry Metrics...</p>
      </div>
    );
  }

  const { summary, llm_analytics, tool_health_matrix, knowledge_base_inspector } = telemetry;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
            <Activity size={22} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Agent Observability & Telemetry Dashboard
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Real-time LLM token cost tracking, tool execution matrix, and RAG quality inspector.
            </span>
          </div>
        </div>

        <button
          onClick={fetchTelemetry}
          disabled={refreshing}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL LLM TOKENS</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#818cf8' }}>{summary.total_tokens_consumed.toLocaleString()}</span>
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Across {summary.total_llm_calls} queries</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>ESTIMATED COST (USD)</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399' }}>${summary.total_estimated_cost_usd}</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Gemini + OpenAI tier pricing</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>DAG TIER 0 PARALLELISM</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#c084fc' }}>{summary.dag_tier_0_parallel_ratio}%</span>
          <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>Concurrent asyncio.gather()</span>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>REGISTERED MCP TOOLS</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>{summary.registered_mcp_tools}</span>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Across {summary.active_mcp_servers} MCP servers</span>
        </div>
      </div>

      {/* Pillar 1: LLM Token & Cost Analytics */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} color="#818cf8" />
          <span>1. LLM Token & Cost Analytics per Provider</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Provider</th>
                <th style={{ padding: '10px' }}>Invocations</th>
                <th style={{ padding: '10px' }}>Tokens Consumed</th>
                <th style={{ padding: '10px' }}>Cost Estimate</th>
                <th style={{ padding: '10px' }}>Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {llm_analytics.map(row => (
                <tr key={row.provider} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 700, color: '#f8fafc' }}>{row.provider}</td>
                  <td style={{ padding: '12px 10px', color: '#e2e8f0' }}>{row.calls} calls</td>
                  <td style={{ padding: '12px 10px', color: '#818cf8', fontWeight: 600 }}>{row.tokens.toLocaleString()} tokens</td>
                  <td style={{ padding: '12px 10px', color: '#34d399', fontWeight: 600 }}>${row.cost_usd}</td>
                  <td style={{ padding: '12px 10px', color: '#c084fc' }}>{row.avg_latency_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pillar 2: Tool Execution Health Matrix */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="#38bdf8" />
          <span>2. Tool Execution Health Matrix & Parallelism Tiers</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: '#94a3b8' }}>
                <th style={{ padding: '10px' }}>Tool Name</th>
                <th style={{ padding: '10px' }}>Execution Tier</th>
                <th style={{ padding: '10px' }}>Invocations</th>
                <th style={{ padding: '10px' }}>Success Rate</th>
                <th style={{ padding: '10px' }}>Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {tool_health_matrix.map(row => (
                <tr key={row.tool_name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 700, color: '#f8fafc' }}><code>{row.tool_name}</code></td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: row.tier === 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                      color: row.tier === 0 ? '#38bdf8' : '#c084fc',
                      border: row.tier === 0 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)'
                    }}>
                      {row.tier === 0 ? 'Tier 0 (Parallel Read)' : 'Tier 1 (Sequential Action)'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', color: '#e2e8f0' }}>{row.calls} calls</td>
                  <td style={{ padding: '12px 10px', color: row.success_rate_percent >= 90 ? '#34d399' : '#fca5a5', fontWeight: 600 }}>
                    {row.success_rate_percent}%
                  </td>
                  <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{row.avg_time_ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pillar 3: Knowledge Base Quality Inspector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} color="#34d399" />
          <span>3. Knowledge Base Quality Inspector (RAG Engine)</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>RRF Similarity Score</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', margin: '4px 0' }}>
              {knowledge_base_inspector.avg_rrf_similarity_score}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>BM25 + TF-IDF Cosine Fusion</span>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Orphan Document Warnings</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: knowledge_base_inspector.orphan_document_warnings === 0 ? '#34d399' : '#fca5a5', margin: '4px 0' }}>
              {knowledge_base_inspector.orphan_document_warnings} Warnings
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Index Integrity Check</span>
          </div>
        </div>

        {/* Chunk Density Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>Chunk Type Density Distribution</span>
          {knowledge_base_inspector.chunk_density_distribution.map(item => (
            <div key={item.type} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
                <span>{item.type}</span>
                <span>{item.count} chunks ({item.percent}%)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${item.percent}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
