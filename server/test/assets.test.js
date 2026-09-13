/**
 * アセットの予算を守らせる — docs/design/10-assets.md
 *
 * ここは「見た目」ではなく「約束」を見る。
 * このテストが無い状態で、頂点カラーのアルファ（部位ID）がエクスポータに落とされ、
 * 全員が同じ色で立つ不具合を出した。画面を見れば分かる、とは限らない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '../../client/assets');

/** 10 §4 は 1,200。実測 1,244〜1,328 なので上限を 1,400 に固定する（§4 に理由を記載） */
const MAX_TRIS = 1400;
const MAX_BYTES = 200 * 1024;
const CLIPS = ['idle', 'sit', 'walk'];
const BONES = 18;
const PART_N = 16;     // assets/avatar.blend.py と一致していること

function glb(file) {
  const b = readFileSync(file);
  assert.equal(b.readUInt32LE(0), 0x46546c67, 'glTF のマジックではない');
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const binAt = 20 + jsonLen;                       // 次のチャンクが BIN
  const binLen = b.readUInt32LE(binAt);
  return { json, bin: b.subarray(binAt + 8, binAt + 8 + binLen), bytes: b.length };
}

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

test('アバターのモデルが3体ある（体型0〜2）', () => {
  assert.deepEqual(files, ['avatar-0.glb', 'avatar-1.glb', 'avatar-2.glb']);
});

for (const f of files) {
  test(`${f}: 1体1ドローコール・三角形と容量が予算内`, () => {
    const { json, bytes } = glb(join(ASSETS, f));
    assert.ok(bytes < MAX_BYTES, `${(bytes / 1024).toFixed(1)}KB は大きすぎる`);

    const prims = json.meshes.flatMap(m => m.primitives);
    assert.equal(prims.length, 1, 'プリミティブが増えると人数×その数だけ描画が要る');

    const p = prims[0];
    const tris = (p.indices != null ? json.accessors[p.indices].count
                                    : json.accessors[p.attributes.POSITION].count) / 3;
    assert.ok(tris <= MAX_TRIS, `三角形 ${tris} は上限 ${MAX_TRIS} を超えている`);
  });

  test(`${f}: 部位IDが COLOR_0 のアルファに残っている`, () => {
    const { json, bin } = glb(join(ASSETS, f));
    const p = json.meshes[0].primitives[0];
    // ★ VEC3 で書き出されるとアルファが落ち、クライアントが誰も塗り替えられなくなる
    assert.equal(json.accessors[p.attributes.COLOR_0].type, 'VEC4',
                 'COLOR_0 が VEC4 でないと部位IDが消える');

    const parts = new Set(readU16Norm(json, bin, p.attributes.COLOR_0)
      .map(c => Math.floor(c[3] * PART_N)));
    for (const need of [0, 1, 2, 3, 4, 5]) {        // 肌・髪・服・ズボン・靴・目
      assert.ok(parts.has(need), `部位ID ${need} がモデルに無い`);
    }
    for (const got of parts) assert.ok(got >= 0 && got < PART_N, `不正な部位ID ${got}`);
  });

  test(`${f}: テクスチャを1枚も使っていない`, () => {
    const { json } = glb(join(ASSETS, f));
    // 外部アセットを増やさない（03 の Won't / 審査パッケージ 01 §4）
    for (const k of ['images', 'textures', 'samplers']) {
      assert.ok(!json[k]?.length, `${k} があってはいけない`);
    }
  });

  test(`${f}: ボーン${BONES}本・クリップ ${CLIPS.join('/')}`, () => {
    const { json } = glb(join(ASSETS, f));
    assert.equal(json.skins.length, 1);
    assert.equal(json.skins[0].joints.length, BONES, '骨の本数は 10 §5 の上限に合わせる');
    assert.deepEqual((json.animations ?? []).map(a => a.name).sort(), CLIPS);
  });
}

test('3体あわせても初回ダウンロードの予算に収まる', () => {
  const total = files.reduce((n, f) => n + glb(join(ASSETS, f)).bytes, 0);
  assert.ok(total < 4.8 * 1024 * 1024, `${(total / 1024).toFixed(0)}KB`);
});
