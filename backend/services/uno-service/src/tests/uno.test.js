const test = require('node:test');
const assert = require('node:assert/strict');
const { createInitialState, playCard, callUno } = require('../game/unoEngine');

test('UNO reverse changes direction', () => {
  const players = [
    { id: 'a', username: 'A' },
    { id: 'b', username: 'B' },
    { id: 'c', username: 'C' }
  ];
  const state = createInitialState(players);
  state.hands.a = [
    { id: 'r1', color: state.currentColor, value: 'reverse' },
    { id: 'spare', color: state.currentColor, value: '1' }
  ];
  state.discardPile = [{ id: 'base', color: state.currentColor, value: '5' }];
  playCard(state, 'a', 'r1');
  assert.equal(state.direction, -1);
  assert.equal(state.players[state.currentPlayerIndex].id, 'c');
});

test('UNO call flag is stored', () => {
  const state = createInitialState([{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }]);
  callUno(state, 'a');
  assert.equal(state.unoCalledBy.a, true);
});
