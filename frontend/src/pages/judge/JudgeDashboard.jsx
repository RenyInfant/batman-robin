import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import ImagePreviewModal from '../../components/ImagePreviewModal';
import { 
  Award, Eye, ChevronLeft, ChevronRight, Save, CheckCircle, 
  Image as ImageIcon, Sliders, MessageSquare, Clock, Users, ShieldAlert, Loader2
} from 'lucide-react';

// Memoized custom colored range slider component to prevent whole page re-renders
const ScoreSlider = React.memo(({ label, value, max, color, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F1F5F9' }}>{label}</span>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: color,
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${color}`
        }}>
          {value} / {max}
        </span>
      </div>
      <input 
        type="range"
        min="0"
        max={max}
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
          height: '8px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      />
    </div>
  );
});

const JudgeDashboard = () => {
  const { socket } = useSocket();
  const { addNotification } = useToast();

  const [submissions, setSubmissions] = useState([]);
  const [referenceImage, setReferenceImage] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingScore, setSavingScore] = useState(false);

  // Criteria slider states
  const [similarity, setSimilarity] = useState(0); // 0-40 (Blue)
  const [promptQuality, setPromptQuality] = useState(0); // 0-20 (Purple)
  const [visualAccuracy, setVisualAccuracy] = useState(0); // 0-20 (Cyan)
  const [communication, setCommunication] = useState(0); // 0-10 (Green)
  const [strategy, setStrategy] = useState(0); // 0-10 (Orange)
  const [feedback, setFeedback] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST', 'AI_SIM_DESC', 'AI_SIM_ASC', 'OLDEST'

  // Fullscreen Preview Modal
  const [previewImageModal, setPreviewImageModal] = useState({ isOpen: false, url: '', title: '' });

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await api.get('/judge/submissions');
      setSubmissions(res.data.submissions);
      setReferenceImage(res.data.referenceImage);
      setRoundNumber(res.data.roundNumber);
    } catch (err) {
      setError('Failed to fetch team submissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();

    socket.on('submission_uploaded', fetchSubmissions);
    socket.on('submission_replaced', fetchSubmissions);
    socket.on('competition:stageChanged', fetchSubmissions);

    return () => {
      socket.off('submission_uploaded', fetchSubmissions);
      socket.off('submission_replaced', fetchSubmissions);
      socket.off('competition:stageChanged', fetchSubmissions);
    };
  }, [fetchSubmissions, socket]);

  // Sorted Submissions List
  const sortedSubmissions = useMemo(() => {
    const list = [...submissions];
    if (sortBy === 'AI_SIM_DESC') {
      list.sort((a, b) => (b.ai_similarity_score || 0) - (a.ai_similarity_score || 0));
    } else if (sortBy === 'AI_SIM_ASC') {
      list.sort((a, b) => (a.ai_similarity_score || 0) - (b.ai_similarity_score || 0));
    } else if (sortBy === 'OLDEST') {
      list.sort((a, b) => new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0));
    } else {
      // NEWEST
      list.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
    }
    return list;
  }, [submissions, sortBy]);

  // Current active submission
  const currentSub = useMemo(() => {
    return sortedSubmissions[currentIndex] || null;
  }, [sortedSubmissions, currentIndex]);


  // Sync slider inputs when current active submission changes
  useEffect(() => {
    if (currentSub) {
      setSimilarity(currentSub.my_similarity !== undefined && currentSub.my_similarity !== null ? currentSub.my_similarity : 0);
      setPromptQuality(currentSub.my_prompt_accuracy !== undefined && currentSub.my_prompt_accuracy !== null ? currentSub.my_prompt_accuracy : 0);
      setVisualAccuracy(currentSub.my_detail !== undefined && currentSub.my_detail !== null ? currentSub.my_detail : 0);
      setCommunication(currentSub.my_creativity !== undefined && currentSub.my_creativity !== null ? currentSub.my_creativity : 0);
      setStrategy(currentSub.my_overall_quality !== undefined && currentSub.my_overall_quality !== null ? currentSub.my_overall_quality : 0);
      setFeedback(currentSub.my_feedback || '');
    }
  }, [currentSub]);

  // Real-time Total Score calculation (sum = 0 to 100)
  const totalScore = useMemo(() => {
    return parseFloat(((similarity || 0) + (promptQuality || 0) + (visualAccuracy || 0) + (communication || 0) + (strategy || 0)).toFixed(2));
  }, [similarity, promptQuality, visualAccuracy, communication, strategy]);

  const handleSaveScore = async () => {
    if (!currentSub) return;

    setSavingScore(true);
    setError(null);

    try {
      await api.post('/judge/score', {
        submission_id: currentSub.id,
        similarity: similarity,
        prompt_accuracy: promptQuality,
        detail: visualAccuracy,
        creativity: communication,
        overall_quality: strategy,
        feedback: feedback,
        is_draft: 0
      });

      addNotification({
        type: 'success',
        title: 'Score Saved',
        message: `Evaluation for Team '${currentSub.team_name}' saved successfully!`
      });

      fetchSubmissions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save evaluation.');
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save evaluation score.'
      });
    } finally {
      setSavingScore(false);
    }
  };

  const handlePrevTeam = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const handleNextTeam = () => {
    if (currentIndex < submissions.length - 1) setCurrentIndex(prev => prev + 1);
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--batman-gold)' }}>
        <Loader2 size={40} className="spin" style={{ marginBottom: '16px' }} />
        <div>Loading Judge Evaluation Desk...</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <ImageIcon size={48} color="var(--batman-gold)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800 }}>No Submissions Available</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            No team has uploaded a final image for Round {roundNumber} yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Selector Bar */}
      <div className="glass-card" style={{ borderLeft: '6px solid var(--cyan-neon)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--cyan-neon)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
              Judge Evaluation Desk • Round {roundNumber}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
              Team: {currentSub?.team_name} ({currentIndex + 1} of {submissions.length})
            </h2>
          </div>

          {/* Sort & Team Switcher Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sort:</span>
              <select 
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentIndex(0);
                }}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-hover)', border: '1px solid var(--cyan-neon)', color: '#fff', fontSize: '0.85rem' }}
              >
                <option value="NEWEST">Newest First</option>
                <option value="AI_SIM_DESC">AI Similarity (Highest First)</option>
                <option value="AI_SIM_ASC">AI Similarity (Lowest First)</option>
                <option value="OLDEST">Oldest First</option>
              </select>
            </div>

            <select 
              value={currentIndex}
              onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', color: '#fff' }}
            >
              {sortedSubmissions.map((sub, idx) => (
                <option key={sub.id} value={idx}>
                  Team: {sub.team_name} {sub.ai_similarity_score !== undefined && sub.ai_similarity_score !== null ? `(AI: ${sub.ai_similarity_score}%)` : ''} {sub.my_score !== null ? `[Score: ${sub.my_score}]` : '[Pending]'}
                </option>
              ))}
            </select>

            <button onClick={handlePrevTeam} disabled={currentIndex === 0} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={handleNextTeam} disabled={currentIndex === sortedSubmissions.length - 1} className="btn btn-secondary" style={{ padding: '8px 12px' }}>

              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', border: '1px solid var(--robin-red)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
      )}

      {/* MAIN LAYOUT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        
        {/* LEFT COLUMN: IMAGES + PROMPT INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* TOP SECTION: EQUAL SIZE IMAGE CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Reference Image (Left) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--cyan-neon)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} /> Target Reference Image
              </h3>
              {referenceImage ? (
                <div 
                  onClick={() => setPreviewImageModal({ isOpen: true, url: referenceImage.filepath, title: 'Target Reference Image' })}
                  style={{
                    flex: 1,
                    minHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '1px solid var(--cyan-glow)'
                  }}
                >
                  <img 
                    src={`${import.meta.env.VITE_API_URL}${referenceImage.filepath}`} 
                    alt="Reference Image" 
                    style={{ width: '100%', height: '260px', objectFit: 'contain' }} 
                  />
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No reference image uploaded for this round.
                </div>
              )}
            </div>

            {/* Submitted Image (Right) */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--batman-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} /> Submitted Final Image
              </h3>
              {currentSub ? (
                <div 
                  onClick={() => setPreviewImageModal({ isOpen: true, url: currentSub.filepath, title: `Submitted Image - ${currentSub.team_name}` })}
                  style={{
                    flex: 1,
                    minHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '1px solid var(--batman-gold-glow)'
                  }}
                >
                  <img 
                    src={`${import.meta.env.VITE_API_URL}${currentSub.filepath}`} 
                    alt="Team Submission" 
                    style={{ width: '100%', height: '260px', objectFit: 'contain' }} 
                  />
                </div>
              ) : null}
            </div>

          </div>

          {/* MIDDLE SECTION: PROMPT INFORMATION CARD */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="var(--batman-gold)" /> Prompt & Submission Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Team Name</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--batman-gold)' }}>{currentSub?.team_name}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Round</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cyan-neon)' }}>Round {roundNumber}</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attempt Number</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Final Submission #1</div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Submission Time</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{currentSub?.updated_at || currentSub?.submitted_at}</div>
              </div>
            </div>

            {/* OpenCLIP AI Similarity Badge & Disclaimer */}
            {currentSub?.ai_similarity_score !== null && currentSub?.ai_similarity_score !== undefined && (
              <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid var(--cyan-neon)', padding: '14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--cyan-neon)', fontWeight: 700 }}>OpenCLIP AI Similarity Score</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan-neon)', fontFamily: 'monospace' }}>
                    {currentSub.ai_similarity_score}%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  * This score is AI-generated and is provided only as a judging aid.
                </div>
              </div>
            )}


            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Prompt Text & Notes</div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {currentSub?.prompt_notes || 'No prompt notes submitted.'}
              </p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SCORING CONTROLS + FEEDBACK + ACTIONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* LIVE SCORE DISPLAY CARD */}
          <div className="glass-card" style={{ border: '1px solid var(--batman-gold-glow)', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              Live Score Total
            </div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 800,
              color: 'var(--batman-gold)',
              lineHeight: '1.1',
              marginTop: '4px',
              fontFamily: 'monospace',
              textShadow: '0 0 20px var(--batman-gold-glow)'
            }}>
              {totalScore} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ 100</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--cyan-neon)', marginTop: '6px' }}>
              {totalScore >= 90 ? '🌟 Outstanding' : totalScore >= 75 ? '👍 Excellent' : totalScore >= 50 ? '👌 Satisfactory' : '⚠️ Below Average'}
            </div>
          </div>

          {/* COLORED SCORING SLIDERS */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.05rem', color: 'var(--batman-gold)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} /> Evaluation Criteria
            </h3>

            {/* Slider 1: Similarity (0-40) - Blue */}
            <ScoreSlider 
              label="Similarity to Reference" 
              value={similarity} 
              max={40} 
              color="#3B82F6" 
              onChange={setSimilarity} 
            />

            {/* Slider 2: Prompt Quality (0-20) - Purple */}
            <ScoreSlider 
              label="Prompt Quality & Precision" 
              value={promptQuality} 
              max={20} 
              color="#8B5CF6" 
              onChange={setPromptQuality} 
            />

            {/* Slider 3: Visual Accuracy (0-20) - Cyan */}
            <ScoreSlider 
              label="Visual Accuracy & Detail" 
              value={visualAccuracy} 
              max={20} 
              color="#00E5FF" 
              onChange={setVisualAccuracy} 
            />

            {/* Slider 4: Communication (0-10) - Green */}
            <ScoreSlider 
              label="Communication & Clarity" 
              value={communication} 
              max={10} 
              color="#00E676" 
              onChange={setCommunication} 
            />

            {/* Slider 5: Strategy (0-10) - Orange */}
            <ScoreSlider 
              label="Strategy & Composition" 
              value={strategy} 
              max={10} 
              color="#FFB800" 
              onChange={setStrategy} 
            />
          </div>

          {/* FEEDBACK TEXTAREA */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px' }}>
              Evaluator Feedback
            </h3>
            <textarea 
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Optional evaluator notes or feedback..."
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleSaveScore} 
              disabled={savingScore}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              <Save size={18} /> {savingScore ? 'Saving Score...' : currentSub?.my_score !== null ? 'Update Score' : 'Save Score'}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handlePrevTeam} 
                disabled={currentIndex === 0} 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '10px' }}
              >
                <ChevronLeft size={16} /> Previous Team
              </button>
              <button 
                onClick={handleNextTeam} 
                disabled={currentIndex === submissions.length - 1} 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '10px' }}
              >
                Next Team <ChevronRight size={16} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Image Fullscreen Preview Modal */}
      <ImagePreviewModal 
        isOpen={previewImageModal.isOpen}
        onClose={() => setPreviewImageModal({ isOpen: false, url: '', title: '' })}
        title={previewImageModal.title}
        referenceUrl={referenceImage?.filepath}
        submissionUrl={currentSub?.filepath}
        promptNotes={currentSub?.prompt_notes}
      />
    </div>
  );
};

export default JudgeDashboard;
