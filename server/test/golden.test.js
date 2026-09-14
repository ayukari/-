/**
 * 移動の規則の「正解表」— shared/golden/movement.tsv
 *
 * ★ この表は Unity（C#）版のためにある。
 *   いまサーバとブラウザは core/movement.js を**同じファイル**として読んでいるので、
 *   規則はこの世に1つしかない（04 §4.5.1）。C# はそれを読めないので書き写すことになり、
 *   規則が2つになる。2つになると、予測と権威がずれて引き戻しが常態化する。
 *
 *   書き写しは避けられないので、代わりに**入出力を固定**する。
 *   JS 側（このテスト）と C# 側（unity/Tests.Headless と EditMode テスト）の両方が
 *   同じ表と一致していれば、どちらかを触って挙動が変わった時点で落ちる。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Grid } from '../src/core/grid.js';
import { SPEED, TOLERANCE, resolveMove, isReachable } from '../src/core/movement.js';

const here = dirname(fileURLToPath(import.meta.url));
const rows = readFileSync(join(here, '../../shared/golden/movement.tsv'), 'utf8')
  .split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));

/** 表の綴りを数に戻す。NaN / Infinity はそのまま書けないので語で持っている */
const n = s => (s === 'nan' ? NaN : s === 'inf' ? Infinity : s === '-inf' ? -Infinity : Number(s));
const r6 = v => Math.round(v * 1e6) / 1e6;
const one = k => rows.find(r => r[0] === k);
const all = k => rows.filter(r => r[0] === k);

const grid = new Grid({
  width: Number(one('grid')[1]), height: Number(one('grid')[2]),
  blocked: all('blocked').map(r => [Number(r[1]), Number(r[2])]),
});

test('速度と許容の定数が表と一致する', () => {
  assert.equal(SPEED, Number(one('speed')[1]));
  assert.equal(TOLERANCE, Number(one('tolerance')[1]));
});

test('表に載っている移動がすべて一致する', () => {
  const moves = all('move');
  assert.ok(moves.length >= 15, '表が薄すぎる');
  for (const [, x, y, dx, dy, dt, ox, oy, odir, moved, clamped] of moves) {
    const g = resolveMove(grid, { x: Number(x), y: Number(y), dir: 0 }, n(dx), n(dy), Number(dt));
    const label = `dx=${dx} dy=${dy} dt=${dt} @(${x},${y})`;
    assert.deepEqual(
      [r6(g.x), r6(g.y), r6(g.dir), g.moved ? '1' : '0', g.clamped ? '1' : '0'],
      [Number(ox), Number(oy), Number(odir), moved, clamped], label);
  }
});

test('到達可能判定も表と一致する', () => {
  for (const [, px, py, nx, ny, dt, ok] of all('reach')) {
    const got = isReachable({ x: Number(px), y: Number(py) },
                            { x: Number(nx), y: Number(ny) }, Number(dt));
    assert.equal(got ? '1' : '0', ok, `prev=(${px},${py}) next=(${nx},${ny}) dt=${dt}`);
  }
});

test('表は壁ずりと壊れた入力を必ず含む（薄い表は見張りにならない）', () => {
  const moves = all('move');
  assert.ok(moves.filter(m => m[10] === '1').length >= 3, '壁に当たるケースが足りない');
  assert.ok(moves.filter(m => m[9] === '0').length >= 4,
            '動かないケース（0入力・0秒・壊れた入力）が足りない');
  assert.ok(moves.filter(m => ['nan', 'inf', '-inf'].includes(m[3]) ||
                              ['nan', 'inf', '-inf'].includes(m[4])).length >= 3,
            'NaN / Infinity のケースが足りない');
});
