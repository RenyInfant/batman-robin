import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export const joinRoleRoom = (role) => {
  if (socket && role) {
    socket.emit('join_role_room', { role });
  }
};
