const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || 'zip';
const root = path.resolve(__dirname, '..');
const outDir = path.resolve(root, '..');
const name = 'dropline-method-3-app-clean';
const exclusions = [
  'node_modules',
  'dist',
  '.git',
  '.env',
  '.DS_Store',
  'npm-debug.log'
];

function hasExcluded(filePath) {
  return exclusions.some(item => filePath.split(path.sep).includes(item));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    const absolute = path.join(dir, entry);
    if (hasExcluded(absolute)) continue;
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) walk(absolute, files);
    else files.push(path.relative(root, absolute));
  }
  return files;
}

const files = walk(root);

if (mode === 'tar') {
  execFileSync('tar', ['-czf', path.join(outDir, `${name}.tar.gz`), ...files], { cwd: root, stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', path.join(outDir, `${name}.zip`), ...files], { cwd: root, stdio: 'inherit' });
}
