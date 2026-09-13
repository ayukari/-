/**
 * 1接続分の状態 — docs/design/09-protocol.md §2 / §5
 *
 * ★ orgId と userId はコンストラクタで受け取る。
 *   クライアントのメッセージからは絶対に読まない（§2、07-security.md §7）。
 */
import { makeLimits } from './ratelimit.js';
import { ViolationCounter } from './violations.js';
import { parseClientMessage } from './protocol.js';
import { validateSit } from '../core/seats.js';
import { reachableObject, dist, PROX, isApproachable } from '../core/proximity.js';

export class Session {
  /**
   * @param {object} p
   * @param {string} p.peerId
   * @param {string} p.orgId    セッションから引いた値のみ
   * @param {string} p.userId   同上
   * @param {object} p.profile  表示情報（name, color, body）
   */
  constructor({ peerId, orgId, userId, profile }) {
    this.peerId = peerId;
    this.orgId = orgId;
    this.userId = userId;
    this.profile = profile;
    this.room = null;
    this.limits = makeLimits();
    this.violations = new ViolationCounter();
    this.closed = false;
  }

  /**
   * チャネル B のメッセージを処理する。
   * @returns {{out:object[], close?:string}} out は呼び出し側が送る
   */
  handle(raw, nowMs, world) {
    if (this.closed) return { out: [] };

    if (!this.limits.channelB.take(nowMs)) {
      return { out: [{ t: 'error', code: 'rate_limited' }] };
    }
    const m = parseClientMessage(raw);
    if (m.t === 'error') return this._violate(nowMs, m.code);

    switch (m.t) {
      case 'enter':       return this._enter(m, nowMs, world);
      case 'setStatus':   return this._setStatus(m);
      case 'sit':         return this._sit(m, nowMs);
      case 'stand':       return this._stand();
      case 'knock':       return this._knock(m, nowMs);
      case 'knockAnswer': return this._knockAnswer(m);
      case 'use':         return this._use(m);
      case 'rosterReq':   return this._roster(m);
      default:            return { out: [] };
    }
  }

  /** バイナリの intent。適用は Room.step で行う */
  handleIntent(dx, dy, seq, nowMs) {
    if (this.closed || !this.room) return { out: [] };
    if (!this.limits.intent.take(nowMs)) return { out: [] };   // 超過分は黙って捨てる
    this.room.setIntent(this.peerId, dx, dy, seq);
    return { out: [] };
  }

  _enter({ floor }, nowMs, world) {
    if (!this.limits.enter.take(nowMs, 'enter')) {
      return { out: [{ t: 'error', code: 'rate_limited' }] };
    }
    const room = world.roomFor(this.orgId, floor);
    if (!room) return { out: [{ t: 'error', code: 'not_found' }] };
    if (this.room) this.room.leave(this.peerId);
    this.room = room;
    const a = room.join(this.peerId, {
      userId: this.userId, name: this.profile.name,
      color: this.profile.color, body: this.profile.body,
    });
    return { out: [
      { t: 'hello', selfEntityId: a.entityId, floor, tickRate: 10, serverTime: nowMs, protocol: 1 },
      { t: 'roster', add: this._rosterAll(), remove: [] },
    ] };
  }

  _setStatus({ status }) {
    const a = this.room?.get(this.peerId);
    if (!a) return { out: [] };
    a.status = status;
    // 集中中にしたら席を立つ（原則2と原則1の整合）
    if (status === 'focus' && a.seat) { a.seat = null; a.inCall = false; }
    return { out: [{ t: 'status', entityId: a.entityId, status }], broadcast: true };
  }

  _sit({ seatId }, nowMs) {
    const a = this.room?.get(this.peerId);
    if (!a) return { out: [] };
    const seat = this.room.grid.objectById(seatId);
    const table = seat?.data?.table;
    const r = validateSit({
      grid: this.room.grid,
      pos: a,
      seatId,
      status: a.status,
      occupied: this.room.occupiedSeats(),
      othersAtTable: table ? this.room.othersAtTable(table) : [],
    });
    if (!r.ok) return { out: [{ t: 'error', code: 'denied' }] };
    a.seat = seatId;
    a.inCall = true;
    return { out: [{ t: 'seat', entityId: a.entityId, seatId }], broadcast: true };
  }

  _stand() {
    const a = this.room?.get(this.peerId);
    if (!a || !a.seat) return { out: [] };
    a.seat = null; a.inCall = false;
    return { out: [{ t: 'seat', entityId: a.entityId, seatId: null }], broadcast: true };
  }

  _knock({ targetEntityId }, nowMs) {
    const a = this.room?.get(this.peerId);
    if (!a) return { out: [] };
    const target = this.room.getByEntity(targetEntityId);
    if (!target) return { out: [{ t: 'error', code: 'not_found' }] };

    // 近接していなければノックできない（座標はサーバの値を使う）
    if (dist(a, target) >= PROX) return { out: [{ t: 'error', code: 'denied' }] };
    // 集中中・離席の相手にはノックが届かない（原則2）
    if (!isApproachable(target.status)) return { out: [{ t: 'error', code: 'denied' }] };

    if (!this.limits.knockPer.take(nowMs, String(targetEntityId))
        || !this.limits.knockAll.take(nowMs)) {
      return { out: [{ t: 'error', code: 'rate_limited' }] };
    }
    return { out: [{ t: 'knock', fromEntityId: a.entityId }], to: target.peerId };
  }

  _knockAnswer({ fromEntityId, accept }) {
    const a = this.room?.get(this.peerId);
    const from = this.room?.getByEntity(fromEntityId);
    if (!a || !from) return { out: [] };
    return { out: [{ t: 'knockResult', targetEntityId: a.entityId, accepted: accept }], to: from.peerId };
  }

  _use({ objectId }) {
    const a = this.room?.get(this.peerId);
    if (!a) return { out: [] };
    const near = reachableObject(this.room.grid, a);
    if (!near || near.id !== objectId) return { out: [{ t: 'error', code: 'denied' }] };
    return { out: [{ t: 'used', objectId, kind: near.kind }] };
  }

  _roster({ entityIds }) {
    const add = entityIds
      .map(id => this.room?.getByEntity(id))
      .filter(Boolean)
      .map(toRosterEntry);
    return { out: [{ t: 'roster', add, remove: [] }] };
  }

  _rosterAll() {
    return [...(this.room?.actors.values() ?? [])].map(toRosterEntry);
  }

  _violate(nowMs, code) {
    const kill = this.violations.record(nowMs);
    if (kill) { this.closed = true; return { out: [{ t: 'error', code }], close: 'protocol' }; }
    return { out: [{ t: 'error', code }] };
  }
}

const toRosterEntry = a => ({
  entityId: a.entityId, userId: a.userId, name: a.name, color: a.color, body: a.body,
});
