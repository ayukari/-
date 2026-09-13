/**
 * チャネル B のメッセージ検証 — docs/design/09-protocol.md §4
 *
 * 受け取った JSON は「他のクライアントが書いた値」であり、信用しない。
 * orgId / userId はここに現れない（セッションから引くため。§2）。
 */

const STATUSES = new Set(['open', 'focus', 'meet', 'away']);

/** クライアント → サーバ で受け付ける型 */
const SCHEMA = {
  enter:       m => isId(m.floor) ? { floor: m.floor } : null,
  setStatus:   m => STATUSES.has(m.status) ? { status: m.status } : null,
  sit:         m => isId(m.seatId) ? { seatId: m.seatId } : null,
  stand:       () => ({}),
  knock:       m => isEntity(m.targetEntityId) ? { targetEntityId: m.targetEntityId } : null,
  knockAnswer: m => isEntity(m.fromEntityId) && typeof m.accept === 'boolean'
                    ? { fromEntityId: m.fromEntityId, accept: m.accept } : null,
  use:         m => isId(m.objectId) ? { objectId: m.objectId } : null,
  rosterReq:   m => Array.isArray(m.entityIds) && m.entityIds.length <= 64
                    && m.entityIds.every(isEntity) ? { entityIds: m.entityIds.slice(0, 64) } : null,
};

/**
 * @param {unknown} raw  文字列または既にパース済みのオブジェクト
 * @returns {{t:string, [k:string]:any} | {t:'error', code:string}}
 */
export function parseClientMessage(raw) {
  let m = raw;
  if (typeof raw === 'string') {
    if (raw.length > 4096) return err('too_large');
    try { m = JSON.parse(raw); } catch { return err('malformed'); }
  }
  if (!m || typeof m !== 'object' || Array.isArray(m)) return err('malformed');
  const t = m.t;
  if (typeof t !== 'string' || !Object.hasOwn(SCHEMA, t)) return err('unknown_type');
  const body = SCHEMA[t](m);
  if (body === null) return err('invalid_argument');
  return { t, ...body };
}

const err = code => ({ t: 'error', code });
const isId = v => typeof v === 'string' && v.length > 0 && v.length <= 64 && /^[A-Za-z0-9_.:-]+$/.test(v);
const isEntity = v => Number.isInteger(v) && v >= 0 && v <= 65535;

export { STATUSES, isId, isEntity };
