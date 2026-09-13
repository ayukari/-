/**
 * アバターの読み込みと着せ替え — docs/design/10-assets.md
 *
 * モデルは Blender で手続き的に作っている（../assets/avatar.blend.py）。
 * テクスチャを1枚も使わず、色はすべて頂点カラーに入っている。
 *
 * ★ 頂点カラーのアルファに「部位ID」が入っている。
 *   ここでそれを読んで、人ごとに肌・髪・服の色へ塗り替える。
 *   テクスチャを差し替えないので、何人いてもGPUに乗るのは同じ1枚ぶんの情報だけ。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/** avatar.blend.py の PART_N と一致していること */
const PART_N = 16;
export const PART = {
  SKIN: 0, HAIR: 1, SHIRT: 2, PANTS: 3, SHOES: 4,
  EYE: 5, WHITE: 6, MOUTH: 7, BLUSH: 8,
};

const SKIN  = ['#F6DCC6', '#EFC9A6', '#D9A97E', '#B07F58'];
const HAIRC = ['#3D322B', '#5C4133', '#8B6343', '#2C3647', '#7B5679', '#B3AAA1'];
const PANTS = ['#3A4250', '#4C4640', '#2E3B33', '#5A4550'];
const SHOES = ['#2A2726', '#3B3230', '#4A4A52'];

const BODIES = 3;
const url = i => `/assets/avatar-${i}.glb`;

/** 1回だけ読む。人数分クローンして使う */
let loading = null;
export function loadAvatars() {
  if (!loading) {
    const loader = new GLTFLoader();
    loading = Promise.all(
      Array.from({ length: BODIES }, (_, i) => loader.loadAsync(url(i)))
    ).then(gltfs => gltfs.map(g => ({ scene: g.scene, clips: g.animations })));
  }
  return loading;
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

const hash = s => { let h = 2166136261; for (const c of String(s)) h = (h ^ c.charCodeAt(0)) * 16777619; return Math.abs(h | 0); };
const pick = (arr, n) => arr[n % arr.length];

/** userId から見た目を決める。同じ人はいつも同じ見た目になる */
export function paletteFor({ userId, color, body }) {
  const h = hash(userId ?? color ?? 'anon');
  return {
    [PART.SKIN]:  pick(SKIN, h),
    [PART.HAIR]:  pick(HAIRC, h >> 3),
    [PART.SHIRT]: color ?? '#C8873C',        // 名簿の色 = その人の色。服に出す
    [PART.PANTS]: pick(PANTS, h >> 7),
    [PART.SHOES]: pick(SHOES, h >> 11),
    [PART.EYE]:   '#2B2A3D',
    [PART.WHITE]: '#FFFFFF',
    [PART.MOUTH]: '#B4595C',
    [PART.BLUSH]: '#F2A9A2',
    body: Number.isInteger(body) ? Math.min(BODIES - 1, Math.max(0, body)) : h % BODIES,
  };
}

/**
 * COLOR_0 のアルファに入っている部位IDを見て、RGB を塗り直す。
 *
 * ★ glTF の COLOR_0 は正規化された u16 で来る。そのまま 0〜1 の値を書くと
 *   整数配列に切り捨てられて真っ黒になる。Float32 の3成分に作り直してから塗る。
 */
function recolor(geometry, palette) {
  const src = geometry.getAttribute('color');
  if (!src || src.itemSize < 4) return false;     // 部位IDが入っていない
  const out = new Float32Array(src.count * 3);
  const c = new THREE.Color();
  const raw = i => src.array[i];
  const val = i => (src.normalized ? THREE.MathUtils.denormalize(raw(i), src.array) : raw(i));
  for (let i = 0; i < src.count; i++) {
    const o = i * src.itemSize;
    const part = Math.floor(val(o + 3) * PART_N);
    const hex = palette[part];
    // Color.set() は sRGB → 作業色空間（線形）の変換を既に行う。
    // ここで convertSRGBToLinear を重ねると2回かかって真っ黒になる
    if (hex) c.set(hex);
    else c.setRGB(val(o), val(o + 1), val(o + 2));
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(out, 3));
  return true;
}

/**
 * 1人ぶんのアバターを作る。
 * @returns {{root:THREE.Object3D, mixer:THREE.AnimationMixer, play:(name:string)=>void, dispose:()=>void}}
 */
export function makeAvatar(packs, actor, gradientMap) {
  const p = paletteFor(actor);
  const src = packs[p.body];
  const root = cloneSkinned(src.scene);

  const owned = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    o.geometry = o.geometry.clone();          // 人ごとに色が違うので共有できない
    recolor(o.geometry, p);
    o.material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });
    o.frustumCulled = false;                  // 骨で動くので AABB が当てにならない
    owned.push(o);
  });

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const clip of src.clips) {
    const a = mixer.clipAction(clip);
    a.enabled = true;
    actions[clip.name] = a;
  }
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
    root, mixer, play, palette: p,
    dispose() {
      mixer.stopAllAction();
      for (const o of owned) { o.geometry.dispose(); o.material.dispose(); }
    },
  };
}
