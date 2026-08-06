import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from './AuthContext';

const CompetitionContext = createContext(null);

export const CompetitionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchState = async () => {
    try {
      const res = await api.get('/competition/state');
      if (res.data && res.data.state) {
        setState(res.data.state);
        setRemainingSeconds(res.data.state.remainingSeconds || 0);
      }
    } catch (err) {
      console.error('Failed to fetch competition state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchState();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // SINGLE SOURCE OF TRUTH: Direct server socket updates only
  useEffect(() => {
    function onCompetitionTimer(timerPayload) {
      if (timerPayload) {
        setRemainingSeconds(timerPayload.remainingSeconds);
        setState(prevState => {
          if (!prevState) return prevState;
          return {
            ...prevState,
            stage: timerPayload.stage || prevState.stage,
            round_number: timerPayload.roundNumber || prevState.round_number,
            remainingSeconds: timerPayload.remainingSeconds,
            totalSeconds: timerPayload.totalSeconds || prevState.totalSeconds
          };
        });
      }
    }

    function onFullStateUpdate(newState) {
      if (newState) {
        setState(newState);
        if (newState.remainingSeconds !== undefined) {
          setRemainingSeconds(newState.remainingSeconds);
        }
      }
    }

    function onStageOrLockChange() {
      fetchState();
    }

    // High Priority Server Sync Listeners
    socket.on('competition:timer', onCompetitionTimer);
    socket.on('competition:state', onFullStateUpdate);
    socket.on('competition:stageChanged', onStageOrLockChange);
    socket.on('competition:submissionLocked', onStageOrLockChange);
    
    // Legacy fallback listeners
    socket.on('timer_tick', (data) => {
      if (data && data.remainingSeconds !== undefined) {
        setRemainingSeconds(data.remainingSeconds);
      }
    });
    socket.on('competition_started', onStageOrLockChange);
    socket.on('competition_reset', onStageOrLockChange);
    socket.on('competition_paused', onStageOrLockChange);
    socket.on('competition_resumed', onStageOrLockChange);
    socket.on('competition_finished', onStageOrLockChange);

    return () => {
      socket.off('competition:timer', onCompetitionTimer);
      socket.off('competition:state', onFullStateUpdate);
      socket.off('competition:stageChanged', onStageOrLockChange);
      socket.off('competition:submissionLocked', onStageOrLockChange);
      socket.off('timer_tick');
      socket.off('competition_started', onStageOrLockChange);
      socket.off('competition_reset', onStageOrLockChange);
      socket.off('competition_paused', onStageOrLockChange);
      socket.off('competition_resumed', onStageOrLockChange);
      socket.off('competition_finished', onStageOrLockChange);
    };
  }, []);

  return (
    <CompetitionContext.Provider value={{ state, remainingSeconds, loading, refreshState: fetchState }}>
      {children}
    </CompetitionContext.Provider>
  );
};

export const useCompetition = () => useContext(CompetitionContext);
