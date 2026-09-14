/**
 * グリッド — 盤面の規則。純粋。
 *
 * DOM も Three.js も DB も知らない（docs/design/08-extensibility.md）。
 * 当たり判定・エリア判定・オブジェクト判定はすべてタイル単位で行う
 * （docs/design/10-assets.md §5 の寸法規約と対応する）。
 */

/** @typedef {{ width:number, height:number, blocked:[number,number][] }} GridDef */
/** @typedef {{ id:string, kind:string, x:number, y:number, data?:object }} SpaceObject */
/** @typedef {{ id:string, x:number, y:number, w:number, h:number, kind:string, name:string }} Area */

export class Grid {
  /**
   * @param {GridDef} def
   * @param {{ areas?:Area[], objects?:SpaceObject[] }} [extra]
   */
  constructor(def, extra = {}) {
    this.width = def.width;
    this.height = def.height;
    this.areas = extra.areas ?? [];
    this.objects = extra.objects ?? [];

    this._blocked = new Set();
    // 外周は常に壁
    for (let x = 0; x < this.width; x++) {
      this._blocked.add(key(x, 0));
      this._blocked.add(key(x, this.height - 1));
    }
    for (let y = 0; y < this.height; y++) {
      this._blocked.add(key(0, y));
      this._blocked.add(key(this.width - 1, y));
    }
    for (const [x, y] of def.blocked ?? []) this._blocked.add(key(x, y));

    this._objectAt = new Map();
    for (const o of this.objects) this._objectAt.set(key(o.x, o.y), o);
  }

  /** 範囲外も「通行不可」として扱う */
  isBlocked(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) return true;
    return this._blocked.has(key(cx, cy));
  }

  areaAt(x, y) {
    return this.areas.find(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h) ?? null;
  }

  objectAt(x, y) {
    return this._objectAt.get(key(Math.floor(x), Math.floor(y))) ?? null;
  }

  objectById(id) {
    return this.objects.find(o => o.id === id) ?? null;
  }
}

const key = (x, y) => x + ',' + y;
