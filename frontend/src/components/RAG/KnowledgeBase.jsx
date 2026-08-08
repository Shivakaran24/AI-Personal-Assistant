import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Database, 
  Sliders, 
  Filter, 
  Layers, 
  Sparkles, 
  FileCode, 
  Cpu, 
  Zap, 
  ArrowUpRight,
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config/api.js';

export default function KnowledgeBase() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Search Sandbox state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [topK, setTopK] = useState(5);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/documents?t=${start}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch documents:", e);
    } finally {
      const elapsed = Date.now() - start;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => setRefreshing(false), delay);
    }
  };

  const uploadFileObject = async (file) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadFileObject(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFileObject(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteDoc = async (id) => {
    try {
      await fetch(`${API_BASE}/api/documents/${id}`, { 
        method: 'DELETE',
        headers: authHeaders
      });
      if (selectedDocId === id) setSelectedDocId('');
      fetchDocuments();
    } catch (e) {
      console.error("Delete doc error:", e);
    }
  };

  const handleVectorSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ 
          query: searchQuery,
          doc_id: selectedDocId || null,
          top_k: topK
        })
      });
      const data = await res.json();
      setSearchResults(data.results || []);
      setSearchMetadata({
        expanded_queries: data.expanded_queries || [],
        relevant_chunks_count: data.relevant_chunks_count || 0,
        fallback_executed: data.fallback_executed || false,
        citations: data.citations || []
      });
    } catch (err) {
      console.error("RAG Query Error:", err);
    } finally {
      setSearching(false);
    }
  };

  const getFileTypeBadge = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return { label: 'PDF', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'md': return { label: 'MARKDOWN', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'py':
      case 'js':
      case 'json': return { label: 'CODE', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' };
      default: return { label: 'TEXT', color: '#a5b4fc', bg: 'rgba(99, 102, 241, 0.15)' };
    }
  };

  return (
    <div style={{
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      height: '100%',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at top left, rgba(30, 27, 75, 0.4) 0%, transparent 60%)'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', color: '#f8fafc' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex' }}>
              <Database size={22} color="#818cf8" />
            </div>
            Advanced Agentic RAG Knowledge Base
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#94a3b8', marginTop: '6px', maxWidth: '700px', lineHeight: 1.5 }}>
            Powered by <strong>Okapi BM25</strong> + <strong>TF-IDF Cosine Vector Space Model</strong> combined via <strong>Reciprocal Rank Fusion (RRF)</strong> and Sentence-Boundary Structural Chunking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchDocuments}
            disabled={refreshing}
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Documents'}</span>
          </button>

          {/* Upload Trigger */}
          <label style={{
            padding: '12px 22px',
            borderRadius: '12px',
            background: 'var(--accent-gradient)',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease'
          }}>
            <Upload size={18} />
            <span>{uploading ? 'Uploading & Indexing...' : 'Upload Document'}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".pdf,.txt,.md,.py,.js,.json,.csv,.html"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          padding: '20px',
          borderRadius: '14px',
          background: dragActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.4)',
          border: `2px dashed ${dragActive ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255, 255, 255, 0.1)'}`,
          textAlign: 'center',
          transition: 'all 0.25s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          color: dragActive ? '#a5b4fc' : 'var(--text-muted)'
        }}
      >
        <Upload size={20} color={dragActive ? '#a5b4fc' : '#64748b'} />
        <span style={{ fontSize: '0.86rem' }}>
          {dragActive ? 'Drop your file here for instant RAG indexing...' : 'Drag & drop PDF, Markdown, Python, JS, or TXT files here to add to Knowledge Base'}
        </span>
      </div>

      {/* Interactive Vector Search & RRF RAG Sandbox */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 12px 36px -12px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)' }}>
              <Search size={18} color="#a5b4fc" />
            </div>
            Okapi BM25 + TF-IDF Cosine Vector Hybrid Search Playground (RRF Engine)
          </div>

          {/* Controls: Document Scope Filter & Top-K */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Document Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#a5b4fc" />
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              >
                <option value="">All Knowledge Documents ({documents.length})</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>{d.filename}</option>
                ))}
              </select>
            </div>

            {/* Top-K Slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <Sliders size={14} color="#a5b4fc" />
              <span>Top-K: <strong style={{ color: '#ffffff' }}>{topK}</strong></span>
              <input
                type="range"
                min="2"
                max="10"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                style={{ width: '70px', accentColor: '#6366f1' }}
              />
            </div>
          </div>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleVectorSearch} style={{ display: 'flex', gap: '14px' }}>
          <input
            type="text"
            placeholder="Ask any question or search terms across indexed documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              borderRadius: '12px',
              color: '#f8fafc',
              padding: '12px 18px',
              fontSize: '0.92rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: searching ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: searching ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              boxShadow: searching ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            {searching ? 'Evaluating RRF Hybrid RAG...' : 'Run Hybrid Search'}
          </button>
        </form>

        {/* Execution Trace Header */}
        {searchMetadata && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
            borderRadius: '14px',
            border: '1px solid rgba(165, 180, 252, 0.3)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }}></span>
              🧠 RAG RRF Fusion Execution Trace
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.82rem' }}>
              <span style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', fontWeight: 600 }}>
                🔍 Expanded Variations ({searchMetadata.expanded_queries.length}): {searchMetadata.expanded_queries.join(' • ')}
              </span>
              <span style={{ padding: '6px 12px', borderRadius: '8px', background: searchMetadata.relevant_chunks_count > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)', color: searchMetadata.relevant_chunks_count > 0 ? '#34d399' : '#f87171', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                ✅ Verified Relevant Chunks: {searchMetadata.relevant_chunks_count}
              </span>
              {searchMetadata.fallback_executed && (
                <span style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
                  🌐 Corrective Fallback: Web Search Triggered
                </span>
              )}
            </div>
          </div>
        )}

        {/* Passages Output List */}
        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> RRF Rank Fused Context Passages ({searchResults.length}):
            </div>
            {searchResults.map((hit, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  borderRadius: '14px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700, color: '#c7d2fe' }}>
                    <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.2)' }}>
                      <FileText size={16} color="#818cf8" />
                    </div>
                    {hit.filename} <span style={{ color: '#64748b', fontWeight: 500 }}>#Chunk-{hit.chunk_index}</span>
                    {hit.section && (
                      <span style={{ fontSize: '0.76rem', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                        {hit.section}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {hit.bm25_rank && hit.bm25_rank < 900 && (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>
                        BM25 Rank #{hit.bm25_rank}
                      </span>
                    )}
                    {hit.semantic_rank && hit.semantic_rank < 900 && (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 600 }}>
                        TF-IDF Rank #{hit.semantic_rank} {hit.semantic_score ? `(Sim: ${hit.semantic_score})` : ''}
                      </span>
                    )}
                    {hit.relevance_confidence && (
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', fontWeight: 600 }}>
                        Confidence: {(hit.relevance_confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      RRF Score: {hit.rrf_score || hit.score}
                    </span>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.86rem',
                  color: '#e2e8f0',
                  lineHeight: 1.6,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  background: 'rgba(2, 6, 23, 0.6)',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  {hit.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indexed Documents List */}
      <div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Indexed Knowledge Documents ({documents.length})
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {documents.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              padding: '40px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px dashed rgba(148, 163, 184, 0.25)',
              borderRadius: '16px',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              No documents uploaded yet. Upload a PDF, Markdown, Python, or Text file above.
            </div>
          ) : (
            documents.map(doc => {
              const badge = getFileTypeBadge(doc.filename);
              return (
                <div key={doc.id} style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '14px',
                  padding: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '10px', background: badge.bg, border: `1px solid ${badge.color}40` }}>
                      <FileText size={20} color={badge.color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {doc.filename}
                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: badge.bg, color: badge.color, fontWeight: 700 }}>
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                        {(doc.size_bytes / 1024).toFixed(1)} KB • <span style={{ color: '#34d399', fontWeight: 600 }}>{doc.chunk_count} structural chunks</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title="Delete Document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
