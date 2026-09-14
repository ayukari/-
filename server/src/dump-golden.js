/**
 * 移動の規則の「正解表」を書き出す — shared/golden/movement.tsv
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
 *
 * ★ なぜ TSV か。JSON ではない。
 *   Unity の JsonUtility は数値と文字列が混ざる欄（NaN を書く欄）を読めず、
 *   System.Text.Json は Unity に標準で入っていない。
 *   **表のために外部ライブラリを増やすのは本末転倒**なので、
 *   どちらの言語でも 15 行で読める行指向の形にした。git の差分も読める。
 *
 *   `npm run dump:golden`
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Grid } from './core/grid.js';
import { SPEED, TOLERANCE, resolveMove, isReachable } from './core/movement.js';

/** 表に使う盤面。小さく、壁ずりと角抜けを含む形にしてある */
const GRID = { width: 8, height: 6, blocked: [[3, 2], [4, 2]] };

/** 入力の組。端の値と壊れた値を必ず含める */
const MOVES = [
  // 素直に歩く
  [1.5, 1.5, 1, 0, 0.1],
  [1.5, 1.5, 0, 1, 0.1],
  [1.5, 1.5, 1, 1, 0.1],        // 斜めは速くならない
  [1.5, 1.5, -1, -1, 0.1],
  // 壁ずり（机の角・外周）
  [3.5, 1.6, 0, 1, 0.1],        // 机に正面から
  [2.9, 1.6, 1, 1, 0.1],        // 机の角へ斜めに
  [1.2, 1.5, -1, 0, 0.1],       // 外周へ
  [1.5, 1.2, -1, -1, 0.1],      // 外周の角へ
  // ★ 壁ずりの「作法」を固定する3件。
  //   これが無いと、軸ごとの判定を少し違う書き方にしても表が通ってしまった。
  //   実際に C# 版で `isBlocked(x, ny)` を `isBlocked(nx, ny)` と書き間違えても
  //   検出できず、この3件を足して初めて落ちるようになった。
  [2.8, 2.5, 1, 1, 0.1],        // X が机に阻まれたあと、Y は**更新後の x** で判定する
  [2.8, 2.5, 1, -1, 0.1],       // 同じことを逆向きで
  [2.8, 1.9, 1, 1, 0.1],        // X を先に確定する（Y を先にすると別の結果になる）
  // 入力の丸め
  [1.5, 1.5, 9, 0, 0.1],        // 範囲外は 1 に丸まる
  [1.5, 1.5, -9, 9, 0.1],
  [1.5, 1.5, 0, 0, 0.1],        // 動かない
  [1.5, 1.5, 1, 0, 0],          // 時間が無い
  [1.5, 1.5, 1, 0, -1],         // 負の時間
  [1.5, 1.5, 1, 0, 9],          // 一括移動は 0.25 秒で頭打ち
  [1.5, 1.5, NaN, 0, 0.1],      // 壊れた入力
  [1.5, 1.5, Infinity, 1, 0.1],
  [1.5, 1.5, -Infinity, 0, 0.1],
  // 細かい dt
  [1.5, 1.5, 1, 0, 0.016],
  [1.5, 1.5, 0.3, -0.7, 0.05],
];

/** isReachable の表。将来クライアントが座標を送る経路を足したときの門番 */
const REACH = [
  [1.5, 1.5, 1.5, 1.5, 0.1],
  [1.5, 1.5, 1.9, 1.5, 0.1],
  [1.5, 1.5, 3.0, 1.5, 0.1],
  [1.5, 1.5, 1.5, 2.1, 0.1],
  [1.5, 1.5, 9.0, 9.0, 9],
];

/** 6桁で切る。丸めを両言語で揃えるため、表の側で確定させておく */
const r6 = v => (Math.round(v * 1e6) / 1e6).toString();
/** JSON も TSV も NaN / Infinity をそのままは書けない。読める綴りに固定する */
const w = v => (Number.isNaN(v) ? 'nan' : v === Infinity ? 'inf' : v === -Infinity ? '-inf' : String(v));
const b = v => (v ? '1' : '0');

const grid = new Grid(GRID);
const lines = [
  '# ひだまり 移動の正解表 — server/src/dump-golden.js が書き出す。手で編集しない。',
  '# 定義は core/movement.js のほう。この表を直して通すのは、規則を2つ持つのと同じこと。',
  `speed\t${SPEED}`,
  `tolerance\t${TOLERANCE}`,
  `grid\t${GRID.width}\t${GRID.height}`,
  ...GRID.blocked.map(([x, y]) => `blocked\t${x}\t${y}`),
  '# move\tx\ty\tdx\tdy\tdt\t->\toutX\toutY\toutDir\tmoved\tclamped',
];
for (const [x, y, dx, dy, dt] of MOVES) {
  const g = resolveMove(grid, { x, y, dir: 0 }, dx, dy, dt);
  lines.push(['move', x, y, w(dx), w(dy), dt, r6(g.x), r6(g.y), r6(g.dir), b(g.moved), b(g.clamped)]
    .join('\t'));
}
lines.push('# reach\tprevX\tprevY\tnextX\tnextY\tdt\t->\tok');
for (const [px, py, nx, ny, dt] of REACH) {
  lines.push(['reach', px, py, nx, ny, dt, b(isReachable({ x: px, y: py }, { x: nx, y: ny }, dt))]
    .join('\t'));
}

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, '../../shared/golden/movement.tsv');
writeFileSync(path, lines.join('\n') + '\n');
console.log('wrote', path, `(${MOVES.length} moves / ${REACH.length} reachable)`);
