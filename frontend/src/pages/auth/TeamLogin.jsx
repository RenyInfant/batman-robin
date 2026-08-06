import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Key, User, AlertCircle } from 'lucide-react';

const TeamLogin = () => {
  const [username, setUsername] = useState('team1');
  const [password, setPassword] = useState('team123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login('team', username, password);
    if (res.success) {
      navigate('/team/dashboard');
    } else {
      setError(res.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-card" style={{ maxWidth: '440px', width: '100%', border: '1px solid var(--robin-red-glow)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--robin-red) 0%, #B91C1C 100%)',
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--robin-red-glow)'
          }}>
            <Users size={32} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--robin-red)' }}>PARTICIPANT TEAM PORTAL</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Prompt Engineering Competition Portal Login
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(230, 57, 70, 0.15)',
            border: '1px solid var(--robin-red)',
            color: 'var(--robin-red)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Team Account Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '40px' }}
                placeholder="Enter team username"
                required 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Team Passkey / Password
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                placeholder="Enter team password"
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-danger" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Enter Team Arena'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Default Credentials: <code style={{ color: 'var(--robin-red)' }}>team1</code> / <code style={{ color: 'var(--robin-red)' }}>team123</code>
        </div>
      </div>
    </div>
  );
};

export default TeamLogin;
