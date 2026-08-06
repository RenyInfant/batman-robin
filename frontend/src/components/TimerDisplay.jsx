import React from 'react';
import { Clock } from 'lucide-react';

const formatTime = (totalSeconds) => {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TimerDisplay = ({ remainingSeconds, totalSeconds = 0, stage }) => {
  const formatted = formatTime(remainingSeconds);
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.max(0, (remainingSeconds / totalSeconds) * 100)) : 0;

  const isUrgent = remainingSeconds <= 60 && remainingSeconds > 0;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '16px',
      background: 'rgba(15, 23, 42, 0.8)',
      padding: '12px 20px',
      borderRadius: 'var(--radius-md)',
      border: isUrgent ? '1px solid var(--robin-red)' : '1px solid var(--border-color)',
      boxShadow: isUrgent ? '0 0 15px var(--robin-red-glow)' : 'var(--shadow-main)'
    }}>
      <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <circle 
            cx="24" cy="24" r="20" fill="none" 
            stroke={isUrgent ? 'var(--robin-red)' : stage === 'OBSERVATION' ? 'var(--cyan-neon)' : 'var(--batman-gold)'} 
            strokeWidth="4"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 - (125.6 * progressPercent) / 100}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <Clock size={20} color={isUrgent ? 'var(--robin-red)' : 'var(--batman-gold)'} style={{ position: 'absolute' }} />
      </div>

      <div>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          {stage === 'OBSERVATION' ? 'Observation Time Left' : stage === 'COMPETITION' ? 'Competition Time Left' : 'Round Timer'}
        </div>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: '800', 
          fontFamily: 'monospace', 
          color: isUrgent ? 'var(--robin-red)' : 'var(--batman-gold)',
          lineHeight: '1'
        }}>
          {formatted}
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;
