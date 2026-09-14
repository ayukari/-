/**
 * アバターの読み込み・着せ替え・統合 — docs/design/10-assets.md
 *
 * モデルは Blender で手続き的に作っている（../assets/avatar.blend.py）。
 * テクスチャは1枚も使わず、色はすべて頂点カラーに入っている。
 *
 * ★ 2つの仕掛けで「種類を増やしても重くならない」ようにしてある。
 *
 *   1. 頂点カラーのアルファに「部位ID」が入っている。
 *      ここでそれを読んで、人ごとに肌・髪・服の色へ塗り替える。
 *      テクスチャを差し替えないので、何人いてもGPUに乗る情報は増えない。
 *
 *   2. 選んだパーツ（素体・髪・トップス・ボトムス・靴・小物）を
 *      **1つのジオメトリに統合してから描く**。
 *      パーツを何種類足しても 1人 = 1ドローコール のまま変わらない。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, deinterleaveGeometry } from 'three/addons/utils/BufferGeometryUtils.js';

/** assets/avatar.blend.py の PART_N と一致していること */
const PART_N = 16;
export const PART = {
  SKIN: 0, HAIR: 1, TOP: 2, BOTTOM: 3, SHOES: 4, EYE: 5,
  WHITE: 6, MOUTH: 7, BLUSH: 8, ACC: 9, ACC2: 10, DARK: 11,
};

/* ---------------- 配色の候補。ここを増やすと通り数が増える ---------------- */
const SKIN_C = ['#FBE3CE', '#F6D8BC', '#EFC9A6', '#E3B58C', '#CFA079', '#B4835C', '#96643F', '#74492C'];
const HAIR_C = ['#3D322B', '#241F1D', '#5C4133', '#8B6343', '#B08A5E', '#D8C39A',
                '#2C3647', '#46607A', '#7B5679', '#A4557C', '#8C3E3E', '#4E7A5C',
                '#B3AAA1', '#E6E1DA'];
const BOTTOM_C = ['#3A4250', '#262B33', '#4C4640', '#2E3B33', '#5A4550', '#6B5A45',
                  '#7C8794', '#8C5E4A', '#3F5E6E', '#A9A296'];
const SHOE_C = ['#2A2726', '#3B3230', '#4A4A52', '#7A6A5C', '#B9B3AC', '#8C4A45'];
const ACC_C = ['#C8873C', '#4F8299', '#7A6FA8', '#5F8C6B', '#B25F6A', '#D8A657',
               '#3F4A57', '#E0E3E8', '#9A6B4F', '#C2708F'];
const EYE_C = ['#2B2A3D', '#3A2A22', '#26463F', '#2E3A5A', '#4A2E3A', '#1F1F24'];

/* ---------------- パーツの種類数（avatar.blend.py と対応） ---------------- */
const N = { body: 3, hair: 14, top: 10, bottom: 8, shoe: 5, acc: 8 };   // acc の 0 は「無し」

const FILES = ['avatar-common.glb', 'avatar-body-0.glb', 'avatar-body-1.glb', 'avatar-body-2.glb'];

/**
 * 1つ読む。
 *
 * ふつうは このファイルからの相対 URL を取りに行く（dev サーバでも、ファイルを
 * 並べただけの場所でも、同じ1行で動く）。
 *
 * ★ .glb を配信できない置き場所（公開プロトタイプ）では、
 *   `globalThis.__HIDAMARI_ASSET(name)` が中身そのもの（ArrayBuffer）を返す。
 *   そのときはネットワークを使わずに直接読む。
 */
function loadPack(loader, name) {
  const embedded = globalThis.__HIDAMARI_ASSET?.(name);
  if (embedded) return new Promise((ok, ng) => loader.parse(embedded, '', ok, ng));
  return loader.loadAsync(new URL(`../assets/${name}`, import.meta.url).href);
}

