/**
 * 近接判定 — docs/design/00-overview.md 原則1・原則2
 *
 * 近接は「可聴可能性の提示」までで、通話の開始ではない。
 * 「集中中」「離席」の人は近接の対象にしない（原則2）。
 */

/** 話しかけられる距離（タイル） */
export const PROX = 2.6;
/** オブジェクトに手が届く距離（タイル） */
export const REACH = 1.5;

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** 近接対象になりうるステータスか */
export const isApproachable = status => status !== 'focus' && status !== 'away';

/**
 * @param {{x:number,y:number}} me
 * @param {{id:string,x:number,y:number,status:string}[]} others
 * @returns {{id:string,x:number,y:number,status:string}[]} 近い順
 */
export function nearbyActors(me, others) {
  return others
    .filter(a => isApproachable(a.status))
    .filter(a => dist(a, me) < PROX)
    .sort((a, b) => dist(a, me) - dist(b, me));
}

/**
 * 足元のオブジェクトを優先し、無ければ手の届く範囲で最も近いもの。
 * @param {import('./grid.js').Grid} grid
 */
export function reachableObject(grid, me) {
  const under = grid.objectAt(me.x, me.y);
  if (under) return under;
  let best = null, bd = REACH;
  for (const o of grid.objects) {
    const d = Math.hypot(o.x + 0.5 - me.x, o.y + 0.5 - me.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
