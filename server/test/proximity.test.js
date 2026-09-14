import test from 'node:test';
import assert from 'node:assert/strict';
import { nearbyActors, reachableObject, PROX } from '../src/core/proximity.js';
import { makeGrid } from './helpers.js';

const grid = makeGrid();
const me = { x: 5, y: 5 };

test('近接半径の外は含まれない', () => {
  const r = nearbyActors(me, [{ id: 'a', x: 5 + PROX + 0.1, y: 5, status: 'open' }]);
  assert.equal(r.length, 0);
});

test('「集中中」は近接の対象にならない（原則2）', () => {
  const r = nearbyActors(me, [{ id: 'a', x: 5.5, y: 5, status: 'focus' }]);
  assert.equal(r.length, 0);
});

test('「離席」も対象にならない', () => {
  const r = nearbyActors(me, [{ id: 'a', x: 5.5, y: 5, status: 'away' }]);
  assert.equal(r.length, 0);
});

test('近い順に並ぶ', () => {
  const r = nearbyActors(me, [
    { id: 'far', x: 7, y: 5, status: 'open' },
    { id: 'near', x: 5.2, y: 5, status: 'open' },
  ]);
  assert.deepEqual(r.map(a => a.id), ['near', 'far']);
});

test('足元のオブジェクトが最優先', () => {
  const o = reachableObject(grid, { x: 3.5, y: 3.5 });
  assert.equal(o.id, 's1');
});

test('手の届かない距離のオブジェクトは返らない', () => {
  assert.equal(reachableObject(grid, { x: 8.5, y: 6.5 }), null);
});
