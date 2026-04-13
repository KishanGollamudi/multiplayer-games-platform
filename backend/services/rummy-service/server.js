const express = require('express');
const { z } = require('zod');
const { createGameService } = require('../../shared/utils/serviceFactory');
const { saveMatchHistory, updateRatings } = require('../../shared/db');
const {
  createGame,
  drawCard,
  discardCard,
  declareGame,
  serializeState,
  normalizeMelds
} = require('./gameLogic');

const rooms = new Map();
const queue = [];

function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function addPlayer(room, socket) {
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

function roomView(room, viewerId) {
  return {
    code: room.code,
    gameKey: 'rummy',
    players: room.players.map(({ socketId, ...player }) => player),
    timerEndsAt: room.timerEndsAt,
    chat: room.chat.slice(-40),
    state: room.state ? serializeState(room.state, viewerId) : null
  };
}

function emitRoom(io, room) {
  room.players.forEach((player) => {
    io.to(player.socketId).emit('room:update', roomView(room, player.id));
  });
}

async function finalizeRoom(room) {
  if (!room.state || room.state.status !== 'finished' || room.saved) {
    return;
  }

  room.saved = true;
  await updateRatings(
    'rummy',
    room.players.map((player) => ({
      userId: player.id,
      rank: room.state.winnerIds.includes(player.id) ? 1 : 2
    }))
  );
  await saveMatchHistory({
    roomCode: room.code,
    gameKey: 'rummy',
    payload: room.state,
    winners: room.state.winnerIds,
    participants: room.players.map(({ socketId, ...player }) => player)
  });
}

function resetTimer(io, room) {
  clearTimeout(room.timerId);
  room.timerEndsAt = Date.now() + 30_000;
  room.timerId = setTimeout(async () => {
    if (!room.state || room.state.status !== 'playing') {
      return;
    }

    try {
      const player = room.state.players[room.state.currentPlayerIndex];
      if (!room.state.hasDrawn) {
        drawCard(room.state, player.id, 'deck');
      }
      const fallbackCard = room.state.hands[player.id][room.state.hands[player.id].length - 1];
      discardCard(room.state, player.id, fallbackCard.id);
      emitRoom(io, room);
    } catch (error) {
      io.to(room.code).emit('room:error', { message: error.message });
    }
  }, 30_000);
}

const drawSchema = z.object({
  roomCode: z.string(),
  source: z.enum(['deck', 'discard'])
});

const discardSchema = z.object({
  roomCode: z.string(),
  cardId: z.string()
});

const declareSchema = z.object({
  roomCode: z.string(),
  melds: z.array(z.array(z.string()))
});

const router = express.Router();
router.get('/info', (req, res) => {
  res.json({
    game: 'rummy',
    variant: 'Indian Rummy',
    players: '2-4',
    handSize: 13,
    rooms: rooms.size,
    queuedPlayers: queue.length
  });
});

const service = createGameService({
  name: 'rummy-service',
  port: 3005,
  router,
  registerSockets(io) {
    io.on('connection', (socket) => {
      socket.on('room:create', ({ isPrivate = true } = {}) => {
        const room = {
          code: createRoomCode(),
          isPrivate,
          players: [],
          state: null,
          chat: [],
          timerId: null,
          timerEndsAt: null,
          saved: false
        };
        rooms.set(room.code, room);
        addPlayer(room, socket);
        socket.join(room.code);
        socket.emit('room:joined', roomView(room, socket.user.id));
      });

      socket.on('queue:join', () => {
        if (!queue.includes(socket.id)) {
          queue.push(socket.id);
        }

        if (queue.length >= 2) {
          const room = {
            code: createRoomCode(),
            isPrivate: false,
            players: [],
            state: null,
            chat: [],
            timerId: null,
            timerEndsAt: null,
            saved: false
          };
          rooms.set(room.code, room);
          queue.splice(0, Math.min(queue.length, 4)).forEach((socketId) => {
            const queuedSocket = io.sockets.sockets.get(socketId);
            if (!queuedSocket) {
              return;
            }
            addPlayer(room, queuedSocket);
            queuedSocket.join(room.code);
            queuedSocket.emit('room:joined', roomView(room, queuedSocket.user.id));
          });
        }
      });

      socket.on('room:join', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) {
          return socket.emit('room:error', { message: 'Room not found.' });
        }
        if (room.players.length >= 4 && !room.players.find((player) => player.id === socket.user.id)) {
          return socket.emit('room:error', { message: 'Room is full.' });
        }
        addPlayer(room, socket);
        socket.join(roomCode);
        emitRoom(io, room);
      });

      socket.on('room:start', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room || room.players.length < 2) {
          return socket.emit('room:error', { message: 'Rummy needs at least 2 players.' });
        }
        room.state = createGame(room.players.map(({ socketId, ...player }) => player));
        resetTimer(io, room);
        emitRoom(io, room);
      });

      socket.on('rummy:draw', ({ roomCode, source }) => {
        try {
          const payload = drawSchema.parse({ roomCode, source });
          const room = rooms.get(payload.roomCode);
          drawCard(room.state, socket.user.id, payload.source);
          resetTimer(io, room);
          emitRoom(io, room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('rummy:discard', ({ roomCode, cardId }) => {
        try {
          const payload = discardSchema.parse({ roomCode, cardId });
          const room = rooms.get(payload.roomCode);
          discardCard(room.state, socket.user.id, payload.cardId);
          resetTimer(io, room);
          emitRoom(io, room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('rummy:declare', async ({ roomCode, melds }) => {
        try {
          const payload = declareSchema.parse({ roomCode, melds });
          const room = rooms.get(payload.roomCode);
          declareGame(room.state, socket.user.id, normalizeMelds(payload.melds));
          clearTimeout(room.timerId);
          emitRoom(io, room);
          await finalizeRoom(room);
        } catch (error) {
          socket.emit('room:error', { message: error.message });
        }
      });

      socket.on('chat:send', ({ roomCode, text }) => {
        const room = rooms.get(roomCode);
        if (!room || !text?.trim()) {
          return;
        }
        room.chat.push({
          id: uuid(),
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

function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

service.start();
