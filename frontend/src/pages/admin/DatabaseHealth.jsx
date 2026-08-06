import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Database, Download, RefreshCw, HardDrive, ShieldCheck, Check, AlertCircle } from 'lucide-react';

const DatabaseHealth = () => {
  const [health, setHealth] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchHealthAndBackups = async () => {
    try {
      const [hRes, bRes] = await Promise.all([
        api.get('/backup/health'),
        api.get('/backup/list')
      ]);
      setHealth(hRes.data.health);
      setBackups(bRes.data.backups);
    } catch (err) {
      setError('Failed to load database health metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndBackups();
  }, []);

  const handleCreateBackup = async () => {
    setMessage(null);
    setError(null);
    try {
      const res = await api.post('/backup/create');
      setMessage(res.data.message);
      fetchHealthAndBackups();
    } catch (err) {
      setError(err.response?.data?.error || 'Backup creation failed.');
    }
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`Are you sure you want to restore the database from '${filename}'? Current data will be replaced with safety backup.`)) return;
    
    setMessage(null);
    setError(null);
    try {
      const res = await api.post('/backup/restore', { filename });
      setMessage(res.data.message);
      fetchHealthAndBackups();
    } catch (err) {
      setError(err.response?.data?.error || 'Database restore failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--batman-gold)' }}>Database Health & Backup Hub</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Monitor SQLite storage health, table counts, manual snapshots, and restore database.</p>
        </div>
        <button onClick={handleCreateBackup} className="btn btn-primary">
          <HardDrive size={16} /> Create Database Backup Snapshot
        </button>
      </div>

      {message && <div style={{ background: 'rgba(0, 230, 118, 0.15)', color: 'var(--green-neon)', border: '1px solid var(--green-neon)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{message}</div>}
      {error && <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', border: '1px solid var(--robin-red)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="glass-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Database Status</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: health.status === 'HEALTHY' ? 'var(--green-neon)' : 'var(--robin-red)', marginTop: '4px' }}>
              {health.status}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '4px' }}>
              Integrity check: {health.integrityCheck}
            </div>
          </div>

          <div className="glass-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>File Storage Size</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--batman-gold)', marginTop: '4px' }}>
              {health.fileSize}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '4px' }}>
              SQLite Version {health.sqliteVersion}
            </div>
          </div>

          <div className="glass-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Table Statistics</div>
            <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '8px' }}>
              Teams: <strong>{health.tableCounts.teams}</strong> | Submissions: <strong>{health.tableCounts.submissions}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', marginTop: '4px' }}>
              Scores: <strong>{health.tableCounts.judge_scores}</strong> | Logs: <strong>{health.tableCounts.audit_log}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.15rem', color: 'var(--cyan-neon)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} /> Archived Database Backups ({backups.length})
        </h3>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Backup Filename</th>
                <th>File Size</th>
                <th>Created Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, idx) => (
                <tr key={idx}>
                  <td><code style={{ color: 'var(--batman-gold)' }}>{b.filename}</code></td>
                  <td>{(b.size / 1024).toFixed(2)} KB</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.created_at}</td>
                  <td>
                    <button onClick={() => handleRestore(b.filename)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      <RefreshCw size={14} /> Restore Snapshot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DatabaseHealth;
