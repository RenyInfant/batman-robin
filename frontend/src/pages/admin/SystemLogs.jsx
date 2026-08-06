import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity, ShieldCheck, ListFilter } from 'lucide-react';

const SystemLogs = () => {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'system'
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const [auditRes, sysRes] = await Promise.all([
          api.get('/admin/logs/audit'),
          api.get('/admin/logs/system')
        ]);
        setAuditLogs(auditRes.data.auditLogs);
        setSystemLogs(sysRes.data.systemLogs);
      } catch (err) {
        console.error('Failed to load logs', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--batman-gold)' }}>Audit & System Event Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Security audit trial, user operations, and competition engine events.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('audit')}>
            <ShieldCheck size={16} /> User Audit Trail ({auditLogs.length})
          </button>
          <button className={`btn ${activeTab === 'system' ? 'btn-cyan' : 'btn-secondary'}`} onClick={() => setActiveTab('system')}>
            <Activity size={16} /> System Event Logs ({systemLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'audit' ? (
        <div className="glass-card table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Username</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                  <td style={{ fontWeight: 700, color: 'var(--batman-gold)' }}>{log.username || 'System'}</td>
                  <td><span className="badge badge-observation">{log.action}</span></td>
                  <td>{log.details}</td>
                  <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.ip_address || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Round</th>
                <th>Log Type</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {systemLogs.map(log => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                  <td>Round {log.round_number}</td>
                  <td><span className="badge badge-competition">{log.log_type}</span></td>
                  <td style={{ color: '#fff' }}>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
