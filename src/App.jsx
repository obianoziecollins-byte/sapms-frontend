import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './Auth';
import Dashboard from './Dashboard';

/**
 * App.jsx — Root component.
 *
 * Auth state is stored in localStorage under the key 'sapms_username'.
 * After a successful login, Auth calls onLoginSuccess(username), which
 * saves the username and re-renders App so the protected route becomes
 * accessible. Logout clears localStorage and redirects to "/".
 *
 * Route structure:
 *   /                 → Auth page (redirects to /dashboard if already logged in)
 *   /dashboard/*      → Protected Dashboard (redirects to / if not logged in)
 */
function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem('sapms_username') // read once on mount
  );

  const handleLoginSuccess = (loggedInUsername) => {
    localStorage.setItem('sapms_username', loggedInUsername);
    setUsername(loggedInUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('sapms_username');
    setUsername(null);
  };

  return (
    <Router>
      <Routes>
        {/* Public route — redirect away if already authenticated */}
        <Route
          path="/"
          element={
            username
              ? <Navigate to="/dashboard" replace />
              : <Auth onLoginSuccess={handleLoginSuccess} />
          }
        />

        {/* Protected route — redirect to login if not authenticated */}
        <Route
          path="/dashboard/*"
          element={
            username
              ? <Dashboard username={username} onLogout={handleLogout} />
              : <Navigate to="/" replace />
          }
        />

        {/* Catch-all: redirect unknown paths to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;