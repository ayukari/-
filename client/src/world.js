/**
 * クライアント側の論理レイヤー — docs/design/04-architecture.md §4.5
 *
 * ここには「2Dグリッド上の事実」だけがある。Three.js も DOM も知らない。
 * 表現（3D / 2D）はこの上に差し替え可能な形で乗る。
 *
 * ★ 当たり判定の規則は /core/ からサーバと同じファイルを読み込む。
 *   移動の実装が2つ存在しないようにするため（予測=ここ、権威=サーバ）。
 */
import { Grid } from '../core/grid.js';
import { resolveMove } from '../core/movement.js';
import { reachableObject, nearbyActors, PROX } from '../core/proximity.js';

/** サーバ値と予測値がこれ以上離れたら巻き戻す（タイル） */
export const SNAP = 0.55;
/** SNAP 未満のずれを毎 tick どれだけ吸収するか */
export const PULL = 0.25;

const STATUS = ['open', 'focus', 'meet', 'away'];
const decodeState = s => ({
  status: STATUS[s & 0b111] ?? 'open',
  seated: !!(s & 0b1000),
  inCall: !!(s & 0b10000),
});

export async function loadFloor(id = 'office', url = null) {
  const r = await fetch(url ?? `/api/floor?id=${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error('floor ' + r.status);
  return r.json();
}

export class ClientWorld {
  /** @param {{id:string,name:string,spawn:{x:number,y:number},grid:object,areas:object[],objects:object[]}} floor */
  constructor(floor) {
    this.floor = floor;
    this.grid = new Grid(floor.grid, { areas: floor.areas, objects: floor.objects });
    /** entityId -> Actor */
    this.actors = new Map();
    this.selfEntityId = null;
    this.tick = 0;
    this.fixes = 0;
  }

  get me() { return this.actors.get(this.selfEntityId) ?? null; }

  /**
   * 入室し直したときに、前の状態を捨てる。
   *
   * ★ 再接続すると entityId が振り直される。捨てないと、切れる前の自分が
   *   その場に立ったまま残る（誰も動かさないので永遠に消えない）。
   */
  reset(selfEntityId) {
    this.actors.clear();
    this.selfEntityId = selfEntityId;
    this.tick = 0;
  }

  /** roster（名前・色）は tick とは別チャネルで来る（§3.4） */
  applyRoster({ add = [], remove = [] }) {
    for (const e of add) {
      const a = this.actors.get(e.entityId) ?? this._blank(e.entityId);
      Object.assign(a, { userId: e.userId, name: e.name, color: e.color, body: e.body });
      this.actors.set(e.entityId, a);
    }
    for (const id of remove) this.actors.delete(id);
  }

  /** tick を当てる。自分は巻き戻し照合、他人は補間の目標を差し替える（§6） */
  applyTick({ tick, entries }) {
    this.tick = tick;
    for (const e of entries) {
      const a = this.actors.get(e.entityId) ?? this._blank(e.entityId);
      this.actors.set(e.entityId, a);
      const sx = e.x / 256, sy = e.y / 256;
      Object.assign(a, decodeState(e.state));
      a.dir = (e.dir / 255) * Math.PI * 2;
      a.sx = sx; a.sy = sy;

      if (e.entityId === this.selfEntityId) {
        // 予測とサーバ値の差。大きければ即座に合わせ、小さければ毎tick少しずつ寄せる。
        // 溜めてから跳ぶと画面が飛ぶので、溜まる前に消す（§6）
        if (a.x === null || Math.hypot(a.x - sx, a.y - sy) > SNAP) {
          if (a.x !== null) this.fixes++;
          a.x = sx; a.y = sy;
        } else {
          a.x += (sx - a.x) * PULL;
          a.y += (sy - a.y) * PULL;
        }
        a.tx = a.x; a.ty = a.y;
      } else {
        a.tx = sx; a.ty = sy;
        if (a.x === null) { a.x = sx; a.y = sy; }
      }
    }
  }

  setStatus(entityId, status) {
    const a = this.actors.get(entityId); if (a) a.status = status;
  }
  setSeat(entityId, seatId) {
    const a = this.actors.get(entityId); if (a) { a.seated = !!seatId; a.seatId = seatId; }
  }

  /** 自分だけをローカルで進める（サーバと同じ resolveMove を使う） */
  predict(dx, dy, dtSec) {
    const me = this.me;
    if (!me || me.x === null || me.seated) return;
    const r = resolveMove(this.grid, me, dx, dy, dtSec);
    if (r.moved) { me.x = r.x; me.y = r.y; me.dir = r.dir; }
    else if (dx || dy) me.dir = Math.atan2(dx, dy);
  }

  /** 他人の位置を目標へ寄せる。10Hz の tick を 30fps に伸ばす */
  interpolate(dtSec) {
    const k = 1 - Math.exp(-dtSec * 14);
    for (const a of this.actors.values()) {
      if (a.entityId === this.selfEntityId || a.x === null) continue;
      a.x += (a.tx - a.x) * k;
      a.y += (a.ty - a.y) * k;
    }
  }

  /** 足元〜手の届くオブジェクト（サーバの use 判定と同じ関数を使う） */
  reachable() {
    const me = this.me;
    return me && me.x !== null ? reachableObject(this.grid, me) : null;
  }

  /**
   * いま押せる「行動」1つ。動詞は sit / stand / use / knock / walk の5つだけ。
   *
   * ★ ここがサーバの検証と同じ条件を持つ。
   *   着席はサーバが「席のタイルの上にいること」を求める（09 §5.2 ①）ので、
   *   手が届くだけで「座る」を出してはいけない。出すと必ず denied になる。
   *   表現レイヤーもボタンもこの結果だけを見る。
   */
  actionable() {
    const me = this.me;
    if (!me || me.x === null) return null;
    if (me.seated) return { verb: 'stand' };

    const under = this.grid.objectAt(me.x, me.y);
    if (under) return { verb: under.kind === 'seat' ? 'sit' : 'use', object: under };

    const o = reachableObject(this.grid, me);
    if (o && o.kind !== 'seat') return { verb: 'use', object: o };

    const n = this.nearby()[0];
    if (n) return { verb: 'knock', actor: n };

    // 席は手が届くだけでは座れない。まずその上まで歩く
    if (o) return { verb: 'walk', object: o };
    return null;
  }

  /** 話しかけられる相手（集中中・離席は除外される = 原則2） */
  nearby() {
    const me = this.me;
    if (!me || me.x === null) return [];
    const others = [...this.actors.values()]
      .filter(a => a.entityId !== this.selfEntityId && a.x !== null)
      .map(a => ({ id: a.entityId, x: a.x, y: a.y, status: a.status }));
    return nearbyActors(me, others).map(o => this.actors.get(o.id));
  }

  /**
   * その人が座っている席。
   *
   * 着席中は必ずその席のタイルの上にいる（サーバがそう検証している。09 §5.2 ①）ので、
   * 足元から引ける。自分が入室する前から座っていた人は seat メッセージを受け取って
   * いないので、seatId には頼れない。
   */
  seatOf(a) {
    if (!a?.seated || a.x === null) return null;
    const under = this.grid.objectAt(a.x, a.y);
    if (under?.kind === 'seat') return under;
    return a.seatId ? this.grid.objectById(a.seatId) : null;
  }

  /** 席から見て机のある向き。座ったら机を向く */
  seatFacing(seat) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (this.grid.isBlocked(seat.x + dx, seat.y + dy)) return Math.atan2(dx, dy);
    }
    return 0;
  }

  areaOfMe() {
    const me = this.me;
    return me && me.x !== null ? this.grid.areaAt(me.x, me.y) : null;
  }

  _blank(entityId) {
    return {
      entityId, userId: null, name: '…', color: '#8A7B5E', body: 0,
      x: null, y: null, tx: 0, ty: 0, sx: 0, sy: 0, dir: 0,
      status: 'open', seated: false, inCall: false, seatId: null,
    };
  }
}

export { PROX };
