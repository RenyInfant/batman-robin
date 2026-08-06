let io = null;

function initSocket(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    // Send immediate state to newly connected or reconnected client
    try {
      const { getCompetitionState } = require('./timerService');
      const state = getCompetitionState();
      if (state) {
        socket.emit('competition:state', state);
        socket.emit('competition:timer', {
          stage: state.stage,
          remainingSeconds: state.remainingSeconds || 0,
          totalSeconds: state.totalSeconds || 0,
          roundNumber: state.round_number || 1,
          currentStatus: state.stage === 'PAUSED' ? 'PAUSED' : ((state.remainingSeconds || 0) <= 0 ? 'CLOSED' : 'ACTIVE'),
          timestamp: Date.now()
        });
      }
    } catch (e) {}

    socket.on('request_competition_state', () => {
      try {
        const { getCompetitionState } = require('./timerService');
        const state = getCompetitionState();
        if (state) {
          socket.emit('competition:state', state);
          socket.emit('competition:timer', {
            stage: state.stage,
            remainingSeconds: state.remainingSeconds || 0,
            totalSeconds: state.totalSeconds || 0,
            roundNumber: state.round_number || 1,
            currentStatus: state.stage === 'PAUSED' ? 'PAUSED' : ((state.remainingSeconds || 0) <= 0 ? 'CLOSED' : 'ACTIVE'),
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    });

    socket.on('join_role_room', (data) => {
      if (data && data.role) {
        socket.join(`role_${data.role}`);
      }
    });

    socket.on('disconnect', () => {
      // Client disconnected
    });
  });
}

function getIo() {
  if (!io) {
    console.warn('Socket.io instance requested before initialization');
  }
  return io;
}

function broadcast(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
}

function broadcastToRole(role, event, payload) {
  if (io) {
    io.to(`role_${role}`).emit(event, payload);
  }
}

module.exports = {
  initSocket,
  getIo,
  broadcast,
  broadcastToRole
};
