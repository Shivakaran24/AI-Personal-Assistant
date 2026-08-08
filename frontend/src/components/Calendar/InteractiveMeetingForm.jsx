import React, { useState } from 'react';
import { API_BASE } from '../../config/api.js';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Globe, 
  Video, 
  FileText, 
  Users, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  Send,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';

export default function InteractiveMeetingForm({ 
  initialData = {}, 
  onSubmitted = null 
}) {
  const [formData, setFormData] = useState({
    person: initialData.person || initialData.person_resolved || 'Sharannani321',
    email: initialData.email || initialData.email_resolved || 'sharannani321@gmail.com',
    date: initialData.date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: initialData.start_time || '03:00 PM',
    duration: initialData.duration_minutes || 30,
    timezone: initialData.timezone || 'IST (UTC+5:30)',
    meetingType: initialData.meeting_type || 'Virtual (Google Meet)',
    title: initialData.title || `Meeting with ${initialData.person || 'Sharannani321'}`,
    otherAttendees: initialData.other_attendees || '',
    location: initialData.location || 'Google Meet Video Call',
    description: initialData.description || `Discussion & sync agenda for meeting`
  });

  const availableSlots = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "03:00 PM", "04:30 PM"];
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const handleSelectSlot = (slotTime) => {
    setFormData(prev => ({
      ...prev,
      time: slotTime
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/calendar/schedule-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: formData.person,
          attendees: [formData.email],
          date: formData.date,
          start_time: formData.time,
          duration_minutes: parseInt(formData.duration),
          timezone: formData.timezone,
          meeting_type: formData.meetingType,
          title: formData.title,
          other_attendees: formData.otherAttendees ? formData.otherAttendees.split(',').map(s => s.trim()) : [],
          location: formData.location,
          description: formData.description
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitResult({
          success: true,
          hitlId: data.hitl_action?.id || data.event_id || 'hitl-queued',
          message: `Meeting details submitted! Queued into Human-in-the-Loop review & HTML invitation prepared for ${formData.email}.`
        });
        if (onSubmitted) onSubmitted(data);
      } else {
        setSubmitResult({
          success: false,
          message: "Failed to schedule meeting. Please check backend server log."
        });
      }
    } catch (err) {
      console.error("Failed to submit meeting form:", err);
      setSubmitResult({
        success: false,
        message: "Error communicating with server."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(18, 24, 38, 0.95) 0%, rgba(10, 14, 24, 0.98) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.35)',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
      color: '#f8fafc',
      margin: '16px 0',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
          }}>
            <CalendarIcon size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
              Interactive Meeting Information Collector
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#a5b4fc' }}>
              Select available open time slot & complete 11 meeting details
            </span>
          </div>
        </div>
        <span style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.74rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Zap size={12} /> Interactive Form
        </span>
      </div>

      {/* STEP 1: Interactive Animated Open Time Slot Picker */}
      <div style={{ marginBottom: '24px', background: 'rgba(10, 13, 20, 0.6)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Clock size={15} />
          <span>Step 1: Select Available Open Time Slot (Interactive Animation)</span>
        </label>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {availableSlots.map((slot) => {
            const isSelected = formData.time === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => handleSelectSlot(slot)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(79, 70, 229, 0.45) 100%)' 
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected ? '0 0 16px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
                  transform: isSelected ? 'scale(1.04)' : 'scale(1)'
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isSelected ? '#34d399' : '#a1a1aa',
                  boxShadow: isSelected ? '0 0 8px #34d399' : 'none'
                }} />
                <span>{slot}</span>
                {isSelected && <Check size={14} color="#34d399" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: Complete 11 Meeting Fields Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          
          {/* 1. Person */}
          <div className="form-group">
            <label style={labelStyle}><User size={13} /> 1. Person</label>
            <input 
              type="text" 
              value={formData.person} 
              onChange={(e) => handleInputChange('person', e.target.value)}
              placeholder="e.g. Sharannani321" 
              style={inputStyle}
            />
          </div>

          {/* 2. Which Contact / Email */}
          <div className="form-group">
            <label style={labelStyle}><Mail size={13} /> 2. Which Contact / Email</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="sharannani321@gmail.com" 
              style={inputStyle}
            />
          </div>

          {/* 3. Date */}
          <div className="form-group">
            <label style={labelStyle}><CalendarIcon size={13} /> 3. Date</label>
            <input 
              type="date" 
              value={formData.date} 
              onChange={(e) => handleInputChange('date', e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 4. Time */}
          <div className="form-group">
            <label style={labelStyle}><Clock size={13} /> 4. Time (Selected Slot)</label>
            <input 
              type="text" 
              value={formData.time} 
              onChange={(e) => handleInputChange('time', e.target.value)}
              placeholder="e.g. 03:00 PM" 
              style={{ ...inputStyle, border: '1px solid #818cf8', color: '#818cf8', fontWeight: 'bold' }}
            />
          </div>

          {/* 5. Duration */}
          <div className="form-group">
            <label style={labelStyle}><Clock size={13} /> 5. Duration</label>
            <select 
              value={formData.duration} 
              onChange={(e) => handleInputChange('duration', e.target.value)}
              style={selectStyle}
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes (Standard)</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes (1 Hour)</option>
              <option value="90">90 Minutes</option>
            </select>
          </div>

          {/* 6. Timezone */}
          <div className="form-group">
            <label style={labelStyle}><Globe size={13} /> 6. Timezone</label>
            <select 
              value={formData.timezone} 
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              style={selectStyle}
            >
              <option value="IST (UTC+5:30)">IST (UTC+5:30)</option>
              <option value="EST (UTC-5)">EST (US Eastern)</option>
              <option value="PST (UTC-8)">PST (US Pacific)</option>
              <option value="GMT / UTC">GMT / UTC</option>
            </select>
          </div>

          {/* 7. Meeting Type */}
          <div className="form-group">
            <label style={labelStyle}><Video size={13} /> 7. Meeting Type</label>
            <select 
              value={formData.meetingType} 
              onChange={(e) => handleInputChange('meetingType', e.target.value)}
              style={selectStyle}
            >
              <option value="Virtual (Google Meet)">Virtual (Google Meet)</option>
              <option value="In-Person Conference">In-Person Conference</option>
              <option value="Phone Call Sync">Phone Call Sync</option>
              <option value="Team Sync">Team Sync</option>
            </select>
          </div>

          {/* 8. Title / Purpose */}
          <div className="form-group">
            <label style={labelStyle}><FileText size={13} /> 8. Title / Purpose</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Project Review & Goals" 
              style={inputStyle}
            />
          </div>

          {/* 9. Other Attendees */}
          <div className="form-group">
            <label style={labelStyle}><Users size={13} /> 9. Other Attendees</label>
            <input 
              type="text" 
              value={formData.otherAttendees} 
              onChange={(e) => handleInputChange('otherAttendees', e.target.value)}
              placeholder="e.g. alex@company.com, team@org.com" 
              style={inputStyle}
            />
          </div>

          {/* 10. Location */}
          <div className="form-group">
            <label style={labelStyle}><MapPin size={13} /> 10. Location</label>
            <input 
              type="text" 
              value={formData.location} 
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g. Google Meet Link" 
              style={inputStyle}
            />
          </div>
        </div>

        {/* 11. Description / Agenda */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}><FileText size={13} /> 11. Description / Agenda</label>
          <textarea 
            rows="2" 
            value={formData.description} 
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter meeting agenda topics, objectives, and discussion notes..." 
            style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Submission Feedback Toast */}
        {submitResult && (
          <div style={{
            background: submitResult.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${submitResult.success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: submitResult.success ? '#34d399' : '#fca5a5',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {submitResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{submitResult.message}</span>
          </div>
        )}

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          {submitting ? (
            <>
              <Sparkles size={16} className="animate-spin" />
              <span>Scheduling Meeting & Sending Invitation...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Confirm & Schedule Meeting with 11 Details (Queue HITL Review)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

const labelStyle = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: '6px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  background: 'rgba(10, 13, 20, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#f8fafc',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const selectStyle = {
  ...inputStyle,
  color: '#a5b4fc',
  cursor: 'pointer'
};
