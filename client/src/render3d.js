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

const TILE = 1;                 // 1タイル = 1ユニット ≒ 1.0m（10 §5）
const WALL_H = 1.5;
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

  scene.add(new THREE.HemisphereLight(0xffffff, PAL.ground, 1.45));
  const sun = new THREE.DirectionalLight(0xfff4e2, 0.75);
  sun.position.set(6, 12, 4);
  scene.add(sun);

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
  const slab = (cells, color, h) => {
    if (!cells.length) return;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, h, TILE), mat(color), cells.length);
    cells.forEach(([x, y], i) => {
      m4.makeScale(0.98, 1, 0.98).setPosition(x + 0.5, h / 2, y + 0.5);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
  };
  slab(edges, PAL.wall, WALL_H);
  slab(furn, PAL.furn, 0.72);     // 内側はテーブルの高さ

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

  // 手の届くオブジェクトを示す輪
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24),
    new THREE.MeshBasicMaterial({ color: 0xc8873c, transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false;
  scene.add(ring);

  /* ---------------- アバター ---------------- */
  /** entityId -> {group, body, head, label, tex} */
  const avatars = new Map();

  function makeAvatar(a) {
    const g = new THREE.Group();
    const r = BODY_R[a.body ?? 0], bh = BODY_H[a.body ?? 0];
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, bh, 3, 10), mat(a.color));
    body.position.y = bh / 2 + r;
    const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.78, 12, 8), mat(0xf3dfc8));
    head.position.y = bh + r * 2 + r * 0.5;   // カプセルの頂点より上に出す
    // 向きが分かるように鼻を付ける（モデルは +z を正面とする、10 §5）
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), mat(0xd8b48c));
    nose.position.set(0, head.position.y, r * 0.72);
    const { sprite, tex } = makeLabel(a.name);
    sprite.position.y = head.position.y + r * 1.35;
    g.add(body, head, nose, sprite);
    scene.add(g);
    return { group: g, body, head, label: sprite, tex, name: a.name, shape: a.body ?? 0 };
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
    sprite.scale.set(c.width / c.height * 0.38, 0.38, 1);
    return { sprite, tex };
  }

  /* ---------------- 毎フレーム ---------------- */
  const target = new THREE.Vector3();
  let camReady = false;

  function render() {
    const me = world.me;

    // アバターの生成・更新・破棄
    for (const a of world.actors.values()) {
      if (a.x === null) continue;
      let av = avatars.get(a.entityId);
      if (!av) { av = makeAvatar(a); avatars.set(a.entityId, av); }
      if (av.name !== a.name) {  // roster が後から届いた場合
        scene.remove(av.group); disposeAvatar(av);
        av = makeAvatar(a); avatars.set(a.entityId, av);
      }
      const sit = a.seated ? 0.22 : 0;
      av.group.position.set(a.x, -sit, a.y);
      av.group.rotation.y = a.dir;
      const focus = a.status === 'focus', away = a.status === 'away';
      av.body.material.opacity = away ? 0.4 : 1;
      av.body.material.transparent = away;
      av.head.material.color.setHex(focus ? 0xc9d2dc : 0xf3dfc8);
      av.label.visible = !away;
    }
    for (const [id, av] of avatars) {
      if (!world.actors.has(id)) { scene.remove(av.group); disposeAvatar(av); avatars.delete(id); }
    }

    // いま行動の対象になっているものに輪をつける
    const o = world.actionable()?.object;
    ring.visible = !!o;
    if (o) ring.position.set(o.x + 0.5, 0.03, o.y + 0.5);

    // カメラ。固定の斜め見下ろし。縦持ちのときは角度を立てる
    if (me && me.x !== null) {
      const portrait = renderer.domElement.clientHeight > renderer.domElement.clientWidth;
      const h = portrait ? 15 : 11.5, d = portrait ? 6 : 9.5;
      target.set(me.x, 0, me.y);
      const want = new THREE.Vector3(me.x, h, me.y + d);
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

  const disposeAvatar = av => {
    av.tex.dispose();
    av.group.traverse(n => { n.geometry?.dispose?.(); n.material?.dispose?.(); });
  };

  return {
    kind: '3d',
    render, resize, pick,
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
    dispose() {
      for (const av of avatars.values()) disposeAvatar(av);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
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
