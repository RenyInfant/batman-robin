import React, { createContext, useContext, useEffect, useState } from 'react';
import { socket, joinRoleRoom } from '../services/socket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { addNotification } = useToast();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      if (user && user.role) {
        joinRoleRoom(user.role);
      }
      socket.emit('request_competition_state');
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Discrete notification handlers (STRICTLY EXCLUDING TIMER EVENTS)
    socket.on('competition:stageChanged', (data) => {
      addNotification({
        type: 'info',
        title: 'Stage Changed',
        message: data?.message || `Stage updated to ${data?.stage}`
      });
    });

    socket.on('competition:submissionLocked', (data) => {
      addNotification({
        type: 'warning',
        title: 'Submission Closed',
        message: data?.message || 'Submissions are now closed.'
      });
    });

    socket.on('submission_uploaded', (data) => {
      addNotification({
        type: 'success',
        title: 'Submission Received',
        message: data?.message || 'Team image submission received.'
      });
    });

    socket.on('submission_replaced', (data) => {
      addNotification({
        type: 'success',
        title: 'Submission Replaced',
        message: data?.message || 'Team replaced their submission image.'
      });
    });

    socket.on('judge_score_updated', (data) => {
      addNotification({
        type: 'award',
        title: 'Score Evaluated',
        message: data?.message || 'Evaluation published by judge.'
      });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('competition:stageChanged');
      socket.off('competition:submissionLocked');
      socket.off('submission_uploaded');
      socket.off('submission_replaced');
      socket.off('judge_score_updated');
    };
  }, [user, addNotification]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
