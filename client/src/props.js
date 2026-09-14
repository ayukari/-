/**
 * 部屋の造作 — 床・壁・家具 — docs/design/10-assets.md §5
 *
 * ★ 家具は **three 側で組み立てる**。glTF を落としてこない。
 *   机や棚は箱の組み合わせで足りる形なので、コードで作れば
 *   ダウンロードは1バイトも増えず、形を変えるのも早い。
 *   （骨と動きを持つアバターだけは glTF が要る）
 *
 * ★ 種別ごとに1つのジオメトリに統合する。置く数が増えても
 *   InstancedMesh 1つ = 1ドローコールのまま変わらない（10 §5）。
 *
 * ★ 陰は頂点カラーに焼く。動的な影を使わない代わりに、
 *   「低いところほど暗い」「壁や家具の際ほど暗い」を焼いておく。
 *   これが無いと、低ポリの部屋は書き割りに見える。
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------------- 色 ---------------- */
export const C = {
  woodLight: '#C6A57C', wood: '#A9865C', woodDark: '#6F5639', woodWarm: '#B8865A',
  metal: '#8E94A1', metalDark: '#5A606C',
  fabricWarm: '#C07E5E', fabricCool: '#6F8C9C', fabricCream: '#E0D2BC', fabricSage: '#8AA08A',
  felt: '#C3CCD1', rugWarm: '#B0705C', rugField: '#E6D8C2',
  leaf: '#5D8C58', leafDark: '#456B44', pot: '#B4705A', soil: '#4A3B30',
  screen: '#2D3742', screenOn: '#8FB8CE', paper: '#F3EEE4', ink: '#3A3F47',
  glass: '#BFD9EA', sky: '#CFE3F0', white: '#EFEFEA', dark: '#2C2A2D',
  accent: '#C8873C', accent2: '#7A6FA8', red: '#B25F6A', teal: '#4F8299',
};

/* ---------------- 組み立ての道具 ---------------- */
/** 1部品。色と、置き場所と、向きを持つ */
function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = null) {
  geo.rotateX(rot[0]); geo.rotateY(rot[1]); geo.rotateZ(rot[2]);
  if (scale) geo.scale(...scale);
  geo.translate(...pos);
  geo.userData.color = color;
  return geo;
}
const box = (w, h, d, ...rest) => part(new THREE.BoxGeometry(w, h, d), ...rest);
const cyl = (rt, rb, h, seg, ...rest) => part(new THREE.CylinderGeometry(rt, rb, h, seg), ...rest);
const sph = (r, seg, ring, ...rest) => part(new THREE.SphereGeometry(r, seg, ring), ...rest);
const con = (r, h, seg, ...rest) => part(new THREE.ConeGeometry(r, h, seg), ...rest);

/** 0〜1 に丸める。負を通すと `** 0.7` が NaN になり、その頂点が真っ黒になる */
const clamp01 = v => (v > 1 ? 1 : v > 0 ? v : 0);

/**
 * 部品をまとめて1つにする。ここで陰を頂点カラーに焼く。
 * @param {number} top この家具のいちばん高いところ（陰の勾配の基準）
 */
