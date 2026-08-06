import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const recentMessagesRef = useRef(new Map());

  const addNotification = useCallback(({ type = 'info', title = '', message = '' }) => {
    if (!message) return;

    // Deduplicate identical messages within 2 seconds
    const now = Date.now();
    const msgKey = `${type}:${message}`;
    const lastSeen = recentMessagesRef.current.get(msgKey);
    if (lastSeen && (now - lastSeen < 2000)) {
      return;
    }
    recentMessagesRef.current.set(msgKey, now);

    const id = `toast_${now}_${Math.random().toString(36).substr(2, 6)}`;

    setToasts(prev => {
      const nextToasts = [...prev, { id, type, title, message, isExiting: false }];
      if (nextToasts.length > 4) {
        return nextToasts.slice(nextToasts.length - 4);
      }
      return nextToasts;
    });
  }, []);

  const removeNotification = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addNotification, removeNotification }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
