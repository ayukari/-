/**
 * 移動の規則の「正解表」を書き出す — shared/golden/movement.json
 *
 * ★ なぜ要るか。
 *   いまは core/movement.js を**サーバとブラウザが同じファイルとして**読んでいるので、
 *   移動の規則はこの世に1つしかない（04 §4.5）。
 *   Unity 版のクライアントは JavaScript を読めないので、C# に書き写すことになる。
 *   そこで規則が2つになる。**2つになった瞬間、予測と権威がずれて
 *   「歩いていたら引き戻される」が常態化する。**
 *
 *   書き写すこと自体は避けられないので、代わりに**同じ入力に対する出力を固定**する。
 *   JS 側も C# 側も、この表と一致することをテストで見張る。
 *   どちらかを書き換えて挙動が変わったら、その場で落ちる。
 *
 *   `npm run dump:golden`
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Grid } from './core/grid.js';
import { SPEED, TOLERANCE, resolveMove, isReachable } from './core/movement.js';

/** 表に使う盤面。小さく、壁ずりと角抜けを含む形にしてある */
const GRID_DEF = {
  width: 8,
  height: 6,
  // 中央に2タイルの机。外周は Grid が必ず塞ぐ
  blocked: [[3, 2], [4, 2]],
};

/** 入力の組。端の値と壊れた値を必ず含める */
const INPUTS = [
  // 素直に歩く
  { from: [1.5, 1.5], dx: 1, dy: 0, dt: 0.1 },
  { from: [1.5, 1.5], dx: 0, dy: 1, dt: 0.1 },
  { from: [1.5, 1.5], dx: 1, dy: 1, dt: 0.1 },      // 斜めは速くならない
  { from: [1.5, 1.5], dx: -1, dy: -1, dt: 0.1 },
  // 壁ずり（机の角・外周）
  { from: [3.5, 1.6], dx: 0, dy: 1, dt: 0.1 },      // 机に正面から
  { from: [2.9, 1.6], dx: 1, dy: 1, dt: 0.1 },      // 机の角へ斜めに
  { from: [1.2, 1.5], dx: -1, dy: 0, dt: 0.1 },     // 外周へ
  { from: [1.5, 1.2], dx: -1, dy: -1, dt: 0.1 },    // 外周の角へ
  // 入力の丸め
  { from: [1.5, 1.5], dx: 9, dy: 0, dt: 0.1 },      // 範囲外は 1 に丸まる
  { from: [1.5, 1.5], dx: -9, dy: 9, dt: 0.1 },
  { from: [1.5, 1.5], dx: 0, dy: 0, dt: 0.1 },      // 動かない
  { from: [1.5, 1.5], dx: 1, dy: 0, dt: 0 },        // 時間が無い
  { from: [1.5, 1.5], dx: 1, dy: 0, dt: -1 },       // 負の時間
  { from: [1.5, 1.5], dx: 1, dy: 0, dt: 9 },        // 一括移動は 0.25 秒で頭打ち
  { from: [1.5, 1.5], dx: NaN, dy: 0, dt: 0.1 },    // 壊れた入力
  { from: [1.5, 1.5], dx: Infinity, dy: 1, dt: 0.1 },
  // 細かい dt
  { from: [1.5, 1.5], dx: 1, dy: 0, dt: 0.016 },
  { from: [1.5, 1.5], dx: 0.3, dy: -0.7, dt: 0.05 },
];

/** isReachable の表。将来クライアントが座標を送る経路を足したときの門番 */
const REACH = [
  { prev: [1.5, 1.5], next: [1.5, 1.5], dt: 0.1 },
  { prev: [1.5, 1.5], next: [1.9, 1.5], dt: 0.1 },
  { prev: [1.5, 1.5], next: [3.0, 1.5], dt: 0.1 },
  { prev: [1.5, 1.5], next: [1.5, 2.1], dt: 0.1 },
  { prev: [1.5, 1.5], next: [9.0, 9.0], dt: 9 },
];

const r6 = v => Math.round(v * 1e6) / 1e6;
const grid = new Grid(GRID_DEF);

const out = {
  note: 'server/src/dump-golden.js が書き出す。手で編集しない。'
      + ' JS と C# の両方がこの表と一致することをテストで見張る。',
  speed: SPEED,
  tolerance: TOLERANCE,
  grid: GRID_DEF,
  moves: INPUTS.map(c => {
    const g = resolveMove(grid, { x: c.from[0], y: c.from[1], dir: 0 }, c.dx, c.dy, c.dt);
    return {
      // JSON に NaN / Infinity は書けないので文字列で持つ
      in: { x: c.from[0], y: c.from[1], dx: num(c.dx), dy: num(c.dy), dt: c.dt },
      out: { x: r6(g.x), y: r6(g.y), dir: r6(g.dir), moved: g.moved, clamped: g.clamped },
    };
  }),
  reachable: REACH.map(c => ({
    in: { prev: c.prev, next: c.next, dt: c.dt },
    out: isReachable({ x: c.prev[0], y: c.prev[1] }, { x: c.next[0], y: c.next[1] }, c.dt),
  })),
};

function num(v) {
  return Number.isFinite(v) ? v : String(v);
}

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, '../../shared/golden/movement.json');
writeFileSync(path, JSON.stringify(out, null, 1) + '\n');
console.log('wrote', path, `(${out.moves.length} moves / ${out.reachable.length} reachable)`);
