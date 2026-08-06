import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompetition } from '../context/CompetitionContext';
import { useSocket } from '../context/SocketContext';
import StageBadge from './StageBadge';
import TimerDisplay from './TimerDisplay';
import { Shield, Award, LogOut, Radio, LayoutDashboard, Database, History, FileText,Cpu} from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { state, remainingSeconds } = useCompetition();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    logout();
    if (user.role === 'admin') navigate('/login/admin');
    else if (user.role === 'judge') navigate('/login/judge');
    else navigate('/login/team');
  };

  return (
    <header style={{
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--batman-gold) 0%, var(--robin-red) 100%)',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-gold)'
          }}>
            <Shield size={24} color="#000" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '0.5px', color: '#fff' }}>
              BATMAN & ROBIN
            </h1>
            <div style={{ fontSize: '0.75rem', color: 'var(--batman-gold)', fontWeight: 600 }}>
              AI Prompt Competition Portal
            </div>
          </div>
        </div>

        {/* Dynamic Center Timer & Stage Status */}
        {state && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <StageBadge stage={state.stage} />
            {(state.stage === 'OBSERVATION' || state.stage === 'COMPETITION' || state.stage === 'PAUSED') && (
              <TimerDisplay 
                remainingSeconds={remainingSeconds} 
                totalSeconds={state.totalSeconds} 
                stage={state.stage} 
              />
            )}
          </div>
        )}

        {/* Navigation & Role Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Socket Connection Dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Radio size={14} color={isConnected ? 'var(--green-neon)' : 'var(--robin-red)'} />
            <span>{isConnected ? 'LIVE' : 'DISCONNECTED'}</span>
          </div>

          {/* Role Links */}
          {user.role === 'admin' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/admin/dashboard" className={`btn ${location.pathname === '/admin/dashboard' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <LayoutDashboard size={16} /> Admin
              </Link>
              <Link to="/admin/ai-evaluation" className={`btn ${location.pathname.includes('/admin/ai-evaluation') ? 'btn-cyan' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <Cpu size={16} /> AI Evaluation
              </Link>
              <Link to="/leaderboard" className={`btn ${location.pathname === '/leaderboard' ? 'btn-cyan' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <Award size={16} /> Leaderboard
              </Link>
            </div>
          )}


          {user.role === 'judge' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/judge/dashboard" className={`btn ${location.pathname.includes('/judge/dashboard') ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <LayoutDashboard size={16} /> Evaluation
              </Link>
              <Link to="/leaderboard" className={`btn ${location.pathname === '/leaderboard' ? 'btn-cyan' : 'btn-secondary'}`} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <Award size={16} /> Leaderboard
              </Link>
            </div>
          )}

          {user.role === 'team' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/team/dashboard" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <LayoutDashboard size={16} /> My Team Portal
              </Link>
              {/* STRICTLY NO LEADERBOARD LINK FOR TEAMS */}
            </div>
          )}

          {/* User Badge & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{user.username}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--batman-gold)', textTransform: 'uppercase', fontWeight: 700 }}>{user.role}</div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary" title="Logout" style={{ padding: '8px 12px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
