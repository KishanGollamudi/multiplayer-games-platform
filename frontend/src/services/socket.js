import { io } from 'socket.io-client';

// Direct connection to each game service
const SERVICES = {
  uno: 3001,
  cards: 3002,
  chess: 3003,
  snakes: 3004,
  rummy: 3005
};

const sockets = new Map();

export function connectSocket(gameKey, token) {
  if (sockets.has(gameKey)) return sockets.get(gameKey);
  const port = SERVICES[gameKey];
  const url = `http://54.87.255.157:${port}`;
  console.log(`Connecting to ${url}`);
  const socket = io(url, {
    autoConnect: true,
    auth: { token }
  });
  socket.on('connect', () => console.log(`${gameKey} socket connected`));
  socket.on('connect_error', (err) => console.error(`${gameKey} socket error:`, err));
  sockets.set(gameKey, socket);
  // Auto-create a room on connection
  socket.on('connect', () => {
    setTimeout(() => {
      console.log('Auto-creating room for', gameKey);
      socket.emit('room:create', { isPrivate: true });
    }, 500);
  });
  return socket;
}
