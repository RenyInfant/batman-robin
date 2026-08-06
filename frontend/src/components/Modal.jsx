import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        animation: 'slide-in 0.25s ease'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: 'var(--batman-gold)', fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
