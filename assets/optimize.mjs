/**
 * 書き出した .glb を縮める — docs/design/10-assets.md §2
 *
 *   node assets/optimize.mjs client/assets
 *
 * Blender のエクスポータは素直な形で書き出すので、そのままだと無駄が多い。
 * 実測（2026-09-13、最適化前）:
 *
 *     WEIGHTS_0 77KB  POSITION 58KB  NORMAL 58KB  COLOR_0 39KB  indices 27KB
 *
 * ★ WEIGHTS_0 が最大だった。うちのスキニングは剛体（どの頂点も重みは 1,0,0,0）なのに、
 *   float32 × 4 = 16バイト/頂点 を使っていた。8bit で足りる。
 *
 * 使うのは glTF の標準拡張 KHR_mesh_quantization だけで、
 * three.js の GLTFLoader が追加のデコーダ無しで読める。
 * Draco / Meshopt を使わないのは、デコーダ（数百KB）の配信が増えるほうが損だから（10 §2）。
 */
import { writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, resample } from '@gltf-transform/functions';

const src = process.argv[2] ?? 'build';
const dst = process.argv[3] ?? '../client/assets';
mkdirSync(dst, { recursive: true });
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);

let before = 0, after = 0;
for (const f of readdirSync(src).filter(x => x.endsWith('.glb')).sort()) {
  const b0 = statSync(join(src, f)).size;
  const doc = await io.read(join(src, f));

  await doc.transform(
    dedup(),        // 同じアクセサ・マテリアルをまとめる
    prune(),        // どこからも参照されていないものを捨てる
    resample(),     // アニメーションの冗長なキーを間引く（値は変えない）
    weld(),         // 同じ位置・法線の頂点をまとめる
    quantize({
      // ★ 位置は量子化しない。
      //   位置を量子化すると、その分を打ち消す変換が逆バインド行列に入る。
      //   うちは4ファイルのジオメトリを1つの骨に結びつけて統合するので、
      //   ファイルごとに違う逆バインド行列が入ると手足がずれる。
      //   （さらに既定の「メッシュごとの範囲」だと skin が 1 → 26 に分裂する）
      //   位置を外しても、下の3つで元の 6割 まで落ちる。
      pattern: /^(NORMAL|COLOR_|WEIGHTS_|TEXCOORD_)/,
      quantizeNormal: 8,      // フラットシェーディング主体なので 8bit で足りる
      quantizeColor: 8,       // ★ 部位IDはアルファに入っている。16段階なので 8bit で潰れない
      quantizeWeight: 8,      // 剛体スキニングなので本来 1bit で足りる
      quantizeTexcoord: 12,
    }),
  );

  const out = await io.writeBinary(doc);
  writeFileSync(join(dst, f), out);
  before += b0; after += out.byteLength;
  console.log(`${f.padEnd(22)} ${(b0 / 1024).toFixed(1)} KB → ${(out.byteLength / 1024).toFixed(1)} KB`
              + `  (${(100 - out.byteLength / b0 * 100).toFixed(0)}% 減)`);
}
console.log(`合計 ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB`
            + `  / アバターの取り分 1,229 KB（10 §1）`);
