const { v4: uuidv4 } = require('uuid');
const { RANKS, SUITS, cardLabel, isSameCard, sortCards, validateDeclaration } = require('./utils');

function createDeck() {
  const deck = [];

  for (let deckIndex = 0; deckIndex < 2; deckIndex += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: uuidv4(),
          rank,
          suit,
          deckIndex
        });
      }
    }
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function createGame(players) {
  const deck = createDeck();
  const hands = {};

  players.forEach((player) => {
    hands[player.id] = sortCards(deck.splice(0, 13));
  });

  const jokerCard = deck.shift();
  const discardPile = [deck.shift()];

  return {
    players,
    hands,
    drawPile: deck,
    discardPile,
    jokerRank: jokerCard.rank,
    currentPlayerIndex: 0,
    hasDrawn: false,
    status: 'playing',
    winnerIds: [],
    turnStartedAt: Date.now(),
    lastAction: `Wild joker rank is ${jokerCard.rank}`,
    scores: Object.fromEntries(players.map((player) => [player.id, 0]))
  };
}

function currentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function nextTurn(state) {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.hasDrawn = false;
  state.turnStartedAt = Date.now();
}

function drawCard(state, userId, source = 'deck') {
  if (state.status !== 'playing') {
    throw new Error('Game finished.');
  }
  if (currentPlayer(state).id !== userId) {
    throw new Error('Not your turn.');
  }
  if (state.hasDrawn) {
    throw new Error('You already drew this turn.');
  }

  let card;
  if (source === 'discard') {
    card = state.discardPile.pop();
  } else {
    card = state.drawPile.shift();
  }

  if (!card) {
    throw new Error('No card available to draw.');
  }

  state.hands[userId].push(card);
  state.hands[userId] = sortCards(state.hands[userId]);
  state.hasDrawn = true;
  state.lastAction = `${currentPlayer(state).username} drew from ${source}`;
  return card;
}

function discardCard(state, userId, cardId) {
  if (state.status !== 'playing') {
    throw new Error('Game finished.');
  }
  if (currentPlayer(state).id !== userId) {
    throw new Error('Not your turn.');
  }
  if (!state.hasDrawn) {
    throw new Error('Draw before discarding.');
  }

  const hand = state.hands[userId];
  const index = hand.findIndex((card) => card.id === cardId);
  if (index === -1) {
    throw new Error('Card not found.');
  }

  const [card] = hand.splice(index, 1);
  state.discardPile.push(card);
  state.lastAction = `${currentPlayer(state).username} discarded ${cardLabel(card)}`;
  nextTurn(state);
  return card;
}

function declareGame(state, userId, meldCardIds) {
  if (state.status !== 'playing') {
    throw new Error('Game finished.');
  }
  if (currentPlayer(state).id !== userId) {
    throw new Error('Only the active player can declare.');
  }

  const hand = state.hands[userId];
  const used = new Set();
  const melds = meldCardIds.map((group) =>
    group.map((cardId) => {
      if (used.has(cardId)) {
        throw new Error('Duplicate card in declaration.');
      }
      const card = hand.find((item) => item.id === cardId);
      if (!card) {
        throw new Error('Declared card not in hand.');
      }
      used.add(cardId);
      return card;
    })
  );

  const result = validateDeclaration(melds, state.jokerRank);
  if (!result.isValid) {
    state.scores[userId] = result.score;
    throw new Error(`Invalid declaration. Deadwood score ${result.score}.`);
  }

  state.status = 'finished';
  state.winnerIds = [userId];
  state.lastAction = `${currentPlayer(state).username} declared valid Rummy`;

  state.players.forEach((player) => {
    if (player.id === userId) {
      state.scores[player.id] = 0;
      return;
    }
    const penalty = state.hands[player.id].reduce((sum, card) => {
      if (card.rank === state.jokerRank) {
        return sum;
      }
      return sum + Math.min(RANKS.indexOf(card.rank) + 1, 10);
    }, 0);
    state.scores[player.id] = penalty;
  });

  return result;
}

function serializeState(state, userId) {
  return {
    ...state,
    topDiscard: state.discardPile[state.discardPile.length - 1] || null,
    drawPileCount: state.drawPile.length,
    hands: Object.fromEntries(
      Object.entries(state.hands).map(([playerId, cards]) => [playerId, playerId === userId ? cards : cards.length])
    )
  };
}

function normalizeMelds(rawMelds) {
  if (!Array.isArray(rawMelds)) {
    throw new Error('Melds must be an array.');
  }
  return rawMelds.map((group) => {
    if (!Array.isArray(group) || group.length < 3) {
      throw new Error('Each meld must contain at least 3 cards.');
    }
    return group;
  });
}

module.exports = {
  createDeck,
  createGame,
  drawCard,
  discardCard,
  declareGame,
  serializeState,
  normalizeMelds
};
