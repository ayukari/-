/**
 * レート制限 — docs/design/09-protocol.md §5.3
 *
 * トークンバケット。時刻を引数で受け取る（テストしやすくするため、
 * また複数のバケットで同じ時刻を使えるようにするため）。
 */
export class TokenBucket {
  /**
   * @param {number} capacity  バースト上限
   * @param {number} refillPerSec  毎秒の補充量
   */
  constructor(capacity, refillPerSec) {
    this.capacity = capacity;
    this.refill = refillPerSec;
    this.tokens = capacity;
    /** 未設定は null。0 を番兵にすると nowMs=0 のときに誤動作する */
    this.last = null;
  }
  /** @returns {boolean} 通してよいか */
  take(nowMs, n = 1) {
    if (this.last === null) this.last = nowMs;
    const dt = Math.max(0, (nowMs - this.last) / 1000);
    this.last = nowMs;
    this.tokens = Math.min(this.capacity, this.tokens + dt * this.refill);
    if (this.tokens < n) return false;
    this.tokens -= n;
    return true;
  }
}

/** 「同じ相手に1回/N秒」のような、鍵ごとのクールダウン */
export class Cooldown {
  constructor(windowMs) { this.windowMs = windowMs; this.at = new Map(); }
  take(nowMs, key) {
    const prev = this.at.get(key);
    if (prev !== undefined && nowMs - prev < this.windowMs) return false;
    this.at.set(key, nowMs);
    return true;
  }
  /** 古い記録を捨てる。呼ばなくても正しく動くが、際限なく増えないように */
  sweep(nowMs) {
    for (const [k, t] of this.at) if (nowMs - t > this.windowMs * 4) this.at.delete(k);
  }
}

/** §5.3 の表をそのまま実装した組。1接続につき1つ持つ */
export function makeLimits() {
  return {
    intent: new TokenBucket(30, 15),      // 15Hz
    channelB: new TokenBucket(40, 20),    // 20件/秒、バースト40
    knockAll: new TokenBucket(6, 0.1),    // 6回/分
    knockPer: new Cooldown(30_000),       // 同一相手に1回/30秒
    enter: new Cooldown(2_000),           // フロア移動は1回/2秒
  };
}
