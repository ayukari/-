import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSit } from '../src/core/seats.js';
import { makeGrid } from './helpers.js';
import { World } from '../src/world.js';

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

/* ---- フロアの席の置き方 ---- */

test('席には向きがあり、机（通れないタイル）の方を向いている', () => {
  // ★ ここが無いと気づけない不具合を実際に出した。
  //   席の rot を渡していなかったので椅子はいつも南を向き、人だけが机を向いて、
  //   **全員が背もたれに正対して座っていた**。絵を見るまで誰も気づかない。
  const f = new World().describe('office');
  const solid = new Set(f.grid.blocked.map(([x, y]) => x + ',' + y));
  const seats = f.objects.filter(o => o.kind === 'seat');
  assert.ok(seats.length > 0, '席が1つも無い');
  for (const s of seats) {
    assert.equal(typeof s.rot, 'number', `${s.id} に向きが無い`);
    // rot は「机のある向き」。その方向の隣タイルは通れないはず
    const dx = Math.round(Math.sin(s.rot * Math.PI / 180));
    const dy = Math.round(Math.cos(s.rot * Math.PI / 180));
    assert.ok(solid.has((s.x + dx) + ',' + (s.y + dy)),
              `${s.id} の向き(${s.rot}°)の先に机が無い`);
  }
});

test('席そのものは通行を邪魔しない（座りに行けなくなる）', () => {
  const f = new World().describe('office');
  const solid = new Set(f.grid.blocked.map(([x, y]) => x + ',' + y));
  for (const s of f.objects.filter(o => o.kind === 'seat')) {
    assert.ok(!solid.has(s.x + ',' + s.y), `${s.id} のタイルが通れない`);
  }
});
