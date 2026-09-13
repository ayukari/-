/**
 * ゲートウェイの通し試験 — 実際に HTTP と WebSocket を立てて2人つなぐ。
 *
 * 単体テストでは見つからない種類の穴を見るためにある。
 * 実際ここで、クライアントが「座る」を出せるのにサーバが必ず断る、
 * という食い違いが見つかった（手が届く ≠ 席の上にいる、09 §5.2 ①）。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocket } from 'ws';
import { createGateway } from '../src/adapters/wsServer.js';

const here = dirname(fileURLToPath(import.meta.url));
let gw, port;

before(async () => {
  gw = createGateway({
    clientDir: join(here, '../../client'),
    vendorDir: join(here, '../node_modules/three/build'),
    coreDir: join(here, '../src/core'),
    jsmDir: join(here, '../node_modules/three/examples/jsm'),
  });
  port = (await gw.listen(0)).port;
});
after(() => gw.close());

/** 1接続分の薄いクライアント。受信を種類ごとに貯める */
function connect(u, name) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?u=${u}&name=${encodeURIComponent(name)}`);
  const c = { ws, self: null, pos: new Map(), got: [], name };
  ws.on('message', d => {
    const m = JSON.parse(d);
    c.got.push(m);
    if (m.t === 'hello') c.self = m.selfEntityId;
    if (m.t === 'tick') for (const e of m.entries) c.pos.set(e.entityId, { x: e.x / 256, y: e.y / 256 });
  });
  c.send = m => ws.send(JSON.stringify(m));
  c.hello = () => waitFor(c, m => m.t === 'hello');
  c.take = t => c.got.filter(m => m.t === t);
  return c;
}
const waitFor = (c, pred, ms = 3000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const i = setInterval(() => {
    const m = c.got.find(pred);
    if (m) { clearInterval(i); res(m); }
    else if (Date.now() - t0 > ms) { clearInterval(i); rej(new Error('timeout: ' + c.name)); }
  }, 10);
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** 条件を満たすまで歩く。tick と送信は同期していないので歩数では数えない */
async function walkUntil(c, dx, dy, done, max = 40) {
  for (let i = 0; i < max && !done(c); i++) {
    c.send({ t: 'intent', dx, dy, seq: i + 1 });
    await sleep(100);
  }
  c.send({ t: 'intent', dx: 0, dy: 0, seq: max + 1 });
  await sleep(150);
}
/** 進みたい向きを n 回送る（サーバは1tickに1つしか使わない） */
async function walk(c, dx, dy, ticks) {
  for (let i = 0; i < ticks; i++) { c.send({ t: 'intent', dx, dy, seq: i + 1 }); await sleep(100); }
  c.send({ t: 'intent', dx: 0, dy: 0, seq: ticks + 1 });
  await sleep(150);
}

test('フロア定義は HTTP で配られ、当たり判定に必要なものが揃っている', async () => {
  const r = await fetch(`http://127.0.0.1:${port}/api/floor?id=office`);
  assert.equal(r.status, 200);
  const f = await r.json();
  assert.equal(f.id, 'office');
  for (const k of ['grid', 'areas', 'objects', 'spawn']) assert.ok(f[k], k + ' がない');
  assert.ok(f.grid.width > 0 && f.grid.height > 0);
});

test('無いフロアは 404。パストラバーサルは 400', async () => {
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/floor?id=nope`)).status, 404);
  const r = await fetch(`http://127.0.0.1:${port}/vendor/..%2F..%2Fpackage.json`);
  assert.ok(r.status === 400 || r.status === 404, '外に出られてはいけない: ' + r.status);
});

test('サーバとクライアントは同じ core/ を読む（移動の規則が2つ存在しない）', async () => {
  const r = await fetch(`http://127.0.0.1:${port}/core/movement.js`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /export const SPEED/);
});

test('2人つなぐと互いが名簿に出て、位置が届く', async () => {
  const a = connect('e2eA', 'あかり'), b = connect('e2eB', 'そら');
  await Promise.all([a.hello(), b.hello()]);
  await sleep(300);
  const roster = await waitFor(b, m => m.t === 'roster' && m.add.some(e => e.name === 'あかり'));
  assert.ok(roster.add.find(e => e.name === 'あかり'));
  await waitFor(a, m => m.t === 'tick');
  assert.ok(a.pos.has(a.self), '自分の位置が来ていない（巻き戻し照合に要る）');
  a.ws.close(); b.ws.close();
});