/** 見た目の通り数。README と確認ページに出す */
export const VARIETY = {
  shapes: N.body * N.hair * N.top * N.bottom * N.shoe * N.acc,
  colors: SKIN_C.length * HAIR_C.length * BOTTOM_C.length * SHOE_C.length * ACC_C.length * EYE_C.length,
  parts: N.hair + N.top * N.body + N.bottom * N.body + N.shoe + (N.acc - 1) + N.body,
};

/* ---------------- 読み込み ---------------- */
let loading = null;

/**
 * パーツ一式を1回だけ読む。
 * 共通ファイル（髪・靴・小物・骨・動き）＋ 体型ごとのファイル（素体・トップス・ボトムス）。
 */
export function loadAvatars() {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loading = Promise.all(FILES.map(n => loadPack(loader, n)))
    .then(([common, ...bodies]) => {
      const index = new Map();          // パーツ名 -> SkinnedMesh（元）
      const add = gltf => gltf.scene.traverse(o => { if (o.isSkinnedMesh) index.set(o.name, o); });
      add(common);
      bodies.forEach((g, i) => g.scene.traverse(o => {
        if (o.isSkinnedMesh) index.set(`${o.name}@${i}`, o);
      }));
      checkJointOrder(common, bodies);
      return { ...makeRigTemplate(common.scene), clips: common.animations, index };
    });
  return loading;
}

/**
 * 骨だけの雛形を1つ作る。
 *
 * ★ SkeletonUtils.clone() は「スキンメッシュ1つにつき Skeleton を1つ」作る。
 *   共通ファイルには26個のパーツが入っているので、素直に複製すると
 *   1人あたり Skeleton が26個できて、25個は捨てることになる。
 *   Skeleton は骨行列のテクスチャを持つので、これは実際の無駄になる。
 *   メッシュを外した雛形を作っておき、骨だけ複製して Skeleton は自分で1つ組む。
 */
function makeRigTemplate(scene) {
  let src = null;
  scene.traverse(o => { if (o.isSkinnedMesh && !src) src = o; });
  if (!src) throw new Error('共通ファイルにスキンメッシュが無い');

  const template = scene.clone(true);
  const slotName = src.parent?.name ?? null;
  for (const m of [...collect(template, o => o.isSkinnedMesh)]) m.removeFromParent();

  return {
    rig: template,
    boneNames: src.skeleton.bones.map(b => b.name),
    boneInverses: src.skeleton.boneInverses.map(m => m.clone()),
    bindMatrix: src.bindMatrix.clone(),
    slot: { name: slotName, position: src.position.clone(),
            quaternion: src.quaternion.clone(), scale: src.scale.clone() },
  };
}

const collect = (root, pred) => {
  const out = [];
  root.traverse(o => { if (pred(o)) out.push(o); });
  return out;
};

/**
 * ★ 体型ファイルのジオメトリを共通ファイルの骨に結びつけるので、
 *   骨の並びが全ファイルで同じでなければならない。違うと手足が飛ぶ。
 *   生成元が同じなので普通は揃うが、揃わなくなったことに気づけるようにしておく。
 */
function checkJointOrder(common, bodies) {
  const order = g => {
    let names = null;
    g.scene.traverse(o => { if (o.isSkinnedMesh && !names) names = o.skeleton.bones.map(b => b.name); });
    return (names ?? []).join(',');
  };
  const base = order(common);
  for (const [i, b] of bodies.entries()) {
    if (order(b) !== base) console.error(`骨の並びが共通ファイルと違う: body-${i}`);
  }
}

/** 段階的な陰。ポストエフェクトを使わずにアニメ寄りの見えにする（02 §6.3） */
export function toonGradient() {
  const steps = new Uint8Array([168, 206, 236, 255]);   // 陰を浅くする。強い影は「Chill」に合わない
  const t = new THREE.DataTexture(
    new Uint8Array([...steps].flatMap(v => [v, v, v, 255])), steps.length, 1, THREE.RGBAFormat);
  t.needsUpdate = true;
  t.minFilter = t.magFilter = THREE.NearestFilter;
  return t;
}

