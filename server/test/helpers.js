import { Grid } from '../src/core/grid.js';

/** テスト用の小さなフロア。10×8、中央に机、その四方に席 */
export function makeGrid() {
  return new Grid(
    { width: 10, height: 8, blocked: [[4, 3], [5, 3]] },   // 机2タイル
    {
      areas: [{ id: 'meet', x: 7, y: 1, w: 2, h: 3, kind: 'MEETING', name: '会議室' }],
      objects: [
        { id: 's1', kind: 'seat', x: 3, y: 3, data: { table: 't1' } },
        { id: 's2', kind: 'seat', x: 6, y: 3, data: { table: 't1' } },
        { id: 's3', kind: 'seat', x: 4, y: 2, data: { table: 't1' } },
        { id: 'note', kind: 'note', x: 1, y: 6, data: {} },
      ],
    }
  );
}

export const at = (x, y) => ({ x, y, dir: 0 });
