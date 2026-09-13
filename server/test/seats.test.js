import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSit } from '../src/core/seats.js';
import { makeGrid } from './helpers.js';

const grid = makeGrid();
const base = {
  grid, pos: { x: 3.5, y: 3.5 }, seatId: 's1', status: 'open',
  occupied: new Map(), othersAtTable: [],
};

test('4条件をすべて満たせば座れる', () => {
  assert.equal(validateSit(base).ok, true);
});

test('① 席の上にいなければ拒否', () => {
  assert.equal(validateSit({ ...base, pos: { x: 8.5, y: 6.5 } }).ok, false);
});

test('② 埋まっている席には座れない', () => {
  assert.equal(validateSit({ ...base, occupied: new Map([['s1', 'other']]) }).ok, false);
});

test('③ 同じテーブルに集中中の人がいたら座れない', () => {
  assert.equal(validateSit({ ...base, othersAtTable: [{ seat: 's2', status: 'focus' }] }).ok, false);
});

test('③ 自分が集中中なら座れない', () => {
  assert.equal(validateSit({ ...base, status: 'focus' }).ok, false);
});

test('④ エリアの入室権限が無ければ拒否', () => {
  assert.equal(validateSit({ ...base, canEnter: () => false }).ok, false);
});

test('存在しない席・席でないオブジェクトは拒否', () => {
  assert.equal(validateSit({ ...base, seatId: 'nope' }).ok, false);
  assert.equal(validateSit({ ...base, seatId: 'note', pos: { x: 1.5, y: 6.5 } }).ok, false);
});

test('拒否の理由は一律で、どの条件で落ちたかを漏らさない', () => {
  const reasons = new Set([
    validateSit({ ...base, pos: { x: 8.5, y: 6.5 } }).reason,
    validateSit({ ...base, occupied: new Map([['s1', 'x']]) }).reason,
    validateSit({ ...base, status: 'focus' }).reason,
    validateSit({ ...base, canEnter: () => false }).reason,
  ]);
  assert.equal(reasons.size, 1, '理由が条件ごとに違うと存在の推測に使える');
});
