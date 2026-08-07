import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL;

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
