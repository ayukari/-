import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ViolationCounter, AnonymousViolationTally } from '../src/gateway/violations.js';

test('閾値を超えたら切断を指示する', () => {
  const v = new ViolationCounter(3, 10_000);
  assert.equal(v.record(0), false);
  assert.equal(v.record(1), false);
  assert.equal(v.record(2), false);
  assert.equal(v.record(3), true);
});

test('時間が経てばカウントは減衰する', () => {
  const v = new ViolationCounter(3, 1000);
  v.record(0); v.record(0); v.record(0);
  assert.equal(v.record(5000), false, '減衰していない');
});

test('運用監視に出せるのは総数だけで、個人も組織も持たない', () => {
  const t = new AnonymousViolationTally();
  t.bump(); t.bump();
  assert.deepEqual(t.snapshot(), { total: 2 });
  assert.deepEqual(Object.keys(t.snapshot()), ['total']);
});

// 原則3 の担保。実装が「記録しない」ままであることを構造として縛る。
// コメントには 04-audit-log.md への参照があるため、コードだけを見る。
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

test('違反の記録に永続化の経路が無い（原則3）', () => {
  const src = readFileSync(new URL('../src/gateway/violations.js', import.meta.url), 'utf8');
  const code = stripComments(src);
  for (const banned of ['audit', 'AuditLog', 'prisma', 'db.', 'INSERT', 'writeFile', 'appendFile', 'fetch(']) {
    assert.ok(!code.includes(banned),
      `violations.js のコードに永続化らしき語 "${banned}" がある。原則3 に反する`);
  }
});

test('走査はコメントを無視し、コードだけを見ている', () => {
  // この保護自体が壊れていないことの確認（コメントだけなら通り、コードなら落ちる）
  assert.equal(stripComments('/* audit */ const a = 1;').includes('audit'), false);
  assert.equal(stripComments('// audit\nconst a = 1;').includes('audit'), false);
  assert.equal(stripComments('const x = audit.write();').includes('audit'), true);
});
