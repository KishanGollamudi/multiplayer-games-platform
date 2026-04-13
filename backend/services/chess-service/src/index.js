const express = require('express');
const { createGameService } = require('../../../shared/utils/serviceFactory');
const { saveMatchHistory, updateRatings } = require('../../../shared/db');
const { createMatch, movePiece, autoMoveLoss } = require('./game/chessEngine');

const rooms = new Map();
const queue = [];

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function roomView(room) {
  return {
    code: room.code,
    gameKey: 'chess',
    players: room.players,
    chat: room.chat.slice(-40),
    timerEndsAt: room.timerEndsAt,
    state: room.state
      ? {
          ...room.state,
          chess: undefined
        }
      : null
  };
}

function emitRoom(io, room) {
  io.to(room.code).emit('room:update', roomView(room));
}

async function finalize(room) {
  if (!room.state || room.state.status !== 'finished' || room.saved) {
    return;
  }
  room.saved = true;
  await updateRatings(
    'chess',
    room.players.map((player) => ({
      userId: player.id,
      rank: room.state.winnerIds.length === 0 ? 1 : room.state.winnerIds.includes(player.id) ? 1 : 2
    }))
  );
  await saveMatchHistory({
    roomCode: room.code,
    gameKey: 'chess',
    payload: roomView(room).state,
    winners: room.state.winnerIds,
    participants: room.players
  });
}

function resetTimer(io, room) {
  clearTimeout(room.timerId);
  room.timerEndsAt = Date.now() + 30_000;
  room.timerId = setTimeout(async () => {
    autoMoveLoss(room.state);
    emitRoom(io, room);
    await finalize(room);
  }, 30_000);
}

function addPlayer(room, socket) {
  if (room.players.find((player) => player.id === socket.user.id)) {
    return;
  }
  room.players.push({
    id: socket.user.id,
    username: socket.user.username,
    avatarUrl: socket.user.avatarUrl
  });
}

const router = express.Router();
router.get('/info', (req, res) => {
  res.json({ game: 'chess', rooms: rooms.size, queuedPlayers: queue.length, library: 'chess.js' });
});

const service = createGameService({
  name: 'chess-service',
  port: 3003,
  router,
  registerSockets(io) {
    io.on('connection', (socket) => {
      socket.on('room:create', ({ isPrivate = true } = {}) => {
        const room = { code: roomCode(), isPrivate, players: [], chat: [], state: null, timerId: null, timerEndsAt: null, saved: false };
        rooms.set(room.code, room);
        addPlayer(room, socket);
        socket.join(room.code);
        socket.emit('room:joined', roomView(room));
      });

      socket.on('queue:join', () => {
        if (!queue.includes(socket.id)) {
          queue.push(socket.id);
        }
        if (queue.length >= 2) {
          const room = { code: roomCode(), isPrivate: false, players: [], chat: [], state: null, timerId: null, timerEndsAt: null, saved: false };
          rooms.set(room.code, room);
          queue.splice(0, 2).forEach((id) => {
            const queuedSocket = io.sockets.sockets.get(id);
            if (queuedSocket) {
              addPlayer(room, queuedSocket);
              queuedSocket.join(room.code);
              queuedSocket.emit('room:joined', roomView(room));
            }
          });
        }
      });

      socket.on('room:join', ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room) {
          return socket.emit('room:error', { message: 'Room not found.' });
        }
        if (room.players.length >= 2 && !room.players.find((player) => player.id === socket.user.id)) {
          return socket.emit('room:error', { message: 'Room is full.' });
        }
        addPlayer(room, socket);
        socket.join(code);
        emitRoom(io, room);
      });

      socket.on('room:start', ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room || room.players.length !== 2) {
          return socket.emit('room:error', { message: 'Chess requires 2 players.' });
        }
        room.state = createMatch(room.players);
        resetTimer(io, room);
        emitRoom(io, room);
      });

      socket.on('chess:move', async ({ roomCode: code, from, to, promotion }) => {
        try {
          const room = rooms.get(code);
          movePiece(room.state, socket.user.id, from, to, promotion);
          if (room.state.status === 'finished') {
            await finalize(room);
          } else {
            resetTimer(io, room);
          }
          emitRoom(io, room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('chat:send', ({ roomCode: code, text }) => {
        const room = rooms.get(code);
        if (!room || !text?.trim()) {
          return;
        }
        room.chat.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: socket.user.id,
          username: socket.user.username,
          text: text.slice(0, 300),
          createdAt: Date.now()
        });
        emitRoom(io, room);
      });
    });
  }
});

service.start();
