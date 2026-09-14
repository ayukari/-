/**
 * client/floor.json を書き出す。
 *
 * ★ solo.html（サーバ無しのプロトタイプ）だけがこのファイルを読む。
 *   手で書くと、サーバの持つ当たり判定とずれる。必ずここから作る。
 *   `npm run dump:floor`
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { World } from './world.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../client/floor.json');
writeFileSync(out, JSON.stringify(new World().describe('office'), null, 1) + '\n');
console.log('wrote', out);
