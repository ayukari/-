/** 開発用の起動口。`node src/main.js` で立ち上がる */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createGateway } from './adapters/wsServer.js';

const here = dirname(fileURLToPath(import.meta.url));
const gw = createGateway({
  clientDir: join(here, '../../client'),
  vendorDir: join(here, '../node_modules/three/build'),
  coreDir: join(here, 'core'),
});
const port = Number(process.env.PORT) || 8787;
const addr = await gw.listen(port, '127.0.0.1');
console.log(`ひだまり dev server: http://127.0.0.1:${addr.port}/`);
