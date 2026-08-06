import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useCompetition } from '../../context/CompetitionContext';
import { 
  Sparkles, Play, Award, BarChart2, ShieldAlert, CheckCircle, 
  Cpu, Layers, Filter, Download, Table, FileText, ToggleLeft, ToggleRight, Loader2, Save
} from 'lucide-react';

const AiEvaluation = () => {
  const { socket } = useSocket();
  const { state, refreshState } = useCompetition();

  const [aiData, setAiData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Filters & Hybrid Config
  const [rankFilter, setRankFilter] = useState('ALL'); // 'ALL', 'TOP5', 'TOP10', 'TOP20'
  const [hybridEnabled, setHybridEnabled] = useState(false);
  const [judgeWeight, setJudgeWeight] = useState(70);
  const [aiWeight, setAiWeight] = useState(30);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchAiDataAndHealth = async () => {
    try {
      const [dataRes, healthRes] = await Promise.all([
        api.get('/admin/ai-eval/data'),
        api.get('/admin/ai-eval/health')
      ]);

      setAiData(dataRes.data);
      setHealth(healthRes.data.health);

      if (dataRes.data?.settings) {
        setHybridEnabled(dataRes.data.settings.hybrid_scoring_enabled);
        setJudgeWeight(parseFloat(dataRes.data.settings.judge_weight));
        setAiWeight(parseFloat(dataRes.data.settings.ai_weight));
      }
    } catch (err) {
      setError('Failed to fetch AI evaluation parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiDataAndHealth();

    socket.on('ai_eval_progress', (data) => {
      setEvaluating(true);
      setProgress(data);
    });

    socket.on('ai_eval_completed', (data) => {
      setEvaluating(false);
      setProgress(null);
      setMessage(data.message);
      fetchAiDataAndHealth();
    });

    return () => {
      socket.off('ai_eval_progress');
      socket.off('ai_eval_completed');
    };
  }, [socket]);

  const handleRunAiEvaluation = async () => {
    setEvaluating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.post('/admin/ai-eval/run');
      setMessage(res.data.message);
      fetchAiDataAndHealth();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'AI Evaluation failed');
    } finally {
      setEvaluating(false);
      setProgress(null);
    }
  };

  const handleSaveHybridSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    setError(null);

    try {
      await api.put('/admin/settings', {
        hybrid_scoring_enabled: hybridEnabled ? 'ON' : 'OFF',
        judge_weight: String(judgeWeight),
        ai_weight: String(aiWeight)
      });
      setMessage('Hybrid scoring weights updated successfully!');
      refreshState();
      fetchAiDataAndHealth();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update hybrid settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const downloadExport = (type) => {
    const token = localStorage.getItem('gotham_auth_token');
    const url = `http://localhost:5000/api/export/${type}?round=${aiData?.roundNumber || 1}&token=${token}`;
    window.open(url, '_blank');
  };

  // Filter results for Top 5, Top 10, Top 20
  const displayedResults = (aiData?.results || []).slice(0, 
    rankFilter === 'TOP5' ? 5 : rankFilter === 'TOP10' ? 10 : rankFilter === 'TOP20' ? 20 : aiData?.results?.length
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div className="glass-card" style={{ borderLeft: '6px solid var(--cyan-neon)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--cyan-neon)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>
              OpenCLIP AI Assistant Hub • Round {aiData?.roundNumber || 1}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              AI Assisted Preliminary Evaluation Dashboard
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Automatic image similarity analysis using OpenCLIP neural embeddings (Judging Assistance Tool).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge ${health?.status === 'ONLINE' ? 'badge-finished' : 'badge-paused'}`}>
              <Cpu size={14} /> Service: {health?.service || 'OpenCLIP Python'} ({health?.device || 'CPU'})
            </span>

            <button 
              onClick={handleRunAiEvaluation} 
              disabled={evaluating} 
              className="btn btn-cyan"
            >
              {evaluating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {evaluating ? 'Evaluating Submissions...' : 'Run AI Evaluation'}
            </button>
          </div>
        </div>
      </div>

      {message && <div style={{ background: 'rgba(0, 230, 118, 0.15)', color: 'var(--green-neon)', border: '1px solid var(--green-neon)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{message}</div>}
      {error && <div style={{ background: 'rgba(230, 57, 70, 0.15)', color: 'var(--robin-red)', border: '1px solid var(--robin-red)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

      {/* Real-time Progress Bar */}
      {evaluating && (
        <div className="glass-card" style={{ border: '1px solid var(--cyan-neon)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--cyan-neon)' }}>
            <span>Evaluating Team Submissions with OpenCLIP...</span>
            <span>{progress ? `${progress.processedCount} / ${progress.totalCount} images (${progress.percentage}%)` : 'Processing...'}</span>
          </div>
          <div style={{ background: 'rgba(15,23,42,0.8)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${progress?.percentage || 10}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--cyan-neon) 0%, var(--batman-gold) 100%)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* TOP SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average AI Similarity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cyan-neon)', marginTop: '4px' }}>
            {aiData?.metrics?.average_similarity || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px' }}>Across {aiData?.totalTeamsEvaluated || 0} teams</div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highest Similarity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--batman-gold)', marginTop: '4px' }}>
            {aiData?.metrics?.highest_similarity || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px' }}>Top matching submission</div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lowest Similarity</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--robin-red)', marginTop: '4px' }}>
            {aiData?.metrics?.lowest_similarity || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px' }}>Baseline deviation</div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Submissions Evaluated</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
            {aiData?.totalTeamsEvaluated || 0} / {aiData?.totalSubmissions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px' }}>Round {aiData?.roundNumber || 1} Total</div>
        </div>
      </div>

      {/* OPTIONAL HYBRID SCORING CONFIGURATION */}
      <div className="glass-card" style={{ border: '1px solid var(--border-highlight)' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--batman-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} /> Hybrid Scoring Settings (Optional)
        </h3>

        <form onSubmit={handleSaveHybridSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setHybridEnabled(!hybridEnabled)} 
                style={{ background: 'none', border: 'none', color: hybridEnabled ? 'var(--green-neon)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 700 }}
              >
                {hybridEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                Hybrid Scoring: {hybridEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
              </button>
            </div>

            {hybridEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Judge Weight (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={judgeWeight} 
                    onChange={e => {
                      const jw = parseFloat(e.target.value) || 0;
                      setJudgeWeight(jw);
                      setAiWeight(100 - jw);
                    }} 
                    style={{ width: '100px', padding: '6px 10px' }} 
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Weight (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={aiWeight} 
                    onChange={e => {
                      const aw = parseFloat(e.target.value) || 0;
                      setAiWeight(aw);
                      setJudgeWeight(100 - aw);
                    }} 
                    style={{ width: '100px', padding: '6px 10px' }} 
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingSettings} style={{ padding: '8px 16px', marginTop: '16px' }}>
                  <Save size={16} /> Save Weights
                </button>
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            When Hybrid Scoring is OFF, rankings are determined 100% by Judge Evaluations. When ON, Final Score = (Judge Score × {judgeWeight}%) + (AI Similarity × {aiWeight}%).
          </div>
        </form>
      </div>

      {/* RANKINGS & LEADERBOARD TABLE */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="var(--batman-gold)" /> OpenCLIP AI Preliminary Rankings & Leaderboard
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Filter Selector (Top 5, Top 10, Top 20, All) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'TOP5', 'TOP10', 'TOP20'].map(filter => (
                <button 
                  key={filter} 
                  onClick={() => setRankFilter(filter)} 
                  className={`btn ${rankFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {filter === 'ALL' ? 'All Teams' : filter}
                </button>
              ))}
            </div>

            {/* Export Actions */}
            <button onClick={() => downloadExport('csv')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Download size={14} /> CSV
            </button>
            <button onClick={() => downloadExport('excel')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <Table size={14} /> Excel
            </button>
            <button onClick={() => downloadExport('pdf')} className="btn btn-cyan" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>AI Rank</th>
                <th>Team Name</th>
                <th>Members</th>
                <th>OpenCLIP AI Similarity %</th>
                <th>Judge Score</th>
                <th>Final Score</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {displayedResults.map((row) => (
                <tr key={row.team_id}>
                  <td>
                    {row.ai_rank === 1 ? (
                      <span className="badge badge-competition">🥇 #1 AI Rank</span>
                    ) : row.ai_rank === 2 ? (
                      <span className="badge badge-observation">🥈 #2</span>
                    ) : row.ai_rank === 3 ? (
                      <span className="badge badge-idle" style={{ color: 'var(--batman-gold)' }}>🥉 #3</span>
                    ) : (
                      <strong style={{ color: 'var(--text-muted)' }}>#{row.ai_rank}</strong>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: '#fff' }}>{row.team_name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{row.members}</td>
                  <td>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cyan-neon)' }}>
                      {row.similarity_score}%
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--batman-gold)' }}>
                    {row.judge_score} / 100
                  </td>
                  <td style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                    {row.final_score} {hybridEnabled ? '(Hybrid)' : ''}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.submitted_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AiEvaluation;