/* ---------------- 見た目を決める ---------------- */
const hash32 = s => {
  let h = 2166136261 >>> 0;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};
/** 1つのハッシュから独立した値を取り出す。同じ人はいつも同じ見た目になる */
const stream = seed => {
  let x = (seed || 1) >>> 0;
  return n => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x % n; };
};

/**
 * その人の見た目。userId から決まるので、機種が変わっても同じ姿で出る。
 * @param {{userId?:string,color?:string,body?:number}} actor 名簿の情報
 */
export function lookFor(actor = {}) {
  const pick = stream(hash32(actor.userId ?? actor.color ?? 'anon'));
  const body = Number.isInteger(actor.body) ? Math.min(N.body - 1, Math.max(0, actor.body))
                                            : pick(N.body);
  return {
    body,
    hair: pick(N.hair), top: pick(N.top), bottom: pick(N.bottom),
    shoe: pick(N.shoe), acc: pick(N.acc),
    palette: {
      [PART.SKIN]:  SKIN_C[pick(SKIN_C.length)],
      [PART.HAIR]:  HAIR_C[pick(HAIR_C.length)],
      [PART.TOP]:   actor.color ?? ACC_C[pick(ACC_C.length)],   // 名簿の色 = その人の色
      [PART.BOTTOM]: BOTTOM_C[pick(BOTTOM_C.length)],
      [PART.SHOES]: SHOE_C[pick(SHOE_C.length)],
      [PART.EYE]:   EYE_C[pick(EYE_C.length)],
      [PART.ACC]:   ACC_C[pick(ACC_C.length)],
      [PART.WHITE]: '#FFFFFF', [PART.MOUTH]: '#B4595C',
      [PART.BLUSH]: '#F2A9A2', [PART.ACC2]: '#E8EAEE', [PART.DARK]: '#2A282B',
    },
  };
}

/** 裾のあるトップス（ワンピース）。ボトムスを重ねると二重のスカートになる */
const SKIRTED_TOPS = new Set([7]);      // avatar.blend.py の TOP_DEFS と対応

/** 見た目 → 使うパーツ名 */
function partNames(look) {
  const b = look.body;
  const ns = [`base@${b}`, `hair_${pad(look.hair)}`, `top_${pad(look.top)}@${b}`];
  if (!SKIRTED_TOPS.has(look.top)) ns.push(`bottom_${pad(look.bottom)}@${b}`);
  ns.push(`shoe_${pad(look.shoe)}`);
  if (look.acc > 0) ns.push(`acc_${pad(look.acc)}`);   // 0 は「小物なし」
  return ns;
}
const pad = n => String(n).padStart(2, '0');

/* ---------------- 組み立て ---------------- */
/**
 * 統合できる形にそろえる。
 *
 * ★ 最適化（assets/optimize.mjs の量子化）を通すと、属性が**交互配置**になる。
 *   そのとき `attr.array` はその属性だけの配列ではなく、位置も法線も混ざった
 *   バッファ全体を指す。自前で添字を計算して読むと、まったく別の値を読む。
 *   一度 交互配置を解いてから触る。
 */
