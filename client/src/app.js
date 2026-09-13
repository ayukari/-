/**
 * 組み立て口（composition root） — docs/design/08-extensibility.md §1
 *
 * ここだけが「どの実装を使うか」を知っている。
 * core（規則）→ world（論理）→ renderer（表現）/ net（通信）の向きにしか依存しない。
 *
 * 30fps で止める（02 §6 / 04 §4.6）。
 * ★ 描画だけ間引いても CPU は休まないので、予測も描画もこのゲートの内側で回す。
 */
import { ClientWorld, loadFloor } from './world.js';
import { createNet } from './net.js';
import { createRenderer3D, webglAvailable } from './render3d.js';
import { createRenderer2D } from './render2d.js';

const FPS_CAP = 30;
const FRAME_MS = 1000 / FPS_CAP;
const INTENT_HZ = 10;

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);

boot().catch(err => {
  $('boot').textContent = '起動できませんでした: ' + err.message;
  console.error(err);
});

async function boot() {
  const floorId = q.get('floor') || 'office';
  const floor = await loadFloor(floorId);
  const world = new ClientWorld(floor);
  $('floorName').textContent = floor.name;

  /* ---- 表現レイヤーの選択。ここが唯一 3D/2D を決める場所 ---- */
  const force2d = q.get('view') === '2d';
  const use3d = !force2d && webglAvailable();
  const renderer = use3d ? createRenderer3D($('stage'), world) : createRenderer2D($('stage'), world);
  if (!use3d) toast(force2d ? '2D ビューで表示しています' : 'WebGL が使えないため 2D で起動しました', 4000);

  /* ---- 通信 ---- */
  const wsUrl = new URL('/rt', location.href);
  wsUrl.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  for (const k of ['u', 'org', 'name', 'body', 'floor']) {
    const v = q.get(k); if (v) wsUrl.searchParams.set(k, v);
  }
  const net = createNet({ url: wsUrl.toString(), on: onMessage });

  function onMessage(m) {
    switch (m.t) {
      case '_open':  setNet(true);  break;
      case '_close': setNet(false); break;
      case 'hello':
        world.selfEntityId = m.selfEntityId;
        $('boot').remove();
        break;
      case 'roster': world.applyRoster(m); renderPanel(); break;
      case 'tick':   world.applyTick(m); break;
      case 'status': world.setStatus(m.entityId, m.status); renderPanel(); break;
      case 'seat':   world.setSeat(m.entityId, m.seatId); break;
      case 'used':   onUsed(m); break;
      case 'knock':  onKnock(m.fromEntityId); break;
      case 'knockResult':
        toast(m.accepted ? '応答がありました' : '今は都合が悪いようです');
        break;
      case 'error':
        if (m.code === 'denied') toast('いまはできません');
        else if (m.code === 'rate_limited') toast('少し待ってください');
        break;
    }
  }

  /* ---- 入力。キーボード / クリック / タッチのドラッグ ---- */
  const keys = new Set();
  let goal = null;          // クリック移動の目標
  addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'e') { act(); e.preventDefault(); return; }
    if (KEY[k]) { keys.add(KEY[k]); goal = null; e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(KEY[e.key.toLowerCase()]));
  addEventListener('blur', () => keys.clear());

  const stage = $('stage');
  let drag = null;
  stage.addEventListener('pointerdown', e => {
    stage.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false, t: performance.now() };
  });
  stage.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    const len = Math.hypot(dx, dy);
    if (len < 16) { drag.dx = drag.dy = 0; return; }
    drag.moved = true; goal = null;
    drag.dx = dx / len; drag.dy = dy / len;
  });
  stage.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    // 動かしていない＝タップ。その地点へ歩く
    if (!drag.moved && performance.now() - drag.t < 600) {
      const p = renderer.pick(e.clientX, e.clientY);
      if (p) goal = p;
    }
    drag = null;
  });
  stage.addEventListener('pointercancel', () => { drag = null; });

  $('statusSel').addEventListener('change', e => net.setStatus(e.target.value));
  $('actBtn').addEventListener('click', act);
  addEventListener('resize', () => renderer.resize());

  /* ---- 行動は1つだけ。何ができるかは論理レイヤーが決める（08 §3） ---- */
  function act() {
    const a = world.actionable();
    if (!a) return;
    switch (a.verb) {
      case 'stand': return net.stand();
      case 'sit':   return net.sit(a.object.id);
      case 'use':   return net.use(a.object.id);
      case 'knock':
        net.knock(a.actor.entityId);
        return toast(`${a.actor.name} さんに声をかけました`);
      case 'walk':  // 席は上に立ってからでないと座れない。まずそこまで歩く
        goal = { x: a.object.x + 0.5, y: a.object.y + 0.5 };
        return;
    }
  }

  function onUsed({ objectId, kind }) {
    const o = world.grid.objectById(objectId);
    const title = o?.data?.title;
    toast(title ? `${title}` : `${kind} を使いました`);
  }

  function onKnock(fromEntityId) {
    const from = world.actors.get(fromEntityId);
    const name = from?.name ?? 'だれか';
    // 自動で通話は始まらない（原則1）。受けるかどうかは本人が決める
    toastAsk(`${name} さんが声をかけています`, ok => net.knockAnswer(fromEntityId, ok));
  }

  /* ---- ループ ---- */
  let lastFrame = 0, lastIntent = 0, lastSent = { dx: 0, dy: 0 };
  let fpsT = performance.now(), fpsN = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    if (now - lastFrame < FRAME_MS - 1) return;     // 30fps のゲート
    const dt = Math.min(0.25, (now - lastFrame) / 1000) || 1 / FPS_CAP;
    lastFrame = now;

    const [dx, dy] = inputVector();
    world.predict(dx, dy, dt);
    world.interpolate(dt);
    renderer.render(dt);

    // 意思の送信は 10Hz。変化が無ければ止まったことを1回だけ伝える
    if (now - lastIntent >= 1000 / INTENT_HZ) {
      lastIntent = now;
      if (dx !== lastSent.dx || dy !== lastSent.dy || dx || dy) {
        net.intent(dx, dy);
        lastSent = { dx, dy };
      }
    }

    fpsN++;
    if (now - fpsT >= 500) {
      const fps = Math.round(fpsN * 1000 / (now - fpsT));
      fpsT = now; fpsN = 0;
      $('hFps').textContent = fps;
      const i = renderer.info();
      $('hCalls').textContent = renderer.kind === '3d' ? i.calls : '—（2D）';
      $('hTick').textContent = world.tick;
      $('hFix').textContent = world.fixes;
      refreshAct();
      renderPanel();
    }
  }
  requestAnimationFrame(loop);

  // 動作確認・診断用の覗き口。論理レイヤーを読むだけで、ここからは何も動かせない
  // （サーバは元々クライアントの主張を信用しないので、露出しても権限は増えない）
  Object.defineProperty(globalThis, '__hidamari', {
    value: { world, view: renderer.kind, floor: floor.id }, configurable: true,
  });

  function inputVector() {
    let dx = 0, dy = 0;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    if (drag && (drag.dx || drag.dy)) { dx = drag.dx; dy = drag.dy; }
    if (!dx && !dy && goal) {
      const me = world.me;
      if (!me || me.x === null) return [0, 0];
      const vx = goal.x - me.x, vy = goal.y - me.y;
      const len = Math.hypot(vx, vy);
      if (len < 0.25) { goal = null; return [0, 0]; }
      dx = vx / len; dy = vy / len;
    }
    return [round3(dx), round3(dy)];
  }

  /* ---- 画面の更新 ---- */
  function refreshAct() {
    const b = $('actBtn');
    const a = world.actionable();
    b.classList.toggle('live', a?.verb === 'stand');
    b.disabled = !a;
    b.textContent = !a ? '—' : {
      stand: '席を立つ',
      sit:   'ここに座る',
      use:   LABEL[a.object?.kind] ?? '使う',
      knock: `${a.actor?.name} さんに声をかける`,
      walk:  '席へ移動する',
    }[a.verb];

    const area = world.areaOfMe();
    $('hint').textContent = area ? area.name : 'WASD / 矢印・タップで移動・席の上で E';
  }

  function renderPanel() {
    const ul = $('members');
    const list = [...world.actors.values()].filter(a => a.userId);
    ul.innerHTML = list.map(a => `<li class="${a.entityId === world.selfEntityId ? 'me' : ''}">
      <span class="av" style="background:${esc(a.color)}"></span>
      <span>${esc(a.name)}</span>
      <span class="st ${a.status}">${STATUS_JA[a.status] ?? ''}</span></li>`).join('');
  }

  function setNet(ok) {
    $('netDot').classList.toggle('on', ok);
    $('netTxt').textContent = ok ? '接続中' : '切断 — 再接続します';
  }
}

