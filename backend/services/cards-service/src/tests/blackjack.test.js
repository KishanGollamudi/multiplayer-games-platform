const test = require('node:test');
const assert = require('node:assert/strict');
const { handValue, createRound, hit, stand, resolveDealer } = require('../game/blackjackEngine');

test('Blackjack ace adjusts to avoid bust', () => {
  assert.equal(handValue([{ rank: 'A' }, { rank: '9' }, { rank: '8' }]), 18);
});

test('Blackjack round resolves winners', () => {
  const state = createRound([{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }]);
  state.players[0].hand = [{ rank: '10' }, { rank: '9' }];
  state.players[1].hand = [{ rank: '10' }, { rank: '6' }];
  state.dealer.hand = [{ rank: '10' }, { rank: '7' }];
  stand(state, 'a');
  stand(state, 'b');
  resolveDealer(state);
  assert.equal(state.players[0].result, 'win');
});
