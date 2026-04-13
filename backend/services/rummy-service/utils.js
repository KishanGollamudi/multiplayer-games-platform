const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUE = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 1]));

function cardLabel(card) {
  return `${card.rank}-${card.suit}-${card.deckIndex}`;
}

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    }
    return RANK_VALUE[a.rank] - RANK_VALUE[b.rank];
  });
}

function isSameCard(a, b) {
  return a.rank === b.rank && a.suit === b.suit && a.deckIndex === b.deckIndex;
}

function groupByRank(cards) {
  return cards.reduce((acc, card) => {
    acc[card.rank] ||= [];
    acc[card.rank].push(card);
    return acc;
  }, {});
}

function countJokers(cards, jokerRank) {
  return cards.filter((card) => card.rank === jokerRank).length;
}

function withoutJokers(cards, jokerRank) {
  return cards.filter((card) => card.rank !== jokerRank);
}

function isValidSet(cards, jokerRank) {
  if (cards.length < 3 || cards.length > 4) {
    return false;
  }

  const nonJokers = withoutJokers(cards, jokerRank);
  if (nonJokers.length === 0) {
    return false;
  }

  const rank = nonJokers[0].rank;
  const uniqueSuits = new Set(nonJokers.map((card) => card.suit));
  return nonJokers.every((card) => card.rank === rank) && uniqueSuits.size === nonJokers.length;
}

function isValidSequence(cards, jokerRank, { allowJokers = true } = {}) {
  if (cards.length < 3) {
    return false;
  }

  const jokers = allowJokers ? countJokers(cards, jokerRank) : 0;
  const nonJokers = allowJokers ? withoutJokers(cards, jokerRank) : cards;
  if (nonJokers.length === 0) {
    return false;
  }

  const suit = nonJokers[0].suit;
  if (!nonJokers.every((card) => card.suit === suit)) {
    return false;
  }

  const ordered = [...nonJokers].sort((a, b) => RANK_VALUE[a.rank] - RANK_VALUE[b.rank]);
  let gaps = 0;

  for (let i = 1; i < ordered.length; i += 1) {
    const diff = RANK_VALUE[ordered[i].rank] - RANK_VALUE[ordered[i - 1].rank];
    if (diff <= 0) {
      return false;
    }
    gaps += diff - 1;
  }

  return gaps <= jokers;
}

function validateDeclaration(melds, jokerRank) {
  let pureSequences = 0;
  let validMelds = 0;
  let deadwood = [];

  for (const meld of melds) {
    if (isValidSequence(meld, jokerRank, { allowJokers: false })) {
      pureSequences += 1;
      validMelds += 1;
      continue;
    }
    if (isValidSequence(meld, jokerRank, { allowJokers: true }) || isValidSet(meld, jokerRank)) {
      validMelds += 1;
      continue;
    }
    deadwood = deadwood.concat(meld);
  }

  const isValid = pureSequences >= 1 && validMelds === melds.length;
  return {
    isValid,
    pureSequences,
    deadwood,
    score: isValid ? 0 : deadwood.reduce((sum, card) => sum + Math.min(RANK_VALUE[card.rank], 10), 0)
  };
}

module.exports = {
  SUITS,
  RANKS,
  RANK_VALUE,
  cardLabel,
  sortCards,
  isSameCard,
  groupByRank,
  isValidSet,
  isValidSequence,
  validateDeclaration
};
