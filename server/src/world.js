/**
 * フロアの定義と、組織ごとの部屋の管理。
 *
 * ★ マップはサーバが持つ。クライアントは API で受け取るだけで、
 *   自分でマップを持たない（当たり判定の正はサーバにしかない）。
 */
import { Grid } from './core/grid.js';
import { Room } from './gateway/room.js';

/** @type {Record<string, {name:string, grid:object, spawn:{x:number,y:number}}>} */
export const FLOORS = {
  office: {
    name: 'プロダクト開発の部屋',
    spawn: { x: 12.5, y: 8.5 },
    grid: {
      width: 24, height: 16,
      blocked: [
        ...rect(9, 4, 3, 2), ...rect(9, 10, 3, 2),
        ...rect(2, 2, 1, 3), ...rect(4, 2, 1, 3), ...rect(6, 2, 1, 3),
        ...rect(17, 9, 2, 1), ...rect(20, 9, 2, 1),
      ],
    },
    areas: [
      { id: 'meet',  x: 15, y: 1,  w: 8, h: 6, kind: 'MEETING', name: '会議室A' },
      { id: 'focus', x: 1,  y: 10, w: 6, h: 5, kind: 'FOCUS',   name: '集中ルーム' },
    ],
    objects: [
      seat('t1a', 8, 4, 't1'), seat('t1b', 8, 5, 't1'), seat('t1c', 12, 4, 't1'), seat('t1d', 12, 5, 't1'),
      seat('t2a', 8, 10, 't2'), seat('t2b', 8, 11, 't2'), seat('t2c', 12, 10, 't2'), seat('t2d', 12, 11, 't2'),
      { id: 'note1',  kind: 'note',  x: 3,  y: 8,  data: { title: 'チェックインの時間' } },
      { id: 'board1', kind: 'board', x: 20, y: 12, data: { title: 'チームの今週' } },
      { id: 'sign1',  kind: 'sign',  x: 13, y: 14, data: { title: '案内' } },
      { id: 'wb1',    kind: 'whiteboard', x: 18, y: 2, data: { boardId: 'office-a' } },
      { id: 'pl1',    kind: 'plant', x: 22, y: 2,  data: {} },
      { id: 'pl2',    kind: 'plant', x: 2,  y: 6,  data: {} },
    ],
  },
};

function rect(x, y, w, h) {
  const out = [];
  for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) out.push([i, j]);
  return out;
}
function seat(id, x, y, table) { return { id, kind: 'seat', x, y, data: { table } }; }

/** 組織 × フロア の部屋を必要になったときに作る */
export class World {
  constructor() { this.rooms = new Map(); }

  roomFor(orgId, floorId) {
    const def = FLOORS[floorId];
    if (!def) return null;
    const key = orgId + ':' + floorId;
    let room = this.rooms.get(key);
    if (!room) {
      room = new Room(floorId, new Grid(def.grid, { areas: def.areas, objects: def.objects }), def.spawn);
      this.rooms.set(key, room);
    }
    return room;
  }

  /** クライアントに渡すフロア定義（当たり判定の正はサーバ側にある） */
  describe(floorId) {
    const d = FLOORS[floorId];
    if (!d) return null;
    return { id: floorId, name: d.name, spawn: d.spawn,
             grid: d.grid, areas: d.areas, objects: d.objects };
  }

  step(dtSec) { for (const r of this.rooms.values()) r.step(dtSec); }
}
