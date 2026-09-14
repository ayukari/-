/**
 * ひとり用の組み立て口 — サーバ無しで動く版
 *
 * ★ 部屋のロジックはサーバと同じ `gateway/room.js` を、ブラウザの中で動かしている。
 *   移動の速度上限も壁の当たり判定も着席の4条件も、本番とまったく同じコードが働く。
 *   違うのは「誰が権威か」だけで、ここでは自分しかいないので権威も自分にある。
 *
 *   本番（client/src/app.js）はこれを WebSocket の向こうに置く。
 *   置き場所が変わるだけで、規則は1つしかない。
 */
import { Grid } from '../core/grid.js';
import { Room } from '../gateway/room.js';
import { validateSit } from '../core/seats.js';
import { reachableObject } from '../core/proximity.js';
import { ClientWorld } from './world.js';
import { createRenderer3D, webglAvailable } from './render3d.js';
import { createRenderer2D } from './render2d.js';
import { lookFor, VARIETY } from './avatar.js';

const FPS_CAP = 30, FRAME_MS = 1000 / FPS_CAP;
const TICK_HZ = 10, TICK_MS = 1000 / TICK_HZ;

const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);

const NAMES = ['あかり', 'そら', 'みなと', 'ひなた', 'つむぎ', 'かえで', 'あおい', 'りく',
               'ゆい', 'はると', 'のぞみ', 'いつき'];
const COLORS = ['#C8873C', '#4F8299', '#7A6FA8', '#5F8C6B', '#B25F6A', '#8A7B5E',
                '#3F7E8C', '#A4557C'];
const STATUS_JA = { open: 'オープン', focus: '集中中', meet: '会議中', away: '離席' };
const LABEL = { note: '読む', board: '見る', sign: '読む', whiteboard: '開く', plant: '眺める' };

const PART_NAMES = {
  body: ['細め', 'ふつう', '丸め'],
  hair: ['ショート', '分け目', 'ボブ', 'ロング', 'ポニー', 'ツイン', 'お団子', '三つ編み',
         'ツンツン', 'ウェーブ', '刈り上げ', 'くるくる', 'ハーフ', 'サイド'],
  top: ['Tシャツ', '長袖', 'タンク', 'パーカー', 'シャツ', 'セーター', 'カーデ', 'ワンピ',
        'ジャケット', 'ベスト'],
  bottom: ['パンツ', 'ショート', 'クロップ', 'ワイド', 'レギンス', 'スカート', 'ロングスカート', 'カーゴ'],
  shoe: ['スニーカー', 'ローファー', 'ブーツ', 'サンダル', 'ハイカット'],
  acc: ['小物なし', 'めがね', 'ヘッドホン', 'キャップ', 'ニット帽', 'リボン', 'マフラー', 'ヘアピン'],
};

boot().catch(err => {
  $('boot').textContent = '起動できませんでした: ' + err.message;
  console.error(err);
});