function assemble(pieces, top = 1) {
  const col = new THREE.Color();
  for (const g of pieces) {
    const pos = g.getAttribute('position');
    const c = new Float32Array(pos.count * 3);
    col.set(g.userData.color);
    for (let i = 0; i < pos.count; i++) {
      // 低いところほど暗い。1つの勾配だけで、脚の付け根や棚の内側が落ちる
      const k = 0.62 + 0.38 * clamp01(pos.getY(i) / top) ** 0.7;
      c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    delete g.userData.color;
  }
  const m = mergeGeometries(pieces, false);
  for (const g of pieces) g.dispose();
  m.computeVertexNormals();
  return m;
}

const rnd = seed => { let x = seed; return () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; };

/* ---------------- 家具 ----------------
   すべて「タイルの中心が原点・床が y=0・+Z が正面」で作る。
   置く向きは render3d 側が Y 回転で与える。 */

const DESK_H = 0.72, SEAT_H = 0.42;

const PROPS = {
  /** 机。2タイルぶんの幅 */
  desk: () => assemble([
    box(1.86, 0.055, 0.86, C.woodLight, [0, DESK_H, 0]),
    box(1.80, 0.03, 0.80, C.wood, [0, DESK_H - 0.05, 0]),
    ...[[-0.86, -0.37], [0.86, -0.37], [-0.86, 0.37], [0.86, 0.37]]
      .map(([x, z]) => box(0.07, DESK_H, 0.07, C.woodDark, [x, DESK_H / 2, z])),
    box(1.70, 0.30, 0.04, C.wood, [0, 0.42, -0.38]),        // 幕板
  ], DESK_H + 0.06),

  /** 椅子 */
  chair: () => assemble([
    box(0.46, 0.07, 0.44, C.woodLight, [0, SEAT_H, 0]),
    box(0.44, 0.42, 0.055, C.woodLight, [0, SEAT_H + 0.26, -0.20], [0.10, 0, 0]),
    ...[[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]
      .map(([x, z]) => cyl(0.022, 0.026, SEAT_H, 6, C.metalDark, [x, SEAT_H / 2, z])),
  ], SEAT_H + 0.5),

  /** モニタ。机の上に載る高さで作ってある */
  monitor: () => assemble([
    box(0.60, 0.36, 0.035, C.dark, [0, DESK_H + 0.30, -0.02]),
    box(0.55, 0.31, 0.01, C.screenOn, [0, DESK_H + 0.30, 0.005]),
    cyl(0.03, 0.03, 0.14, 8, C.metal, [0, DESK_H + 0.08, -0.02]),
    box(0.26, 0.018, 0.16, C.metal, [0, DESK_H + 0.01, -0.02]),
  ], DESK_H + 0.5),

  laptop: () => assemble([
    box(0.34, 0.018, 0.24, C.metal, [0, DESK_H + 0.03, 0.03]),
    box(0.33, 0.22, 0.012, C.dark, [0, DESK_H + 0.14, -0.08], [-0.22, 0, 0]),
    box(0.30, 0.19, 0.006, C.screenOn, [0, DESK_H + 0.14, -0.072], [-0.22, 0, 0]),
  ], DESK_H + 0.3),

  mug: () => assemble([
    cyl(0.042, 0.036, 0.10, 10, C.white, [0, DESK_H + 0.05, 0]),
    cyl(0.038, 0.038, 0.01, 10, C.accent, [0, DESK_H + 0.098, 0]),
  ], DESK_H + 0.12),

  /** 観葉植物。葉を放射に散らす */
  plant: () => {
    const r = rnd(7), leaves = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4;
      const lean = 0.45 + r() * 0.5, len = 0.42 + r() * 0.28;
      leaves.push(part(new THREE.SphereGeometry(0.5, 6, 4), i % 2 ? C.leaf : C.leafDark,
        [Math.sin(a) * len * 0.42, 0.46 + len * 0.42 * Math.cos(lean), Math.cos(a) * len * 0.42],
        [lean * Math.cos(a), -a, -lean * Math.sin(a)],
        [0.19, 0.09, len * 0.62]));
    }
    return assemble([
      con(0.24, 0.34, 10, C.pot, [0, 0.17, 0], [Math.PI, 0, 0]),
      cyl(0.21, 0.21, 0.05, 10, C.soil, [0, 0.33, 0]),
      ...leaves,
    ], 1.1);
  },

  plantS: () => assemble([
    cyl(0.07, 0.055, 0.10, 8, C.pot, [0, DESK_H + 0.05, 0]),
    sph(0.09, 8, 6, C.leaf, [0, DESK_H + 0.16, 0], [0, 0, 0], [1, 0.85, 1]),
  ], DESK_H + 0.28),

  /** 本棚。背の本は高さも色も少しずつ変える */
  shelf: () => {
    const r = rnd(3), books = [];
    for (let s = 0; s < 3; s++) {
      let x = -0.42;
      while (x < 0.38) {
        const w = 0.035 + r() * 0.03, h = 0.20 + r() * 0.08;
        const c = [C.red, C.teal, C.accent, C.accent2, C.fabricCream, C.leafDark][(r() * 6) | 0];
        books.push(box(w, h, 0.20, c, [x + w / 2, 0.30 + s * 0.42 + h / 2, 0]));
        x += w + 0.006;
      }
    }
    return assemble([
      box(1.00, 1.50, 0.30, C.wood, [0, 0.75, -0.02]),
      ...[0, 1, 2, 3].map(i => box(0.96, 0.035, 0.30, C.woodLight, [0, 0.28 + i * 0.42, 0.01])),
      ...books,
    ], 1.5);
  },

  /** ソファ。2タイルぶん */
  sofa: () => assemble([
    box(1.80, 0.32, 0.82, C.fabricWarm, [0, 0.28, 0]),
    box(1.80, 0.52, 0.20, C.fabricWarm, [0, 0.62, -0.31], [0.12, 0, 0]),
    box(0.18, 0.28, 0.82, C.fabricWarm, [-0.81, 0.58, 0]),
    box(0.18, 0.28, 0.82, C.fabricWarm, [0.81, 0.58, 0]),
    box(0.80, 0.10, 0.70, C.fabricCream, [-0.42, 0.48, 0.03]),
    box(0.80, 0.10, 0.70, C.fabricCream, [0.42, 0.48, 0.03]),
    ...[[-0.72, -0.30], [0.72, -0.30], [-0.72, 0.30], [0.72, 0.30]]
      .map(([x, z]) => cyl(0.035, 0.03, 0.12, 6, C.woodDark, [x, 0.06, z])),
  ], 0.9),

  lowTable: () => assemble([
    box(1.10, 0.05, 0.62, C.woodLight, [0, 0.38, 0]),
    box(1.00, 0.03, 0.54, C.wood, [0, 0.20, 0]),
    ...[[-0.48, -0.25], [0.48, -0.25], [-0.48, 0.25], [0.48, 0.25]]
      .map(([x, z]) => box(0.05, 0.38, 0.05, C.woodDark, [x, 0.19, z])),
  ], 0.45),

  /** ラグ。板ポリ1枚だが、縁を1段付けて厚みを出す */
  rug: () => assemble([
    box(2.90, 0.012, 1.90, C.rugWarm, [0, 0.006, 0]),
    box(2.62, 0.014, 1.64, C.rugField, [0, 0.009, 0]),
    box(2.62, 0.016, 0.16, C.rugWarm, [0, 0.011, -0.46]),
    box(2.62, 0.016, 0.16, C.rugWarm, [0, 0.011, 0.46]),
    box(1.30, 0.018, 0.34, C.fabricSage, [0, 0.013, 0]),
  ], 0.05),

  /** 大きいラグ。会議の島を1枚で囲う */
  rugBig: () => assemble([
    box(4.86, 0.012, 3.86, C.fabricSage, [0, 0.006, 0]),
    box(4.58, 0.014, 3.58, C.rugField, [0, 0.009, 0]),
    box(4.58, 0.016, 0.18, C.fabricSage, [0, 0.011, -1.42]),
    box(4.58, 0.016, 0.18, C.fabricSage, [0, 0.011, 1.42]),
  ], 0.05),

  lamp: () => assemble([
    cyl(0.18, 0.20, 0.03, 12, C.metalDark, [0, 0.015, 0]),
    cyl(0.022, 0.022, 1.30, 6, C.metal, [0, 0.65, 0]),
    cyl(0.16, 0.24, 0.28, 12, C.fabricCream, [0, 1.40, 0]),
    cyl(0.15, 0.15, 0.02, 12, C.screenOn, [0, 1.27, 0]),
  ], 1.6),

  cabinet: () => assemble([
    box(1.00, 0.80, 0.42, C.wood, [0, 0.40, 0]),
    box(0.46, 0.66, 0.03, C.woodLight, [-0.25, 0.42, 0.21]),
    box(0.46, 0.66, 0.03, C.woodLight, [0.25, 0.42, 0.21]),
    cyl(0.018, 0.018, 0.10, 6, C.metal, [-0.06, 0.42, 0.24], [0, 0, Math.PI / 2]),
    cyl(0.018, 0.018, 0.10, 6, C.metal, [0.06, 0.42, 0.24], [0, 0, Math.PI / 2]),
    box(1.04, 0.04, 0.46, C.woodLight, [0, 0.82, 0]),
  ], 0.86),

  /** 間仕切り */
  partition: () => assemble([
    box(0.96, 1.24, 0.05, C.felt, [0, 0.74, 0]),
    box(1.02, 1.34, 0.03, C.woodLight, [0, 0.73, -0.02]),    // 木の枠
    box(1.04, 0.06, 0.12, C.woodDark, [0, 0.05, 0]),
    box(1.04, 0.05, 0.10, C.woodLight, [0, 1.42, 0]),
  ], 1.45),

  /* --- 壁に付くもの。原点はタイルの中心、壁は -Z 側にある前提 --- */
  window: () => assemble([
    box(1.70, 1.25, 0.06, C.white, [0, 1.25, -0.44]),
    box(1.52, 1.08, 0.02, C.sky, [0, 1.25, -0.41]),
    box(0.05, 1.08, 0.03, C.white, [0, 1.25, -0.40]),
    box(1.52, 0.05, 0.03, C.white, [0, 1.25, -0.40]),
    box(1.84, 0.06, 0.20, C.woodLight, [0, 0.62, -0.38]),   // 窓台
  ], 1.95),

  poster: () => assemble([
    box(0.66, 0.90, 0.03, C.paper, [0, 1.35, -0.45]),
    box(0.54, 0.50, 0.01, C.accent, [0, 1.50, -0.43]),
    box(0.54, 0.10, 0.01, C.ink, [0, 1.12, -0.43]),
  ], 1.9),

  clock: () => assemble([
    cyl(0.17, 0.17, 0.05, 16, C.white, [0, 1.70, -0.44], [Math.PI / 2, 0, 0]),
    box(0.02, 0.11, 0.01, C.ink, [0, 1.75, -0.41]),
    box(0.08, 0.02, 0.01, C.ink, [0.03, 1.70, -0.41]),
  ], 1.9),

  whiteboard: () => assemble([
    box(1.90, 1.15, 0.05, C.white, [0, 1.30, -0.44]),
    box(1.98, 0.06, 0.08, C.metal, [0, 0.70, -0.42]),
    box(1.80, 1.02, 0.01, C.paper, [0, 1.32, -0.41]),
    box(0.70, 0.05, 0.005, C.teal, [-0.4, 1.60, -0.40]),
    box(0.50, 0.05, 0.005, C.red, [-0.5, 1.46, -0.40]),
  ], 1.95),

  board: () => assemble([
    box(1.30, 0.90, 0.05, C.woodDark, [0, 1.25, -0.44]),
    box(1.18, 0.78, 0.01, C.fabricCream, [0, 1.25, -0.41]),
    box(0.22, 0.28, 0.008, C.paper, [-0.32, 1.34, -0.40]),
    box(0.22, 0.28, 0.008, C.paper, [0.02, 1.22, -0.40], [0, 0, 0.08]),
    box(0.22, 0.28, 0.008, C.accent, [0.34, 1.36, -0.40], [0, 0, -0.06]),
  ], 1.8),

  note: () => assemble([
    box(0.46, 0.62, 0.05, C.woodLight, [0, 1.05, 0]),
    box(0.38, 0.52, 0.01, C.paper, [0, 1.08, 0.031]),
    cyl(0.03, 0.03, 0.90, 6, C.metalDark, [0, 0.45, 0]),
    cyl(0.16, 0.18, 0.04, 10, C.metalDark, [0, 0.02, 0]),
  ], 1.4),

  sign: () => assemble([
    box(0.52, 0.34, 0.05, C.accent, [0, 1.18, 0]),
    box(0.44, 0.26, 0.01, C.paper, [0, 1.18, 0.031]),
    cyl(0.025, 0.025, 1.02, 6, C.metal, [0, 0.51, 0]),
    cyl(0.14, 0.16, 0.035, 10, C.metalDark, [0, 0.018, 0]),
  ], 1.4),

  /** 給湯のカウンター。2タイルぶん。コーヒーの道具が載る */
  counter: () => assemble([
    box(1.90, 0.90, 0.62, C.wood, [0, 0.45, 0]),
    box(2.00, 0.06, 0.70, C.woodLight, [0, 0.93, 0]),
    box(1.80, 0.03, 0.58, C.woodDark, [0, 0.62, 0]),            // 中棚
    box(0.36, 0.30, 0.26, C.dark, [-0.55, 1.11, -0.06]),        // コーヒーメーカー
    box(0.30, 0.06, 0.22, C.metal, [-0.55, 0.99, -0.06]),
    cyl(0.09, 0.09, 0.20, 10, C.glass, [-0.55, 1.06, 0.10]),
    ...[0, 1, 2].map(i => cyl(0.042, 0.036, 0.10, 8,
      [C.white, C.accent, C.teal][i], [0.22 + i * 0.16, 1.01, 0.08])),
    cyl(0.10, 0.12, 0.22, 10, C.fabricCream, [0.78, 1.07, -0.04]),  // 茶筒
  ], 1.2),

  /** ウォーターサーバー */
  cooler: () => assemble([
    box(0.34, 0.90, 0.34, C.white, [0, 0.45, 0]),
    box(0.24, 0.16, 0.04, C.metalDark, [0, 0.72, 0.17]),
    cyl(0.14, 0.11, 0.34, 10, C.glass, [0, 1.10, 0]),
    cyl(0.07, 0.09, 0.08, 10, C.metal, [0, 0.92, 0]),
  ], 1.3),

  /** コート掛け。上着が何枚か掛かっている */
  rack: () => assemble([
    cyl(0.03, 0.03, 1.62, 8, C.metalDark, [-0.55, 0.81, 0]),
    cyl(0.03, 0.03, 1.62, 8, C.metalDark, [0.55, 0.81, 0]),
    cyl(0.02, 0.02, 1.16, 6, C.metal, [0, 1.58, 0], [0, 0, Math.PI / 2]),
    box(0.14, 0.10, 0.34, C.metalDark, [-0.55, 0.05, 0]),
    box(0.14, 0.10, 0.34, C.metalDark, [0.55, 0.05, 0]),
    ...[[-0.30, C.fabricCool], [0.02, C.red], [0.32, C.leafDark]].map(([x, col]) =>
      box(0.26, 0.72, 0.14, col, [x, 1.16, 0])),
  ], 1.7),

  /** ビーズクッション。角を落とした塊にすると布に見える */
  beanbag: () => assemble([
    sph(0.46, 10, 7, C.fabricCool, [0, 0.30, 0], [0, 0, 0], [1, 0.62, 1]),
    sph(0.34, 10, 6, C.fabricCool, [0, 0.46, -0.10], [0, 0, 0], [1, 0.70, 1]),
  ], 0.7),

  /** 座布団 */
  cushion: () => assemble([
    box(0.62, 0.14, 0.62, C.fabricWarm, [0, 0.07, 0]),
    box(0.50, 0.03, 0.50, C.fabricCream, [0, 0.15, 0]),
  ], 0.2),

  /** 積んだ本 */
  books: () => assemble([
    box(0.30, 0.05, 0.22, C.red, [0, 0.025, 0]),
    box(0.28, 0.05, 0.21, C.teal, [0.01, 0.075, 0.01]),
    box(0.29, 0.05, 0.22, C.accent, [-0.01, 0.125, -0.01], [0, 0.12, 0]),
    box(0.26, 0.04, 0.20, C.fabricCream, [0, 0.17, 0], [0, -0.08, 0]),
  ], 0.22),

  /** 木箱。積んである */
  crate: () => assemble([
    box(0.56, 0.40, 0.50, C.woodWarm, [0, 0.20, 0]),
    box(0.58, 0.04, 0.52, C.woodDark, [0, 0.40, 0]),
    box(0.44, 0.34, 0.40, C.wood, [0.04, 0.59, -0.03], [0, 0.22, 0]),
    box(0.46, 0.04, 0.42, C.woodDark, [0.04, 0.77, -0.03], [0, 0.22, 0]),
  ], 0.8),

  /** ペンダントライト。天井から吊る。灯りの点が1つあるだけで部屋が締まる */
  pendant: () => assemble([
    cyl(0.012, 0.012, 1.05, 5, C.metalDark, [0, 2.36, 0]),
    cyl(0.09, 0.34, 0.30, 12, C.accent, [0, 1.74, 0]),
    cyl(0.31, 0.31, 0.02, 12, C.screenOn, [0, 1.60, 0]),
  ], 2.9),

  /** 席。椅子と同じ形だが、当たり判定は持たない（座る場所） */
  seat: () => PROPS.chair(),
};

export const PROP_KINDS = Object.keys(PROPS);

/** 種別ごとのジオメトリを1回だけ作る */
const cache = new Map();
export function propGeometry(kind) {
  if (!cache.has(kind)) cache.set(kind, PROPS[kind] ? PROPS[kind]() : null);
  return cache.get(kind);
}

/* ================================================================ 床と壁 */

/**
 * 板張りの床。
 *
 * ★ 1枚の板ポリだと、どれだけ光を当てても書き割りにしか見えない。
 *   板の目地と、壁や家具の際の陰を**頂点カラーに焼く**と、
 *   それだけで床が床に見えるようになる。全部で1ドローコール。
 */
export function buildFloor(W, H, blockedAt, dark, windows = [], areas = []) {
  const base = new THREE.Color(dark ? '#6B5942' : '#A8845C');
  // 板の目地から下が透けるので、暗い下地を1枚敷く
  const under = new THREE.PlaneGeometry(W, H);
  under.rotateX(-Math.PI / 2);
  under.translate(W / 2, -0.004, H / 2);
  under.userData.shade = 0.44;
  const tint = [0.96, 1.0, 1.04, 0.99, 1.02];   // 板ごとの色ムラ
  const pieces = [];
  const r = rnd(11);

  for (let z = 0; z < H; z += 0.34) {
    let x = 0;
    while (x < W - 0.01) {
      const len = Math.min(W - x, 1.3 + r() * 2.0);
      // ★ 分割を細かくしておく。光だまりの縁は頂点でしか折れないので、
      //   粗いと日なたが階段状になる
      const g = new THREE.PlaneGeometry(len - 0.026, 0.316, Math.max(3, Math.round(len * 4)), 2);
      g.rotateX(-Math.PI / 2);
      g.translate(x + len / 2, 0, z + 0.17);
      g.userData.shade = tint[(r() * tint.length) | 0];
      pieces.push(g);
      x += len;
    }
  }
  const m = bakeFloor([under, ...pieces], base, W, H, blockedAt, windows, dark, areas);
  return mergeGeometries([m, skirt(W, H, dark)], false);
}

/**
 * 窓から差し込む光。0（日陰）〜1（いちばん明るいところ）。
 *
 * ★ 動的な影は焼かないと決めているので、代わりに「日なた」を床に描く。
 *   部屋がぜんぶ同じ明るさだと、どれだけ家具を置いても書き割りに見える。
 *   北の壁の窓から手前へ、斜めに伸びる帯を1枚ずつ足している。
 */
function sunAt(x, z, windows) {
  let m = 0;
  for (const w of windows) {
    const t = (z - (w.y + 0.5)) / 4.4;          // 窓ぎわ 0 → 伸びた先 1
    if (t < 0 || t > 1) continue;
    const cx = w.x + 0.5 + 2.1 * t;             // 光は斜めに差す
    const half = 0.95 + 0.55 * t;               // 先へ行くほど広がる
    const d = Math.abs(x - cx) / half;
    if (d >= 1) continue;
    m = Math.max(m, (1 - d) ** 0.55 * (1 - t * t) ** 0.7);
  }
  return m;
}

/** 床の頂点に、壁や家具からの距離で陰を焼く */
/**
 * エリア（会議室・集中ルーム）の印。
 *
 * ★ 半透明の板を床に重ねると、板目も日なたも一緒に濁る。
 *   床の色そのものを少しだけ寄せ、境目に線を1本入れるほうが、
 *   「区切られている」ことが伝わるうえに木の床が残る。
 * @returns {[number, number]} [面の強さ, 境目の線の強さ]
 */
function areaAt(x, z, areas) {
  for (const a of areas) {
    if (x < a.x || x > a.x + a.w || z < a.y || z > a.y + a.h) continue;
    const edge = Math.min(x - a.x, a.x + a.w - x, z - a.y, a.y + a.h - z);
    return [a, 0.10, edge < 0.14 ? 1 : edge < 0.28 ? (0.28 - edge) / 0.14 : 0];
  }
  return null;
}

function bakeFloor(pieces, base, W, H, blockedAt, windows = [], dark = false, areas = []) {
  const areaCol = new Map(areas.map(a => [a, new THREE.Color(
    a.kind === 'MEETING' ? (dark ? '#5A4526' : '#D9A868') : (dark ? '#25414F' : '#8FB6CC'))]));
  const c = new THREE.Color();
  const warm = new THREE.Color(dark ? '#3E3A2A' : '#F2DCAE');   // 日なたの色
  for (const g of pieces) {
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let k = g.userData.shade;
      // 近くに通れないタイルがあるほど暗くする（際の陰）
      let near = 9;
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
        const tx = Math.floor(x) + dx, tz = Math.floor(z) + dz;
        if (!blockedAt(tx, tz)) continue;
        const cx = Math.max(tx, Math.min(tx + 1, x)), cz = Math.max(tz, Math.min(tz + 1, z));
        near = Math.min(near, Math.hypot(x - cx, z - cz));
      }
      k *= 0.58 + 0.42 * clamp01(near / 1.15) ** 0.6;
      // 際の陰が濃いところ（家具の下）には日は差さない
      const sun = sunAt(x, z, windows) * clamp01((k / g.userData.shade - 0.72) / 0.28);
      c.copy(base).multiplyScalar(k * (1 + 0.40 * sun)).lerp(warm, sun * 0.58);
      const area = areaAt(x, z, areas);
      if (area) c.lerp(areaCol.get(area[0]), area[1] + 0.20 * area[2]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    delete g.userData.shade;
  }
  const m = mergeGeometries(pieces, false);
  for (const g of pieces) g.dispose();
  return m;
}

/**
 * 壁。
 *
 * ★ 手前（カメラ側）の壁は低くする。全部同じ高さにすると、
 *   固定の斜め見下ろしでは手前の壁が部屋を隠してしまう。
 */
/** 立ち上がる壁の高さ。天井の庇はこのすぐ上に載る */
export const WALL_TOP = 2.90;

export function buildWalls(W, H, blockedAt, dark) {
  const wall = new THREE.Color(dark ? '#4A4E56' : '#E6DED1');
  const base = new THREE.Color(dark ? '#383B42' : '#B9AE9C');
  const rail = new THREE.Color(dark ? '#585D66' : '#D2C5B0');

  /**
   * 壁の高さ。
   *
   * ★ 手前と、手前寄りの左右は低くする（切り取った模型のように見せる）。
   *   全周を天井まで立てると、カメラの手前が壁で埋まって中が見えない。
   *   逆に壁が1枚も無いと、家具が板の上に並んでいるようにしか見えない。
   */
  const wallH = (x, z) => {
    if (z === H - 1) return 0;                     // 手前は立てない（断面）
    if (x === 0 || x === W - 1) {
      if (z >= H - 3) return 0;
      if (z >= H - 7) return 1.42;
    }
    return WALL_TOP;
  };

  const pieces = [];
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < H; z++) {
      if (!blockedAt(x, z)) continue;
      if (!(x === 0 || z === 0 || x === W - 1 || z === H - 1)) continue;
      const h = wallH(x, z);
      if (h === 0) continue;
      const g = new THREE.BoxGeometry(1.0, h, 1.0);
      g.translate(x + 0.5, h / 2, z + 0.5);
      g.userData.color = wall; g.userData.h = h;
      pieces.push(g);

      const b = new THREE.BoxGeometry(1.02, 0.13, 1.02);         // 幅木
      b.translate(x + 0.5, 0.065, z + 0.5);
      b.userData.color = base; b.userData.h = h;
      pieces.push(b);

      // 低い壁には天端、高い壁には腰の見切りを入れる。
      // 面積の大きい壁は、線が1本あるだけで「板」から「壁」になる
      const t = new THREE.BoxGeometry(1.02, h > 1 ? 0.05 : 0.07, 1.06);
      t.translate(x + 0.5, h > 1 ? 1.02 : h + 0.02, z + 0.5);
      t.userData.color = rail; t.userData.h = h;
      pieces.push(t);
    }
  }

  const c = new THREE.Color();
  for (const g of pieces) {
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      // 上ほど明るい。床からの照り返しが届かない下側が落ちる。
      // ★ Math.max(0, …) を外してはいけない。頂点は float32 なので、床に接する
      //   面の y が -7e-10 のような微小な負になることがあり、負の冪乗は NaN。
      //   NaN の頂点カラーは真っ黒に描かれる（壁が全部黒くなった原因）
      const k = 0.66 + 0.34 * clamp01(pos.getY(i) / WALL_TOP) ** 0.55;
      c.copy(g.userData.color).multiplyScalar(k);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    delete g.userData.color; delete g.userData.h;
  }
  const m = mergeGeometries(pieces, false);
  for (const g of pieces) g.dispose();
  return m;
}

