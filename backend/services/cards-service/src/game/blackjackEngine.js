const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}-${Math.random().toString(36).slice(2, 8)}`, rank, suit });
    }
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

function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function createRound(players) {
  const deck = createDeck();
  const state = {
    players: players.map((player) => ({
      ...player,
      hand: [deck.shift(), deck.shift()],
      status: 'playing',
      result: null
    })),
    dealer: {
      hand: [deck.shift(), deck.shift()]
    },
    deck,
    currentPlayerIndex: 0,
    phase: 'player-turns',
    turnStartedAt: Date.now(),
    winnerIds: [],
    lastAction: 'Round started'
  };
  return state;
}

function currentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function advanceTurn(state) {
  while (state.currentPlayerIndex < state.players.length) {
    const player = state.players[state.currentPlayerIndex];
    if (player.status === 'playing') {
      return;
    }
    state.currentPlayerIndex += 1;
  }
  state.phase = 'dealer-turn';
}

function hit(state, userId) {
  const player = currentPlayer(state);
  if (!player || player.id !== userId || state.phase !== 'player-turns') {
    throw new Error('Not your turn.');
  }
  player.hand.push(state.deck.shift());
  const value = handValue(player.hand);
  state.lastAction = `${player.username} hit`;
  if (value > 21) {
    player.status = 'busted';
    player.result = 'loss';
    state.currentPlayerIndex += 1;
    advanceTurn(state);
  }
  state.turnStartedAt = Date.now();
  return state;
}

function stand(state, userId) {
  const player = currentPlayer(state);
  if (!player || player.id !== userId || state.phase !== 'player-turns') {
    throw new Error('Not your turn.');
  }
  player.status = 'stood';
  state.lastAction = `${player.username} stood`;
  state.currentPlayerIndex += 1;
  advanceTurn(state);
  state.turnStartedAt = Date.now();
  return state;
}

function resolveDealer(state) {
  state.phase = 'dealer-turn';
  while (handValue(state.dealer.hand) < 17) {
    state.dealer.hand.push(state.deck.shift());
  }
  const dealerValue = handValue(state.dealer.hand);
  state.phase = 'finished';
  state.winnerIds = [];

  for (const player of state.players) {
    const playerValue = handValue(player.hand);
    if (playerValue > 21) {
      player.result = 'loss';
      continue;
    }
    if (dealerValue > 21 || playerValue > dealerValue) {
      player.result = 'win';
      state.winnerIds.push(player.id);
    } else if (playerValue === dealerValue) {
      player.result = 'push';
    } else {
      player.result = 'loss';
    }
  }
  state.lastAction = 'Dealer resolved the table';
  return state;
}

function serializeForPlayer(state) {
  return {
    ...state,
    dealer: {
      hand:
        state.phase === 'finished'
          ? state.dealer.hand
          : [state.dealer.hand[0], { id: 'hidden', rank: '?', suit: '?' }]
    }
  };
}

module.exports = {
  createDeck,
  handValue,
  createRound,
  hit,
  stand,
  resolveDealer,
  serializeForPlayer
};