async function boot() {
  const floor = await fetch(new URL('../floor.json', import.meta.url)).then(r => r.json());
  const world = new ClientWorld(floor);
  $('floorName').textContent = floor.name;

  /* ---- 部屋。サーバと同じクラスをここで回す ---- */
  const room = new Room(floor.id, new Grid(floor.grid, { areas: floor.areas, objects: floor.objects }),
                        floor.spawn);

  const me = { peerId: 'me', name: q.get('name') || 'あなた', color: COLORS[0], body: 1 };
  room.join(me.peerId, { userId: 'you', ...me });
  scatter(room, me.peerId);

  const bots = [];
  const BOT_N = Math.max(0, Math.min(12, Number(q.get('bots') ?? 6)));
  for (let i = 0; i < BOT_N; i++) {
    const peerId = 'b' + i;
    const name = NAMES[(i + 1) % NAMES.length];
    room.join(peerId, { userId: 'bot' + i, name, color: COLORS[(i + 1) % COLORS.length], body: i % 3 });
    scatter(room, peerId);
    bots.push({ peerId, goal: null, waitUntil: 0, standAt: 0 });
  }

  world.selfEntityId = room.get(me.peerId).entityId;
  syncRoster(world, room);

  /* ---- 表現レイヤー ---- */
  const use3d = q.get('view') !== '2d' && webglAvailable();
  const renderer = use3d ? createRenderer3D($('stage'), world) : createRenderer2D($('stage'), world);
  if (!use3d) toast('WebGL が使えないので 2D で表示しています', 4000);

  /* ---- 入力 ---- */
  const keys = new Set();
  let goal = null;
  addEventListener('keydown', e => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
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
    if (!drag.moved && performance.now() - drag.t < 600) {
      const p = renderer.pick(e.clientX, e.clientY);
      if (p) goal = p;
    }
    drag = null;
  });
  stage.addEventListener('pointercancel', () => { drag = null; });

  $('actBtn').addEventListener('click', act);
  $('statusSel').addEventListener('change', e => {
    const a = room.get(me.peerId);
    a.status = e.target.value;
    if (a.status === 'focus' && a.seat) { a.seat = null; a.inCall = false; }
  });
  addEventListener('resize', () => renderer.resize());

  /* ---- 行動。app.js と同じく動詞は5つだけ ---- */
  function act() {
    const a = world.actionable();
    const self = room.get(me.peerId);
    if (!a || !self) return;
    switch (a.verb) {
      case 'stand': self.seat = null; self.inCall = false; return;
      case 'sit': return sit(room, me.peerId, a.object.id) || toast('いまは座れません');
      case 'use': {
        const t = a.object.data?.title;
        return toast(t ? t : `${LABEL[a.object.kind] ?? '使った'}`);
      }
      case 'knock': return toast(`${a.actor.name} さんに声をかけました（ひとり用なので返事は来ません）`);
      case 'walk': goal = { x: a.object.x + 0.5, y: a.object.y + 0.5 }; return;
    }
  }

  /* ---- 見た目の編集 ---- */
  const look = { ...lookFor({ userId: 'you', color: me.color, body: me.body }) };
  applyLook();
  for (const [key, labels] of Object.entries(PART_NAMES)) {
    const sel = $('p_' + key);
    sel.innerHTML = labels.map((l, i) => `<option value="${i}">${l}</option>`).join('');
    sel.value = String(look[key]);
    sel.onchange = () => { look[key] = +sel.value; applyLook(); };
  }
  $('reroll').onclick = () => {
    Object.assign(look, lookFor({ userId: 'seed' + Math.random(), color: me.color }));
    for (const k of Object.keys(PART_NAMES)) $('p_' + k).value = String(look[k]);
    applyLook();
  };
  $('editBtn').onclick = () => $('editor').classList.toggle('on');
  $('closeEdit').onclick = () => $('editor').classList.remove('on');

  function applyLook() {
    const a = world.me;
    if (a) a.look = { ...look };      // 参照が変わったら作り直される
  }

  $('variety').textContent =
    `形 ${VARIETY.shapes.toLocaleString()} 通り × 配色 ${VARIETY.colors.toLocaleString()} 通り`;

  /* ---- ループ。10Hz で部屋を進め、30fps で描く ---- */
  let lastFrame = 0, lastTick = 0, seq = 0;
  let fpsT = performance.now(), fpsN = 0;
  $('boot').remove();

  function loop(now) {
    requestAnimationFrame(loop);
    if (now - lastFrame < FRAME_MS - 1) return;
    const dt = Math.min(0.25, (now - lastFrame) / 1000) || 1 / FPS_CAP;
    lastFrame = now;

    const [dx, dy] = inputVector();
    world.predict(dx, dy, dt);
    world.interpolate(dt);
    renderer.render(dt);

    if (now - lastTick >= TICK_MS) {
      lastTick = now;
      room.setIntent(me.peerId, dx, dy, (seq = (seq + 1) & 0xffff));
      for (const b of bots) driveBot(room, b, now);
      room.step(1 / TICK_HZ);
      const tick = room.buildTick(me.peerId, now);
      if (tick && tick.entries.length) world.applyTick(tick);
      syncStatuses(world, room);
    }

    fpsN++;
    if (now - fpsT >= 500) {
      const fps = Math.round(fpsN * 1000 / (now - fpsT));
      fpsT = now; fpsN = 0;
      $('hFps').textContent = fps;
      const i = renderer.info();
      $('hCalls').textContent = renderer.kind === '3d' ? i.calls : '—';
      $('hTris').textContent = renderer.kind === '3d' ? i.tris.toLocaleString() : '—';
      $('hPeople').textContent = world.actors.size;
      refreshAct();
      renderPanel();
    }
  }
  requestAnimationFrame(loop);

  // 動作確認用の覗き口
  globalThis.__solo = { world, room, shadows: () => renderer.info().shadows };

  function inputVector() {
    let dx = 0, dy = 0;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    if (drag && (drag.dx || drag.dy)) { dx = drag.dx; dy = drag.dy; }
    if (!dx && !dy && goal) {
      const a = world.me;
      if (!a || a.x === null) return [0, 0];
      const vx = goal.x - a.x, vy = goal.y - a.y, len = Math.hypot(vx, vy);
      if (len < 0.25) { goal = null; return [0, 0]; }
      dx = vx / len; dy = vy / len;
    }
    return [round3(dx), round3(dy)];
  }

  function refreshAct() {
    const b = $('actBtn'), a = world.actionable();
    b.classList.toggle('live', a?.verb === 'stand');
    b.disabled = !a;
    b.textContent = !a ? '—' : {
      stand: '席を立つ', sit: 'ここに座る',
      use: LABEL[a.object?.kind] ?? '使う',
      knock: `${a.actor?.name} さんに声をかける`,
      walk: '席へ移動する',
    }[a.verb];
    const area = world.areaOfMe();
    $('hint').textContent = area ? area.name : 'WASD / 矢印・タップで移動・席の上で E';
  }

  function renderPanel() {
    $('members').innerHTML = [...world.actors.values()].filter(a => a.userId).map(a =>
      `<li class="${a.entityId === world.selfEntityId ? 'me' : ''}">
        <span class="av" style="background:${esc(a.color)}"></span>
        <span>${esc(a.name)}</span>
        <span class="st ${a.status}">${STATUS_JA[a.status] ?? ''}</span></li>`).join('');
  }
}

