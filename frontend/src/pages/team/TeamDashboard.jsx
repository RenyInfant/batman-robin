import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import StageBadge from '../../components/StageBadge';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { 
  Upload, Image as ImageIcon, FileText, CheckCircle, Lock, AlertTriangle, ExternalLink, RefreshCw 
} from 'lucide-react';

const TeamDashboard = () => {
  const { user, team } = useAuth();
  const { state, remainingSeconds } = useCompetition();
  const { socket } = useSocket();

  const [submission, setSubmission] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [promptNotes, setPromptNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchMySubmission = async () => {
    try {
      const res = await api.get('/team/my-submission');
      setSubmission(res.data.submission);
      setIsLocked(res.data.isLocked);
      if (res.data.submission) {
        setPromptNotes(res.data.submission.prompt_notes || '');
      }
    } catch (err) {
      console.error('Failed to fetch submission', err);
    }
  };

  useEffect(() => {
    fetchMySubmission();

    function onSubmissionLocked(data) {
      setIsLocked(true);
    }

    function onStageChanged(data) {
      fetchMySubmission();
    }

    socket.on('competition:submissionLocked', onSubmissionLocked);
    socket.on('competition:stageChanged', onStageChanged);
    socket.on('competition:state', fetchMySubmission);

    return () => {
      socket.off('competition:submissionLocked', onSubmissionLocked);
      socket.off('competition:stageChanged', onStageChanged);
      socket.off('competition:state', fetchMySubmission);
    };
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !submission) {
      setError('Please select an image file to upload.');
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    if (selectedFile) formData.append('submission_image', selectedFile);
    formData.append('prompt_notes', promptNotes);

    try {
      const res = await api.post('/team/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(res.data.message);
      setSubmission(res.data.submission);
      setSelectedFile(null);
      fetchMySubmission();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Upload allowed ONLY during active COMPETITION stage when remainingSeconds > 0 and not locked
  const isUploadAllowed = state?.stage === 'COMPETITION' && !isLocked && (remainingSeconds > 0 || state?.remainingSeconds > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Team Welcome Banner */}
      <div className="glass-card" style={{ borderLeft: '6px solid var(--robin-red)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--robin-red)', textTransform: 'uppercase', fontWeight: 800 }}>
              Participant Team Portal • Round {state?.round_number || 1}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              Welcome, Team {team?.team_name || user?.username}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Members: {team?.members}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Round Stage</div>
            <div style={{ marginTop: '4px' }}><StageBadge stage={state?.stage} /></div>
          </div>
        </div>
      </div>

      {message && <div style={{ background: 'rgba(0, 230, 118, 0.15)', color: 'var(--green-neon)', border: '1px solid var(--green-neon)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>{message}</div>}
      {error && <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', border: '1px solid var(--robin-red)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {/* Grid: Instructions & Reference Image */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        
        {/* Box 1: Reference Target Image */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--cyan-neon)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} /> Target Reference Image
          </h3>

          {state?.stage === 'IDLE' ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>
              <Lock size={32} color="var(--batman-gold)" style={{ marginBottom: '12px' }} />
              <div>Target Reference Image is currently HIDDEN.</div>
              <div style={{ fontSize: '0.8rem', marginTop: '6px' }}>The reference image will become visible automatically when Admin STARTS the round.</div>
            </div>
          ) : state?.referenceImage ? (
            <div style={{ textAlign: 'center' }}>
              <img 
                src={`${import.meta.env.VITE_API_URL}${state.referenceImage.filepath}`} 
                alt="Target Reference" 
                style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan-glow)' }} 
              />
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => setPreviewOpen(true)} className="btn btn-cyan" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Inspect Full Resolution Image
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No reference image uploaded yet for this round.
            </div>
          )}
        </div>

        {/* Box 2: Competition Rules & External AI Guidelines */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--batman-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> Competition Rules & AI Guidance
          </h3>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>External Image Generation:</strong> Use Leonardo AI (or preferred external AI model on your laptop) to engineer your prompts.</li>
              <li><strong>Observation Phase:</strong> Study the reference image lighting, composition, style, and details.</li>
              <li><strong>Competition Phase:</strong> Generate images externally, copy your prompt text into notes, and upload ONE final image.</li>
              <li><strong>Image Replacements:</strong> You may replace your uploaded image freely until the competition timer expires.</li>
              <li><strong>Automatic Lock:</strong> Submissions lock instantly when the timer hits zero.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Final Submission Uploader */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.25rem', color: 'var(--batman-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={22} /> Final Image Submission & Prompt Notes
        </h3>

        {!isUploadAllowed && (
          <div style={{ 
            background: 'rgba(230, 57, 70, 0.15)', 
            border: '1px solid var(--robin-red)', 
            color: 'var(--robin-red)', 
            padding: '16px 20px', 
            borderRadius: 'var(--radius-sm)', 
            marginBottom: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: '1rem',
            fontWeight: '700'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={22} />
              <span>Submission Closed</span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
              Uploads are only accepted during active COMPETITION phase.
            </span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Prompt Engineering Notes & Parameters
            </label>
            <textarea 
              rows={4}
              value={promptNotes}
              onChange={e => setPromptNotes(e.target.value)}
              placeholder="Paste your exact Leonardo AI prompt text, seed numbers, negative prompts, or generation notes here..."
              disabled={!isUploadAllowed}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              {submission ? 'Replace Uploaded Final Image (PNG/JPG/WEBP)' : 'Select Final Image File (PNG/JPG/WEBP)'}
            </label>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={e => setSelectedFile(e.target.files[0])}
              disabled={!isUploadAllowed}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              type="submit" 
              className={`btn ${submission ? 'btn-cyan' : 'btn-primary'}`} 
              disabled={!isUploadAllowed || uploading}
              style={{ minWidth: '220px' }}
            >
              <Upload size={18} /> 
              {uploading ? 'Processing Upload...' : submission ? 'Replace Submitted Image' : 'Submit Final Image'}
            </button>

            {submission && (
              <span style={{ fontSize: '0.85rem', color: 'var(--green-neon)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Final Submission Uploaded on {submission.updated_at || submission.submitted_at}
              </span>
            )}
          </div>
        </form>

        {/* Uploaded Image Preview */}
        {submission && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h4 style={{ color: 'var(--batman-gold)', fontSize: '1rem', marginBottom: '12px' }}>Your Uploaded Final Submission Preview</h4>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <img 
                src={`${import.meta.env.VITE_API_URL}${submission.filepath}`} 
                alt="Submitted Final" 
                style={{ width: '250px', maxHeight: '250px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--batman-gold)' }} 
              />
              <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Original File Name</div>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '12px' }}>{submission.original_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prompt Notes</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{submission.prompt_notes || 'No notes entered.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal 
        isOpen={previewOpen} 
        onClose={() => setPreviewOpen(false)} 
        title="Reference Target Image Inspection" 
        referenceUrl={state?.referenceImage?.filepath} 
      />
    </div>
  );
};

export default TeamDashboard;
