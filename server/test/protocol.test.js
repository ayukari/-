import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClientMessage } from '../src/gateway/protocol.js';

test('正しいメッセージは通る', () => {
  assert.deepEqual(parseClientMessage('{"t":"setStatus","status":"focus"}'),
    { t: 'setStatus', status: 'focus' });
});

test('壊れた JSON は弾く', () => {
  assert.equal(parseClientMessage('{').code, 'malformed');
  assert.equal(parseClientMessage('[]').code, 'malformed');
  assert.equal(parseClientMessage('null').code, 'malformed');
});

test('知らない型は弾く', () => {
  assert.equal(parseClientMessage('{"t":"shutdown"}').code, 'unknown_type');
});

test('巨大なメッセージは弾く', () => {
  assert.equal(parseClientMessage('{"t":"stand","x":"' + 'a'.repeat(5000) + '"}').code, 'too_large');
});

test('範囲外の値は弾く', () => {
  assert.equal(parseClientMessage('{"t":"setStatus","status":"godmode"}').code, 'invalid_argument');
  assert.equal(parseClientMessage('{"t":"knock","targetEntityId":99999}').code, 'invalid_argument');
  assert.equal(parseClientMessage('{"t":"knock","targetEntityId":-1}').code, 'invalid_argument');
  assert.equal(parseClientMessage('{"t":"sit","seatId":"../../etc/passwd"}').code, 'invalid_argument');
});

test('余計なフィールドは落とされる（orgId / userId を含む）', () => {
  const r = parseClientMessage('{"t":"stand","orgId":"evil","userId":"admin","isAdmin":true}');
  assert.deepEqual(r, { t: 'stand' });
  assert.ok(!('orgId' in r) && !('userId' in r) && !('isAdmin' in r));
});

test('プロトタイプ汚染を試みても効かない', () => {
  parseClientMessage('{"t":"stand","__proto__":{"polluted":true}}');
  assert.equal({}.polluted, undefined);
  const r = parseClientMessage('{"t":"sit","seatId":"__proto__"}');
  assert.equal(r.t, 'sit');           // 文字列としては通るが
  assert.equal({}.seatId, undefined); // 汚染はしない
});

test('rosterReq の件数に上限がある', () => {
  const many = JSON.stringify({ t: 'rosterReq', entityIds: Array.from({ length: 200 }, (_, i) => i) });
  assert.equal(parseClientMessage(many).code, 'invalid_argument');
});
