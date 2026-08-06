import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { History, Award, Image as ImageIcon, Calendar } from 'lucide-react';
import ImagePreviewModal from '../../components/ImagePreviewModal';

const RoundHistory = () => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    async function fetchRounds() {
      try {
        const res = await api.get('/competition/rounds');
        setRounds(res.data.rounds);
      } catch (err) {
        setError('Failed to fetch historical rounds.');
      } finally {
        setLoading(false);
      }
    }
    fetchRounds();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--batman-gold)' }}>Historical Rounds Archive</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Review reference images, total team submissions, and historical round stages.</p>
      </div>

      {error && <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {rounds.map(r => (
          <div key={r.id} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="badge badge-observation">Round {r.round_number}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.created_at}</span>
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{r.title || `Round ${r.round_number}`}</h3>

            {r.ref_filepath ? (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <img 
                  src={`http://localhost:5000${r.ref_filepath}`} 
                  alt="Reference Image" 
                  style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} 
                />
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(15,23,42,0.5)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', marginBottom: '16px' }}>
                No Reference Image Archived
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div>Submissions: <strong style={{ color: 'var(--batman-gold)' }}>{r.total_submissions}</strong></div>
              <div>Stage: <strong style={{ color: 'var(--cyan-neon)' }}>{r.stage}</strong></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoundHistory;
