import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/gateway/session.js';
import { Room } from '../src/gateway/room.js';
import { makeGrid } from './helpers.js';

function world() {
  const rooms = new Map([['org1:office', new Room('office', makeGrid(), { x: 5, y: 5 })]]);
  return { roomFor: (orgId, floor) => rooms.get(orgId + ':' + floor) ?? null, rooms };
}
const mkSession = (peerId = 'p1', orgId = 'org1') => new Session({
  peerId, orgId, userId: 'u1', profile: { name: '山田', color: '#C8873C', body: 0 },
});
function entered(w, s) {
  s.handle({ t: 'enter', floor: 'office' }, 1000, w);
  return s;
}

test('★ クライアントが orgId を偽装しても、セッションの値が使われる', () => {
  const w = world();
  const s = mkSession('p1', 'org1');
  // 他組織の office に入ろうとする
  s.handle({ t: 'enter', floor: 'office', orgId: 'org-victim' }, 1000, w);
  assert.equal(s.room, w.rooms.get('org1:office'), '他組織の部屋に入れてしまった');
});

test('★ 存在しない組織のセッションはどの部屋にも入れない', () => {
  const w = world();
  const s = mkSession('p1', 'org-unknown');
  const r = s.handle({ t: 'enter', floor: 'office' }, 1000, w);
  assert.equal(s.room, null);
  assert.equal(r.out[0].code, 'not_found');
});

test('★ 離れた席には座れない（座標はサーバの値を使う）', () => {
  const w = world(); const s = entered(w, mkSession());
  const a = s.room.get('p1');
  a.x = 9; a.y = 7;                       // 席から遠い
  const r = s.handle({ t: 'sit', seatId: 's1' }, 2000, w);
  assert.equal(r.out[0].code, 'denied');
  assert.equal(a.seat, null);
});

test('席の上にいれば座れて、通話状態になる', () => {
  const w = world(); const s = entered(w, mkSession());
  const a = s.room.get('p1');
  a.x = 3.5; a.y = 3.5;
  const r = s.handle({ t: 'sit', seatId: 's1' }, 2000, w);
  assert.equal(r.out[0].t, 'seat');
  assert.equal(a.seat, 's1');
  assert.equal(a.inCall, true);
});

test('集中中にすると席を立ち、通話が切れる', () => {
  const w = world(); const s = entered(w, mkSession());
  const a = s.room.get('p1');
  a.x = 3.5; a.y = 3.5;
  s.handle({ t: 'sit', seatId: 's1' }, 2000, w);
  s.handle({ t: 'setStatus', status: 'focus' }, 2100, w);
  assert.equal(a.seat, null);
  assert.equal(a.inCall, false);
});

test('★ 離れた相手にはノックできない', () => {
  const w = world();
  const s1 = entered(w, mkSession('p1'));
  const s2 = entered(w, mkSession('p2'));
  const b = s1.room.get('p2');
  b.x = 9; b.y = 7;
  const r = s1.handle({ t: 'knock', targetEntityId: b.entityId }, 3000, w);
  assert.equal(r.out[0].code, 'denied');
});

test('★ 集中中の相手にはノックが届かない（原則2）', () => {
  const w = world();
  const s1 = entered(w, mkSession('p1'));
  entered(w, mkSession('p2'));
  const b = s1.room.get('p2');
  b.x = 5.2; b.y = 5; b.status = 'focus';
  const r = s1.handle({ t: 'knock', targetEntityId: b.entityId }, 3000, w);
  assert.equal(r.out[0].code, 'denied');
});

test('近くのオープンな相手にはノックが届く', () => {
  const w = world();
  const s1 = entered(w, mkSession('p1'));
  entered(w, mkSession('p2'));
  const b = s1.room.get('p2');
  b.x = 5.2; b.y = 5;
  const r = s1.handle({ t: 'knock', targetEntityId: b.entityId }, 3000, w);
  assert.equal(r.out[0].t, 'knock');
  assert.equal(r.to, 'p2');
});

test('同じ相手への連続ノックは絞られる', () => {
  const w = world();
  const s1 = entered(w, mkSession('p1'));
  entered(w, mkSession('p2'));
  const b = s1.room.get('p2');
  b.x = 5.2; b.y = 5;
  assert.equal(s1.handle({ t: 'knock', targetEntityId: b.entityId }, 3000, w).out[0].t, 'knock');
  assert.equal(s1.handle({ t: 'knock', targetEntityId: b.entityId }, 3500, w).out[0].code, 'rate_limited');
});

test('★ 手が届かないオブジェクトは使えない', () => {
  const w = world(); const s = entered(w, mkSession());
  const a = s.room.get('p1');
  a.x = 5; a.y = 5;
  assert.equal(s.handle({ t: 'use', objectId: 'note' }, 4000, w).out[0].code, 'denied');
  a.x = 1.5; a.y = 6.5;
  assert.equal(s.handle({ t: 'use', objectId: 'note' }, 4100, w).out[0].t, 'used');
});

test('壊れたメッセージを送り続けると切断される', () => {
  const w = world(); const s = entered(w, mkSession());
  let closed = null;
  for (let i = 0; i < 20 && !closed; i++) {
    const r = s.handle('{bad', 5000 + i, w);
    closed = r.close;
  }
  assert.equal(closed, 'protocol');
  assert.equal(s.closed, true);
});

test('切断後はメッセージを受け付けない', () => {
  const w = world(); const s = entered(w, mkSession());
  s.closed = true;
  assert.deepEqual(s.handle({ t: 'stand' }, 6000, w), { out: [] });
});

test('チャネル B のレート制限が効く', () => {
  const w = world(); const s = entered(w, mkSession());
  let limited = 0;
  for (let i = 0; i < 80; i++) {
    const r = s.handle({ t: 'stand' }, 7000, w);
    if (r.out[0]?.code === 'rate_limited') limited++;
  }
  assert.ok(limited > 0, 'いくら送っても絞られない');
});

test('intent もレート制限される', () => {
  const w = world(); const s = entered(w, mkSession());
  let t = 8000;
  for (let i = 0; i < 100; i++) { s.handleIntent(1, 0, i, t); t += 5; }  // 200Hz
  // 絞られていれば seq は最後まで届かない
  assert.ok(s.room.get('p1').intent.seq < 99, '200Hz がそのまま通っている');
});
