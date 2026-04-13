const test = require('node:test');
const assert = require('node:assert/strict');
const { createMatch, movePiece } = require('../game/chessEngine');

test('Chess move updates turn', () => {
  const state = createMatch([{ id: 'w', username: 'White' }, { id: 'b', username: 'Black' }]);
  movePiece(state, 'w', 'e2', 'e4');
  assert.equal(state.turn, 'b');
});

test('Chess checkmate marks winner', () => {
  const state = createMatch([{ id: 'w', username: 'White' }, { id: 'b', username: 'Black' }]);
  movePiece(state, 'w', 'f2', 'f3');
  movePiece(state, 'b', 'e7', 'e5');
  movePiece(state, 'w', 'g2', 'g4');
  movePiece(state, 'b', 'd8', 'h4');
  assert.equal(state.status, 'finished');
  assert.deepEqual(state.winnerIds, ['b']);
});
