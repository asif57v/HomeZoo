import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/apiConfig';

// Derive root socket URL from API_BASE_URL (strip trailing /api)
const socketUrl = (API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
  }
  return socket;
};

export default getSocket;

