const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, applyRoll } = require('../game/snakesEngine');

test('Snakes and ladders ladder is applied', () => {
  const state = createGame([{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }]);
  applyRoll(state, 'a', 1);
  assert.equal(state.players[0].position, 38);
});

test('Snakes and ladders exact finish required', () => {
  const state = createGame([{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }]);
  state.players[0].position = 98;
  applyRoll(state, 'a', 4);
  assert.equal(state.players[0].position, 98);
});
