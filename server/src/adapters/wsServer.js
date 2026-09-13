/**
 * WebSocket と静的配信のアダプタ — docs/design/04-architecture.md §1
 *
 * ここが唯一トランスポートを知っている層。Session / Room はこれを知らない。
 *
 * ★ 認証は開発用の仮実装である。本番は OIDC（1-1、docs/security-review-pack/02 §7）。
 *   仮実装であることが分かるように、userId は接続時のクエリから取り、
 *   本番では「セッションから引く」1箇所だけを差し替えればよい形にしてある。
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { WebSocketServer } from 'ws';
import { Session } from '../gateway/session.js';
import { World } from '../world.js';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
};

const COLORS = ['#C8873C', '#4F8299', '#7A6FA8', '#5F8C6B', '#B25F6A', '#8A7B5E'];

export function createGateway({ clientDir, vendorDir, coreDir, tickHz = 10 }) {
  const world = new World();
  /** @type {Map<import('ws').WebSocket, {session:Session}>} */
  const peers = new Map();
  let nextPeer = 1;

  const http = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/floor') {
        const d = world.describe(url.searchParams.get('id') || 'office');
        return json(res, d ? 200 : 404, d ?? { error: 'not_found' });
      }
      // ★ core/ はサーバと同じ実装をブラウザにも配る。
      //   移動の規則が2つ存在しないようにするため（予測=クライアント、権威=サーバ）
      let base = clientDir, rel;
      if (url.pathname.startsWith('/vendor/')) { base = vendorDir; rel = url.pathname.slice(8); }
      else if (url.pathname.startsWith('/core/')) { base = coreDir; rel = url.pathname.slice(6); }
      else rel = (url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
      // パストラバーサルを弾く
      const safe = normalize(rel).replace(/^(\.\.[/\\])+/, '');
      if (safe.includes('..')) return text(res, 400, 'bad path');
      const file = join(base, safe);
      const st = await stat(file).catch(() => null);
      if (!st || !st.isFile()) return text(res, 404, 'not found');
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': MIME[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch (e) {
      text(res, 500, 'error');
    }
  });

  const wss = new WebSocketServer({ server: http, path: '/rt' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');

    /* ---- 開発用の仮認証。本番はここをセッションの解決に差し替える ---- */
    const userId = sanitize(url.searchParams.get('u')) || 'u' + nextPeer;
    const orgId = sanitize(url.searchParams.get('org')) || 'dev';
    const name = (url.searchParams.get('name') || 'ゲスト').slice(0, 20);
    const body = Math.min(2, Math.max(0, Number(url.searchParams.get('body')) || 0));
    const color = COLORS[(hash(userId) % COLORS.length)];
    /* ------------------------------------------------------------------ */

    const peerId = 'p' + (nextPeer++);
    const session = new Session({ peerId, orgId, userId, profile: { name, color, body } });
    peers.set(ws, { session });

    ws.on('message', data => {
      const now = Date.now();
      let r;
      try { r = session.handle(String(data), now, world); }
      catch (e) { r = { out: [{ t: 'error', code: 'internal' }] }; }
      deliver(ws, session, r);
      if (r.close) ws.close(1008, r.close);
    });

    ws.on('close', () => {
      const a = session.room?.leave(peerId);
      peers.delete(ws);
      if (a) broadcast(session.room, { t: 'roster', add: [], remove: [a.entityId] });
    });

    // 入室は接続時に自動で行う（フロア選択は後で UI から）
    const r = session.handle({ t: 'enter', floor: url.searchParams.get('floor') || 'office' },
                             Date.now(), world);
    deliver(ws, session, r);
    if (session.room) {
      broadcast(session.room, { t: 'roster', add: [rosterOf(session)], remove: [] }, ws);
    }
  });

  /** Session の戻り値を実際の送信に変える。to / broadcast の解決はここだけが知る */
  function deliver(ws, session, r) {
    if (!r || !r.out) return;
    for (const msg of r.out) {
      if (r.to) sendToPeer(session.room, r.to, msg);
      else if (r.broadcast) broadcast(session.room, msg);
      else send(ws, msg);
    }
  }

  const send = (ws, msg) => { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); };

  function broadcast(room, msg, except) {
    if (!room) return;
    for (const [ws, { session }] of peers) {
      if (session.room === room && ws !== except) send(ws, msg);
    }
  }
  function sendToPeer(room, peerId, msg) {
    for (const [ws, { session }] of peers) {
      if (session.room === room && session.peerId === peerId) return send(ws, msg);
    }
  }
  const rosterOf = s => {
    const a = s.room?.get(s.peerId);
    return a && { entityId: a.entityId, userId: a.userId, name: a.name, color: a.color, body: a.body };
  };

  /* ---- tick ループ ---- */
  const dt = 1 / tickHz;
  const timer = setInterval(() => {
    world.step(dt);
    const now = Date.now();
    for (const [ws, { session }] of peers) {
      if (!session.room || ws.readyState !== 1) continue;
      const t = session.room.buildTick(session.peerId, now);
      if (t && t.entries.length) send(ws, t);
    }
  }, 1000 / tickHz);
  timer.unref?.();

  return {
    listen: (port, host = '127.0.0.1') => new Promise(res => http.listen(port, host, () => res(http.address()))),
    close: () => { clearInterval(timer); wss.close(); http.close(); },
    world, peers,
  };
}

const json = (res, code, obj) => {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(b);
};
const text = (res, code, s) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(s); };
const sanitize = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(v)) ? v : null;
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