test('進みたい向きだけで動き、壁は抜けられない', async () => {
  const a = connect('e2eC', 'みなと');
  await a.hello();
  await waitFor(a, m => m.t === 'tick');
  const start = a.pos.get(a.self);
  await walk(a, -1, 0, 8);
  const mid = a.pos.get(a.self);
  assert.ok(mid.x < start.x - 1, '左に動いていない');
  await walk(a, -1, 0, 30);                       // 壁に向かって押し続ける
  const end = a.pos.get(a.self);
  assert.ok(end.x >= 1, '外周の壁を抜けた: ' + end.x);
  a.ws.close();
});

test('席は「その席のタイルの上にいる」ときだけ座れる', async () => {
  const a = connect('e2eD', 'ひなた');
  await a.hello();
  await waitFor(a, m => m.t === 'tick');
  // スポーン(12.5,8.5)から席 t1c(12,4) までは手が届かない。まず上に歩く
  a.send({ t: 'sit', seatId: 't1c' });
  assert.equal((await waitFor(a, m => m.t === 'error')).code, 'denied');

  await walkUntil(a, 0, -1, c => Math.floor(c.pos.get(c.self).y) === 4);
  const p = a.pos.get(a.self);
  assert.equal(Math.floor(p.x), 12);
  assert.equal(Math.floor(p.y), 4, '席のタイルに乗っていない: ' + p.y);
  a.got.length = 0;
  a.send({ t: 'sit', seatId: 't1c' });
  const seat = await waitFor(a, m => m.t === 'seat');
  assert.equal(seat.seatId, 't1c');
  a.ws.close();
});

test('近くにいれば声をかけられ、集中中の相手には届かない（原則2）', async () => {
  const a = connect('e2eE', 'あおい'), b = connect('e2eF', 'かえで');
  await Promise.all([a.hello(), b.hello()]);
  await waitFor(a, m => m.t === 'tick');
  await walk(a, 1, 0, 3);                          // 1.2 タイルほど離れる

  a.got.length = 0; b.got.length = 0;
  b.send({ t: 'knock', targetEntityId: a.self });
  assert.equal((await waitFor(a, m => m.t === 'knock')).fromEntityId, b.self);

  // 集中中にすると届かなくなる
  a.send({ t: 'setStatus', status: 'focus' });
  await sleep(200);
  b.got.length = 0;
  b.send({ t: 'knock', targetEntityId: a.self });
  assert.equal((await waitFor(b, m => m.t === 'error')).code, 'denied');

  // 遠ければ届かない
  a.send({ t: 'setStatus', status: 'open' });
  await walk(a, 1, 0, 8);
  b.got.length = 0;
  b.send({ t: 'knock', targetEntityId: a.self });
  assert.equal((await waitFor(b, m => m.t === 'error')).code, 'denied');
  a.ws.close(); b.ws.close();
});

test('フロアを移ると、前の部屋の人の名簿から消える', async () => {
  // ★ 伝えないと、移った本人が前の部屋に立ったまま残る（誰も動かさないので消えない）
  const a = connect('e2eI', 'あさひ'), b = connect('e2eJ', 'ゆう');
  try {
    await Promise.all([a.hello(), b.hello()]);
    await sleep(300);
    const gone = a.self;

    a.got.length = 0; b.got.length = 0;
    await sleep(2100);                            // enter は2秒に1回まで（09 §5.3）
    a.send({ t: 'enter', floor: 'office' });      // 同じフロアへ入り直す = 一度出る

    const r = await waitFor(b, m => m.t === 'roster' && m.remove.includes(gone));
    assert.ok(r);
    // 入り直した本人には新しい entityId が渡る
    const hello = await waitFor(a, m => m.t === 'hello');
    assert.notEqual(hello.selfEntityId, gone);
  } finally {
    a.ws.close(); b.ws.close();
  }
});

test('切断すると名簿から消える', async () => {
  const a = connect('e2eG', 'つかさ'), b = connect('e2eH', 'のぞみ');
  await Promise.all([a.hello(), b.hello()]);
  await sleep(300);
  b.got.length = 0;
  const gone = a.self;
  a.ws.close();
  const r = await waitFor(b, m => m.t === 'roster' && m.remove.includes(gone));
  assert.ok(r);
  b.ws.close();
});