/**
 * 天井の庇。
 *
 * ★ 奥の壁より**手前には出さない**。部屋の上に天井を張ると、
 *   見下ろしのカメラからは部屋の中身が全部隠れてしまう。
 *   奥の壁の裏側にだけ伸ばすと、画面の上の帯（壁の上に見えていた空）だけを塞げる。
 *   これで「外に建っている箱」ではなく「部屋の中」に見えるようになる。
 */
export function buildCeiling(W, H, dark) {
  const T = 0.34, BACK = 22;
  const slab = new THREE.BoxGeometry(W + 14, T, BACK);
  slab.translate(W / 2, WALL_TOP + T / 2, 1 - BACK / 2);
  const face = new THREE.Color(dark ? '#3D4148' : '#C4B8A6');   // 見切り（正面）
  const soff = new THREE.Color(dark ? '#2F333A' : '#9E9184');
  const pos = slab.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // 下面は光が回らないので落とす。正面の見切りだけ明るく残す
    const isFace = Math.abs(pos.getZ(i) - 1) < 1e-3;
    c.copy(isFace ? face : soff);
    if (!isFace && pos.getY(i) < WALL_TOP + T / 2) c.multiplyScalar(0.82);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  slab.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return slab;
}

/**
 * 床の小口。
 *
 * ★ 手前の壁を立てないので、これが無いと床が紙一枚に見える。
 *   厚みを 1 枚描くだけで「台の上に載った模型」になる。
 */
function skirt(W, H, dark) {
  const T = 0.22;
  const side = new THREE.Color(dark ? '#453A2C' : '#7A6047');
  const pieces = [];
  const add = (w, d, x, z) => {
    const g = new THREE.BoxGeometry(w, T, d);
    g.translate(x, -T / 2, z);
    pieces.push(g);
  };
  add(W + 0.24, 0.12, W / 2, H + 0.06);     // 手前
  add(0.12, H + 0.12, -0.06, H / 2);        // 左
  add(0.12, H + 0.12, W + 0.06, H / 2);     // 右
  const c = new THREE.Color();
  for (const g of pieces) {
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const k = 0.72 + 0.28 * clamp01((pos.getY(i) + T) / T);
      c.copy(side).multiplyScalar(k);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const m = mergeGeometries(pieces, false);
  for (const g of pieces) g.dispose();
  return m;
}
