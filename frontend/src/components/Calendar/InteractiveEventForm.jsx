import React, { useState } from 'react';
import { API_BASE } from '../../config/api.js';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  MapPin, 
  FileText, 
  Users, 
  Sparkles, 
  Send,
  Zap,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function InteractiveEventForm({ 
  initialData = {}, 
  onSubmitted = null 
}) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    date: initialData.date || '',
    startTime: initialData.start_time || '',
    endTime: initialData.end_time || '',
    duration: initialData.duration || '',
    category: initialData.category || 'Work Event',
    location: initialData.location || '',
    attendees: Array.isArray(initialData.attendees) ? initialData.attendees.join(', ') : (initialData.attendees || ''),
    description: initialData.description || ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const attList = formData.attendees.split(',').map(a => a.trim()).filter(Boolean);
      const res = await fetch(`${API_BASE}/api/calendar/create-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          duration_minutes: parseInt(formData.duration, 10),
          location: formData.location,
          attendees: attList,
          description: formData.description,
          category: formData.category
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitResult({
          status: 'success',
          message: data.message || `Event "${formData.title}" created & queued for Human-in-the-Loop review!`
        });
        if (onSubmitted) onSubmitted(data);
      } else {
        setSubmitResult({
          status: 'error',
          message: data.detail || 'Failed to create event.'
        });
      }
    } catch (err) {
      setSubmitResult({
        status: 'error',
        message: 'Network error submitting event creation form.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const containerStyle = {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.92))',
    borderRadius: '16px',
    border: '1px solid rgba(168, 85, 247, 0.4)',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    padding: '24px',
    color: '#f8fafc',
    fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    marginTop: '14px',
    animation: 'eventFormEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
  };

  const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#c084fc',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(2, 6, 23, 0.7)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#f8fafc',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes eventFormEntrance {
          0% { opacity: 0; transform: scale(0.94) translateY(14px); filter: blur(4px); }
          70% { transform: scale(1.01) translateY(-2px); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) translateY(0px); }
        }
      `}</style>

      {/* Form Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
          }}>
            <CalendarIcon size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#ffffff' }}>
              Interactive Event Creator Form
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#c084fc' }}>
              Complete event fields & queue for Human-in-the-Loop review
            </span>
          </div>
        </div>
        <span style={{
          background: 'rgba(168, 85, 247, 0.15)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          color: '#e9d5ff',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.74rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Zap size={12} /> Event Form
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          
          {/* 1. Event Title */}
          <div>
            <label style={labelStyle}><Tag size={13} /> 1. Event Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Holi Celebration, Project Review" 
              style={{ ...inputStyle, border: '1px solid #c084fc', fontWeight: 'bold' }}
              required
            />
          </div>

          {/* 2. Category */}
          <div>
            <label style={labelStyle}><Sparkles size={13} /> 2. Category</label>
            <select 
              value={formData.category} 
              onChange={(e) => handleInputChange('category', e.target.value)}
              style={inputStyle}
            >
              <option value="Work Event">Work Event</option>
              <option value="Festival / Celebration">Festival / Celebration</option>
              <option value="Personal">Personal</option>
              <option value="Conference / Workshop">Conference / Workshop</option>
            </select>
          </div>

          {/* 3. Date */}
          <div>
            <label style={labelStyle}><CalendarIcon size={13} /> 3. Event Date</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={(e) => handleInputChange('date', e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {/* 4. Start Time */}
          <div>
            <label style={labelStyle}><Clock size={13} /> 4. Start Time</label>
            <input 
              type="text" 
              value={formData.startTime} 
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              placeholder="e.g. 06:00 PM" 
              style={inputStyle}
              required
            />
          </div>

          {/* 5. End Time */}
          <div>
            <label style={labelStyle}><Clock size={13} /> 5. End Time</label>
            <input 
              type="text" 
              value={formData.endTime} 
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              placeholder="e.g. 07:00 PM" 
              style={inputStyle}
            />
          </div>

          {/* 6. Location */}
          <div>
            <label style={labelStyle}><MapPin size={13} /> 6. Location / Venue</label>
            <input 
              type="text" 
              value={formData.location} 
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g. Google Meet, Main Auditorium" 
              style={inputStyle}
            />
          </div>

          {/* 7. Attendees */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}><Users size={13} /> 7. Attendees (Comma Separated)</label>
            <input 
              type="text" 
              value={formData.attendees} 
              onChange={(e) => handleInputChange('attendees', e.target.value)}
              placeholder="e.g. rahul@company.com, priya@company.com" 
              style={inputStyle}
            />
          </div>

          {/* 8. Description */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}><FileText size={13} /> 8. Event Description & Agenda</label>
            <textarea 
              value={formData.description} 
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              placeholder="Event details & description..." 
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Submit Feedback Notification */}
        {submitResult && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: submitResult.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${submitResult.status === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: submitResult.status === 'success' ? '#34d399' : '#fca5a5',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {submitResult.status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{submitResult.message}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          {submitting ? (
            <span>Creating Event...</span>
          ) : (
            <>
              <Send size={16} />
              <span>Confirm & Create Event (Queue for HITL Review)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
