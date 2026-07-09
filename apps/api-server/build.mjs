import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

// Bundle app + deps into one file so Render start does not depend on
// node_modules layout / cwd. Keep only packages that break when bundled.
await esbuild.build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(__dirname, 'dist/index.mjs'),
  alias: {
    '@dropline/db': path.join(root, 'packages/db/src/index.ts'),
  },
  // Native / dynamic-require packages stay external
  external: [
    '@apple/app-store-server-library',
  ],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
});

const rootsSrc = path.join(__dirname, 'src/lib/apple-roots');
const rootsDest = path.join(__dirname, 'dist/apple-roots');
if (fs.existsSync(rootsSrc)) {
  fs.rmSync(rootsDest, { recursive: true, force: true });
  fs.cpSync(rootsSrc, rootsDest, { recursive: true });
}

console.log('API build complete');
