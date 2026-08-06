import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal';
import { Users, UserPlus, Edit, Trash2, Key, ToggleLeft, ToggleRight, Check, AlertCircle } from 'lucide-react';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [formData, setFormData] = useState({ username: '', password: '', team_name: '', members: '' });
  const [newPassword, setNewPassword] = useState('');

  const fetchTeams = async () => {
    try {
      const res = await api.get('/admin/teams');
      setTeams(res.data.teams);
    } catch (err) {
      setError('Failed to load team accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const res = await api.post('/admin/teams', formData);
      setMessage(res.data.message);
      setIsCreateOpen(false);
      setFormData({ username: '', password: '', team_name: '', members: '' });
      fetchTeams();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team.');
    }
  };

  const handleToggleEnable = async (team) => {
    try {
      await api.put(`/admin/teams/${team.id}`, { is_enabled: !team.is_enabled });
      fetchTeams();
    } catch (err) {
      setError('Failed to update team status.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    try {
      const res = await api.put(`/admin/teams/${selectedTeam.id}/reset-password`, { new_password: newPassword });
      setMessage(res.data.message);
      setIsResetOpen(false);
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete team '${name}'?`)) return;
    try {
      const res = await api.delete(`/admin/teams/${id}`);
      setMessage(res.data.message);
      fetchTeams();
    } catch (err) {
      setError('Failed to delete team.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--batman-gold)' }}>Team Roster Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Create, edit, reset passwords, or enable/disable competition participant accounts.</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
          <UserPlus size={16} /> Register New Team
        </button>
      </div>

      {message && <div style={{ background: 'rgba(0, 230, 118, 0.15)', color: 'var(--green-neon)', border: '1px solid var(--green-neon)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{message}</div>}
      {error && <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', border: '1px solid var(--robin-red)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      <div className="glass-card table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Team Name</th>
              <th>Username</th>
              <th>Members</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id}>
                <td>#{t.id}</td>
                <td style={{ fontWeight: 700, color: '#fff' }}>{t.team_name}</td>
                <td><code style={{ color: 'var(--batman-gold)' }}>{t.username}</code></td>
                <td>{t.members}</td>
                <td>
                  <button onClick={() => handleToggleEnable(t)} style={{ background: 'none', border: 'none', color: t.is_enabled ? 'var(--green-neon)' : 'var(--robin-red)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    {t.is_enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                    {t.is_enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.created_at}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setSelectedTeam(t); setIsResetOpen(true); }} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Reset Password">
                      <Key size={14} /> Password
                    </button>
                    <button onClick={() => handleDeleteTeam(t.id, t.team_name)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem' }} title="Delete Team">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Team Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Competition Team">
        <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Team Name</label>
            <input type="text" value={formData.team_name} onChange={e => setFormData({ ...formData, team_name: e.target.value })} placeholder="e.g. Dark Knights" required />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Team Members</label>
            <input type="text" value={formData.members} onChange={e => setFormData({ ...formData, members: e.target.value })} placeholder="e.g. Bruce Wayne, Dick Grayson" required />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Username</label>
            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="e.g. team_darkknights" required />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Account login password" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Create Team Account</button>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title={`Reset Password for '${selectedTeam?.team_name}'`}>
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 4 characters" required />
          </div>
          <button type="submit" className="btn btn-primary">Update Team Password</button>
        </form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
