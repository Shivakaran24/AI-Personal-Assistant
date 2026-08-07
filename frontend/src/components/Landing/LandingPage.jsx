import React, { useState } from 'react';
import './LandingPage.css';
import { 
  Sparkles, Calendar, Mail, MessageSquare, Github, HardDrive, FileText, 
  ArrowRight, Play, CheckCircle2, Shield, Cpu, Zap, Database, Terminal, 
  Layers, Lock, Activity, Bot, ChevronRight, ChevronDown, ExternalLink, Globe 
} from 'lucide-react';

const INTEGRATIONS = [
  { name: 'Google Calendar', icon: Calendar, color: '#4285F4' },
  { name: 'Gmail', icon: Mail, color: '#EA4335' },
  { name: 'Slack', icon: MessageSquare, color: '#E01E5A' },
  { name: 'GitHub', icon: Github, color: '#FFFFFF' },
  { name: 'Google Drive', icon: HardDrive, color: '#34A853' },
  { name: 'Notion', icon: FileText, color: '#FFFFFF' },
  { name: 'PostgreSQL DB', icon: Database, color: '#336791' },
  { name: 'Python Sandbox', icon: Terminal, color: '#3776AB' },
];

const DEMO_COMMANDS = [
  {
    id: 'meeting',
    title: '📅 Schedule meeting with Alex tomorrow at 4 PM',
    steps: [
      '🧠 Supervisor Agent: Routing query to Domain "Calendar Agent"',
      '⚡ Tier 0 DAG: Checking availability for Alex via calendar_check_availability()',
      '🟢 Conflict Check Passed: 4:00 PM slot open & available',
      '✉️ Email Dispatch: Real HTML invitation sent to alex@company.com',
      '✅ SUCCESS: Calendar event created & RSVP status initialized!'
    ]
  },
  {
    id: 'emails',
    title: '📧 Summarize top priority unread emails',
    steps: [
      '🧠 Supervisor Agent: Routing query to Domain "Email Agent"',
      '⚡ Tier 0 DAG: Fetching messages via gmail_list_messages()',
      '🔍 RAG Reordering: Extracted Radiansys DevOps & Infosys job alerts',
      '📄 Artifact Generated: email_agent_output.md created with clickable links',
      '✅ SUCCESS: Executive Email Digest rendered in dashboard!'
    ]
  },
  {
    id: 'python',
    title: '🐍 Run Python Fibonacci & Golden Ratio script',
    steps: [
      '🧠 Supervisor Agent: Routing query to Domain "Code Interpreter"',
      '⚡ Tier 0 DAG: Launching Python sandbox via run_python_code()',
      '💻 Execution: Calculated 15 terms [0, 1, 1, 2, 3, 5, 8, 13, 21...]',
      '📊 Result: Golden Ratio Approximation = 1.618034',
      '✅ SUCCESS: Python stdout captured with 0 errors!'
    ]
  }
];

