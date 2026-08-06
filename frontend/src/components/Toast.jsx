import React, { useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { Bell, Award, CheckCircle, AlertTriangle, Zap, X } from 'lucide-react';

const ToastItem = ({ toast, onDismiss }) => {
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id]);

  let icon = <Bell size={18} color="var(--batman-gold)" />;
  let borderColor = 'var(--batman-gold)';

  if (toast.type === 'success' || toast.type?.includes('score')) {
    icon = <CheckCircle size={18} color="var(--green-neon)" />;
    borderColor = 'var(--green-neon)';
  } else if (toast.type === 'award' || toast.type?.includes('leaderboard')) {
    icon = <Award size={18} color="var(--cyan-neon)" />;
    borderColor = 'var(--cyan-neon)';
  } else if (toast.type === 'warning' || toast.type === 'error') {
    icon = <AlertTriangle size={18} color="var(--robin-red)" />;
    borderColor = 'var(--robin-red)';
  }

  return (
    <div 
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      style={{
        background: 'var(--bg-card)',
        borderLeft: `4px solid ${borderColor}`,
        borderTop: '1px solid var(--border-color)',
        borderRight: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)',
        color: 'var(--text-main)',
        padding: '14px 18px',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        maxWidth: '420px',
        width: '100%',
        willChange: 'transform, opacity',
        transform: toast.isExiting ? 'translate3d(120%, 0, 0)' : 'translate3d(0, 0, 0)',
        opacity: toast.isExiting ? 0 : 1,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon}
        <div>
          {toast.title && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{toast.title}</div>}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{toast.message}</div>
        </div>
      </div>

      <button 
        onClick={() => onDismiss(toast.id)} 
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          transition: 'color 0.15s ease'
        }}
        title="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};

const Toast = () => {
  const { toasts, removeNotification } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onDismiss={removeNotification} />
        </div>
      ))}
    </div>
  );
};

export default Toast;
