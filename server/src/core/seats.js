/**
 * 着席の検証 — docs/design/09-protocol.md §5.2
 *
 * 4条件すべてを満たさなければ拒否する。理由は最小限しか返さない
 * （どの条件で落ちたかを細かく返すと、存在の推測に使われる）。
 */

export const SIT_OK = 'ok';
export const SIT_DENIED = 'denied';

/**
 * @param {object} p
 * @param {import('./grid.js').Grid} p.grid
 * @param {{x:number,y:number}} p.pos            サーバが持つ申請者の座標
 * @param {string} p.seatId
 * @param {string} p.status                      申請者のステータス
 * @param {Map<string,string>} p.occupied        seatId -> userId
 * @param {{seat:string|null,status:string}[]} p.othersAtTable 同じテーブルの在席者
 * @param {(area:object|null)=>boolean} [p.canEnter] エリアの入室権限
 * @returns {{ok:boolean, reason:string}}
 */
export function validateSit({ grid, pos, seatId, status, occupied, othersAtTable, canEnter = () => true }) {
  const seat = grid.objectById(seatId);
  if (!seat || seat.kind !== 'seat') return deny();

  // ① 自分のサーバ側座標が、その席のタイルの上にあるか
  if (Math.floor(pos.x) !== seat.x || Math.floor(pos.y) !== seat.y) return deny();

  // ② その席が空いているか
  if (occupied.has(seatId)) return deny();

  // ③ 同じテーブルの相手が「集中中」でないか
  //    （自分が集中中のときも座らせない。原則2との整合）
  if (status === 'focus') return deny();
  if (othersAtTable.some(o => o.status === 'focus')) return deny();

  // ④ そのエリアへの入室権限があるか
  if (!canEnter(grid.areaAt(seat.x, seat.y))) return deny();

  return { ok: true, reason: SIT_OK };
}

const deny = () => ({ ok: false, reason: SIT_DENIED });
