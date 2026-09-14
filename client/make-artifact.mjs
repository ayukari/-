/**
 * 公開用に組み替える。
 *
 *   node client/make-artifact.mjs <出力ディレクトリ>
 *
 * 2つのことをする。
 *
 *  1. 公開プラットフォーム側が <!doctype>…<head></head><body> を被せるので、
 *     solo.html から中身だけを取り出す（画面を2箇所に書かないため、solo.html が正）。
 *  2. **.glb は配信できる形式ではない**ので、中身を base64 で1つの .js に畳む。
 *     `globalThis.__HIDAMARI_ASSET` で client/src/avatar.js に渡る。
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) throw new Error('出力ディレクトリを指定してください');
mkdirSync(join(out, 'assets'), { recursive: true });

/* ---- 1. アセットを base64 の .js に畳む ---- */
const dir = join(here, 'assets');
const names = readdirSync(dir).filter(f => f.endsWith('.glb')).sort();
const entries = names.map(n =>
  `  ${JSON.stringify(n)}: ${JSON.stringify(readFileSync(join(dir, n)).toString('base64'))}`);
const js = `/* 自動生成（client/make-artifact.mjs）。手で編集しない。
   .glb をそのまま置けない場所のために、中身を base64 で持っている */
const B64 = {
${entries.join(',\n')}
};
const buf = s => {
  const bin = atob(s), a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a.buffer;
};
const cache = new Map();
globalThis.__HIDAMARI_ASSET = name => {
  if (!B64[name]) return null;
  if (!cache.has(name)) cache.set(name, buf(B64[name]));
  return cache.get(name);
};
`;
writeFileSync(join(out, 'assets/avatars.js'), js);

/* ---- 2. index.html ---- */
const src = readFileSync(join(here, 'solo.html'), 'utf8');
const head = src.slice(src.indexOf('<title>'), src.indexOf('</head>'))
  .replace(/<link rel="icon"[^>]*>\s*/, '');           // favicon は公開時の引数で渡す
const body = src.slice(src.indexOf('<body>') + 6, src.indexOf('</body>'))
  .replace('<script type="module" src="./src/solo.js"></script>',
           '<script src="./assets/avatars.js"></script>\n'
           + '<script type="module" src="./src/solo.js"></script>');
writeFileSync(join(out, 'index.html'), head.trim() + '\n' + body.trim() + '\n');

const kb = n => (n / 1024).toFixed(0);
console.log(`${out}/index.html          ${kb(head.length + body.length)} KB`);
console.log(`${out}/assets/avatars.js   ${kb(js.length)} KB（${names.length} ファイルを畳んだ）`);
