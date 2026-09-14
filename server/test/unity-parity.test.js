/**
 * ブラウザ版と Unity 版がずれていないか。
 *
 * ★ 表現レイヤーが2つになった（client/src/props.js と unity/.../Props.cs）。
 *   10 §5 の寸法規約は1つなので、片方に家具を足して片方に足さないと、
 *   **同じ部屋が実行系によって違う形になる**。論理（タイル）は同じなので、
 *   見た目だけが食い違い、どちらが正しいのか分からなくなる。
 *
 *   形の数字まで自動で照合するのは無理なので、**種別の集合が一致すること**だけ見張る。
 *   ここが落ちたら、足したほうを片方にも足す。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const R = join(here, '../..');
const jsPath = join(R, 'client/src/props.js');
const csPath = join(R, 'unity/Assets/Hidamari/Runtime/Props.cs');

/** props.js の PROPS のキー */
const jsKinds = () => new Set(
  [...readFileSync(jsPath, 'utf8').matchAll(/^ {2}(\w+): \(\) =>/gm)].map(m => m[1]));
/** Props.cs の switch のラベル */
const csKinds = () => new Set(
  [...readFileSync(csPath, 'utf8').matchAll(/case "(\w+)":/g)].map(m => m[1]));

test('部屋が置く家具は、両方の表現レイヤーに揃っている', { skip: !existsSync(csPath) && 'Unity 版が無い' }, () => {
  const floor = JSON.parse(readFileSync(join(R, 'client/floor.json'), 'utf8'));
  const used = [...new Set(floor.objects.map(o => o.kind))];
  const js = jsKinds(), cs = csKinds();
  assert.deepEqual(used.filter(k => !js.has(k)), [], 'props.js に無い種別を置いている');
  assert.deepEqual(used.filter(k => !cs.has(k)), [], 'Props.cs に無い種別を置いている');
});

test('props.js と Props.cs の家具の種類が一致する', { skip: !existsSync(csPath) && 'Unity 版が無い' }, () => {
  const js = jsKinds(), cs = csKinds();
  assert.ok(js.size >= 25, 'props.js の読み取りに失敗している');
  assert.deepEqual([...js].filter(k => !cs.has(k)), [], 'Unity 版にだけ無い家具');
  assert.deepEqual([...cs].filter(k => !js.has(k)), [], 'ブラウザ版にだけ無い家具');
});

test('Unity 版の StreamingAssets のフロアが、サーバの出すものと同じ', {
  skip: !existsSync(join(R, 'unity/Assets/StreamingAssets/floor.json')) && 'Unity 版が無い',
}, () => {
  // ★ 手でコピーしたものが古いままだと、Unity 版だけ別の部屋を描く
  const a = readFileSync(join(R, 'client/floor.json'), 'utf8');
  const b = readFileSync(join(R, 'unity/Assets/StreamingAssets/floor.json'), 'utf8');
  assert.equal(b, a, 'unity/Assets/StreamingAssets/floor.json が古い。`npm run dump:floor` のあとコピーし直す');
});