function prepare(geometry) {
  const g = geometry;
  // deinterleaveGeometry は引数のジオメトリを書き換える（戻り値は無い）
  if (Object.values(g.attributes).some(a => a.isInterleavedBufferAttribute)) deinterleaveGeometry(g);

  // 統合は属性の型が揃っていることを求める。量子化でファイルごとに型が変わりうる
  const idx = g.getAttribute('skinIndex');
  if (idx && !(idx.array instanceof Uint16Array)) {
    const a = new Uint16Array(idx.count * idx.itemSize);
    for (let i = 0; i < idx.count; i++)
      for (let c = 0; c < idx.itemSize; c++) a[i * idx.itemSize + c] = idx.getComponent(i, c);
    g.setAttribute('skinIndex', new THREE.BufferAttribute(a, idx.itemSize));
  }
  const wt = g.getAttribute('skinWeight');
  if (wt && (!(wt.array instanceof Float32Array) || wt.normalized)) {
    const a = new Float32Array(wt.count * wt.itemSize);
    for (let i = 0; i < wt.count; i++)
      for (let c = 0; c < wt.itemSize; c++) a[i * wt.itemSize + c] = wt.getComponent(i, c);
    g.setAttribute('skinWeight', new THREE.BufferAttribute(a, wt.itemSize));
  }
  for (const name of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'color', 'skinIndex', 'skinWeight'].includes(name)) {
      g.deleteAttribute(name);           // 揃っていない属性があると統合が失敗する
    }
  }
  return g;
}

/**
 * COLOR_0 のアルファに入っている部位IDを見て RGB を塗り直す。
 *
 * ★ 生成時は u16、最適化後は u8 で入っている。どちらでも読めるように
 *   getX/getW を使う（正規化の解除は three がやる）。
 *   生の配列から自分で読むと、型が変わった瞬間に真っ黒になる。
 */
function recolor(geometry, palette) {
  const src = geometry.getAttribute('color');
  if (!src || src.itemSize < 4) return geometry;
  const out = new Float32Array(src.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < src.count; i++) {
    const hex = palette[Math.floor(src.getW(i) * PART_N)];
    // Color.set() は sRGB → 作業色空間（線形）の変換を既に行う。
    // ここで convertSRGBToLinear を重ねると2回かかって真っ黒になる
    if (hex) c.set(hex);
    else c.setRGB(src.getX(i), src.getY(i), src.getZ(i));
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return geometry;
}

/**
 * 1人ぶんのアバターを作る。
 * @returns {{root:THREE.Object3D, mixer:THREE.AnimationMixer, play:(name:string)=>void,
 *            look:object, tris:number, dispose:()=>void}}
 */
export function makeAvatar(packs, actor, gradientMap) {
  const look = actor.look ?? lookFor(actor);

  // 骨だけを人数ぶん複製し、Skeleton は1人1つだけ組む
  const root = packs.rig.clone(true);
  const byName = new Map();
  root.traverse(o => { if (o.isBone) byName.set(o.name, o); });
  const bones = packs.boneNames.map(n => byName.get(n));
  if (bones.some(b => !b)) throw new Error('雛形に無い骨がある');
  const skeleton = new THREE.Skeleton(bones, packs.boneInverses);

  const geos = [];
  for (const name of partNames(look)) {
    const src = packs.index.get(name);
    if (!src) { console.warn('パーツが無い:', name); continue; }
    geos.push(recolor(prepare(src.geometry.clone()), look.palette));
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!merged) throw new Error('パーツを統合できなかった');

  const material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
  const mesh = new THREE.SkinnedMesh(merged, material);
  mesh.name = 'avatar';
  mesh.position.copy(packs.slot.position);
  mesh.quaternion.copy(packs.slot.quaternion);
  mesh.scale.copy(packs.slot.scale);
  mesh.frustumCulled = false;            // 骨で動くので AABB が当てにならない
  const parent = (packs.slot.name && root.getObjectByName(packs.slot.name)) || root;
  parent.add(mesh);
  mesh.bind(skeleton, packs.bindMatrix);

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of packs.clips) actions[clip.name] = mixer.clipAction(clip);
  let current = null;
  const play = name => {
    const next = actions[name];
    if (!next || next === current) return;
    next.reset().setEffectiveWeight(1).fadeIn(0.18).play();
    if (current) current.fadeOut(0.18);
    current = next;
  };
  play('idle');

  return {
    root, mixer, play, look, mesh,
    tris: merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3,
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      skeleton.dispose();
      merged.dispose();
      material.dispose();
    },
  };
}
