/**
 * 3D 表現レイヤー — docs/design/04-architecture.md §4.5 / §4.6、10-assets.md
 *
 * 論理レイヤー（ClientWorld）を読むだけ。書き込まない。
 * 同じインターフェースを render2d.js が実装しているので差し替えられる。
 *
 * 描画予算（10 §2）を守るための決まり:
 *   - 影なし・ポストエフェクトなし（MeshLambertMaterial + 2灯）
 *   - 静的なものは InstancedMesh で1ドローコールに畳む
 *   - アバターは 本体 + 頭 + 名札 の3つ。人数分しか増えない
 */
import * as THREE from 'three';
import { loadAvatars, makeAvatar, toonGradient } from './avatar.js';

const TILE = 1;                 // 1タイル = 1ユニット ≒ 1.0m（10 §5）
const WALL_H = 1.5;
/** ここまでは毎フレーム動かす（タイル） */
const ANIM_NEAR = 9;
/** それより遠い人は何フレームに1回動かすか */
const ANIM_FAR_EVERY = 3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const BODY_R = [0.26, 0.31, 0.36];
const BODY_H = [0.62, 0.58, 0.52];

export function createRenderer3D(el, world) {
  const { grid, floor } = world;
  const W = grid.width, H = grid.height;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;   // 影は使わない（低スペック機の前提、02 §6）
  el.appendChild(renderer.domElement);

  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const PAL = dark
    ? { sky: 0x141a21, ground: 0x232b33, floor: 0x4a4237, wall: 0x39424d, furn: 0x6b5a45, meet: 0x3a2e1c, focus: 0x1e2c34, line: 0x2b343d }
    : { sky: 0xdce4ec, ground: 0xc9d2dc, floor: 0xd8cdbc, wall: 0xc4cbd3, furn: 0xb59b78, meet: 0xf2e2cb, focus: 0xdce9ef, line: 0xbfc7d0 };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  scene.fog = new THREE.Fog(PAL.sky, 26, 46);

  // 3灯。動的な影は焼かない（02 §6.3）ので、光の当て方だけで立体を出す。
  //   キー   … 上手前から。暖色
  //   フィル … 半球光。下側は木の床からの照り返しを想定した色
  //   リム   … 後ろから寒色。背景から輪郭を分けるのはこれが効く
  scene.add(new THREE.HemisphereLight(0xFFF3E4, dark ? 0x1C222A : 0xC3A183, 1.00));
  const key = new THREE.DirectionalLight(0xFFF1DA, 1.15);
  key.position.set(5, 10, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xBED4EC, 0.45);
  rim.position.set(-5, 3.5, -7);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(44, 1, 0.5, 120);

  /* ---------------- 静的な地形。1回作って動かさない ---------------- */
  const mat = c => new THREE.MeshLambertMaterial({ color: c });

  // 部屋の外の地面。縦持ちで空だけが見えるのを防ぐ（実機で見つけた問題）
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat(PAL.ground));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, -0.04, H / 2);
  scene.add(ground);

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat(PAL.floor));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(W / 2, 0, H / 2);
  scene.add(floorMesh);

  // エリア（会議室・集中ルーム）は床の色違いで示す
  for (const a of floor.areas ?? []) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h),
      mat(a.kind === 'MEETING' ? PAL.meet : PAL.focus));
    p.rotation.x = -Math.PI / 2;
    p.position.set(a.x + a.w / 2, 0.01, a.y + a.h / 2);
    scene.add(p);
  }

  // 通行不可タイル。外周の壁と内側の什器は見分けがつかないと困るので色を分ける。
  // それぞれ InstancedMesh 1つ = 2ドローコールで済む
  const m4 = new THREE.Matrix4();
  const edges = [], furn = [];
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    if (!grid.isBlocked(x, y)) continue;
    (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? edges : furn).push([x, y]);
  }
  const slab = (cells, color, h, gap = 1.0) => {
    if (!cells.length) return;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, h, TILE), mat(color), cells.length);
    cells.forEach(([x, y], i) => {
      // 壁は隙間なく、什器は少し縮めて1つずつに見えるように
      m4.makeScale(gap, 1, gap).setPosition(x + 0.5, h / 2, y + 0.5);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  };
  slab(edges, PAL.wall, WALL_H);
  slab(furn, PAL.furn, 0.72, 0.98);   // 内側はテーブルの高さ

  /* ---------------- オブジェクト。種別ごとに1ドローコール ---------------- */
  const KINDS = {
    seat:  { geo: () => new THREE.CylinderGeometry(0.28, 0.22, 0.42, 10), c: 0x8a7b5e, y: 0.21 },
    note:  { geo: () => new THREE.BoxGeometry(0.5, 0.7, 0.08), c: 0xc8873c, y: 0.35 },
    board: { geo: () => new THREE.BoxGeometry(1.2, 0.8, 0.1), c: 0x4f8299, y: 0.62 },
    sign:  { geo: () => new THREE.BoxGeometry(0.6, 0.9, 0.08), c: 0x7a6fa8, y: 0.45 },
    whiteboard: { geo: () => new THREE.BoxGeometry(1.6, 1.1, 0.1), c: 0xeef1f4, y: 0.7 },
    plant: { geo: () => new THREE.ConeGeometry(0.34, 0.9, 8), c: 0x5f8c6b, y: 0.45 },
  };
  const objMeshes = new Map();
  for (const [kind, spec] of Object.entries(KINDS)) {
    const list = (floor.objects ?? []).filter(o => o.kind === kind);
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(spec.geo(), mat(spec.c), list.length);
    list.forEach((o, i) => {
      m4.makeRotationY(0).setPosition(o.x + 0.5, spec.y, o.y + 0.5);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    objMeshes.set(kind, { im, list });
  }

  /* ---------------- 接地影（10 §2 の「ブロブシャドウ」） ----------------
     動的な影は使わないが、足元に丸い影が無いと人が浮いて見える。
     中心が濃く外周が透明な円板を、全員ぶん1つの InstancedMesh で描く = 1ドローコール */
  const MAX_SHADOWS = 64;
  const shadows = new THREE.InstancedMesh(blobGeometry(), new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false,
  }), MAX_SHADOWS);
  shadows.count = 0;
  shadows.frustumCulled = false;
  shadows.renderOrder = 1;
  scene.add(shadows);

  // 手の届くオブジェクトを示す輪
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24),
    new THREE.MeshBasicMaterial({ color: 0xc8873c, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false;
  scene.add(ring);

  /* ---------------- アバター ---------------- */
  /** entityId -> Av */
  const avatars = new Map();
  const gradient = toonGradient();
  const shadowM = new THREE.Matrix4();
  let frame = 0;

  // モデルは後から届く。届くまでは簡易表示で動かし、届いたら差し替える。
  // 読み込みに失敗しても簡易表示のまま止まらない（10 §9 の「3Dが落ちても続行する」）
  let packs = null;
  loadAvatars().then(p => {
    packs = p;
    for (const [id, av] of [...avatars]) { drop(av); avatars.delete(id); }
  }).catch(err => {
    console.warn('アバターのモデルを読めなかったので簡易表示で続ける', err);
  });

  function buildAvatar(a) {
    const { sprite, tex } = makeLabel(a.name);
    if (packs) {
      const av = makeAvatar(packs, a, gradient);
      sprite.position.y = 1.92;
      av.root.add(sprite);
      scene.add(av.root);
      // 位相をずらす。同じフレームにまとめて更新すると、そのフレームだけ跳ねる
      return { group: av.root, rig: av, label: sprite, tex, name: a.name, lookRef: a.look,
               px: a.x, py: a.y, clip: 'idle', phase: a.entityId % ANIM_FAR_EVERY };
    }
    // 簡易表示（モデル到着前・読み込み失敗時）
    const g = new THREE.Group();
    const r = BODY_R[a.body ?? 0], bh = BODY_H[a.body ?? 0];
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, bh, 3, 10), mat(a.color));
    body.position.y = bh / 2 + r;
    const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.78, 12, 8), mat(0xf3dfc8));
    head.position.y = bh + r * 2 + r * 0.5;
    sprite.position.y = head.position.y + r * 1.35;
    g.add(body, head, sprite);
    scene.add(g);
    return { group: g, body, head, label: sprite, tex, name: a.name, lookRef: a.look,
            px: a.x, py: a.y, clip: 'idle', phase: a.entityId % ANIM_FAR_EVERY };
  }

  function drop(av) {
    scene.remove(av.group);
    av.tex.dispose();
    av.label.material.dispose();
    if (av.rig) av.rig.dispose();
    else av.group.traverse(n => { n.geometry?.dispose?.(); n.material?.dispose?.(); });
  }

  function makeLabel(name) {
    const pad = 10, fs = 30;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = `500 ${fs}px sans-serif`;
    c.width = Math.ceil(ctx.measureText(name).width) + pad * 2;
    c.height = fs + pad * 2;
    const x = c.getContext('2d');
    x.font = `500 ${fs}px sans-serif`;
    x.fillStyle = dark ? 'rgba(20,24,30,.82)' : 'rgba(255,255,255,.9)';
    roundRect(x, 0, 0, c.width, c.height, 12); x.fill();
    x.fillStyle = dark ? '#e7ebf0' : '#191e25';
    x.textBaseline = 'middle';
    x.fillText(name, pad, c.height / 2 + 1);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(c.width / c.height * 0.28, 0.28, 1);   // 名札が体より目立たない大きさ
    return { sprite, tex };
  }

  /* ---------------- 毎フレーム ---------------- */
  const target = new THREE.Vector3();
  let camReady = false;

  function render(dtSec = 1 / 30) {
    const me = world.me;
    frame++;

    // アバターの生成・更新・破棄
    for (const a of world.actors.values()) {
      if (a.x === null) continue;
      let av = avatars.get(a.entityId);
      if (!av) { av = buildAvatar(a); avatars.set(a.entityId, av); }
      // roster が後から届いた場合と、すがたを変えた場合は作り直す
      if (av.name !== a.name || av.lookRef !== a.look) {
        drop(av); av = buildAvatar(a); avatars.set(a.entityId, av);
      }
      // 座ったら席の中心に吸い付き、机を向く。
      // 自分の座標のまま座らせると椅子をまたいで座ることになる
      const seat = world.seatOf(a);
      if (seat) {
        av.group.position.set(seat.x + 0.5, 0, seat.y + 0.5);
        av.group.rotation.y = world.seatFacing(seat);
      } else {
        av.group.position.set(a.x, 0, a.y);
        av.group.rotation.y = a.dir;
      }
      av.label.position.y = seat ? 1.52 : 1.92;
      av.seated = !!seat;

      // 動いているかは位置の変化で決める。サーバは「歩いている」を送ってこない
      const speed = Math.hypot(a.x - av.px, a.y - av.py) / Math.max(dtSec, 1e-3);
      av.px = a.x; av.py = a.y;
      const want = a.seated ? 'sit' : (speed > 0.45 ? 'walk' : 'idle');
      if (av.rig && want !== av.clip) { av.rig.play(want); av.clip = want; }

      // 遠い人はアニメーションを間引く（10 §4）。
      // 骨の行列計算は1人18本ぶんCPUでやるので、人数がそのまま効く。
      // 25人ぶんを毎フレーム回すと、描画より先にここが詰まる
      if (av.rig) {
        const far = me ? Math.hypot(a.x - me.x, a.y - me.y) > ANIM_NEAR : false;
        if (!far) av.rig.mixer.update(dtSec);
        else if ((frame + av.phase) % ANIM_FAR_EVERY === 0) av.rig.mixer.update(dtSec * ANIM_FAR_EVERY);
      }

      const away = a.status === 'away';
      av.group.visible = true;
      av.label.visible = !away;
      setFade(av, away ? 0.35 : 1);
    }
    for (const [id, av] of avatars) {
      if (!world.actors.has(id)) { drop(av); avatars.delete(id); }
    }

    // 接地影を全員ぶん置き直す
    let ns = 0;
    for (const av of avatars.values()) {
      if (ns >= MAX_SHADOWS || !av.group.visible) continue;
      const r = (av.seated ? 0.30 : 0.40) * (av.fade ?? 1);
      shadowM.makeScale(r, 1, r * 0.82);
      shadowM.setPosition(av.group.position.x, 0.012, av.group.position.z + 0.04);
      shadows.setMatrixAt(ns++, shadowM);
    }
    shadows.count = ns;
    shadows.instanceMatrix.needsUpdate = true;

    // いま行動の対象になっているものに輪をつける
    const o = world.actionable()?.object;
    ring.visible = !!o;
    if (o) ring.position.set(o.x + 0.5, 0.03, o.y + 0.5);

    // カメラ。固定の斜め見下ろし。縦持ちのときは角度を立てる
    if (me && me.x !== null) {
      const portrait = renderer.domElement.clientHeight > renderer.domElement.clientWidth;
      // 顔が読める距離まで寄せる。広く見せるより、誰が居るか分かるほうを取る
      const h = portrait ? 10.6 : 8.0, d = portrait ? 4.6 : 6.8;
      // ★ 部屋の端では追うのをやめる。
      //   端まで追うと画面の半分が壁になり、手前の人の名札だけが巨大に見える
      const mx = portrait ? 3.5 : 6.0, mz = 4.0;
      const cx = clamp(me.x, Math.min(mx, W / 2), Math.max(W - mx, W / 2));
      const cz = clamp(me.y, Math.min(mz, H / 2), Math.max(H - mz * 0.6, H / 2));
      target.set(cx, 0, cz);
      const want = new THREE.Vector3(cx, h, cz + d);
      if (!camReady) { camera.position.copy(want); camReady = true; }
      else camera.position.lerp(want, 0.12);
      camera.lookAt(target);
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
  resize();

  /* 画面上の点 → タイル座標 */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(floorMesh, false)[0];
    return hit ? { x: hit.point.x, y: hit.point.z } : null;
  }

  /**
   * 離席は薄く見せる。消すと「居ないこと」になってしまうので残す。
   * 変わったときだけ触る（毎フレーム全ノードを走査すると人数ぶん効く）
   */
  function setFade(av, k) {
    if (av.fade === k) return;
    av.fade = k;
    av.group.traverse(n => {
      if (!n.isMesh) return;
      n.material.transparent = k < 1;
      n.material.opacity = k;
      n.material.depthWrite = k >= 1;
      n.material.needsUpdate = true;
    });
  }

  return {
    kind: '3d',
    render, resize, pick,
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
                   shadows: shadows.count }),
    dispose() {
      for (const av of avatars.values()) drop(av);
      gradient.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/**
 * 中心が濃く外周が透明な円板（接地影）。テクスチャを使わず頂点カラーのアルファで落とす。
 * 中間のリングを1枚挟んで、落ち方を直線ではなくする（芯が締まって影らしくなる）
 */
export function blobGeometry(seg = 16) {
  const RINGS = [[0.0, 0.40], [0.58, 0.26], [1.0, 0.0]];
  const pos = [], col = [], idx = [];
  for (const [r, a] of RINGS) {
    if (r === 0) { pos.push(0, 0, 0); col.push(0, 0, 0, a); continue; }
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      pos.push(Math.cos(t) * r, 0, Math.sin(t) * r);
      col.push(0, 0, 0, a);
    }
  }
  // ★ 巻き方向は上（+Y）から見て反時計回り。逆にすると裏面として消える
  for (let i = 0; i < seg; i++) idx.push(0, 1 + (i + 1) % seg, 1 + i);          // 中心の扇
  for (let i = 0; i < seg; i++) {                                               // 外側の輪
    const a = 1 + i, b = 1 + (i + 1) % seg, c = 1 + seg + i, d = 1 + seg + (i + 1) % seg;
    idx.push(a, d, c, a, b, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r); c.closePath();
}

/** WebGL が無い端末では 3D を起動しない（10 §9 の前提条件） */
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
