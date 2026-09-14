/**
 * プロトコル違反の計数 — docs/design/09-protocol.md §5.4
 *
 * ★ ここは意図的に「記録しない」。
 *
 * 「ユーザ X が何回テレポートを試みたか」は利用行動のログであり、
 * docs/design/00-overview.md 原則3 と
 * docs/security-review-pack/04-audit-log.md の境界に反する。
 *
 * よって:
 *   - メモリ上でのみ数える
 *   - 閾値を超えたら接続を切る
 *   - 永続化しない。監査ログにも書かない。管理者にも見せない
 *   - 運用監視に出すのは、組織を特定しない総数だけ
 *
 * 攻撃者の追跡能力を捨てて原則3を守る、という意図的なトレードオフである。
 * 見直す条件（社外ゲストの受け入れ、規制業種）は 09-protocol.md §5.4 に書いた。
 */

/** この回数を超えたら切断 */
export const VIOLATION_LIMIT = 10;
/** 違反のカウントが減衰する時間 */
export const DECAY_MS = 10_000;

export class ViolationCounter {
  constructor(limit = VIOLATION_LIMIT, decayMs = DECAY_MS) {
    this.limit = limit;
    this.decayMs = decayMs;
    this.count = 0;
    /** 未設定は null。0 を番兵にすると nowMs=0 のとき減衰が効かない */
    this.last = null;
  }
  /** @returns {boolean} 切断すべきか */
  record(nowMs) {
    if (this.last !== null) {
      const decayed = Math.floor((nowMs - this.last) / this.decayMs);
      if (decayed > 0) this.count = Math.max(0, this.count - decayed);
    }
    this.last = nowMs;
    this.count++;
    return this.count > this.limit;
  }
}

/** 運用監視用。組織も個人も持たない、ただの総数 */
export class AnonymousViolationTally {
  constructor() { this.total = 0; }
  bump() { this.total++; }
  /** @returns {{total:number}} これ以上の粒度を持たせてはいけない */
  snapshot() { return { total: this.total }; }
}
