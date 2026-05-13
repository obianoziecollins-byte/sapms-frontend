import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useIsMobile from './hooks/useIsMobile';
import Home    from './pages/Home';
import Profile from './pages/Profile';
import Courses from './pages/Courses';

const API_BASE = import.meta.env.VITE_API_URL;

const T = {
  primary:      '#003366',
  primaryLight: '#e8eef5',
  bg:           '#f2f5f9',
  surface:      '#ffffff',
  border:       '#dde3ec',
  text:         '#1a2332',
  textMuted:    '#64748b',
  danger:       '#8b1a1a',
  dangerLight:  '#fdeaea',
};

const NAV_ITEMS = [
  {
    label: 'Dashboard', path: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5"/>
      </svg>
    ),
  },
  {
    label: 'My Profile', path: '/dashboard/profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="5.5" r="3"/>
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5"/>
      </svg>
    ),
  },
  {
    label: 'My Courses', path: '/dashboard/courses',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4h12M2 8h9M2 12h6" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const Dashboard = ({ username, onLogout }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isMobile  = useIsMobile();

  const [profile,      setProfile]      = useState(null);
  const [prerequisites,setPrerequisites]= useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState('');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  // Close sidebar whenever route changes on mobile
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      const [profileRes, prereqRes] = await Promise.all([
        axios.get(`${API_BASE}/api/profile/?username=${username}`, {
          headers: { "ngrok-skip-browser-warning": "69420" }
        }),
        axios.get(`${API_BASE}/api/prerequisites/`, {
          headers: { "ngrok-skip-browser-warning": "69420" }
        }),
      ]);
      setProfile(profileRes.data);
      setPrerequisites(prereqRes.data);
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Could not load profile. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleLogout = () => { onLogout(); navigate('/'); };

  const initials    = profile
    ? (`${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`).toUpperCase() || username[0].toUpperCase()
    : username[0].toUpperCase();
  const displayName = profile
    ? (`${profile.first_name || ''} ${profile.last_name || ''}`).trim() || profile.username
    : username;

  // ── Sidebar content (shared between desktop static + mobile overlay) ─────────
  const SidebarContent = () => (
    <>
      <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: T.primary }}>Academic Profiler</div>
        <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Nile University · CS
        </div>
      </div>

      <nav style={{ padding: '10px', flex: 1 }}>
        <div style={{ fontSize: '10px', color: T.textMuted, padding: '8px 8px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '9px 10px', borderRadius: '7px', border: 'none',
              background: active ? T.primaryLight : 'transparent',
              color: active ? T.primary : T.textMuted,
              fontWeight: active ? '600' : '400', fontSize: '13.5px',
              cursor: 'pointer', textAlign: 'left', marginBottom: '2px',
              fontFamily: '"Segoe UI", Tahoma, sans-serif',
              borderLeft: `3px solid ${active ? T.primary : 'transparent'}`,
            }}>
              {item.icon}{item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '14px 18px', borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: T.primaryLight, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '700', color: T.primary,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '11px', color: T.textMuted }}>{profile?.student_id || username}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '8px', background: 'transparent',
          border: `1px solid ${T.border}`, borderRadius: '6px',
          fontSize: '12.5px', color: T.textMuted, cursor: 'pointer',
          fontFamily: '"Segoe UI", Tahoma, sans-serif',
        }}>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: '"Segoe UI", Tahoma, sans-serif' }}>

      {/* ── Desktop sidebar (always visible ≥768px) ───────────────────────── */}
      {!isMobile && (
        <aside style={{
          width: '230px', flexShrink: 0, background: T.surface,
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          position: 'sticky', top: 0, height: '100vh',
        }}>
          <SidebarContent />
        </aside>
      )}

      {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <>
          {/* Dark backdrop — tap to close */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
              zIndex: 40,
            }}
          />
          {/* Slide-in drawer */}
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '260px', background: T.surface,
            borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column',
            zIndex: 50,
            boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
          }}>
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '20px', color: T.textMuted, lineHeight: 1,
              }}
            >
              ✕
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 16px', background: T.surface,
            borderBottom: `1px solid ${T.border}`,
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', color: T.primary,
              }}
            >
              {/* Hamburger icon */}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="19" y2="6"/>
                <line x1="3" y1="11" x2="19" y2="11"/>
                <line x1="3" y1="16" x2="19" y2="16"/>
              </svg>
            </button>
            <span style={{ fontSize: '15px', fontWeight: '700', color: T.primary }}>
              Academic Profiler
            </span>
          </div>
        )}

        <main style={{ flex: 1, padding: isMobile ? '1.25rem' : '2rem', overflowY: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: T.textMuted, fontSize: '14px' }}>
              Loading your profile…
            </div>
          )}
          {!loading && fetchError && (
            <div style={{ background: T.dangerLight, border: '1px solid #f5c6cb', color: T.danger, padding: '14px 18px', borderRadius: '8px', fontSize: '14px' }}>
              {fetchError}
            </div>
          )}
          {!loading && !fetchError && (
            <Routes>
              <Route path="/"        element={<Home    profile={profile} username={username} prerequisites={prerequisites} />} />
              <Route path="/profile" element={<Profile profile={profile} username={username} onProfileUpdate={fetchProfile} />} />
              <Route path="/courses" element={<Courses profile={profile} username={username} prerequisites={prerequisites} onProfileUpdate={fetchProfile} />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;