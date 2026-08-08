import React, { useState, useEffect } from 'react';
import { API_BASE } from './config/api';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPortal from './components/Auth/AuthPortal';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/Chat/ChatWindow';
import ToolExplorer from './components/MCP/ToolExplorer';
import KnowledgeBase from './components/RAG/KnowledgeBase';
import CodeSandboxPreview from './components/Code/CodeSandboxPreview';
import LandingPage from './components/Landing/LandingPage';
import ObservabilityDashboard from './components/Observability/ObservabilityDashboard';
import CalendarDashboard from './components/Calendar/CalendarDashboard';
import EmailDashboard from './components/Email/EmailDashboard';
import ApprovalDashboard from './components/HITL/ApprovalDashboard';
import ModelConfigModal from './components/Settings/ModelConfigModal';
import { Bot } from 'lucide-react';

function AppContent() {
  const { user, token, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('chat');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (user && token) {
      fetchConversations();
      fetchPendingCount();
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/approval/pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.summary?.pending_count || (data.pending_actions || []).length);
      }
    } catch (e) {
      console.error("Failed to fetch pending count:", e);
    }
  };

  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations`, {
        headers: { ...authHeaders }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
  };

  const fetchMessagesForConv = async (convId) => {
    if (!convId) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`, {
        headers: { ...authHeaders }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  const handleSelectConversation = (convId) => {
    setCurrentConvId(convId);
    setActiveTab('chat');
    fetchMessagesForConv(convId);
  };

  const handleNewConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    setActiveTab('chat');
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await fetch(`${API_BASE}/api/chat/conversations/${convId}`, { 
        method: 'DELETE',
        headers: { ...authHeaders }
      });
      if (currentConvId === convId) {
        handleNewConversation();
      }
      fetchConversations();
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  const handleSendMessage = async (text, mcpEnabled = true) => {
    setLoading(true);
    
    // Optimistic user message append
    const tempUserMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          conversation_id: currentConvId,
          content: text,
          model: selectedModel,
          mcp_enabled: mcpEnabled
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = {
        role: 'assistant',
        content: '',
        tool_calls: null,
        model_used: selectedModel,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventData.event === 'metadata') {
                if (!currentConvId && eventData.data.conversation_id) {
                  setCurrentConvId(eventData.data.conversation_id);
                }
                assistantMsg.tool_calls = eventData.data.tool_calls;
                assistantMsg.model_used = eventData.data.model_used;
              } else if (eventData.event === 'token') {
                assistantMsg.content += eventData.token;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...assistantMsg };
                  return updated;
                });
              } else if (eventData.event === 'done') {
                if (eventData.final_message) {
                  assistantMsg.content = eventData.final_message.content;
                  assistantMsg.tool_calls = eventData.final_message.tool_calls;
                }
              }
            } catch (e) {}
          }
        }
      }

      fetchConversations();
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error communicating with AI Assistant backend: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteToolFromRegistry = (execData) => {
    const { tool_name, arguments: args, data } = execData;
    const result = data?.result || data || {};
    const status = data?.status || result.status || 'success';
    const server_name = execData?.server_name || data?.server_name || 'MCP Tool Server';
    const exec_time = data?.execution_time_ms || 0;

    let formattedContent = `### 🛠️ Executed MCP Tool: \`${tool_name}\`\n`;
    formattedContent += `**Server:** ${server_name} | **Status:** \`${status.toUpperCase()}\` | **Execution Time:** ${exec_time}ms\n\n`;

    if (tool_name === 'fs_read_file' && status === 'success') {
      const fpath = result.path || args.path || '';
      const title = result.title || fpath.split(/[\/\\]/).pop();
      const ftype = result.file_type || 'File';
      const sizeBytes = result.size_bytes || 0;
      const pages = result.pages || [];
      const formulas = result.formulas || [];
      const links = result.links || [];
      const images = result.images || [];
      const tables = result.tables || [];

      formattedContent += `#### 👑 Document Title: **${title}**\n\n`;

      formattedContent += `### 📋 Metadata & File Properties\n`;
      formattedContent += `• **File Path:** \`${fpath}\`\n`;
      formattedContent += `• **File Format:** \`${ftype}\`\n`;
      formattedContent += `• **Total Pages:** \`${pages.length || 1}\` page(s)\n`;
      formattedContent += `• **File Size:** \`${sizeBytes}\` bytes\n`;
      formattedContent += `• **Extracted Formulas:** \`${formulas.length}\` equation(s)\n`;
      formattedContent += `• **Extracted Links:** \`${links.length}\` reference link(s)\n`;
      formattedContent += `• **Extracted Images:** \`${images.length}\` image(s)\n`;
      formattedContent += `• **Data Tables:** \`${tables.length}\` structured table(s)\n\n`;

      if (formulas.length > 0) {
        formattedContent += `### 🧮 Mathematical Formulas & Equations (${formulas.length})\n`;
        formulas.forEach((f, idx) => {
          formattedContent += `**Formula ${idx + 1}:**\n${f}\n\n`;
        });
      }

      if (images.length > 0) {
        formattedContent += `### 🖼️ Extracted Images & Media (${images.length})\n`;
        images.forEach((img, idx) => {
          const pgStr = img.page ? ` (Page ${img.page})` : '';
          formattedContent += `• **Image ${idx + 1}:** \`${img.name || 'Embedded Image'}\`${pgStr}\n`;
        });
        formattedContent += `\n`;
      }

      if (tables.length > 0) {
        formattedContent += `### 📊 Data Grid & Structured Tables (${tables.length})\n\n`;
        tables.forEach(tbl => {
          formattedContent += `${tbl}\n\n`;
        });
      }

      if (links.length > 0) {
        formattedContent += `### 🔗 Extracted References & Links (${links.length})\n`;
        links.forEach((l, idx) => {
          formattedContent += `**${idx + 1}. [${l}](${l})**\n`;
        });
        formattedContent += `\n`;
      }

      formattedContent += `### 📖 Page-by-Page Document Breakdown\n\n`;

      if (pages.length > 0) {
        pages.forEach(p => {
          formattedContent += `---\n### 📄 PAGE ${p.page_number} OF ${pages.length}\n`;
          if (p.headings && p.headings.length > 0) {
            p.headings.forEach(h => {
              formattedContent += `# 📌 Main Heading: **${h}**\n`;
            });
          }
          if (p.subheadings && p.subheadings.length > 0) {
            p.subheadings.forEach(sh => {
              formattedContent += `## 🏷️ Subheading: *${sh}*\n`;
            });
          }
          if (p.formulas && p.formulas.length > 0) {
            formattedContent += `**Page Equations:** ${p.formulas.join(', ')}\n\n`;
          }
          formattedContent += `💬 **Normal Body / Text:**\n${p.formatted_text || p.raw_text || p.text}\n\n`;
        });
      } else {
        formattedContent += result.content || '';
      }
    } else if (tool_name === 'db_query' && status === 'success') {
      const cols = result.columns || [];
      const rows = result.data || [];
      formattedContent += `#### 🗄️ Database Query Results (${rows.length} rows):\n`;
      if (cols.length > 0 && rows.length > 0) {
        const headers = cols.join(' | ');
        const sep = cols.map(() => '---').join(' | ');
        formattedContent += `| ${headers} |\n| ${sep} |\n`;
        rows.forEach(r => {
          const vals = cols.map(c => String(r[c] !== undefined ? r[c] : '')).join(' | ');
          formattedContent += `| ${vals} |\n`;
        });
      } else {
        formattedContent += `*(No records returned)*\n`;
      }
    } else if (tool_name === 'calendar_create_event' && status === 'success') {
      const title = result.title || args.title || 'Calendar Event';
      const date = result.date || args.date || '';
      const stime = result.start_time || args.start_time || '';
      const duration = result.duration_minutes || args.duration_minutes || 30;
      const attendeesList = Array.isArray(result.attendees) ? result.attendees : (typeof args.attendees === 'string' ? args.attendees.split(',').map(e => e.trim()) : []);

      formattedContent += `#### 📅 Event Created Successfully: **${title}**\n`;
      formattedContent += `• **Date & Time:** 📅 \`${date}\` at ⏰ \`${stime}\` (${duration} minutes)\n`;
      formattedContent += `• **Status:** \`${result.calendar_status || 'Confirmed'}\`\n`;
      formattedContent += `• **Attendees (${attendeesList.length}):**\n`;
      attendeesList.forEach(att => {
        formattedContent += `  - \`${att}\` (RSVP: Pending)\n`;
      });
      if (result.notification_status) {
        formattedContent += `• **Notification Status:** ${result.notification_status}\n`;
      }
      formattedContent += `• **Email Dispatch:** Real HTML invitation email sent with clickable Accept/Reject buttons to attendees.\n`;
    } else if (tool_name === 'calendar_list_events' && status === 'success') {
      const evts = result.events || [];
      formattedContent += `#### 📅 Scheduled Calendar Events (${evts.length}):\n`;
      if (evts.length > 0) {
        evts.forEach(e => {
          formattedContent += `• **${e.title}**: 📅 \`${e.date}\` at ⏰ \`${e.start_time}\` (${e.duration_minutes || 30} mins) — Accepted: \`${e.accepted_count || 0}\` | Rejected: \`${e.rejected_count || 0}\`\n`;
        });
      } else {
        formattedContent += `*(No scheduled events found)*\n`;
      }
    } else if (tool_name === 'calendar_respond_invitation' && status === 'success') {
      formattedContent += `#### 📩 Invitation Response Confirmed:\n`;
      formattedContent += `• **Action:** \`${(result.action || args.action || '').toUpperCase()}\`\n`;
      formattedContent += `• **Event Title:** **${result.title || 'Calendar Event'}**\n`;
      formattedContent += `• **Attendee:** \`${result.attendee || args.attendee}\`\n`;
      formattedContent += `• **Date & Time:** 📅 \`${result.date}\` at ⏰ \`${result.start_time}\`\n`;
    } else if (tool_name === 'gmail_list_messages' && status === 'success') {
      const msgs = result.messages || [];
      formattedContent += `#### 📬 Inbox Emails (${msgs.length}):\n`;
      msgs.forEach((m, idx) => {
        formattedContent += `**${idx + 1}. ${m.subject || 'No Subject'}**\n`;
        formattedContent += `   • **From:** \`${m.from || m.sender}\` | **Date:** \`${m.date}\`\n`;
        if (m.snippet) formattedContent += `   • *${m.snippet}*\n`;
        formattedContent += `\n`;
      });
    } else if (tool_name === 'web_search' && status === 'success') {
      const results = result.results || [];
      formattedContent += `#### 🔍 Search Results for "${result.query || args.query}":\n\n`;
      results.forEach((item, idx) => {
        formattedContent += `**${idx + 1}. [${item.title}](${item.url})**\n   ${item.snippet}\n\n`;
      });
    } else {
      // Clean Key-Value Markdown Renderer Fallback (No JSON Blocks)
      formattedContent += `#### 📋 Execution Result:\n`;
      Object.entries(result).forEach(([k, v]) => {
        if (k === 'status') return;
        const formattedKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (Array.isArray(v)) {
          if (v.length === 0) {
            formattedContent += `• **${formattedKey}:** *(empty)*\n`;
          } else {
            formattedContent += `• **${formattedKey} (${v.length}):**\n`;
            v.forEach((item, idx) => {
              if (typeof item === 'object' && item !== null) {
                const subFields = Object.entries(item).map(([subK, subV]) => `**${subK.replace(/_/g, ' ')}:** \`${subV}\``).join(' | ');
                formattedContent += `  - **Item ${idx + 1}:** ${subFields}\n`;
              } else {
                formattedContent += `  - \`${item}\`\n`;
              }
            });
          }
        } else if (typeof v === 'object' && v !== null) {
          formattedContent += `• **${formattedKey}:**\n`;
          Object.entries(v).forEach(([subK, subV]) => {
            const subKeyFormatted = subK.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            formattedContent += `  - **${subKeyFormatted}:** \`${subV}\`\n`;
          });
        } else {
          formattedContent += `• **${formattedKey}:** ${v}\n`;
        }
      });
    }

    const paramEntries = Object.entries(args || {});
    let userMsgText = `Execute MCP Tool \`${tool_name}\``;
    if (paramEntries.length > 0) {
      userMsgText += ` with parameters:\n` + paramEntries.map(([k, v]) => `• **${k.replace(/_/g, ' ')}:** \`${typeof v === 'object' ? JSON.stringify(v) : String(v)}\``).join('\n');
    }

    const userMsg = {
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toISOString()
    };

    const assistantMsg = {
      role: 'assistant',
      content: formattedContent,
      tool_calls: [{
        name: tool_name,
        server_name: server_name,
        arguments: args,
        result: result,
        execution_time_ms: exec_time
      }],
      timestamp: new Date().toISOString()
    };

    const savedConvId = data?.conversation_id;
    if (savedConvId) {
      if (!currentConvId || currentConvId !== savedConvId) {
        setCurrentConvId(savedConvId);
      }
      fetchConversations();
      fetchMessagesForConv(savedConvId);
    } else {
      setMessages(prev => [...prev, userMsg, assistantMsg]);
    }
    setActiveTab('chat');
  };

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'chat': return 'Interactive Multi-Agent Workspace';
      case 'approval': return 'Human-in-the-Loop Approval Queue';
      case 'calendar': return 'Calendar Agent & Telemetry Workspace';
      case 'email': return 'Email & Communication Agent Workspace';
      case 'mcp': return 'Model Context Protocol Registry & Tool Explorer';
      case 'rag': return 'Knowledge Base & Document Store';
      case 'code': return 'Live Python Sandbox & Artifact Viewer';
      default: return 'Multi-Agent Assistant';
    }
  };

  // 1. Auth loading state
  const [showAuth, setShowAuth] = useState(false);

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner">
          <Bot size={36} className="auth-spinner-icon" />
        </div>
        <p>Initializing Secure Session...</p>
      </div>
    );
  }

  // 2. Unauthenticated user: Show Landing Page by default, or Auth Portal when triggered
  if (!user) {
    if (showAuth) {
      return <AuthPortal onBackToLanding={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // 3. Authenticated user: Full Workspace App
  return (
    <div className="app-container animate-fade-in">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        conversations={conversations}
        currentConvId={currentConvId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        pendingCount={pendingCount}
      />

      <main className="main-content">
        <Header
          selectedModel={selectedModel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          activeTab={activeTab}
          activeTabName={getActiveTabTitle()}
        />

        <div style={{ flex: 1, overflow: activeTab === 'landing' ? 'auto' : 'hidden', height: 'calc(100% - 64px)' }}>
          {activeTab === 'landing' && <LandingPage onGetStarted={() => setActiveTab('chat')} />}

          {activeTab === 'chat' && (
            <ChatWindow
              messages={messages}
              loading={loading}
              onSendMessage={handleSendMessage}
            />
          )}

          {activeTab === 'approval' && <ApprovalDashboard />}

          {activeTab === 'calendar' && <CalendarDashboard />}

          {activeTab === 'email' && <EmailDashboard />}

          {activeTab === 'mcp' && <ToolExplorer onExecuteTool={handleExecuteToolFromRegistry} currentConvId={currentConvId} />}

          {activeTab === 'rag' && <KnowledgeBase />}

          {activeTab === 'code' && <CodeSandboxPreview />}

          {activeTab === 'observability' && <ObservabilityDashboard />}
        </div>
      </main>

      <ModelConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
