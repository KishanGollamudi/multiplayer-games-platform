const COLORS = ['red', 'yellow', 'green', 'blue'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

function makeCard(color, value) {
  return { id: `${color}-${value}-${Math.random().toString(36).slice(2, 8)}`, color, value };
}

function createDeck() {
  const deck = [];

  for (const color of COLORS) {
    deck.push(makeCard(color, '0'));
    for (let i = 1; i <= 9; i += 1) {
      deck.push(makeCard(color, String(i)));
      deck.push(makeCard(color, String(i)));
    }
    for (const action of ['skip', 'reverse', 'draw2']) {
      deck.push(makeCard(color, action));
      deck.push(makeCard(color, action));
    }
  }

  for (let i = 0; i < 4; i += 1) {
    deck.push({ id: `wild-${i}-${Math.random().toString(36).slice(2, 8)}`, color: 'wild', value: 'wild' });
    deck.push({ id: `wild4-${i}-${Math.random().toString(36).slice(2, 8)}`, color: 'wild', value: 'wild4' });
  }

  return shuffle(deck);
}

function shuffle(items) {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function nextIndex(state, jumps = 1) {
  const size = state.players.length;
  let index = state.currentPlayerIndex;
  for (let i = 0; i < jumps; i += 1) {
    index = (index + state.direction + size) % size;
  }
  return index;
}

function topMatches(card, topCard, currentColor) {
  return (
    card.color === 'wild' ||
    card.color === currentColor ||
    card.value === topCard.value
  );
}

function createInitialState(players) {
  const deck = createDeck();
  const hands = {};
  players.forEach((player) => {
    hands[player.id] = deck.splice(0, 7);
  });

  let discardTop = deck.shift();
  while (discardTop.color === 'wild') {
    deck.push(discardTop);
    discardTop = deck.shift();
  }

  return {
    players,
    hands,
    drawPile: deck,
    discardPile: [discardTop],
    currentPlayerIndex: 0,
    direction: 1,
    currentColor: discardTop.color,
    started: true,
    status: 'playing',
    winnerIds: [],
    pendingDraw: 0,
    unoCalledBy: {},
    lastAction: `${players[0].username} starts`,
    turnStartedAt: Date.now()
  };
}

function replenishIfNeeded(state) {
  if (state.drawPile.length > 0) {
    return;
  }
  const top = state.discardPile.pop();
  state.drawPile = shuffle(state.discardPile);
  state.discardPile = [top];
}

function advanceTurn(state, steps = 1) {
  state.currentPlayerIndex = nextIndex(state, steps);
  state.turnStartedAt = Date.now();
}

function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function drawCards(state, userId, count) {
  replenishIfNeeded(state);
  const hand = state.hands[userId];
  for (let i = 0; i < count; i += 1) {
    replenishIfNeeded(state);
    if (!state.drawPile.length) {
      break;
    }
    hand.push(state.drawPile.shift());
  }
}

function playCard(state, userId, cardId, chosenColor) {
  if (state.status !== 'playing') {
    throw new Error('Game already finished.');
  }
  if (getCurrentPlayer(state).id !== userId) {
    throw new Error('Not your turn.');
  }

  const hand = state.hands[userId];
  const index = hand.findIndex((card) => card.id === cardId);
  if (index === -1) {
    throw new Error('Card not found.');
  }

  const card = hand[index];
  const topCard = state.discardPile[state.discardPile.length - 1];
  if (!topMatches(card, topCard, state.currentColor)) {
    throw new Error('Card cannot be played.');
  }

  hand.splice(index, 1);
  state.discardPile.push(card);
  state.currentColor = card.color === 'wild' ? chosenColor || 'red' : card.color;
  state.lastAction = `${getCurrentPlayer(state).username} played ${card.color} ${card.value}`;

  if (hand.length === 1 && !state.unoCalledBy[userId]) {
    drawCards(state, userId, 2);
    state.lastAction = `${getCurrentPlayer(state).username} forgot to call UNO and drew 2 cards`;
  }

  if (hand.length === 1) {
    state.lastAction = `${getCurrentPlayer(state).username} has one card left`;
  }

  if (hand.length === 0) {
    state.status = 'finished';
    state.winnerIds = [userId];
    return state;
  }

  if (card.value === 'skip') {
    advanceTurn(state, 2);
  } else if (card.value === 'reverse') {
    state.direction *= -1;
    advanceTurn(state, state.players.length === 2 ? 2 : 1);
  } else if (card.value === 'draw2') {
    const nextPlayer = state.players[nextIndex(state)];
    drawCards(state, nextPlayer.id, 2);
    advanceTurn(state, 2);
  } else if (card.value === 'wild4') {
    const nextPlayer = state.players[nextIndex(state)];
    drawCards(state, nextPlayer.id, 4);
    advanceTurn(state, 2);
  } else {
    advanceTurn(state, 1);
  }

  return state;
}

function callUno(state, userId) {
  state.unoCalledBy[userId] = true;
  state.lastAction = `${state.players.find((player) => player.id === userId)?.username || 'Player'} called UNO`;
  return state;
}

function drawForTurn(state, userId) {
  if (getCurrentPlayer(state).id !== userId) {
    throw new Error('Not your turn.');
  }
  drawCards(state, userId, 1);
  state.lastAction = `${getCurrentPlayer(state).username} drew a card`;
  advanceTurn(state, 1);
  return state;
}

function serializeForPlayer(state, userId) {
  return {
    ...state,
    hands: Object.fromEntries(
      Object.entries(state.hands).map(([playerId, cards]) => [playerId, playerId === userId ? cards : cards.length])
    )
  };
}

module.exports = {
  COLORS,
  VALUES,
  createDeck,
  createInitialState,
  playCard,
  callUno,
  drawForTurn,
  serializeForPlayer
};
