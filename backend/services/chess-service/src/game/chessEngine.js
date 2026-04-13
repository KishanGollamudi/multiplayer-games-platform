const { Chess } = require('chess.js');

function createMatch(players) {
  const chess = new Chess();
  return {
    players,
    chess,
    fen: chess.fen(),
    history: [],
    turn: 'w',
    status: 'playing',
    winnerIds: [],
    turnStartedAt: Date.now(),
    lastAction: 'Match started'
  };
}

function playerColor(state, userId) {
  const index = state.players.findIndex((player) => player.id === userId);
  return index === 0 ? 'w' : index === 1 ? 'b' : null;
}

function movePiece(state, userId, from, to, promotion = 'q') {
  if (state.status !== 'playing') {
    throw new Error('Match finished.');
  }
  if (playerColor(state, userId) !== state.chess.turn()) {
    throw new Error('Not your turn.');
  }
  const move = state.chess.move({ from, to, promotion });
  if (!move) {
    throw new Error('Illegal move.');
  }
  state.fen = state.chess.fen();
  state.history = state.chess.history({ verbose: true });
  state.turn = state.chess.turn();
  state.turnStartedAt = Date.now();
  state.lastAction = `${state.players.find((player) => player.id === userId)?.username || 'Player'} moved ${from}-${to}`;

  if (state.chess.isCheckmate()) {
    state.status = 'finished';
    state.winnerIds = [userId];
  } else if (state.chess.isDraw() || state.chess.isStalemate() || state.chess.isThreefoldRepetition()) {
    state.status = 'finished';
    state.winnerIds = [];
  }
  return state;
}

function autoMoveLoss(state) {
  const loser = state.players.find((player) => playerColor(state, player.id) === state.chess.turn());
  const winner = state.players.find((player) => player.id !== loser?.id);
  state.status = 'finished';
  state.winnerIds = winner ? [winner.id] : [];
  state.lastAction = `${loser?.username || 'Player'} flagged on time`;
}

module.exports = {
  createMatch,
  movePiece,
  autoMoveLoss
};
