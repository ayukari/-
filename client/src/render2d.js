/**
 * 2D 表現レイヤー — render3d.js と同じインターフェース。
 *
 * 「3D は採用するが必須にはしない」（docs/design/10-assets.md §9）の実体。
 * WebGL が無い端末・描画が重い端末はこちらで起動する。
 * 論理レイヤーは共通なので、見え方以外は何も変わらない。
 */
const TILE = 40;

export function createRenderer2D(el, world) {
  const { grid, floor } = world;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%';
  el.appendChild(cv);
  const g = cv.getContext('2d');
  let dpr = 1, cam = { x: grid.width / 2, y: grid.height / 2 };

  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const C = dark
    ? { bg: '#13171c', floor: '#4a4237', wall: '#39424d', furn: '#6b5a45', meet: '#3a2e1c', focus: '#1e2c34', ink: '#e7ebf0', pane: 'rgba(20,24,30,.82)' }
    : { bg: '#c9d2dc', floor: '#d8cdbc', wall: '#c4cbd3', furn: '#b59b78', meet: '#f2e2cb', focus: '#dce9ef', ink: '#191e25', pane: 'rgba(255,255,255,.9)' };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(el.clientWidth * dpr);
    cv.height = Math.round(el.clientHeight * dpr);
  }
  resize();

  const scale = () => TILE * dpr;
  const toScreen = (x, y) => [
    (x - cam.x) * scale() + cv.width / 2,
    (y - cam.y) * scale() + cv.height / 2,
  ];

  function render() {
    const me = world.me;
    if (me && me.x !== null) { cam.x += (me.x - cam.x) * 0.18; cam.y += (me.y - cam.y) * 0.18; }
    const s = scale();
    g.fillStyle = C.bg; g.fillRect(0, 0, cv.width, cv.height);

    const [ox, oy] = toScreen(0, 0);
    g.fillStyle = C.floor; g.fillRect(ox, oy, grid.width * s, grid.height * s);

    for (const a of floor.areas ?? []) {
      const [x, y] = toScreen(a.x, a.y);
      g.fillStyle = a.kind === 'MEETING' ? C.meet : C.focus;
      g.fillRect(x, y, a.w * s, a.h * s);
    }
    for (let x = 0; x < grid.width; x++) for (let y = 0; y < grid.height; y++) {
      if (!grid.isBlocked(x, y)) continue;
      const [sx, sy] = toScreen(x, y);
      if (sx < -s || sy < -s || sx > cv.width || sy > cv.height) continue;
      const edge = x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1;
      g.fillStyle = edge ? C.wall : C.furn;   // 壁と什器を見分けられるように（3Dと同じ区別）
      g.fillRect(sx, sy, s, s);
    }

    for (const o of floor.objects ?? []) {
      const [x, y] = toScreen(o.x + 0.5, o.y + 0.5);
      g.fillStyle = { seat: '#8a7b5e', note: '#c8873c', board: '#4f8299', sign: '#7a6fa8',
                      whiteboard: '#eef1f4', plant: '#5f8c6b' }[o.kind] ?? '#999';
      g.beginPath(); g.arc(x, y, s * 0.26, 0, Math.PI * 2); g.fill();
    }

    const reach = world.actionable()?.object;
    if (reach) {
      const [x, y] = toScreen(reach.x + 0.5, reach.y + 0.5);
      g.strokeStyle = '#c8873c'; g.lineWidth = 2.5 * dpr;
      g.beginPath(); g.arc(x, y, s * 0.42, 0, Math.PI * 2); g.stroke();
    }

    for (const a of world.actors.values()) {
      if (a.x === null) continue;
      const [x, y] = toScreen(a.x, a.y);
      g.globalAlpha = a.status === 'away' ? 0.4 : 1;
      g.fillStyle = a.color;
      g.beginPath(); g.arc(x, y, s * (a.seated ? 0.26 : 0.32), 0, Math.PI * 2); g.fill();
      // 向き
      g.strokeStyle = C.ink; g.lineWidth = 2 * dpr; g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.sin(a.dir) * s * 0.42, y + Math.cos(a.dir) * s * 0.42);
      g.stroke();
      if (a.status !== 'away') {
        g.font = `${13 * dpr}px sans-serif`;
        const w = g.measureText(a.name).width + 12 * dpr;
        g.fillStyle = C.pane;
        g.fillRect(x - w / 2, y - s * 0.95, w, 19 * dpr);
        g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(a.name, x, y - s * 0.95 + 10 * dpr);
      }
      g.globalAlpha = 1;
    }
  }

  return {
    kind: '2d',
    render, resize,
    pick(clientX, clientY) {
      const r = cv.getBoundingClientRect();
      const px = (clientX - r.left) * dpr, py = (clientY - r.top) * dpr;
      return { x: cam.x + (px - cv.width / 2) / scale(), y: cam.y + (py - cv.height / 2) / scale() };
    },
    info: () => ({ calls: 0, tris: 0 }),
    dispose() { cv.remove(); },
  };
}
