import React, { useState, useEffect } from 'react';
import { useCompetition } from '../../context/CompetitionContext';
import api from '../../services/api';
import StageBadge from '../../components/StageBadge';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { 
  RotateCcw, Play, Pause, FastForward, Square, ArrowRight, Upload, 
  Settings, Users, History, Activity, Database, Download, Image as ImageIcon, AlertTriangle, Check 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { state, refreshState } = useCompetition();
  const [refFile, setRefFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleAction = async (actionEndpoint) => {
    setMessage(null);
    setError(null);
    try {
      const res = await api.post(`/competition/${actionEndpoint}`);
      setMessage(res.data.message);
      refreshState();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Action failed');
    }
  };

  const handleRefUpload = async (e) => {
    e.preventDefault();
    if (!refFile) return;

    setUploading(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('reference_image', refFile);

    try {
      const res = await api.post('/admin/reference-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      setRefFile(null);
      refreshState();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{
        borderLeft: '6px solid var(--batman-gold)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--batman-gold)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
            Admin Control Center • Round {state?.round_number || 1}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            Gotham Competition Operations
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {state?.settings?.competition_name} ({state?.settings?.venue})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/admin/teams" className="btn btn-secondary">
            <Users size={16} /> Manage Teams
          </Link>
          <Link to="/admin/settings" className="btn btn-secondary">
            <Settings size={16} /> Config Settings
          </Link>
          <Link to="/admin/history" className="btn btn-secondary">
            <History size={16} /> History
          </Link>
          <Link to="/admin/health" className="btn btn-secondary">
            <Database size={16} /> DB Health
          </Link>
          <Link to="/admin/logs" className="btn btn-secondary">
            <Activity size={16} /> Logs
          </Link>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div style={{ background: 'rgba(0, 230, 118, 0.15)', border: '1px solid var(--green-neon)', color: 'var(--green-neon)', padding: '14px 20px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Check size={18} /> {message}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(230, 57, 70, 0.15)', border: '1px solid var(--robin-red)', color: 'var(--robin-red)', padding: '14px 20px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Main Control Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Panel 1: Competition Workflow Execution */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--batman-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={20} /> Round Workflow Controls
          </h3>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Stage</div>
              <div style={{ marginTop: '4px' }}><StageBadge stage={state?.stage} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configured Timers</div>
              <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
                Obs: {state?.settings?.observation_time_mins || 10}m | Comp: {state?.settings?.competition_time_mins || 30}m
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={() => handleAction('reset-round')} className="btn btn-secondary" style={{ border: '1px solid var(--robin-red)', color: 'var(--robin-red)' }}>
              <RotateCcw size={16} /> RESET ROUND
            </button>
            <button onClick={() => handleAction('start-round')} className="btn btn-primary" disabled={state?.stage === 'OBSERVATION' || state?.stage === 'COMPETITION'}>
              <Play size={16} /> START ROUND
            </button>
            
            {state?.stage === 'PAUSED' ? (
              <button onClick={() => handleAction('resume-round')} className="btn btn-cyan">
                <Play size={16} /> RESUME ROUND
              </button>
            ) : (
              <button onClick={() => handleAction('pause-round')} className="btn btn-secondary" disabled={state?.stage === 'IDLE' || state?.stage === 'FINISHED'}>
                <Pause size={16} /> PAUSE ROUND
              </button>
            )}

            <button onClick={() => handleAction('end-round')} className="btn btn-danger" disabled={state?.stage === 'FINISHED'}>
              <Square size={16} /> END ROUND
            </button>
          </div>

          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button onClick={() => handleAction('next-round')} className="btn btn-secondary" style={{ width: '100%' }}>
              <FastForward size={16} /> ADVANCE TO NEXT ROUND
            </button>
          </div>
        </div>

        {/* Panel 2: Reference Image Upload & Preview */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--cyan-neon)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} /> Reference Target Image
          </h3>

          {state?.referenceImage ? (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  src={`${import.meta.env.VITE_API_URL}${state.referenceImage.filepath}`} 
                  alt="Current Reference" 
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan-glow)' }}
                />
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Original File: {state.referenceImage.original_name}
              </div>
              <button onClick={() => setPreviewOpen(true)} className="btn btn-secondary" style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.8rem' }}>
                Full Preview
              </button>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', color: 'var(--text-muted)' }}>
              No reference image uploaded for Round {state?.round_number || 1}.
            </div>
          )}

          <form onSubmit={handleRefUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {state?.referenceImage ? 'Replace Reference Image (PNG/JPG/WEBP)' : 'Upload Reference Image'}
            </label>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={(e) => setRefFile(e.target.files[0])}
              required 
            />
            <button type="submit" className="btn btn-cyan" disabled={uploading || !refFile}>
              <Upload size={16} /> {uploading ? 'Uploading Image...' : state?.referenceImage ? 'Replace Reference Image' : 'Upload Reference Image'}
            </button>
          </form>
        </div>

      </div>

      {/* Reference Image Full Preview Modal */}
      <ImagePreviewModal 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        title="Reference Image Preview" 
        referenceUrl={state?.referenceImage?.filepath} 
      />
    </div>
  );
};

export default AdminDashboard;
