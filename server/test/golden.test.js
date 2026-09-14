/**
 * 移動の規則の「正解表」— shared/golden/movement.json
 *
 * ★ この表は Unity（C#）版のためにある。
 *   いまサーバとブラウザは core/movement.js を**同じファイル**として読んでいるので、
 *   規則はこの世に1つしかない（04 §4.5）。C# はそれを読めないので書き写すことになり、
 *   規則が2つになる。2つになると、予測と権威がずれて引き戻しが常態化する。
 *
 *   書き写しは避けられないので、代わりに**入出力を固定**する。
 *   JS 側（このテスト）と C# 側の両方が同じ表と一致していれば、
 *   どちらかを触って挙動が変わった時点で落ちる。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Grid } from '../src/core/grid.js';
import { SPEED, TOLERANCE, resolveMove, isReachable } from '../src/core/movement.js';

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(
  readFileSync(join(here, '../../shared/golden/movement.json'), 'utf8'));

const r6 = v => Math.round(v * 1e6) / 1e6;
/** JSON に NaN / Infinity は書けないので文字列で持っている */
const num = v => (typeof v === 'string' ? Number(v) : v);

test('速度と許容の定数が表と一致する', () => {
  assert.equal(SPEED, golden.speed);
  assert.equal(TOLERANCE, golden.tolerance);
});

test('表に載っているケースがすべて一致する', () => {
  const grid = new Grid(golden.grid);
  assert.ok(golden.moves.length >= 15, '表が薄すぎる');
  for (const c of golden.moves) {
    const got = resolveMove(grid, { x: c.in.x, y: c.in.y, dir: 0 },
                            num(c.in.dx), num(c.in.dy), c.in.dt);
    const label = `dx=${c.in.dx} dy=${c.in.dy} dt=${c.in.dt} @(${c.in.x},${c.in.y})`;
    assert.deepEqual(
      { x: r6(got.x), y: r6(got.y), dir: r6(got.dir), moved: got.moved, clamped: got.clamped },
      c.out, label);
  }
});

test('到達可能判定も表と一致する', () => {
  for (const c of golden.reachable) {
    const got = isReachable({ x: c.in.prev[0], y: c.in.prev[1] },
                            { x: c.in.next[0], y: c.in.next[1] }, c.in.dt);
    assert.equal(got, c.out, `prev=${c.in.prev} next=${c.in.next} dt=${c.in.dt}`);
  }
});

test('表は壁ずりと入力の丸めを必ず含む（薄い表は見張りにならない）', () => {
  const clamped = golden.moves.filter(m => m.out.clamped);
  assert.ok(clamped.length >= 3, '壁に当たるケースが足りない');
  const still = golden.moves.filter(m => !m.out.moved);
  assert.ok(still.length >= 3, '動かないケース（0入力・0秒・壊れた入力）が足りない');
  const broken = golden.moves.filter(m => typeof m.in.dx === 'string' || typeof m.in.dy === 'string');
  assert.ok(broken.length >= 2, 'NaN / Infinity のケースが無い');
});