const KEY = { w: 'up', a: 'left', s: 'down', d: 'right',
              arrowup: 'up', arrowleft: 'left', arrowdown: 'down', arrowright: 'right' };
const LABEL = { note: '読む', board: '見る', sign: '読む', whiteboard: 'ホワイトボードを開く', plant: '眺める' };
const STATUS_JA = { open: 'オープン', focus: '集中中', meet: '会議中', away: '離席' };
const round3 = v => Math.round(v * 1000) / 1000;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer = null;
function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
function toastAsk(msg, done) {
  const t = document.getElementById('toast');
  clearTimeout(toastTimer);
  t.innerHTML = `<span>${esc(msg)}</span>
    <button class="ctl" data-a="1" style="margin-left:10px;padding:4px 10px">出る</button>
    <button class="ctl" data-a="0" style="margin-left:6px;padding:4px 10px">あとで</button>`;
  t.style.pointerEvents = 'auto';
  t.classList.add('on');
  const close = ok => { t.classList.remove('on'); t.style.pointerEvents = 'none'; t.textContent = ''; done(ok); };
  t.querySelector('[data-a="1"]').onclick = () => close(true);
  t.querySelector('[data-a="0"]').onclick = () => close(false);
  toastTimer = setTimeout(() => close(false), 15000);   // 返事をしないことが既定（原則1）
}
