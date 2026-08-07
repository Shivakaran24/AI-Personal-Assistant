import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AuthCanvas from './AuthCanvas';
import { 
  Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, 
  AlertCircle, Zap, Bot, Cpu, Database, Code2, CheckCircle2, 
  Shield, Network, Globe, Layers, ArrowLeft
} from 'lucide-react';

export default function AuthPortal({ onBackToLanding }) {
  const { login, register, demoLogin, error, setError } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleModeSwitch = (targetMode) => {
    setMode(targetMode);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'register') {
      if (!firstName || !lastName) {
        setError('Please enter your First and Last name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreeTerms) {
        setError('You must agree to the Terms of Service & Privacy Policy.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const fullName = `${firstName} ${lastName}`.trim();
        await register(fullName, email, password);
      }
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setSubmitting(true);
    try {
      await demoLogin();
    } catch (err) {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-portal-wrapper">
      {/* Dynamic Cosmic Space Particle Background */}
      <AuthCanvas />

      {/* Cosmic Nebula Glow Effects */}
      <div className="cosmic-glow-orb orb-purple" />
      <div className="cosmic-glow-orb orb-blue" />

      {/* Main Container */}
      <div className="nexus-auth-container">
        {onBackToLanding && (
          <button onClick={onBackToLanding} className="nexus-back-btn">
            <ArrowLeft size={16} />
            <span>Back to Landing Page</span>
          </button>
        )}

        <div className="nexus-split-card">
          {/* Left Side Visual Graphic Panel */}
          <div className="nexus-graphic-panel">
            <div className="nexus-logo-header">
              <div className="nexus-logo-icon">
                <Bot size={24} color="#818cf8" />
              </div>
              <span className="nexus-logo-title">MCP <span className="text-gradient">AI</span></span>
            </div>

            {mode === 'login' ? (
              /* Isometric AI Brain Hub Visual */
              <div className="nexus-visual-stage">
                <div className="floating-app-icon app-gmail"><Mail size={18} color="#EA4335" /></div>
                <div className="floating-app-icon app-slack"><Bot size={18} color="#E01E5A" /></div>
                <div className="floating-app-icon app-github"><Code2 size={18} color="#fff" /></div>
                <div className="floating-app-icon app-calendar"><Sparkles size={18} color="#4285F4" /></div>

                <div className="ai-brain-platform">
                  <div className="ai-brain-core">
                    <Cpu size={48} color="#818cf8" />
                  </div>
                  <div className="isometric-base-grid" />
                </div>
              </div>
            ) : (
              /* Holographic Security Shield Visual */
              <div className="nexus-visual-stage">
                <div className="hologram-shield-wrapper">
                  <div className="hologram-shield">
                    <Shield size={64} color="#a855f7" />
                    <CheckCircle2 size={24} color="#34d399" className="hologram-check" />
                  </div>
                  <div className="hologram-pedestal" />
                </div>
              </div>
            )}
          </div>

          {/* Right Side Form Panel */}
          <div className="nexus-form-panel">
            {/* Header */}
            <div className="nexus-form-header">
              <h2 className="nexus-form-title">
                {mode === 'login' ? (
                  <>Welcome <span className="text-gradient-cyan">Back</span></>
                ) : (
                  <>Create <span className="text-gradient-purple">Account</span></>
                )}
              </h2>
              <p className="nexus-form-subtitle">
                {mode === 'login' 
                  ? 'Sign in to continue to your AI workspace' 
                  : 'Start your journey with MCP AI'}
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="nexus-error-banner animate-shake">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="nexus-form">
              {mode === 'register' && (
                <div className="nexus-name-row">
                  <div className="nexus-input-group">
                    <label>First Name</label>
                    <div className="nexus-input-wrapper">
                      <User size={16} className="nexus-input-icon" />
                      <input
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="nexus-input-group">
                    <label>Last Name</label>
                    <div className="nexus-input-wrapper">
                      <User size={16} className="nexus-input-icon" />
                      <input
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="nexus-input-group">
                <label>Email Address</label>
                <div className="nexus-input-wrapper">
                  <Mail size={16} className="nexus-input-icon" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="nexus-input-group">
                <div className="nexus-label-row">
                  <label>Password</label>
                  {mode === 'login' && (
                    <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Password reset link sent to registered email!"); }} className="nexus-forgot-link">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="nexus-input-wrapper">
                  <Lock size={16} className="nexus-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="nexus-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field for Registration */}
              {mode === 'register' && (
                <div className="nexus-input-group">
                  <label>Confirm Password</label>
                  <div className="nexus-input-wrapper">
                    <Lock size={16} className="nexus-input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      required
                    />
                    <button
                      type="button"
                      className="nexus-eye-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Terms Checkbox for Registration */}
              {mode === 'register' && (
                <label className="nexus-checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>
                    I agree to the <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                  </span>
                </label>
              )}

              {/* Primary Submit Button */}
              <button type="submit" className="nexus-primary-btn" disabled={submitting}>
                {submitting ? (
                  <span className="btn-spinner" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Social Login Options */}
              <div className="nexus-divider">
                <span>{mode === 'login' ? 'or continue with' : 'or sign up with'}</span>
              </div>

              <div className="nexus-social-row">
                <button type="button" onClick={handleDemoAccess} className="nexus-social-btn">
                  <span style={{ fontWeight: 800, color: '#EA4335' }}>G</span> Google
                </button>
                <button type="button" onClick={handleDemoAccess} className="nexus-social-btn">
                  <Code2 size={15} color="#fff" /> GitHub
                </button>
                <button type="button" onClick={handleDemoAccess} className="nexus-social-btn">
                  <span style={{ fontWeight: 800, color: '#00a4ef' }}>M</span> Microsoft
                </button>
              </div>

              {/* Toggle Login / Register */}
              <div className="nexus-toggle-footer">
                {mode === 'login' ? (
                  <span>Don't have an account? <button type="button" onClick={() => handleModeSwitch('register')}>Sign up</button></span>
                ) : (
                  <span>Already have an account? <button type="button" onClick={() => handleModeSwitch('login')}>Sign in</button></span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Feature Highlights Ribbon */}
        <div className="nexus-ribbon-bar">
          <div className="nexus-ribbon-item">
            <Shield size={18} color="#a855f7" />
            <div>
              <strong>Secure & Private</strong>
              <span>Your data is encrypted end-to-end</span>
            </div>
          </div>

          <div className="nexus-ribbon-item">
            <Layers size={18} color="#38bdf8" />
            <div>
              <strong>Smart Integrations</strong>
              <span>Connect all your tools seamlessly</span>
            </div>
          </div>

          <div className="nexus-ribbon-item">
            <Zap size={18} color="#34d399" />
            <div>
              <strong>AI-Powered</strong>
              <span>Intelligent assistant that gets things done</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
