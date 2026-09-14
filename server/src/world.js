/**
 * フロアの定義と、組織ごとの部屋の管理。
 *
 * ★ マップはサーバが持つ。クライアントは API で受け取るだけで、
 *   自分でマップを持たない（当たり判定の正はサーバにしかない）。
 */
import { Grid } from './core/grid.js';
import { Room } from './gateway/room.js';

/**
 * 部屋の中身は「置いたもの」で表す。
 *
 * ★ 通行できないタイルは、家具を置いた結果として決まる。
 *   blocked を手で並べていたときは、表現（机の形）と論理（通れない範囲）が
 *   食い違って、机の角をすり抜けられた。
 */
/**
 * 部屋の広さ。
 *
 * ★ 小さい。以前は 24×16 あったが、あれは「広い床」であって部屋ではなかった。
 *   画角に部屋がまるごと入らないと、どこを見ても床と机が続くだけで、
 *   自分がどこに居るのか分からない。ひと目で見渡せる広さに畳んである。
 */
const W = 20, H = 14;

function layout() {
  const objects = [];
  const blocked = [];
  let n = 0;

  /* ★ 部屋の外周は壁。
     以前は外周を blocked に入れていなかったので、壁に付くもの（窓・時計・
     ホワイトボード）が何も無いところに浮いていた。歩ける範囲は 18×12。 */
  for (let x = 0; x < W; x++) { blocked.push([x, 0]); blocked.push([x, H - 1]); }
  for (let y = 1; y < H - 1; y++) { blocked.push([0, y]); blocked.push([W - 1, y]); }

  /** 家具を1つ置く。footprint ぶんのタイルを通行不可にする */
  const put = (kind, x, y, opts = {}) => {
    const { rot = 0, w = 1, d = 1, solid = true, id = `${kind}${++n}`, data = {} } = opts;
    objects.push({ id, kind, x, y, rot, data });
    if (solid) for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) blocked.push([x + i, y + j]);
    return id;
  };
  const desk = (x, y, rot) => put('desk', x, y, { rot, w: 2, d: 1 });
  const seat = (x, y, table) => put('seat', x, y, { solid: false, id: `s_${x}_${y}`, data: { table } });
  /* 壁に付くものは「壁が -Z 側にある」前提で作ってある（props.js）。
     北の壁はそのまま、東の壁は -90°、西の壁は +90°、手前は 180°。 */
  const EAST = -90, WEST = 90;

  /* --- 北の壁ぎわ。窓と時計と給湯 --- */
  for (const x of [2, 7, 11]) put('window', x, 1, { solid: false });
  put('clock', 9, 1, { solid: false });
  put('counter', 4, 1, { w: 2, d: 1 });
  put('cooler', 6, 1);
  put('plant', 18, 1);
  put('rack', 1, 3);
  put('crate', 1, 5);

  /* --- 会議室（東） --- */
  desk(14, 3, 0); desk(16, 3, 0);
  for (const x of [14, 15, 16, 17]) { seat(x, 2, 'meet'); seat(x, 4, 'meet'); }
  put('rugBig', 15, 3, { solid: false });
  put('whiteboard', 15, 1, { solid: false });
  put('poster', 18, 5, { rot: EAST, solid: false });
  put('partition', 12, 3); put('partition', 12, 4);

  /* --- 中央の島。向かい合わせの机 --- */
  desk(6, 5, 180); desk(8, 5, 180);
  desk(6, 7, 0);   desk(8, 7, 0);
  for (const x of [6, 7, 8, 9]) { seat(x, 4, 't1'); seat(x, 6, 't1'); seat(x, 8, 't2'); }
  put('monitor', 6, 5, { rot: 180, solid: false });
  put('monitor', 9, 5, { rot: 180, solid: false });
  put('laptop', 7, 7, { solid: false });
  put('mug', 8, 7, { solid: false });
  put('plantS', 9, 7, { solid: false });
  put('books', 6, 7, { solid: false });
  put('cabinet', 11, 5);
  put('plantS', 11, 5, { solid: false });

  /* --- 集中ルーム（南西）。間仕切りで囲う --- */
  for (const x of [1, 2, 3, 4]) put('partition', x, 8);
  desk(2, 11, 0);
  seat(2, 10, 'focus'); seat(3, 10, 'focus');
  put('rug', 2, 11, { solid: false });
  put('monitor', 2, 11, { solid: false });
  put('shelf', 1, 12, { rot: WEST });
  put('plant', 5, 12);
  put('note', 5, 9, { solid: false, data: { title: 'チェックインの時間' } });
  put('beanbag', 4, 12);
  put('cushion', 1, 10, { solid: false });
  put('books', 1, 11, { solid: false });

  /* --- ラウンジ（南東） --- */
  put('rug', 13, 11, { solid: false });
  put('sofa', 12, 10, { rot: 0, w: 2, d: 1 });
  put('lowTable', 13, 12, { solid: false });
  put('lamp', 15, 10);
  put('plant', 11, 12);
  put('board', 18, 11, { rot: EAST, solid: false });
  put('sign', 7, 11, { solid: false, data: { title: '案内' } });
  put('shelf', 18, 8, { rot: EAST });
  put('pendant', 13, 11, { solid: false });
  put('cushion', 15, 12, { solid: false });
  put('crate', 10, 10);
  put('lamp', 9, 12);
  put('plant', 8, 10);
  put('beanbag', 17, 10);
  put('cushion', 17, 12, { solid: false });
  put('books', 16, 12, { solid: false });
  put('plant', 16, 8);
  put('crate', 11, 8);

  return { objects, blocked };
}

const OFFICE = layout();

/** @type {Record<string, {name:string, grid:object, spawn:{x:number,y:number}}>} */
export const FLOORS = {
  office: {
    name: 'プロダクト開発の部屋',
    // ★ 中央の通路。まわりが空いていないと、入った瞬間に家具に挟まれる
    spawn: { x: 10.5, y: 6.5 },
    grid: { width: W, height: H, blocked: OFFICE.blocked },
    areas: [
      { id: 'meet',  x: 12, y: 1, w: 7, h: 6, kind: 'MEETING', name: '会議室A' },
      { id: 'focus', x: 1,  y: 9, w: 5, h: 4, kind: 'FOCUS',   name: '集中ルーム' },
    ],
    objects: OFFICE.objects,
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
