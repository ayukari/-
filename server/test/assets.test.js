/**
 * アセットの予算と約束を守らせる — docs/design/10-assets.md
 *
 * ここは「見た目」ではなく「約束」を見る。目で見れば分かる、とは限らない。
 * 実際にこのテストが無い状態で、頂点カラーのアルファ（部位ID）がエクスポータに落とされ、
 * 全員が同じ色で立つ不具合を出した。エラーは1つも出ていなかった。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '../../client/assets');

/** 10 §4。1体の最重の組み合わせの上限 */
const MAX_TRIS = 1900;
/** 10 §1 のアバターの取り分 */
const MAX_BYTES = 1229 * 1024;
const CLIPS = ['idle', 'sit', 'walk'];
const BONES = 18;
const PART_N = 16;                 // assets/avatar.blend.py と一致していること
const COMMON = 'avatar-common.glb';
const BODIES = ['avatar-body-0.glb', 'avatar-body-1.glb', 'avatar-body-2.glb'];
/** 各部位の種類数（avatar.blend.py / client/src/avatar.js と一致していること） */
const COUNT = { hair: 14, top: 10, bottom: 8, shoe: 5, acc: 7 };

function glb(file) {
  const b = readFileSync(join(ASSETS, file));
  assert.equal(b.readUInt32LE(0), 0x46546c67, 'glTF のマジックではない');
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const binAt = 20 + jsonLen;
  return { json, bin: b.subarray(binAt + 8, binAt + 8 + b.readUInt32LE(binAt)), bytes: b.length };
}

/** メッシュ名 -> 三角形数 */
function meshTris({ json }) {
  const out = new Map();
  for (const m of json.meshes) {
    const p = m.primitives[0];
    const n = p.indices != null ? json.accessors[p.indices].count
                                : json.accessors[p.attributes.POSITION].count;
    out.set(m.name, n / 3);
  }
  return out;
}

const jointNames = ({ json }) => json.skins[0].joints.map(i => json.nodes[i].name);

/** u16 正規化のアクセサを読む（頂点カラーがこれ） */
function readU16Norm(json, bin, accIndex) {
  const acc = json.accessors[accIndex];
  assert.equal(acc.componentType, 5123, '想定と違う型');
  const bv = json.bufferViews[acc.bufferView];
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const stride = bv.byteStride ?? size * 2;
  const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const out = [];
  for (let i = 0; i < acc.count; i++) {
    const row = [];
    for (let c = 0; c < size; c++) row.push(bin.readUInt16LE(base + i * stride + c * 2) / 65535);
    out.push(row);
  }
  return out;
}

const files = readdirSync(ASSETS).filter(f => f.endsWith('.glb')).sort();

test('共通ファイルと体型3つが揃っている', () => {
  assert.deepEqual(files, [...BODIES, COMMON].sort());
});

test('パーツが揃っている（髪14・トップス10・ボトムス8・靴5・小物7）', () => {
  const common = meshTris(glb(COMMON));
  for (let i = 0; i < COUNT.hair; i++) assert.ok(common.has(`hair_${p2(i)}`), `hair_${p2(i)}`);
  for (let i = 0; i < COUNT.shoe; i++) assert.ok(common.has(`shoe_${p2(i)}`), `shoe_${p2(i)}`);
  for (let i = 1; i <= COUNT.acc; i++) assert.ok(common.has(`acc_${p2(i)}`), `acc_${p2(i)}`);

  for (const f of BODIES) {
    const m = meshTris(glb(f));
    assert.ok(m.has('base'), `${f}: base`);
    for (let i = 0; i < COUNT.top; i++) assert.ok(m.has(`top_${p2(i)}`), `${f}: top_${p2(i)}`);
    for (let i = 0; i < COUNT.bottom; i++) assert.ok(m.has(`bottom_${p2(i)}`), `${f}: bottom_${p2(i)}`);
  }
});

