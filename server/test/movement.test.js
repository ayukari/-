import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMove, isReachable, SPEED, TOLERANCE } from '../src/core/movement.js';
import { makeGrid, at } from './helpers.js';

const grid = makeGrid();

test('速度上限を超えて進めない', () => {
  const r = resolveMove(grid, at(2, 2), 1, 0, 0.1);
  const moved = r.x - 2;
  assert.ok(moved <= SPEED * 0.1 * TOLERANCE + 1e-9, `進みすぎ: ${moved}`);
  assert.ok(moved > 0);
});

test('dt を大きく偽装しても 250ms 相当までに丸められる', () => {
  const huge = resolveMove(grid, at(2, 2), 1, 0, 9999);
  const cap  = resolveMove(grid, at(2, 2), 1, 0, 0.25);
  assert.equal(huge.x, cap.x);
});

test('dx/dy を 1 より大きく偽装しても効果がない', () => {
  const big = resolveMove(grid, at(2, 2), 999, 0, 0.1);
  const one = resolveMove(grid, at(2, 2), 1, 0, 0.1);
  assert.equal(big.x, one.x);
});

test('NaN / Infinity を送っても壊れない', () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, null, '1']) {
    const r = resolveMove(grid, at(2, 2), bad, bad, 0.1);
    assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y), String(bad));
  }
});

test('壁は抜けられない', () => {
  // (4,3) は机。その左隣から右へ進もうとする
  let p = at(3.9, 3.5);
  for (let i = 0; i < 50; i++) p = { ...p, ...resolveMove(grid, p, 1, 0, 0.1) };
  assert.ok(p.x < 4, `机を抜けた: ${p.x}`);
});

test('外周の外に出られない', () => {
  let p = at(1.5, 1.5);
  for (let i = 0; i < 100; i++) p = { ...p, ...resolveMove(grid, p, -1, -1, 0.1) };
  assert.ok(p.x >= 1 && p.y >= 1, `外に出た: ${p.x},${p.y}`);
});

test('壁ずり: 斜めに壁へ向かっても、進める軸は進む', () => {
  // (4,3) は机。そのすぐ上から右下へ進む → x は進めるが y は机に阻まれる
  const from = at(3.9, 2.9);
  const r = resolveMove(grid, from, 1, 1, 0.1);
  assert.ok(r.x > from.x, 'x が進んでいない（斜めで完全に止まっている）');
  assert.equal(r.y, from.y, 'y が机を抜けている');
  assert.ok(r.clamped, 'clamped が立っていない');
});

test('入力がゼロなら動かない', () => {
  const r = resolveMove(grid, at(2, 2), 0, 0, 0.1);
  assert.equal(r.moved, false);
  assert.equal(r.x, 2);
});

test('isReachable は到達不能な座標を弾く', () => {
  assert.equal(isReachable({ x: 2, y: 2 }, { x: 2.4, y: 2 }, 0.1), true);
  assert.equal(isReachable({ x: 2, y: 2 }, { x: 9, y: 2 }, 0.1), false);
});