/* ---------------- 部屋の世話 ---------------- */
/** 全員が同じ場所に湧くと重なるので、少しだけ散らす */
function scatter(room, peerId) {
  const a = room.get(peerId);
  for (let i = 0; i < 60; i++) {
    const x = 2 + Math.random() * (room.grid.width - 4);
    const y = 2 + Math.random() * (room.grid.height - 4);
    if (!room.grid.isBlocked(x, y) && !room.grid.objectAt(x, y)) { a.x = x; a.y = y; return; }
  }
}

function sit(room, peerId, seatId) {
  const a = room.get(peerId);
  const seat = room.grid.objectById(seatId);
  const table = seat?.data?.table;
  const r = validateSit({
    grid: room.grid, pos: a, seatId, status: a.status,
    occupied: room.occupiedSeats(),
    othersAtTable: table ? room.othersAtTable(table) : [],
  });
  if (!r.ok) return false;
  a.seat = seatId; a.inCall = true;
  return true;
}

/** roster は tick と別チャネル（09 §3.4）。ひとり用では最初に一度だけ渡す */
function syncRoster(world, room) {
  world.applyRoster({
    add: [...room.actors.values()].map(a => ({
      entityId: a.entityId, userId: a.userId, name: a.name, color: a.color, body: a.body,
    })),
    remove: [],
  });
}

/** ステータスも本来は別チャネル。tick の state ビットは既に入っている */
function syncStatuses(world, room) {
  for (const a of room.actors.values()) {
    const c = world.actors.get(a.entityId);
    if (c) c.status = a.status;
  }
}

/* ---------------- ボット ---------------- */
const SEATS = r => r.grid.objects.filter(o => o.kind === 'seat');

function driveBot(room, b, now) {
  const a = room.get(b.peerId);
  if (!a) return;

  if (a.seat) {
    if (now < b.standAt) { room.setIntent(b.peerId, 0, 0, 0); return; }
    a.seat = null; a.inCall = false;
    b.waitUntil = now + 400;
  }
  if (now < b.waitUntil) { room.setIntent(b.peerId, 0, 0, 0); return; }

  if (!b.goal) {
    if (Math.random() < 0.45) {
      const free = SEATS(room).filter(s => !room.occupiedSeats().has(s.id));
      const s = free[(Math.random() * free.length) | 0];
      b.goal = s ? { x: s.x + 0.5, y: s.y + 0.5, seatId: s.id } : randomSpot(room);
    } else {
      b.goal = randomSpot(room);
    }
    if (Math.random() < 0.25) a.status = ['open', 'open', 'open', 'focus', 'meet'][(Math.random() * 5) | 0];
  }

  const vx = b.goal.x - a.x, vy = b.goal.y - a.y, len = Math.hypot(vx, vy);
  if (len < 0.28) {
    if (b.goal.seatId && sit(room, b.peerId, b.goal.seatId)) {
      b.standAt = now + 8000 + Math.random() * 20000;
    } else {
      b.waitUntil = now + 800 + Math.random() * 3000;
    }
    b.goal = null;
    room.setIntent(b.peerId, 0, 0, 0);
    return;
  }
  room.setIntent(b.peerId, round3(vx / len), round3(vy / len), 0);
}

function randomSpot(room) {
  for (let i = 0; i < 40; i++) {
    const x = 1.5 + Math.random() * (room.grid.width - 3);
    const y = 1.5 + Math.random() * (room.grid.height - 3);
    if (!room.grid.isBlocked(x, y)) return { x, y };
  }
  return { x: room.spawn.x, y: room.spawn.y };
}

/* ---------------- こまごま ---------------- */
const KEY = { w: 'up', a: 'left', s: 'down', d: 'right',
              arrowup: 'up', arrowleft: 'left', arrowdown: 'down', arrowright: 'right' };
const round3 = v => Math.round(v * 1000) / 1000;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer = null;
function toast(msg, ms = 2400) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
