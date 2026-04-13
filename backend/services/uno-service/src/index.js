const express = require('express');
const { z } = require('zod');
const { createGameService } = require('../../../shared/utils/serviceFactory');
const { saveMatchHistory, updateRatings } = require('../../../shared/db');
const {
  createInitialState,
  playCard,
  callUno,
  drawForTurn,
  serializeForPlayer
} = require('./game/unoEngine');

const port = 3001;
const rooms = new Map();
const queue = [];

function roomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function visibleRoomState(room, socketUserId) {
  return {
    code: room.code,
    gameKey: 'uno',
    isPrivate: room.isPrivate,
    players: room.players,
    chat: room.chat.slice(-40),
    timerEndsAt: room.timerEndsAt,
    state: serializeForPlayer(room.state, socketUserId)
  };
}

function emitRoom(io, room) {
  room.players.forEach((player) => {
    io.to(player.socketId).emit('room:update', visibleRoomState(room, player.id));
  });
}

async function finishRoom(room) {
  if (room.saved || room.state.status !== 'finished') {
    return;
  }
  room.saved = true;
  const rankedResults = room.players.map((player) => ({
    userId: player.id,
    rank: room.state.winnerIds.includes(player.id) ? 1 : 2
  }));
  await updateRatings('uno', rankedResults);
  await saveMatchHistory({
    roomCode: room.code,
    gameKey: 'uno',
    payload: room.state,
    winners: room.state.winnerIds,
    participants: room.players
  });
}

function resetTimer(io, room) {
  clearTimeout(room.timerId);
  room.timerEndsAt = Date.now() + 30_000;
  room.timerId = setTimeout(async () => {
    try {
      const current = room.state.players[room.state.currentPlayerIndex];
      drawForTurn(room.state, current.id);
      emitRoom(io, room);
    } catch (error) {
      io.to(room.code).emit('room:error', { message: error.message });
    }
  }, 30_000);
}

function addPlayerToRoom(room, socket) {
  const existing = room.players.find((player) => player.id === socket.user.id);
  if (existing) {
    existing.socketId = socket.id;
    return existing;
  }
  const player = {
    id: socket.user.id,
    username: socket.user.username,
    avatarUrl: socket.user.avatarUrl,
    socketId: socket.id
  };
  room.players.push(player);
  return player;
}

const router = express.Router();
router.get('/info', (req, res) => {
  res.json({
    game: 'uno',
    rooms: rooms.size,
    queuedPlayers: queue.length,
    rules: ['skip', 'reverse', 'draw2', 'wild', 'wild4', 'uno-call']
  });
});

const playSchema = z.object({
  roomCode: z.string(),
  cardId: z.string(),
  chosenColor: z.string().optional()
});

const service = createGameService({
  name: 'uno-service',
  port,
  router,
  registerSockets(io) {
    io.on('connection', (socket) => {
      socket.on('room:create', ({ isPrivate = true } = {}) => {
        const code = roomCode();
        const room = {
          code,
          isPrivate,
          players: [],
          chat: [],
          state: null,
          timerId: null,
          timerEndsAt: null,
          saved: false
        };
        rooms.set(code, room);
        addPlayerToRoom(room, socket);
        socket.join(code);
        socket.emit('room:joined', visibleRoomState(room, socket.user.id));
      });

      socket.on('queue:join', () => {
        if (!queue.includes(socket.id)) {
          queue.push(socket.id);
        }
        if (queue.length >= 2) {
          const entrants = queue.splice(0, Math.min(queue.length, 4));
          const code = roomCode();
          const room = {
            code,
            isPrivate: false,
            players: [],
            chat: [],
            state: null,
            timerId: null,
            timerEndsAt: null,
            saved: false
          };
          rooms.set(code, room);
          entrants
            .map((id) => io.sockets.sockets.get(id))
            .filter(Boolean)
            .forEach((queuedSocket) => {
              addPlayerToRoom(room, queuedSocket);
              queuedSocket.join(code);
              queuedSocket.emit('room:joined', visibleRoomState(room, queuedSocket.user.id));
            });
        }
      });

      socket.on('room:join', ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room) {
          return socket.emit('room:error', { message: 'Room not found.' });
        }
        if (room.players.length >= 4 && !room.players.find((player) => player.id === socket.user.id)) {
          return socket.emit('room:error', { message: 'Room is full.' });
        }
        addPlayerToRoom(room, socket);
        socket.join(code);
        emitRoom(io, room);
      });

      socket.on('room:start', async ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room || room.players.length < 2) {
          return socket.emit('room:error', { message: 'At least 2 players required.' });
        }
        room.state = createInitialState(room.players.map(({ socketId, ...player }) => player));
        resetTimer(io, room);
        emitRoom(io, room);
      });

      socket.on('uno:play', async (payload) => {
        try {
          const data = playSchema.parse(payload);
          const room = rooms.get(data.roomCode);
          playCard(room.state, socket.user.id, data.cardId, data.chosenColor);
          resetTimer(io, room);
          emitRoom(io, room);
          await finishRoom(room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('uno:draw', ({ roomCode: code }) => {
        try {
          const room = rooms.get(code);
          drawForTurn(room.state, socket.user.id);
          resetTimer(io, room);
          emitRoom(io, room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('uno:call', ({ roomCode: code }) => {
        const room = rooms.get(code);
        if (!room?.state) {
          return;
        }
        callUno(room.state, socket.user.id);
        emitRoom(io, room);
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