export default function LandingPage({ onGetStarted }) {
  const [activeDemo, setActiveDemo] = useState(DEMO_COMMANDS[0]);
  const [selectedNode, setSelectedNode] = useState('Center Hub');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Background Animated Grid & Orbs */}
      <div className="landing-grid-bg" />
      <div className="landing-glow-orb-1" />
      <div className="landing-glow-orb-2" />

      {/* Floating Navbar */}
      <nav className="landing-nav">
        <a href="#hero" onClick={(e) => { e.preventDefault(); scrollToSection('hero'); }} className="landing-logo">
          <div className="landing-logo-badge">
            <Bot size={20} color="#fff" />
          </div>
          <span>MCP AI ASSISTANT</span>
        </a>

        <ul className="landing-nav-links">
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="landing-nav-link">Features</a></li>
          <li><a href="#integrations" onClick={(e) => { e.preventDefault(); scrollToSection('integrations'); }} className="landing-nav-link">Integrations</a></li>
          <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className="landing-nav-link">How it Works</a></li>
          <li><a href="#demo" onClick={(e) => { e.preventDefault(); scrollToSection('demo'); }} className="landing-nav-link">Live Demo</a></li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onGetStarted} className="landing-cta-btn">
            <span>Get Started</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="landing-hero">
        <div className="landing-badge">
          <Sparkles size={14} color="#a5b4fc" />
          <span>NEXT-GEN MODEL CONTEXT PROTOCOL ECOSYSTEM</span>
        </div>

        <h1 className="landing-title">
          YOUR AI. <br />
          <span className="landing-title-gradient">CONNECTED TO EVERYTHING.</span>
        </h1>

        <p className="landing-subtitle">
          One intelligent assistant powered by a Multi-Agent Supervisor, DAG parallel execution, 
          and Model Context Protocol (MCP) integrations across all your tools.
        </p>

        <div className="landing-hero-actions">
          <button onClick={onGetStarted} className="landing-cta-btn" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            <span>Start Building Workspace</span>
            <ArrowRight size={18} />
          </button>
          <a href="#demo" className="landing-cta-btn-outline" style={{ padding: '14px 24px', fontSize: '1rem' }}>
            <Play size={16} color="#a855f7" />
            <span>See Live Interactive Demo</span>
          </a>
        </div>

        {/* Interactive Network Visualization Hub */}
        <div className="landing-network-hub">
          <div className="landing-center-node" onClick={() => setSelectedNode('AI Agent MCP Hub')}>
            <Bot size={36} color="#fff" />
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>AI AGENT MCP</span>
          </div>

          <div className="landing-orbit-node node-gmail" onClick={() => setSelectedNode('Gmail Integration')}>
            <Mail size={18} color="#EA4335" />
            <span>Gmail</span>
          </div>

          <div className="landing-orbit-node node-calendar" onClick={() => setSelectedNode('Google Calendar')}>
            <Calendar size={18} color="#4285F4" />
            <span>Calendar</span>
          </div>

          <div className="landing-orbit-node node-slack" onClick={() => setSelectedNode('Slack Real-time Messaging')}>
            <MessageSquare size={18} color="#E01E5A" />
            <span>Slack</span>
          </div>

          <div className="landing-orbit-node node-github" onClick={() => setSelectedNode('GitHub Server')}>
            <Github size={18} color="#fff" />
            <span>GitHub</span>
          </div>

          <div className="landing-orbit-node node-drive" onClick={() => setSelectedNode('Google Drive Docs')}>
            <HardDrive size={18} color="#34A853" />
            <span>Drive</span>
          </div>

          <div className="landing-orbit-node node-notion" onClick={() => setSelectedNode('Notion Knowledge Workspace')}>
            <FileText size={18} color="#fff" />
            <span>Notion</span>
          </div>
        </div>

        {/* Animated Scroll to Explore Indicator */}
        <div 
          onClick={() => scrollToSection('features')}
          style={{
            marginTop: '36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--landing-text-secondary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'color 0.2s'
          }}
          className="landing-scroll-indicator"
        >
          <span>↓ scroll to explore ↓</span>
          <ChevronDown size={18} className="scroll-arrow-bounce" />
        </div>
      </section>

      {/* Integration Strip Marquee */}
      <div id="integrations" className="landing-integration-marquee">
        <div className="landing-marquee-track">
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div key={idx} className="landing-marquee-card">
                <IconComp size={18} color={item.color} />
                <span>{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capabilities Section */}
      <section id="features" className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">
            Supercharge Your <span className="landing-title-gradient">Workflow Intelligence</span>
          </h2>
          <p className="landing-section-desc">
            Production-grade MCP tools and multi-agent routing operating in seamless parallel harmony.
          </p>
        </div>

        <div className="landing-grid-3">
          <div className="landing-card">
            <div className="landing-card-icon">
              <Calendar size={24} color="#818cf8" />
            </div>
            <h3 className="landing-card-title">Calendar & Meeting Intelligence</h3>
            <p className="landing-card-text">
              Automated conflict checks, slot availability discovery, real HTML invitation dispatch, and one-click RSVP handling.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-card-icon">
              <Mail size={24} color="#c084fc" />
            </div>
            <h3 className="landing-card-title">Executive Email Digest</h3>
            <p className="landing-card-text">
              Scans unread messages, extracts actionable insights, and formats beautiful markdown reports with direct clickable job links.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-card-icon">
              <Zap size={24} color="#f472b6" />
            </div>
            <h3 className="landing-card-title">Multi-Agent DAG Planning</h3>
            <p className="landing-card-text">
              Supervisor Agent builds execution DAGs, invoking Tier 0 read tools concurrently via <code>asyncio.gather()</code> for 80% lower latency.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-card-icon">
              <Database size={24} color="#34d399" />
            </div>
            <h3 className="landing-card-title">Epistemic Long-Term Memory</h3>
            <p className="landing-card-text">
              Persistent 128-dimensional dense vector store indexed to disk, recalling user preferences and context across chat sessions.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-card-icon">
              <Terminal size={24} color="#38bdf8" />
            </div>
            <h3 className="landing-card-title">Interactive Python Sandbox</h3>
            <p className="landing-card-text">
              Secure code execution engine with live HTML/JS preview iframe sandbox for rendering charts, cards, and UI components.
            </p>
          </div>

          <div className="landing-card">
            <div className="landing-card-icon">
              <Shield size={24} color="#fbbf24" />
            </div>
            <h3 className="landing-card-title">HITL Security & Approvals</h3>
            <p className="landing-card-text">
              Human-in-the-Loop approval queue safeguarding sensitive outbound actions, email dispatches, and calendar updates.
            </p>
          </div>
        </div>
      </section>

      {/* How MCP Works Section */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">
            How <span className="landing-title-gradient">Model Context Protocol</span> Works
          </h2>
          <p className="landing-section-desc">
            A standardized, secure bridge between Large Language Models and external tools.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div className="landing-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="landing-card-icon" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <Bot size={24} color="#818cf8" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8' }}>STEP 1</span>
            <h4 style={{ margin: 0, color: '#fff' }}>User Query & Intent</h4>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>Natural language instruction parsed by Multi-Agent Supervisor.</p>
          </div>

          <div className="landing-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="landing-card-icon" style={{ background: 'rgba(168,85,247,0.2)' }}>
              <Layers size={24} color="#c084fc" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc' }}>STEP 2</span>
            <h4 style={{ margin: 0, color: '#fff' }}>DAG Plan Creation</h4>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>Tool dependencies sorted into Tier 0 (parallel) & Tier 1 (sequential).</p>
          </div>

          <div className="landing-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="landing-card-icon" style={{ background: 'rgba(236,72,153,0.2)' }}>
              <Cpu size={24} color="#f472b6" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f472b6' }}>STEP 3</span>
            <h4 style={{ margin: 0, color: '#fff' }}>MCP Client Dispatch</h4>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>Tool invocation over Builtin, STDIO process, or HTTP SSE endpoints.</p>
          </div>

          <div className="landing-card" style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="landing-card-icon" style={{ background: 'rgba(16,185,129,0.2)' }}>
              <CheckCircle2 size={24} color="#34d399" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>STEP 4</span>
            <h4 style={{ margin: 0, color: '#fff' }}>Result Aggregation</h4>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>Real-time WebSocket streaming and A2UI card generation.</p>
          </div>
        </div>
      </section>

      {/* Interactive Live Assistant Demo */}
      <section id="demo" className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">
            Try the <span className="landing-title-gradient">Interactive Assistant Simulator</span>
          </h2>
          <p className="landing-section-desc">
            Select a sample query below to observe real-time agent planning and execution.
          </p>
        </div>

        <div className="landing-demo-box">
          <div className="landing-demo-triggers">
            {DEMO_COMMANDS.map(cmd => (
              <button
                key={cmd.id}
                onClick={() => setActiveDemo(cmd)}
                className={`landing-demo-pill ${activeDemo.id === cmd.id ? 'active' : ''}`}
              >
                {cmd.title}
              </button>
            ))}
          </div>

          <div className="landing-demo-terminal">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#818cf8', fontWeight: 700 }}>
              <Terminal size={16} />
              <span>LOG STREAM OUTPUT (`/ws` WebSocket Event Stream)</span>
            </div>

            {activeDemo.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <ChevronRight size={16} color="#34d399" style={{ marginTop: '3px' }} />
                <span style={{ color: step.includes('SUCCESS') ? '#34d399' : '#e2e8f0' }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA & Footer */}
      <footer className="landing-footer">
        <div style={{ maxWidth: '800px', margin: '0 auto 40px auto' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', marginBottom: '16px' }}>
            Build Your <span className="landing-title-gradient">AI-Powered Workspace</span> Today
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '28px' }}>
            Experience production-grade MCP tool calling, agentic RAG, and real-time interactive UI controls.
          </p>
          <button onClick={onGetStarted} className="landing-cta-btn" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>
            <span>Launch MCP AI Assistant</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span>© 2026 MCP AI Assistant Engine. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#hero" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy</a>
            <a href="#hero" style={{ color: '#94a3b8', textDecoration: 'none' }}>Documentation</a>
            <a href="#hero" style={{ color: '#94a3b8', textDecoration: 'none' }}>GitHub Repo</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
