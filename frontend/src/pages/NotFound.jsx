import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto' }}>
        <ShieldAlert size={60} color="var(--batman-gold)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--batman-gold)' }}>404 - Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', marginBottom: '24px' }}>
          The requested Gotham sector or route does not exist.
        </p>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Return to Login Landing
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
