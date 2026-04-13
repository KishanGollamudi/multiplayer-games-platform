const express = require('express');
const { createGameService } = require('../../../shared/utils/serviceFactory');
const { saveMatchHistory, updateRatings } = require('../../../shared/db');
const { createGame, applyRoll, DEFAULT_BOARD } = require('./game/snakesEngine');

const rooms = new Map();
const queue = [];

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function addPlayer(room, socket) {
  if (!room.players.find((player) => player.id === socket.user.id)) {
    room.players.push({
      id: socket.user.id,
      username: socket.user.username,
      avatarUrl: socket.user.avatarUrl
    });
  }
}

function emitRoom(io, room) {
  io.to(room.code).emit('room:update', {
    code: room.code,
    gameKey: 'snakes',
    players: room.players,
    chat: room.chat.slice(-40),
    timerEndsAt: room.timerEndsAt,
    state: room.state
  });
}

async function finalize(room) {
  if (!room.state || room.state.status !== 'finished' || room.saved) {
    return;
  }
  room.saved = true;
  await updateRatings(
    'snakes',
    room.players.map((player) => ({
      userId: player.id,
      rank: room.state.winnerIds.includes(player.id) ? 1 : 2
    }))
  );
  await saveMatchHistory({
    roomCode: room.code,
    gameKey: 'snakes',
    payload: room.state,
    winners: room.state.winnerIds,
    participants: room.players
  });
}

function resetTimer(io, room) {
  clearTimeout(room.timerId);
  room.timerEndsAt = Date.now() + 30_000;
  room.timerId = setTimeout(async () => {
    const current = room.state.players[room.state.currentPlayerIndex];
    const roll = Math.floor(Math.random() * 6) + 1;
    applyRoll(room.state, current.id, roll);
    emitRoom(io, room);
    await finalize(room);
  }, 30_000);
}

const router = express.Router();
router.get('/info', (req, res) => {
  res.json({ game: 'snakes-and-ladders', rooms: rooms.size, queuedPlayers: queue.length, board: DEFAULT_BOARD });
});

const service = createGameService({
  name: 'snakes-service',
  port: 3004,
  router,
  registerSockets(io) {
    io.on('connection', (socket) => {
      socket.on('room:create', ({ isPrivate = true } = {}) => {
        const room = { code: roomCode(), isPrivate, players: [], chat: [], state: null, timerId: null, timerEndsAt: null, saved: false };
        rooms.set(room.code, room);
        addPlayer(room, socket);
        socket.join(room.code);
        socket.emit('room:joined', { code: room.code, players: room.players, state: room.state });
      });

      socket.on('queue:join', () => {
        if (!queue.includes(socket.id)) {
          queue.push(socket.id);
        }
        if (queue.length >= 2) {
          const room = { code: roomCode(), isPrivate: false, players: [], chat: [], state: null, timerId: null, timerEndsAt: null, saved: false };
          rooms.set(room.code, room);
          queue.splice(0, Math.min(4, queue.length)).forEach((id) => {
            const queuedSocket = io.sockets.sockets.get(id);
            if (queuedSocket) {
              addPlayer(room, queuedSocket);
              queuedSocket.join(room.code);
              queuedSocket.emit('room:joined', { code: room.code, players: room.players, state: room.state });
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
        room.state = createGame(room.players);
        resetTimer(io, room);
        emitRoom(io, room);
      });

      socket.on('snakes:roll', async ({ roomCode: code, roll }) => {
        try {
          const room = rooms.get(code);
          const dice = Number(roll) || Math.floor(Math.random() * 6) + 1;
          applyRoll(room.state, socket.user.id, dice);
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
