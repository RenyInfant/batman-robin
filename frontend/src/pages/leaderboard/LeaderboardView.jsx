import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Award, Download, FileText, Table, Eye, Lock, ShieldAlert } from 'lucide-react';
import Modal from '../../components/Modal';

const LeaderboardView = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [leaderboard, setLeaderboard] = useState([]);
  const [judges, setJudges] = useState([]);
  const [leaderboardMode, setLeaderboardMode] = useState('Live');
  const [roundNumber, setRoundNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detailTeam, setDetailTeam] = useState(null);

  // STRICT SECURITY GUARD: Teams must NEVER see the leaderboard
  if (user?.role === 'team') {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', border: '1px solid var(--robin-red)' }}>
          <ShieldAlert size={48} color="var(--robin-red)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', color: 'var(--robin-red)', fontWeight: 800 }}>ACCESS DENIED</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            The Leaderboard is strictly reserved for Admins and Judges. Teams cannot view scores or rankings.
          </p>
        </div>
      </div>
    );
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/judge/leaderboard');
      setLeaderboard(res.data.results);
      setJudges(res.data.judges);
      setLeaderboardMode(res.data.leaderboardMode);
      setRoundNumber(res.data.roundNumber);
    } catch (err) {
      setError('Failed to fetch real-time leaderboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    function onLeaderboardUpdate(data) {
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      } else {
        fetchLeaderboard();
      }
    }

    socket.on('leaderboard_updated', onLeaderboardUpdate);
    socket.on('judge_score_updated', fetchLeaderboard);

    return () => {
      socket.off('leaderboard_updated', onLeaderboardUpdate);
      socket.off('judge_score_updated', fetchLeaderboard);
    };
  }, []);

  const downloadExport = (type) => {
    const token = localStorage.getItem('gotham_auth_token');
    const url =`${import.meta.env.VITE_API_URL}/api/export/${type}?round=${roundNumber}&token=${token}`;
    window.open(url, '_blank');
  };

  const isHiddenMode = leaderboardMode === 'Hidden' && user?.role !== 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner */}
      <div className="glass-card" style={{ borderLeft: '6px solid var(--batman-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--batman-gold)', textTransform: 'uppercase', fontWeight: 800 }}>
              Live Standings • Round {roundNumber}
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
              Official Leaderboard & Rankings
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--cyan-neon)', marginTop: '2px' }}>
              Mode: {leaderboardMode} (Real-Time Socket.IO Synchronization Active)
            </div>
          </div>

          {user?.role === 'admin' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => downloadExport('csv')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <Download size={16} /> CSV
              </button>
              <button onClick={() => downloadExport('excel')} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <Table size={16} /> Excel
              </button>
              <button onClick={() => downloadExport('pdf')} className="btn btn-cyan" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                <FileText size={16} /> PDF Report
              </button>
            </div>
          )}
        </div>
      </div>

      {isHiddenMode ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <Lock size={48} color="var(--batman-gold)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--batman-gold)' }}>Leaderboard is Currently Hidden</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Admin has set Leaderboard visibility mode to 'Hidden'. Scores are recorded internally and will be revealed during the final ceremony.
          </p>
        </div>
      ) : (
        <div className="glass-card table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team Name</th>
                <th>Members</th>
                <th>Average Score</th>
                <th>Total Score</th>
                <th>Submission Time</th>
                <th>Judge Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.team_id} style={{
                  background: row.rank === 1 ? 'rgba(255, 184, 0, 0.08)' : row.rank === 2 ? 'rgba(0, 229, 255, 0.05)' : 'transparent'
                }}>
                  <td>
                    {row.rank === 1 ? (
                      <span className="badge badge-competition" style={{ fontSize: '0.9rem' }}>🥇 #1 WINNER</span>
                    ) : row.rank === 2 ? (
                      <span className="badge badge-observation" style={{ fontSize: '0.9rem' }}>🥈 #2</span>
                    ) : row.rank === 3 ? (
                      <span className="badge badge-idle" style={{ fontSize: '0.9rem', color: 'var(--batman-gold)' }}>🥉 #3</span>
                    ) : (
                      <strong style={{ color: 'var(--text-muted)' }}>#{row.rank}</strong>
                    )}
                  </td>

                  <td style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                    {row.team_name}
                  </td>

                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {row.members}
                  </td>

                  <td>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--batman-gold)' }}>
                      {row.average_score} / 100
                    </span>
                  </td>

                  <td style={{ fontWeight: 700, color: 'var(--cyan-neon)' }}>
                    {row.total_score} pts ({row.score_count} judge evaluations)
                  </td>

                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {row.submitted_at}
                  </td>

                  <td>
                    <button onClick={() => setDetailTeam(row)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      <Eye size={14} /> Scores ({row.score_count})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Judge Breakdown Modal */}
      {detailTeam && (
        <Modal isOpen={!!detailTeam} onClose={() => setDetailTeam(null)} title={`Judge Scoring Breakdown: ${detailTeam.team_name}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Final Score</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--batman-gold)' }}>{detailTeam.average_score} / 100</div>
            </div>

            <h4 style={{ fontSize: '1rem', color: 'var(--cyan-neon)' }}>Individual Judge Evaluation Scores</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {judges.map(j => {
                const score = detailTeam.judge_scores[j.id];
                return (
                  <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, color: '#fff' }}>Judge: {j.username}</div>
                    <div style={{ fontWeight: 800, color: score !== undefined ? 'var(--batman-gold)' : 'var(--text-dark)' }}>
                      {score !== undefined ? `${score} / 100` : 'Not Evaluated'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LeaderboardView;
