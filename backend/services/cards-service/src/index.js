const express = require('express');
const { createGameService } = require('../../../shared/utils/serviceFactory');
const { saveMatchHistory, updateRatings } = require('../../../shared/db');
const {
  createRound,
  hit,
  stand,
  resolveDealer,
  serializeForPlayer
} = require('./game/blackjackEngine');

const rooms = new Map();
const queue = [];

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getVisibleRoom(room) {
  return {
    code: room.code,
    gameKey: 'cards',
    gameName: 'Blackjack',
    players: room.players,
    chat: room.chat.slice(-40),
    timerEndsAt: room.timerEndsAt,
    state: room.state ? serializeForPlayer(room.state) : null
  };
}

function emitRoom(io, room) {
  io.to(room.code).emit('room:update', getVisibleRoom(room));
}

async function finalizeRoom(room) {
  if (!room.state || room.state.phase !== 'finished' || room.saved) {
    return;
  }
  room.saved = true;
  await updateRatings(
    'cards',
    room.players.map((player) => ({
      userId: player.id,
      rank: room.state.winnerIds.includes(player.id) ? 1 : 2
    }))
  );
  await saveMatchHistory({
    roomCode: room.code,
    gameKey: 'cards',
    payload: room.state,
    winners: room.state.winnerIds,
    participants: room.players
  });
}

function resetTimer(io, room) {
  clearTimeout(room.timerId);
  room.timerEndsAt = Date.now() + 30_000;
  room.timerId = setTimeout(async () => {
    if (!room.state || room.state.phase !== 'player-turns') {
      return;
    }
    const current = room.state.players[room.state.currentPlayerIndex];
    if (!current) {
      return;
    }
    stand(room.state, current.id);
    if (room.state.phase === 'dealer-turn') {
      resolveDealer(room.state);
      await finalizeRoom(room);
    }
    emitRoom(io, room);
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
  res.json({ game: 'blackjack', rooms: rooms.size, queuedPlayers: queue.length, minPlayers: 2, maxPlayers: 4 });
});

const service = createGameService({
  name: 'cards-service',
  port: 3002,
  router,
  registerSockets(io) {
    io.on('connection', (socket) => {
      socket.on('room:create', ({ isPrivate = true } = {}) => {
        const room = { code: roomCode(), isPrivate, players: [], state: null, chat: [], timerId: null, timerEndsAt: null, saved: false };
        rooms.set(room.code, room);
        addPlayer(room, socket);
        socket.join(room.code);
        socket.emit('room:joined', getVisibleRoom(room));
      });

      socket.on('queue:join', () => {
        if (!queue.includes(socket.id)) {
          queue.push(socket.id);
        }
        if (queue.length >= 2) {
          const room = { code: roomCode(), isPrivate: false, players: [], state: null, chat: [], timerId: null, timerEndsAt: null, saved: false };
          rooms.set(room.code, room);
          queue.splice(0, Math.min(4, queue.length)).forEach((socketId) => {
            const queuedSocket = io.sockets.sockets.get(socketId);
            if (queuedSocket) {
              addPlayer(room, queuedSocket);
              queuedSocket.join(room.code);
              queuedSocket.emit('room:joined', getVisibleRoom(room));
            }
          });
        }
      });

      socket.on('room:join', ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room) {
          return socket.emit('room:error', { message: 'Room not found.' });
        }
        addPlayer(room, socket);
        socket.join(code);
        emitRoom(io, room);
      });

      socket.on('room:start', ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room || room.players.length < 2) {
          return socket.emit('room:error', { message: 'At least 2 players required.' });
        }
        room.state = createRound(room.players);
        resetTimer(io, room);
        emitRoom(io, room);
      });

      socket.on('cards:hit', async ({ roomCode: code }) => {
        try {
          const room = rooms.get(code);
          hit(room.state, socket.user.id);
          if (room.state.phase === 'dealer-turn') {
            resolveDealer(room.state);
            await finalizeRoom(room);
          } else {
            resetTimer(io, room);
          }
          emitRoom(io, room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('cards:stand', async ({ roomCode: code }) => {
        try {
          const room = rooms.get(code);
          stand(room.state, socket.user.id);
          if (room.state.phase === 'dealer-turn') {
            resolveDealer(room.state);
            await finalizeRoom(room);
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
