import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useCompetition } from '../../context/CompetitionContext';
import { Settings, Save, Check, AlertTriangle, Clock } from 'lucide-react';

const CompetitionSettings = () => {
  const { refreshState } = useCompetition();
  const [settings, setSettings] = useState({
    competition_name: '',
    venue: '',
    competition_date: '',
    observation_time_mins: '15',
    competition_time_mins: '30',
    max_upload_size_mb: '10',
    leaderboard_visibility: 'Live',
    max_team_count: '20'
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get('/admin/settings');
        if (res.data.settings) {
          setSettings(prev => ({ ...prev, ...res.data.settings }));
        }
      } catch (err) {
        setError('Failed to load competition settings.');
      }
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.put('/admin/settings', settings);
      setMessage(res.data.message);
      refreshState();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--batman-gold)' }}>Competition Configuration</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Configure event details, dynamic timers, upload size limits, and leaderboard reveal modes.
        </p>
      </div>

      {message && <div style={{ background: 'rgba(0, 230, 118, 0.15)', color: 'var(--green-neon)', border: '1px solid var(--green-neon)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{message}</div>}
      {error && <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', border: '1px solid var(--robin-red)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--cyan-neon)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          Event & Venue Parameters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Competition Title</label>
            <input 
              type="text" 
              value={settings.competition_name} 
              onChange={e => setSettings({ ...settings, competition_name: e.target.value })} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Venue / Hall</label>
            <input 
              type="text" 
              value={settings.venue} 
              onChange={e => setSettings({ ...settings, venue: e.target.value })} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Competition Date</label>
            <input 
              type="date" 
              value={settings.competition_date} 
              onChange={e => setSettings({ ...settings, competition_date: e.target.value })} 
              required 
            />
          </div>
        </div>

        <h3 style={{ fontSize: '1.1rem', color: 'var(--batman-gold)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginTop: '12px' }}>
          Dynamic Stage Timers (Configurable Before Every Round)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Observation Time (Minutes)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['5', '10', '15', '20'].map(mins => (
                <button 
                  key={mins} 
                  type="button" 
                  className={`btn ${settings.observation_time_mins === mins ? 'btn-cyan' : 'btn-secondary'}`}
                  onClick={() => setSettings({ ...settings, observation_time_mins: mins })}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <input 
              type="number" 
              min="1" 
              max="120"
              value={settings.observation_time_mins} 
              onChange={e => setSettings({ ...settings, observation_time_mins: e.target.value })} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Competition Time (Minutes)</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {['20', '30', '45', '60'].map(mins => (
                <button 
                  key={mins} 
                  type="button" 
                  className={`btn ${settings.competition_time_mins === mins ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSettings({ ...settings, competition_time_mins: mins })}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <input 
              type="number" 
              min="1" 
              max="300"
              value={settings.competition_time_mins} 
              onChange={e => setSettings({ ...settings, competition_time_mins: e.target.value })} 
              required 
            />
          </div>
        </div>

        <h3 style={{ fontSize: '1.1rem', color: 'var(--cyan-neon)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginTop: '12px' }}>
          Leaderboard & Upload Policies
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Leaderboard Mode</label>
            <select 
              value={settings.leaderboard_visibility} 
              onChange={e => setSettings({ ...settings, leaderboard_visibility: e.target.value })}
            >
              <option value="Live">Live (Real-time updates)</option>
              <option value="Hidden">Hidden (Scores private)</option>
              <option value="Reveal Results">Reveal Results (Final Ceremony)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Max Upload File Size (MB)</label>
            <input 
              type="number" 
              min="1" 
              max="50"
              value={settings.max_upload_size_mb} 
              onChange={e => setSettings({ ...settings, max_upload_size_mb: e.target.value })} 
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Max Team Capacity</label>
            <input 
              type="number" 
              min="1" 
              max="100"
              value={settings.max_team_count} 
              onChange={e => setSettings({ ...settings, max_team_count: e.target.value })} 
              required 
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '16px' }}>
          <Save size={16} /> {saving ? 'Saving Configuration...' : 'Save & Publish Competition Settings'}
        </button>
      </form>
    </div>
  );
};

export default CompetitionSettings;
