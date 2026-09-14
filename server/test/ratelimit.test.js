import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucket, Cooldown, makeLimits } from '../src/gateway/ratelimit.js';

test('バケットはバースト分だけ通し、その後は絞る', () => {
  const b = new TokenBucket(5, 1);
  let t = 1000, passed = 0;
  for (let i = 0; i < 10; i++) if (b.take(t)) passed++;
  assert.equal(passed, 5);
});

test('時間が経てば補充される', () => {
  const b = new TokenBucket(5, 10);
  let t = 1000;
  for (let i = 0; i < 5; i++) b.take(t);
  assert.equal(b.take(t), false);
  assert.equal(b.take(t + 200), true);   // 0.2秒 × 10/s = 2 補充
});

test('intent は 15Hz を超えると落ちる', () => {
  const { intent } = makeLimits();
  let t = 0, passed = 0;
  // 100Hz で1秒送る
  for (let i = 0; i < 100; i++) { if (intent.take(t)) passed++; t += 10; }
  assert.ok(passed <= 50, `通しすぎ: ${passed}`);
  assert.ok(passed >= 15, `絞りすぎ: ${passed}`);
});

test('同一相手へのノックは 30 秒に1回', () => {
  const c = new Cooldown(30_000);
  assert.equal(c.take(0, 'a'), true);
  assert.equal(c.take(1_000, 'a'), false);
  assert.equal(c.take(1_000, 'b'), true);      // 相手が違えば通る
  assert.equal(c.take(31_000, 'a'), true);
});

test('Cooldown は掃除すれば際限なく増えない', () => {
  const c = new Cooldown(1000);
  for (let i = 0; i < 100; i++) c.take(i, 'k' + i);
  c.sweep(100_000);
  assert.equal(c.at.size, 0);
});
