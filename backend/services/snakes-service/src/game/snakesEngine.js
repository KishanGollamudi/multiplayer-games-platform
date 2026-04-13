const DEFAULT_BOARD = {
  ladders: { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 },
  snakes: { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 }
};

function createGame(players) {
  return {
    players: players.map((player) => ({
      ...player,
      position: 0
    })),
    board: DEFAULT_BOARD,
    currentPlayerIndex: 0,
    lastRoll: null,
    status: 'playing',
    winnerIds: [],
    turnStartedAt: Date.now(),
    lastAction: 'Game started'
  };
}

function applyRoll(state, userId, roll) {
  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== userId) {
    throw new Error('Not your turn.');
  }
  let nextPosition = current.position + roll;
  if (nextPosition > 100) {
    nextPosition = current.position;
  } else if (state.board.ladders[nextPosition]) {
    nextPosition = state.board.ladders[nextPosition];
  } else if (state.board.snakes[nextPosition]) {
    nextPosition = state.board.snakes[nextPosition];
  }

  current.position = nextPosition;
  state.lastRoll = roll;
  state.lastAction = `${current.username} rolled ${roll}`;
  state.turnStartedAt = Date.now();

  if (nextPosition === 100) {
    state.status = 'finished';
    state.winnerIds = [current.id];
    return state;
  }

  if (roll !== 6) {
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }
  return state;
}

module.exports = {
  DEFAULT_BOARD,
  createGame,
  applyRoll
};