test('★ 骨の並びが全ファイルで同じ（統合の前提）', () => {
  // クライアントは体型ファイルのジオメトリを共通ファイルの骨に結びつける。
  // 並びが違うと手足が飛ぶ。生成元が同じなので普通は揃うが、崩れたら気づけるようにする
  const base = jointNames(glb(COMMON));
  assert.equal(base.length, BONES, '骨の本数は 10 §5 の上限に合わせる');
  for (const f of BODIES) assert.deepEqual(jointNames(glb(f)), base, `${f} の骨の並びが違う`);
});

test('動きは共通ファイルだけが持つ（3ファイルに重複させない）', () => {
  assert.deepEqual((glb(COMMON).json.animations ?? []).map(a => a.name).sort(), CLIPS);
  for (const f of BODIES) {
    assert.ok(!(glb(f).json.animations ?? []).length, `${f} にアニメーションが入っている`);
  }
});

for (const f of files) {
  test(`${f}: 部位IDが COLOR_0 のアルファに残っている`, () => {
    const { json, bin } = glb(f);
    const parts = new Set();
    for (const m of json.meshes) {
      const acc = m.primitives[0].attributes.COLOR_0;
      // ★ VEC3 で書き出されるとアルファが落ち、クライアントが誰も塗り替えられなくなる
      assert.equal(json.accessors[acc].type, 'VEC4', `${m.name}: COLOR_0 が VEC4 でない`);
      for (const c of readU16Norm(json, bin, acc)) parts.add(Math.floor(c[3] * PART_N));
    }
    for (const got of parts) assert.ok(got >= 0 && got < PART_N, `不正な部位ID ${got}`);
    assert.ok(parts.size >= 2, '部位が1種類しかない');
  });

  test(`${f}: テクスチャを1枚も使っていない`, () => {
    const { json } = glb(f);
    // 外部アセットを増やさない（03 の Won't / 審査パッケージ 01 §4）
    for (const k of ['images', 'textures', 'samplers']) {
      assert.ok(!json[k]?.length, `${k} があってはいけない`);
    }
  });
}

test('いちばん重い組み合わせでも 1体の予算に収まる', () => {
  const common = meshTris(glb(COMMON));
  const max = pre => Math.max(...[...common].filter(([n]) => n.startsWith(pre)).map(([, t]) => t));
  for (const f of BODIES) {
    const body = meshTris(glb(f));
    const bmax = pre => Math.max(...[...body].filter(([n]) => n.startsWith(pre)).map(([, t]) => t));
    const worst = body.get('base') + max('hair_') + bmax('top_') + bmax('bottom_')
                + max('shoe_') + max('acc_');
    assert.ok(worst <= MAX_TRIS, `${f}: 最重 ${worst} 三角形 > 上限 ${MAX_TRIS}`);
  }
});

test('初回ダウンロードがアバターの取り分に収まる', () => {
  const total = files.reduce((n, f) => n + glb(f).bytes, 0);
  assert.ok(total <= MAX_BYTES,
            `${(total / 1024).toFixed(0)} KB > ${(MAX_BYTES / 1024).toFixed(0)} KB`);
});

test('25人ぶんでも1フレームの三角形の予算に収まる', () => {
  // 10 §1: 1フレーム 150,000 未満。部屋の建材・家具・小物の見積り 31,000 を引いた残り
  const common = meshTris(glb(COMMON));
  const body = meshTris(glb(BODIES[2]));          // いちばん太い体型
  const max = (m, pre) => Math.max(...[...m].filter(([n]) => n.startsWith(pre)).map(([, t]) => t));
  const worst = body.get('base') + max(common, 'hair_') + max(body, 'top_')
              + max(body, 'bottom_') + max(common, 'shoe_') + max(common, 'acc_');
  assert.ok(worst * 25 + 31000 < 150000, `25人で ${worst * 25 + 31000} 三角形`);
});

const p2 = n => String(n).padStart(2, '0');
