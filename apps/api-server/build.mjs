import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(__dirname, 'dist/index.mjs'),
  packages: 'external',
  alias: {
    '@dropline/db': path.join(root, 'packages/db/src/index.ts'),
  },
});

const rootsSrc = path.join(__dirname, 'src/lib/apple-roots');
const rootsDest = path.join(__dirname, 'dist/apple-roots');
if (fs.existsSync(rootsSrc)) {
  fs.rmSync(rootsDest, { recursive: true, force: true });
  fs.cpSync(rootsSrc, rootsDest, { recursive: true });
}

console.log('API build complete');
