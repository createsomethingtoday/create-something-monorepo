#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'config/canon-character-retirement.v1.json'), 'utf8'));
const hashes = new Set(manifest.retired.map(({ sha256 }) => sha256));
const retiredPaths = new Set(manifest.retired.map(({ path }) => path));
const args = process.argv.slice(2);
const artifactIndex = args.indexOf('--artifact');
if (args.length && (artifactIndex !== 0 || args.length !== 2 || !args[1])) {
  throw new Error('Usage: node scripts/check-canon-character-retirement.mjs [--artifact <directory>]');
}
const artifact = artifactIndex >= 0 ? resolve(args[artifactIndex + 1] || '') : null;
const files = [];
if (artifact) {
  if (!existsSync(artifact)) throw new Error(`Missing deployable artifact: ${artifact}`);
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  walk(artifact);
} else {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const path of tracked) {
    if (/^packages\/[^/]+\/static\//.test(path) && existsSync(join(root, path))) files.push(join(root, path));
  }
}
const findings = [];
for (const path of files) {
  const localPath = relative(root, path);
  if (!artifact && retiredPaths.has(localPath)) findings.push({ path: localPath, reason: 'retired public asset path remains' });
  if (/\.(webp|png|jpe?g|gif|mp4|webm)$/i.test(path)) {
    const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (hashes.has(hash)) findings.push({ path: artifact ? relative(artifact, path) : localPath, reason: 'legacy character bytes remain' });
  }
}
console.log(JSON.stringify({ scope: artifact || 'Git-tracked website static assets', retiredAssets: manifest.retired.length, scannedFiles: files.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;
