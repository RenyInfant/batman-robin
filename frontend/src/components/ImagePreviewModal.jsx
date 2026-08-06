import React, { useState } from 'react';
import Modal from './Modal';
import { Columns, Eye, Image as ImageIcon } from 'lucide-react';

const ImagePreviewModal = ({ isOpen, onClose, title, referenceUrl, submissionUrl, promptNotes }) => {
  const [viewMode, setViewMode] = useState('side_by_side'); // 'side_by_side' or 'single'

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Image Viewer & Inspection'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {referenceUrl && submissionUrl && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              className={`btn ${viewMode === 'side_by_side' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('side_by_side')}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Columns size={16} /> Side-by-Side Comparison
            </button>
            <button 
              className={`btn ${viewMode === 'single' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('single')}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Eye size={16} /> Submission Only
            </button>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: (viewMode === 'side_by_side' && referenceUrl && submissionUrl) ? '1fr 1fr' : '1fr',
          gap: '20px'
        }}>
          {referenceUrl && viewMode === 'side_by_side' && (
            <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--cyan-neon)', marginBottom: '12px', fontSize: '0.95rem' }}>
                <ImageIcon size={16} /> Reference Target Image
              </h4>
              <img 
                src={`http://localhost:5000${referenceUrl}`} 
                alt="Reference Target" 
                style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cyan-glow)' }} 
              />
            </div>
          )}

          {submissionUrl && (
            <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
              <h4 style={{ color: 'var(--batman-gold)', marginBottom: '12px', fontSize: '0.95rem' }}>
                <ImageIcon size={16} /> Team Submitted Final Image
              </h4>
              <img 
                src={`http://localhost:5000${submissionUrl}`} 
                alt="Team Submission" 
                style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--batman-gold-glow)' }} 
              />
            </div>
          )}
        </div>

        {promptNotes && (
          <div className="glass-card" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
            <h4 style={{ color: 'var(--batman-gold)', fontSize: '0.95rem', marginBottom: '8px' }}>Submitted Prompt & Generation Notes</h4>
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {promptNotes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
