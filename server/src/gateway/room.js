/**
 * フロアの部屋 — docs/design/09-protocol.md §3.5 / §3.6
 *
 * 1フロアにつき1つ。参加者・座標・tick の生成を持つ。
 * トランスポート（WebSocket）を知らない。送信は out(peerId, msg) に委ねる。
 */
import { resolveMove } from '../core/movement.js';
import { nearbyActors } from '../core/proximity.js';

/** AOI のセルの一辺（タイル） */
export const CELL = 16;
/** 動きが無くても必ず送る間隔 */
export const FORCE_RESEND_MS = 2000;

export class Room {
  /**
   * @param {string} floorId
   * @param {import('../core/grid.js').Grid} grid
   * @param {{x:number,y:number}} spawn
   */
  constructor(floorId, grid, spawn) {
    this.floorId = floorId;
    this.grid = grid;
    this.spawn = spawn;
    /** @type {Map<string, Actor>} peerId -> Actor */
    this.actors = new Map();
    this.tickNo = 0;
    this._nextEntityId = 1;
    /** @type {Map<number,string>} entityId -> peerId */
    this.byEntity = new Map();
  }

  /** @returns {Actor} */
  join(peerId, { userId, name, color, body }) {
    const entityId = this._allocEntityId();
    const a = {
      peerId, entityId, userId, name, color, body,
      x: this.spawn.x, y: this.spawn.y, dir: 0,
      status: 'open', seat: null,
      intent: { dx: 0, dy: 0, seq: 0 },
      ackSeq: 0,
      lastSentAt: new Map(),   // entityId -> ms（差分抑制用）
    };
    this.actors.set(peerId, a);
    this.byEntity.set(entityId, peerId);
    return a;
  }

  leave(peerId) {
    const a = this.actors.get(peerId);
    if (!a) return null;
    this.actors.delete(peerId);
    this.byEntity.delete(a.entityId);
    for (const other of this.actors.values()) other.lastSentAt.delete(a.entityId);
    return a;
  }

  get(peerId) { return this.actors.get(peerId) ?? null; }
  getByEntity(entityId) {
    const p = this.byEntity.get(entityId);
    return p ? this.actors.get(p) ?? null : null;
  }

  /** クライアントの intent を受け取る。適用は tick で行う */
  setIntent(peerId, dx, dy, seq) {
    const a = this.actors.get(peerId);
    if (!a) return;
    a.intent = { dx, dy, seq };
  }

  /**
   * 1 tick 進める。各 actor の直近 intent を1つだけ適用する。
   * @param {number} dtSec
   * @returns {{moved:string[]}}
   */
  step(dtSec) {
    this.tickNo++;
    const moved = [];
    for (const a of this.actors.values()) {
      const { dx, dy, seq } = a.intent;
      const r = resolveMove(this.grid, a, dx, dy, dtSec);
      if (r.moved) {
        a.x = r.x; a.y = r.y; a.dir = r.dir;
        moved.push(a.peerId);
        // 席から離れたら自動的に立つ（09 §4.2 の sit/stand と整合）
        if (a.seat) {
          const o = this.grid.objectAt(a.x, a.y);
          if (!o || o.id !== a.seat) a.seat = null;
        }
      }
      a.ackSeq = seq;
    }
    return { moved };
  }

  /** AOI: 自分のセルと隣接8セルにいる actor */
  visibleTo(peerId) {
    const me = this.actors.get(peerId);
    if (!me) return [];
    const cx = Math.floor(me.x / CELL), cy = Math.floor(me.y / CELL);
    const out = [];
    for (const a of this.actors.values()) {
      if (a.peerId === peerId) continue;
      const ax = Math.floor(a.x / CELL), ay = Math.floor(a.y / CELL);
      if (Math.abs(ax - cx) <= 1 && Math.abs(ay - cy) <= 1) out.push(a);
    }
    return out;
  }

  /**
   * 1人分の tick ペイロードを組む。差分抑制つき（§3.6）。
   * バイナリ化は後（§10 の実装順）。いまは同じ構造を JSON で返す。
   */
  buildTick(peerId, nowMs) {
    const me = this.actors.get(peerId);
    if (!me) return null;
    const entries = [];
    // 自分も含める（巻き戻し照合に必要）
    for (const a of [me, ...this.visibleTo(peerId)]) {
      const snap = stateKey(a);
      const prev = me.lastSentAt.get(a.entityId);
      const changed = !prev || prev.k !== snap;
      const stale = !prev || nowMs - prev.t >= FORCE_RESEND_MS;
      if (!changed && !stale) continue;
      me.lastSentAt.set(a.entityId, { k: snap, t: nowMs });
      entries.push({
        entityId: a.entityId,
        x: Math.round(a.x * 256), y: Math.round(a.y * 256),
        dir: Math.round(((a.dir + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 255) & 255,
        state: encodeState(a),
      });
    }
    return { t: 'tick', tick: this.tickNo, ackSeq: me.ackSeq, entries };
  }

  /** 近接している相手（原則2で集中中・離席は除外済み） */
  nearby(peerId) {
    const me = this.actors.get(peerId);
    if (!me) return [];
    return nearbyActors(me, this.visibleTo(peerId).map(a => ({
      id: a.peerId, x: a.x, y: a.y, status: a.status,
    })));
  }

  /** 同じテーブルの在席者 */
  othersAtTable(tableId) {
    const seats = new Set(this.grid.objects
      .filter(o => o.kind === 'seat' && o.data?.table === tableId).map(o => o.id));
    return [...this.actors.values()].filter(a => a.seat && seats.has(a.seat));
  }

  /** seatId -> peerId */
  occupiedSeats() {
    const m = new Map();
    for (const a of this.actors.values()) if (a.seat) m.set(a.seat, a.peerId);
    return m;
  }

  _allocEntityId() {
    // u16。使い切ったら空きを探す（フロア内で一意であればよい）
    for (let i = 0; i < 65535; i++) {
      const id = ((this._nextEntityId + i - 1) % 65535) + 1;
      if (!this.byEntity.has(id)) {
        this._nextEntityId = (id % 65535) + 1;
        return id;
      }
    }
    throw new Error('entity id exhausted');
  }
}

/** state バイト: bit0-2 ステータス / bit3 着席 / bit4 通話中 */
export function encodeState(a) {
  const s = { open: 0, focus: 1, meet: 2, away: 3 }[a.status] ?? 0;
  return (s & 0b111) | (a.seat ? 0b1000 : 0) | (a.inCall ? 0b10000 : 0);
}

const stateKey = a =>
  `${Math.round(a.x * 256)},${Math.round(a.y * 256)},${Math.round(a.dir * 100)},${encodeState(a)}`;

/** @typedef {ReturnType<Room['join']>} Actor */
