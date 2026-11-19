import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socket = null;
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};
export default getSocket;
