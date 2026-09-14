/**
 * client/floor.json を書き出す。
 *
 * ★ solo.html（サーバ無しのプロトタイプ）だけがこのファイルを読む。
 *   手で書くと、サーバの持つ当たり判定とずれる。必ずここから作る。
 *   `npm run dump:floor`
 */
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { World } from './world.js';

const here = dirname(fileURLToPath(import.meta.url));
const json = JSON.stringify(new World().describe('office'), null, 1) + '\n';
// ★ Unity 版も同じものを読む。片方だけ古いと、実行系によって違う部屋が出る
for (const out of ['../../client/floor.json', '../../unity/Assets/StreamingAssets/floor.json']) {
  const p = join(here, out);
  if (out.includes('unity') && !existsSync(dirname(p))) continue;   // Unity 版が無い環境では飛ばす
  writeFileSync(p, json);
  console.log('wrote', p);
}
