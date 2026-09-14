/**
 * 3D 表現レイヤー — docs/design/04-architecture.md §4.5 / §4.6、10-assets.md
 *
 * 論理レイヤー（ClientWorld）を読むだけ。書き込まない。
 * 同じインターフェースを render2d.js が実装しているので差し替えられる。
 *
 * 描画予算（10 §2）を守るための決まり:
 *   - 動的な影・ポストエフェクトなし（MeshLambertMaterial + 3灯）
 *   - 静的なものは InstancedMesh で1ドローコールに畳む
 *   - アバターは 本体 + 頭 + 名札 の3つ。人数分しか増えない
 *   - 部屋（床・壁・天井の庇・家具）は props.js が three 側で組む。DL は 0 バイト
 */
import * as THREE from 'three';
import { loadAvatars, makeAvatar, toonGradient } from './avatar.js';
import { propGeometry, buildFloor, buildWalls, buildCeiling } from './props.js';

/** ここまでは毎フレーム動かす（タイル） */
const ANIM_NEAR = 9;
/** それより遠い人は何フレームに1回動かすか */
const ANIM_FAR_EVERY = 3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** 見下ろす角度。寝かせると床ばかり、立てると机の側面が消える。この辺りが両方見える */
const PITCH = 56 * Math.PI / 180;
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
  // 部屋の外は「台の上に置いた模型」のように、無地で静かにしておく。
  // 空や地面を描くと、屋外に建っている建物に見えてしまう
  const PAL = dark ? { sky: 0x14120E } : { sky: 0xE7E2D9 };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  // 部屋の外はすぐ霞ませる。見せたいのは部屋の中
  scene.fog = new THREE.Fog(PAL.sky, 26, 52);

  // 3灯。動的な影は焼かない（02 §6.3）ので、光の当て方だけで立体を出す。
  //   キー   … 上手前から。暖色
  //   フィル … 半球光。下側は木の床からの照り返しを想定した色
  //   リム   … 後ろから寒色。背景から輪郭を分けるのはこれが効く
  // ★ 暗い配色では光そのものを落とす。家具の色は1つしか持っていないので、
  //   灯りを絞らないと、真っ暗な部屋に昼間の机が浮いているように見える
  const lit = dark ? 0.56 : 1;
  scene.add(new THREE.HemisphereLight(0xFFF3E4, dark ? 0x1C222A : 0xC3A183, 1.00 * lit));
  const key = new THREE.DirectionalLight(0xFFF1DA, 1.15 * lit);
  key.position.set(5, 10, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xBED4EC, dark ? 0.30 : 0.45);
  rim.position.set(-5, 3.5, -7);
  scene.add(rim);

  // 画角を狭くすると遠近が弱まり、箱庭に見える（gogh 系の見え方）
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 140);

  /* ---------------- 静的な地形。1回作って動かさない ---------------- */
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  /** 頂点カラーに色も陰も入っている。部屋のものは全部これ1つで描ける */
  const vc = () => new THREE.MeshLambertMaterial({ vertexColors: true });

  const blockedAt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid.isBlocked(x, y);
  // 窓の位置を渡して、床に日なたを焼いてもらう
  const windows = (floor.objects ?? []).filter(o => o.kind === 'window');
  const floorMesh = new THREE.Mesh(buildFloor(W, H, blockedAt, dark, windows, floor.areas ?? []), vc());
  scene.add(floorMesh);
  scene.add(new THREE.Mesh(buildWalls(W, H, blockedAt, dark), vc()));
  scene.add(new THREE.Mesh(buildCeiling(W, H, dark), vc()));

  // エリア（会議室・集中ルーム）の印は床の頂点カラーに焼いてある（props.js）

  /* ---------------- 家具。種別ごとに1ドローコール（10 §5） ---------------- */
  const m4 = new THREE.Matrix4();
  const objects = floor.objects ?? [];
  for (const kind of new Set(objects.map(o => o.kind))) {
    const geo = propGeometry(kind);
    if (!geo) continue;
    const list = objects.filter(o => o.kind === kind);
    const im = new THREE.InstancedMesh(geo, vc(), list.length);
    list.forEach((o, i) => {
      m4.makeRotationY((o.rot ?? 0) * Math.PI / 180).setPosition(o.x + 0.5, 0, o.y + 0.5);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
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

    /* カメラ。
       ★ 数字を手で決めない。**部屋の幅が画角に収まる距離**を毎フレーム計算する。
         こうすると、窓の大きさが変わっても「部屋がまるごと見える」が保たれる。
         横持ちでは部屋が丸ごと入るので、視点はほとんど動かない（箱庭の見え方）。
         縦持ちでは入りきらないので、入る範囲だけ人を追う。 */
    if (me && me.x !== null) {
      const halfV = camera.fov * Math.PI / 360;
      const tanH = Math.tan(halfV) * camera.aspect;
      // 壁の外側まで少し余白を取る。近すぎると部屋が窮屈に、遠すぎると人が読めない
      // 幅がちょうど入る距離。ただし**部屋の奥行きが画面を埋める**ところまで。
      // 幅だけを見て引くと、縦持ちでは画面の下半分が部屋の外になる
      const fitW = (W / 2 + 1.4) / tanH;
      const fillD = (H / 2 + 0.6) * Math.sin(PITCH) / Math.tan(halfV);
      const dist = clamp(Math.min(fitW, fillD), 13, 27);
      const h = dist * Math.sin(PITCH), d = dist * Math.cos(PITCH);
      // いま画面に入る広さ。これが部屋より広ければ、追う必要はない
      const vw = dist * tanH;
      const vd = dist * Math.tan(halfV) / Math.sin(PITCH);
      const cx = clamp(me.x, Math.min(vw, W / 2), Math.max(W - vw, W / 2));
      const cz = clamp(me.y, Math.min(vd, H / 2), Math.max(H - vd, H / 2));
      // ★ 注視点を少し手前に置く。真ん中を見ると、遠近のぶん手前が詰まって
      //   部屋の手前側（ラウンジ）が画面の下で切れる
      target.set(cx, 0.55, cz + 0.9);
      const want = new THREE.Vector3(cx, h, cz + d);
      if (!camReady) { camera.position.copy(want); camReady = true; }
      else camera.position.lerp(want, 0.10);
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
    // ★ カメラの値も返す。画の不具合は「どこから見ているか」が分からないと追えない
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles,
                   shadows: shadows.count,
                   cam: camera.position.toArray().map(v => +v.toFixed(2)),
                   at: target.toArray().map(v => +v.toFixed(2)),
                   fov: camera.fov, aspect: +camera.aspect.toFixed(3) }),
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
