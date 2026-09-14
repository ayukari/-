/**
 * 移動の確定 — docs/design/09-protocol.md §5.1
 *
 * クライアントは「進みたい向き」しか送れない。座標は送れない。
 * サーバがここで速度上限と壁を検証して確定させる。
 * 偽装できるのは向きだけで、それはこの関数で潰れる。
 */

/** タイル/秒 */
export const SPEED = 4.2;
/** RTT のゆらぎを吸収する許容係数 */
export const TOLERANCE = 1.2;

/**
 * @param {import('./grid.js').Grid} grid
 * @param {{x:number,y:number,dir:number}} pos  現在位置（この関数は変更しない）
 * @param {number} dx  -1..1（範囲外は丸める）
 * @param {number} dy  -1..1
 * @param {number} dtSec  経過秒。負や過大な値は丸める
 * @returns {{x:number,y:number,dir:number,moved:boolean,clamped:boolean}}
 */
export function resolveMove(grid, pos, dx, dy, dtSec) {
  // 入力の正規化。壊れた値でサーバが壊れないようにする
  dx = clampUnit(dx);
  dy = clampUnit(dy);
  const dt = Math.min(Math.max(dtSec, 0), 0.25); // 250ms を超える一括移動は認めない

  const len = Math.hypot(dx, dy);
  if (len === 0 || dt === 0) {
    return { x: pos.x, y: pos.y, dir: pos.dir, moved: false, clamped: false };
  }

  const want = SPEED * dt;
  const max = SPEED * dt * TOLERANCE;
  const step = Math.min(want, max);

  const nx = pos.x + (dx / len) * step;
  const ny = pos.y + (dy / len) * step;

  // 軸ごとに判定する（壁ずり）。斜めに詰まって止まらないようにするため
  let x = pos.x, y = pos.y, clamped = false;
  if (!grid.isBlocked(nx, pos.y)) x = nx; else clamped = true;
  if (!grid.isBlocked(x, ny)) y = ny; else clamped = true;

  const dir = Math.atan2(dx, dy);
  const moved = x !== pos.x || y !== pos.y;
  return { x, y, dir, moved, clamped };
}

/**
 * クライアントが主張した座標が、直前の確定座標から到達可能かを検証する。
 * 通常の経路では使わない（座標を受け取らないため）が、
 * 将来クライアントが座標を送る経路を足したときの門番として置いておく。
 */
export function isReachable(prev, next, dtSec) {
  const max = SPEED * Math.min(Math.max(dtSec, 0), 0.25) * TOLERANCE;
  return Math.hypot(next.x - prev.x, next.y - prev.y) <= max + 1e-9;
}

function clampUnit(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(-1, v));
}
