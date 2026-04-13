import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import Button from '../components/Button';
import ChatPanel from '../components/ChatPanel';
import { games } from '../services/games';
import { useSocketRoom } from '../hooks/useSocketRoom';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

function RoomControls({ gameKey, socket, room }) {
  const [joinCode, setJoinCode] = useState('');

  return (
    <div className="glass rounded-[28px] p-5">
      <h2 className="font-display text-2xl">Room Controls</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Button onClick={() => socket.emit('room:create', { isPrivate: true })}>Create Private Room</Button>
        <Button onClick={() => socket.emit('queue:join')}>Join Public Queue</Button>
        <div className="flex gap-2 md:col-span-2">
          <input
            className="min-w-0 flex-1 rounded-2xl bg-white/10 px-4 py-3 outline-none"
            placeholder="Invite code"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
          />
          <Button onClick={() => socket.emit('room:join', { roomCode: joinCode })}>Join Room</Button>
        </div>
        <Button className="md:col-span-2 bg-emerald-500/70" disabled={!room?.code} onClick={() => socket.emit('room:start', { roomCode: room.code })}>
          Start Match
        </Button>
      </div>
    </div>
  );
}

function renderUno(room, socket, user) {
  if (!room || !room.state) return <div className="glass rounded-[28px] p-5">Waiting for game...</div>;
  const playerHand = Array.isArray(room.state.hands?.[user?.id]) ? room.state.hands[user.id] : [];
  return (
    <div className="grid gap-4">
      <div className="glass rounded-[28px] p-5">
        <div className="text-sm text-white/70">Current color: {room.state.currentColor}</div>
        <div className="mt-4 flex flex-wrap gap-3">
          {playerHand.map((card) => (
            <button
              key={card.id}
              className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-6 text-left"
              onClick={() => socket.emit('uno:play', { roomCode: room.code, cardId: card.id, chosenColor: 'red' })}
            >
              <div className="font-semibold">{card.color}</div>
              <div className="text-xl font-bold">{card.value}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => socket.emit('uno:draw', { roomCode: room.code })}>Draw</Button>
          <Button onClick={() => socket.emit('uno:call', { roomCode: room.code })}>Call UNO</Button>
        </div>
      </div>
    </div>
  );
}

function renderBlackjack(room, socket) {
  if (!room || !room.state) return <div className="glass rounded-[28px] p-5">Waiting for game...</div>;
  return (
    <div className="glass rounded-[28px] p-5">
      <div className="text-sm text-white/70">Dealer</div>
      <div className="mt-3 flex flex-wrap gap-3">
        {(room.state.dealer?.hand || []).map((card, index) => (
          <div key={`${card.id}-${index}`} className="rounded-[22px] bg-white/10 px-4 py-6">
            {card.rank}{card.suit}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={() => socket.emit('cards:hit', { roomCode: room.code })}>Hit</Button>
        <Button onClick={() => socket.emit('cards:stand', { roomCode: room.code })}>Stand</Button>
      </div>
    </div>
  );
}

function renderChess(room, socket, user) {
  if (!room || !room.state) return <div className="glass rounded-[28px] p-5">Waiting for game...</div>;
  const orientation = room.players?.[0]?.id === user?.id ? 'white' : 'black';
  return (
    <div className="glass rounded-[28px] p-5">
      <Chessboard
        id="platform-chessboard"
        position={room.state.fen || 'start'}
        boardWidth={560}
        customDarkSquareStyle={{ backgroundColor: '#0f766e' }}
        customLightSquareStyle={{ backgroundColor: '#d1fae5' }}
        boardOrientation={orientation}
        onPieceDrop={(from, to) => {
          socket.emit('chess:move', { roomCode: room.code, from, to, promotion: 'q' });
          return true;
        }}
      />
    </div>
  );
}

function renderSnakes(room, socket) {
  if (!room || !room.state) {
    return <div className="glass rounded-[28px] p-5">Waiting for game to start...</div>;
  }
  const positions = room.state.players || [];
  return (
    <div className="grid gap-4">
      <div className="glass rounded-[28px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl">Board</h3>
          <Button onClick={() => socket.emit('snakes:roll', { roomCode: room.code })}>Roll Dice</Button>
        </div>
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: 100 }, (_, index) => 100 - index).map((cell) => (
            <div key={cell} className="board-cell bg-white/5">
              <div>{cell}</div>
              <div className="text-[10px] text-emerald-300">
                {positions.filter((player) => player.position === cell).map((player) => player.username[0]).join(',')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RummyPanel({ room, socket, user }) {
  if (!room || !room.state) return <div className="glass rounded-[28px] p-5">Waiting for game...</div>;
  const playerHand = Array.isArray(room.state.hands?.[user?.id]) ? room.state.hands[user.id] : [];
  const [meldText, setMeldText] = useState('');
  return (
    <div className="grid gap-4">
      <div className="glass rounded-[28px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/70">Wild joker rank: {room.state.jokerRank || 'n/a'}</div>
            <div className="text-sm text-white/70">Top discard: {room.state.topDiscard ? `${room.state.topDiscard.rank} ${room.state.topDiscard.suit}` : 'empty'}</div>
          </div>
          <div className="text-sm text-white/70">Draw pile: {room.state.drawPileCount ?? 0}</div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => socket.emit('rummy:draw', { roomCode: room.code, source: 'deck' })}>Draw Deck</Button>
          <Button onClick={() => socket.emit('rummy:draw', { roomCode: room.code, source: 'discard' })}>Draw Discard</Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {playerHand.map((card) => (
            <button
              key={card.id}
              className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-6 text-left"
              onClick={() => socket.emit('rummy:discard', { roomCode: room.code, cardId: card.id })}
            >
              <div className="font-semibold">{card.rank}</div>
              <div className="text-sm text-white/70">{card.suit}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          <textarea
            className="min-h-28 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm outline-none"
            value={meldText}
            onChange={(event) => setMeldText(event.target.value)}
            placeholder='Declare melds as JSON card-id groups, e.g. [["id1","id2","id3"],["id4","id5","id6"]]'
          />
          <Button
            className="bg-fuchsia-500/60"
            onClick={() => {
              try {
                socket.emit('rummy:declare', { roomCode: room.code, melds: JSON.parse(meldText || '[]') });
              } catch {
                socket.emit('room:error', { message: 'Declaration JSON is invalid.' });
              }
            }}
          >
            Declare
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function GameRoom() {
  const { gameKey } = useParams();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const pushToast = useAppStore((state) => state.pushToast);
  const { socket, room, error } = useSocketRoom(gameKey, token);
  const game = useMemo(() => games.find((item) => item.key === gameKey), [gameKey]);

  // Auto-create a room when socket connects and no room exists
  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => {
      console.log('Socket connected, auto-creating room');
      socket.emit('room:create', { isPrivate: true });
    };
    if (socket.connected) {
      handleConnect();
    } else {
      socket.on('connect', handleConnect);
      return () => socket.off('connect', handleConnect);
    }
  }, [socket]);

  // Debug: log room updates
  useEffect(() => {
    if (room) {
      console.log('Room updated:', room);
    }
  }, [room]);

  useEffect(() => {
    if (error) {
      pushToast({ title: 'Room event', message: error });
      console.error('Socket error:', error);
    }
  }, [error, pushToast]);

  if (!game) {
    return <div className="p-8">Unknown game.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="glass rounded-[32px] p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/55">{game.subtitle}</p>
            <h1 className="font-display text-4xl">{game.title}</h1>
          </div>
          <div className="text-sm text-white/70">
            Timer: {room?.timerEndsAt ? `${Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000))}s` : 'idle'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.5fr_0.8fr]">
        <RoomControls gameKey={gameKey} socket={socket} room={room} />
        {gameKey === 'uno' ? renderUno(room, socket, user) : null}
        {gameKey === 'cards' ? renderBlackjack(room, socket) : null}
        {gameKey === 'chess' ? renderChess(room, socket, user) : null}
        {gameKey === 'snakes' ? renderSnakes(room, socket) : null}
        {gameKey === 'rummy' ? <RummyPanel room={room} socket={socket} user={user} /> : null}
        <ChatPanel roomCode={room?.code} chat={room?.chat} onSend={(text) => socket.emit('chat:send', { roomCode: room?.code, text })} />
      </div>
    </div>
  );
}
