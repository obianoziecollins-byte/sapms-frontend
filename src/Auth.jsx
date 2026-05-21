import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL;

// ─── Design tokens — Nile University navy blue palette ────────────────────────
const T = {
  primary:       '#003366',
  primaryHover:  '#002650',
  primaryLight:  '#e8eef5',
  bg:            '#f2f5f9',
  surface:       '#ffffff',
  border:        '#dde3ec',
  text:          '#1a2332',
  textMuted:     '#64748b',
  danger:        '#8b1a1a',
  dangerLight:   '#fdeaea',
  dangerBorder:  '#f5c6cb',
  success:       '#1a7a4a',
  successLight:  '#e6f4ed',
  successBorder: '#a8d5b9',
};

// ─── Reusable field helpers ────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: `1px solid ${T.border}`,
  boxSizing: 'border-box',
  fontSize: '14px',
  color: T.text,
  fontFamily: '"Segoe UI", Tahoma, sans-serif',
  background: T.surface,
  outline: 'none',
  transition: 'border-color 0.15s',
};

const labelStyle = {
  display: 'block',
  fontSize: '12.5px',
  fontWeight: '600',
  color: T.textMuted,
  marginBottom: '5px',
};

// ─── Component ─────────────────────────────────────────────────────────────────
/**
 * Auth.jsx
 *
 * Props:
 *   onLoginSuccess(username: string) — called by App.jsx after a successful login
 *
 * On login:  POST /api/login/ → { message, username, student_id, first_name }
 * On signup: POST /api/register/ → { message }
 *
 * After successful login, username is passed up to App.jsx which stores it
 * in localStorage and navigates to /dashboard.
 */
const Auth = ({ onLoginSuccess }) => {
  const navigate  = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    full_name:       '',
    username:        '',
    email:           '',
    password:        '',
    student_id:      '',
    specialization:  '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const switchTab = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    setSuccess('');
    setForm({ full_name: '', username: '', email: '', password: '', student_id: '', specialization: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const url     = isLogin ? `${API_BASE}/api/login/` : `${API_BASE}/api/register/`;
    const payload = isLogin
      ? { username: form.username, password: form.password }
      : form;

    try {
      // Clean request without ngrok headers since Render handles traffic natively
      const res = await axios.post(url, payload);
      
      if (isLogin) {
        onLoginSuccess(res.data.username);
        navigate('/dashboard');
      } else {
        setSuccess('Account created successfully. You can now sign in.');
        switchTab(true);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: '"Segoe UI", Tahoma, sans-serif',
    }}>
      {/* Branding header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: T.primary, margin: '0 auto 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <h1 style={{ color: T.primary, fontSize: '20px', fontWeight: '700', margin: '0 0 4px' }}>
          Student Academic Profiling
        </h1>
        <p style={{ color: T.textMuted, margin: 0, fontSize: '13.5px' }}>
          Nile University of Nigeria &nbsp;·&nbsp; Faculty of Computing
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '420px',
        background: T.surface, borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,51,102,0.10)',
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
      }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          {[['Login', true], ['Sign Up', false]].map(([label, loginMode]) => {
            const active = isLogin === loginMode;
            return (
              <button
                key={label}
                type="button"
                onClick={() => switchTab(loginMode)}
                style={{
                  flex: 1, padding: '14px',
                  background: active ? T.surface : '#f8fafc',
                  border: 'none',
                  borderBottom: `3px solid ${active ? T.primary : 'transparent'}`,
                  cursor: 'pointer',
                  fontWeight: active ? '700' : '400',
                  fontSize: '14px',
                  color: active ? T.primary : T.textMuted,
                  fontFamily: '"Segoe UI", Tahoma, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Error banner */}
          {error && (
            <div style={{
              background: T.dangerLight, border: `1px solid ${T.dangerBorder}`,
              color: T.danger, padding: '10px 12px', borderRadius: '6px',
              fontSize: '13px', marginBottom: '16px', lineHeight: '1.5',
            }}>
              {error}
            </div>
          )}

          {/* Success banner */}
          {success && (
            <div style={{
              background: T.successLight, border: `1px solid ${T.successBorder}`,
              color: T.success, padding: '10px 12px', borderRadius: '6px',
              fontSize: '13px', marginBottom: '16px',
            }}>
              {success}
            </div>
          )}

          {/* ── Sign-up only: Full Name ── */}
          {!isLogin && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Full Name</label>
              <input
                name="full_name" type="text"
                placeholder="e.g. Obianozie Collins Obinna-Chukwu"
                style={inputStyle} value={form.full_name}
                onChange={handleChange} required
              />
            </div>
          )}

          {/* ── Sign-up only: Student ID ── */}
          {!isLogin && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Student ID</label>
              <input
                name="student_id" type="text"
                placeholder="e.g. 20220210"
                style={inputStyle} value={form.student_id}
                onChange={handleChange} required
              />
            </div>
          )}

          {/* ── Username (both modes) ── */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Username</label>
            <input
              name="username" type="text"
              placeholder="johndoe"
              style={inputStyle} value={form.username}
              onChange={handleChange} required
            />
          </div>

          {/* ── Sign-up only: Email ── */}
          {!isLogin && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email Address</label>
              <input
                name="email" type="email"
                placeholder="20220210@nileuniversity.edu.ng"
                style={inputStyle} value={form.email}
                onChange={handleChange} required
              />
            </div>
          )}

          {/* ── Password (both modes) ── */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Password</label>
            <input
              name="password" type="password"
              placeholder="••••••••"
              style={inputStyle} value={form.password}
              onChange={handleChange} required
            />
          </div>

          {/* ── Sign-up only: Specialization ── */}
          {!isLogin && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Specialization</label>
              <select
                name="specialization"
                style={inputStyle} value={form.specialization}
                onChange={handleChange} required
              >
                <option value="">Select your specialization</option>
                <option value="AI">Artificial Intelligence</option>
                <option value="ML">Machine Learning</option>
                <option value="DS">Data Science</option>
                <option value="SE">Software Engineering</option>
                <option value="CY">Cyber Security</option>
                <option value="IT">Information Technology</option>
                <option value="CC">Cloud Computing</option>
                <option value="CG">Computer Graphics</option>
                <option value="CN">Computer Networking & Communications</option>
                <option value="HC">Human-Computer Interaction</option>
              </select>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#6b8ab5' : T.primary,
              color: '#fff', border: 'none', borderRadius: '6px',
              fontWeight: '700', fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '6px',
              fontFamily: '"Segoe UI", Tahoma, sans-serif',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;