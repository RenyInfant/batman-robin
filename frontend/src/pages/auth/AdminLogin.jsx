import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Key, User, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login('admin', username, password);
    if (res.success) {
      navigate('/admin/dashboard');
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
      <div className="glass-card" style={{ maxWidth: '440px', width: '100%', border: '1px solid var(--batman-gold-glow)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--batman-gold) 0%, #D49800 100%)',
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--shadow-glow-gold)'
          }}>
            <Shield size={32} color="#000" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--batman-gold)' }}>GOTHAM ADMIN PORTAL</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Competition Control & Operations Login
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
              Admin Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '40px' }}
                placeholder="Enter admin username"
                required 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <Key size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                placeholder="Enter admin password"
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
            {loading ? 'Authenticating...' : 'Access Admin Command Center'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Default Credentials: <code style={{ color: 'var(--batman-gold)' }}>admin</code> / <code style={{ color: 'var(--batman-gold)' }}>admin123</code>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
