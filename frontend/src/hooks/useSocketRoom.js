import { useEffect, useMemo, useState } from 'react';
import { connectSocket } from '../services/socket';

export function useSocketRoom(gameKey, token) {
  const socket = useMemo(() => (token ? connectSocket(gameKey, token) : null), [gameKey, token]);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleJoined = (payload) => setRoom(payload);
    const handleUpdate = (payload) => setRoom(payload);
    const handleError = (payload) => setError(payload.message);

    socket.on('room:joined', handleJoined);
    socket.on('room:update', handleUpdate);
    socket.on('room:error', handleError);

    return () => {
      socket.off('room:joined', handleJoined);
      socket.off('room:update', handleUpdate);
      socket.off('room:error', handleError);
    };
  }, [socket]);

  return { socket, room, setRoom, error, setError };
}
