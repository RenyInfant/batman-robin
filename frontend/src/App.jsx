import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import Toast from './components/Toast';

import AdminLogin from './pages/auth/AdminLogin';
import JudgeLogin from './pages/auth/JudgeLogin';
import TeamLogin from './pages/auth/TeamLogin';

import AdminDashboard from './pages/admin/AdminDashboard';
import TeamManagement from './pages/admin/TeamManagement';
import CompetitionSettings from './pages/admin/CompetitionSettings';
import RoundHistory from './pages/admin/RoundHistory';
import SystemLogs from './pages/admin/SystemLogs';
import DatabaseHealth from './pages/admin/DatabaseHealth';
import AiEvaluation from './pages/admin/AiEvaluation';

import TeamDashboard from './pages/team/TeamDashboard';

import JudgeDashboard from './pages/judge/JudgeDashboard';
import LeaderboardView from './pages/leaderboard/LeaderboardView';
import NotFound from './pages/NotFound';

import { Shield, Award, Users } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login/team" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'judge') return <Navigate to="/judge/dashboard" replace />;
    return <Navigate to="/team/dashboard" replace />;
  }

  return children;
};

const RoleLanding = () => {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'judge') return <Navigate to="/judge/dashboard" replace />;
    return <Navigate to="/team/dashboard" replace />;
  }

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div className="glass-card" style={{ maxWidth: '600px', width: '100%', border: '1px solid var(--batman-gold)' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--batman-gold)', marginBottom: '8px' }}>
          BATMAN & ROBIN
        </h1>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '24px' }}>
          AI Prompt Engineering Competition Portal
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>
          Select your portal role to authenticate into the competition management system.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <Link to="/login/admin" className="btn btn-primary" style={{ padding: '20px 16px', flexDirection: 'column' }}>
            <Shield size={28} />
            <span style={{ marginTop: '8px' }}>Admin Portal</span>
          </Link>

          <Link to="/login/judge" className="btn btn-cyan" style={{ padding: '20px 16px', flexDirection: 'column' }}>
            <Award size={28} />
            <span style={{ marginTop: '8px' }}>Judge Portal</span>
          </Link>

          <Link to="/login/team" className="btn btn-danger" style={{ padding: '20px 16px', flexDirection: 'column' }}>
            <Users size={28} />
            <span style={{ marginTop: '8px' }}>Team Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<RoleLanding />} />

          {/* Auth Routes */}
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/judge" element={<JudgeLogin />} />
          <Route path="/login/team" element={<TeamLogin />} />

          {/* Admin Protected Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/teams" element={
            <ProtectedRoute allowedRoles={['admin']}><TeamManagement /></ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['admin']}><CompetitionSettings /></ProtectedRoute>
          } />
          <Route path="/admin/history" element={
            <ProtectedRoute allowedRoles={['admin']}><RoundHistory /></ProtectedRoute>
          } />
          <Route path="/admin/logs" element={
            <ProtectedRoute allowedRoles={['admin']}><SystemLogs /></ProtectedRoute>
          } />
          <Route path="/admin/health" element={
            <ProtectedRoute allowedRoles={['admin']}><DatabaseHealth /></ProtectedRoute>
          } />
          <Route path="/admin/ai-evaluation" element={
            <ProtectedRoute allowedRoles={['admin']}><AiEvaluation /></ProtectedRoute>
          } />


          {/* Judge Protected Routes */}
          <Route path="/judge/dashboard" element={
            <ProtectedRoute allowedRoles={['judge']}><JudgeDashboard /></ProtectedRoute>
          } />

          {/* Team Protected Routes */}
          <Route path="/team/dashboard" element={
            <ProtectedRoute allowedRoles={['team']}><TeamDashboard /></ProtectedRoute>
          } />

          {/* Shared Leaderboard Route (Admin & Judge ONLY) */}
          <Route path="/leaderboard" element={
            <ProtectedRoute allowedRoles={['admin', 'judge']}><LeaderboardView /></ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toast />
    </div>
  );
};

export default App;
