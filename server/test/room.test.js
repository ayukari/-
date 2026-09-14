import test from 'node:test';
import assert from 'node:assert/strict';
import { Room, CELL, FORCE_RESEND_MS } from '../src/gateway/room.js';
import { makeGrid } from './helpers.js';

const mk = () => new Room('office', makeGrid(), { x: 5, y: 5 });
const profile = n => ({ userId: 'u' + n, name: 'n' + n, color: '#C8873C', body: 0 });

test('入退室で entityId が割り当てられ、解放される', () => {
  const r = mk();
  const a = r.join('p1', profile(1));
  const b = r.join('p2', profile(2));
  assert.notEqual(a.entityId, b.entityId);
  r.leave('p1');
  assert.equal(r.getByEntity(a.entityId), null);
  const c = r.join('p3', profile(3));
  assert.ok(c.entityId >= 1 && c.entityId <= 65535);
});

test('entityId はフロア内で一意', () => {
  const r = mk();
  const ids = new Set();
  for (let i = 0; i < 50; i++) ids.add(r.join('p' + i, profile(i)).entityId);
  assert.equal(ids.size, 50);
});

test('tick で intent が1回だけ適用される', () => {
  const r = mk();
  r.join('p1', profile(1));
  r.setIntent('p1', 1, 0, 7);
  const before = r.get('p1').x;
  r.step(0.1);
  const after = r.get('p1').x;
  assert.ok(after > before);
  assert.equal(r.get('p1').ackSeq, 7);
  // 同じ intent のまま次の tick も進む（押しっぱなし）
  r.step(0.1);
  assert.ok(r.get('p1').x > after);
});

test('席から離れると自動的に立つ', () => {
  const r = mk();
  const a = r.join('p1', profile(1));
  a.x = 3.5; a.y = 3.5; a.seat = 's1';
  r.setIntent('p1', 0, 1, 1);
  for (let i = 0; i < 10; i++) r.step(0.1);
  assert.equal(r.get('p1').seat, null);
});

test('AOI: 遠いセルの相手は見えない', () => {
  const grid = makeGrid();
  const big = new Room('big', Object.assign(Object.create(Object.getPrototypeOf(grid)), grid,
    { width: 200, height: 200 }), { x: 5, y: 5 });
  const a = big.join('p1', profile(1));
  const b = big.join('p2', profile(2));
  a.x = 5; a.y = 5;
  b.x = 5 + CELL * 3; b.y = 5;
  assert.equal(big.visibleTo('p1').length, 0);
  b.x = 5 + CELL;               // 隣のセル
  assert.equal(big.visibleTo('p1').length, 1);
});

test('差分抑制: 動きが無ければ2回目は送らない', () => {
  const r = mk();
  r.join('p1', profile(1));
  r.join('p2', profile(2));
  const t1 = r.buildTick('p1', 1000);
  assert.equal(t1.entries.length, 2, '初回は全員入る');
  const t2 = r.buildTick('p1', 1100);
  assert.equal(t2.entries.length, 0, '変化が無いのに送っている');
});

test('差分抑制: 動きが無くても2秒に1回は送る', () => {
  const r = mk();
  r.join('p1', profile(1));
  r.buildTick('p1', 1000);
  const later = r.buildTick('p1', 1000 + FORCE_RESEND_MS);
  assert.ok(later.entries.length > 0, '取りこぼしの自己修復が効かない');
});

test('tick には自分も含まれる（巻き戻し照合に要る）', () => {
  const r = mk();
  const a = r.join('p1', profile(1));
  const t = r.buildTick('p1', 1000);
  assert.ok(t.entries.some(e => e.entityId === a.entityId));
});

test('座標は固定小数で丸められる', () => {
  const r = mk();
  const a = r.join('p1', profile(1));
  a.x = 5.123456;
  const t = r.buildTick('p1', 1000);
  const e = t.entries.find(x => x.entityId === a.entityId);
  assert.equal(e.x, Math.round(5.123456 * 256));
  assert.ok(Number.isInteger(e.x) && e.x >= 0 && e.x <= 65535);
});
