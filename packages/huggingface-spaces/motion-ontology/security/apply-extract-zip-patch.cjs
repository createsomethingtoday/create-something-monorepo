// Apply the same reviewed patch used by root pnpm to standalone npm installs.
// npm install MUST use --ignore-scripts so acquisition cannot run before patching.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const hashes = require('./extract-zip-hashes.json');
const patch = path.join(__dirname, 'extract-zip@2.0.1.patch');
const digest = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function apply(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (manifest.name !== 'extract-zip' || manifest.version !== '2.0.1') {
    throw new Error(`Unreviewed extractor version at ${directory}`);
  }
  const entry = path.join(directory, 'index.js');
  const entryStat = fs.lstatSync(entry);
  if (!entryStat.isFile() || entryStat.nlink !== 1) throw new Error(`Linked extractor source at ${directory}`);
  const before = digest(entry);
  if (before === hashes.patched) return;
  if (before !== hashes.upstream) throw new Error(`Unreviewed extractor content at ${directory}`);
  execFileSync('patch', ['--batch', '--fuzz=0', '-p1', '-i', patch], { cwd: directory });
  if (digest(entry) !== hashes.patched) throw new Error(`Extractor patch verification failed at ${directory}`);
}

function applyTree(modules) {
  let count = 0;
  function inspectPackage(directory, entry) {
    const child = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Linked dependency directory: ${child}`);
    if (!entry.isDirectory()) return;
    if (entry.name === 'extract-zip') {
      apply(child);
      count++;
    }
    const nested = path.join(child, 'node_modules');
    if (fs.existsSync(nested)) {
      if (fs.lstatSync(nested).isSymbolicLink()) throw new Error(`Linked node_modules: ${nested}`);
      walk(nested);
    }
  }
  function walk(directory) {
    // Standalone npm creates real directories. Never traverse pnpm/store links
    // or any link that could mutate files outside this installation.
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue; // npm .bin links are executable shims.
      if (entry.name.startsWith('@')) {
        const scope = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`Linked dependency scope: ${scope}`);
        for (const pkg of fs.readdirSync(scope, { withFileTypes: true })) inspectPackage(scope, pkg);
      } else {
        inspectPackage(directory, entry);
      }
    }
  }
  if (fs.lstatSync(modules).isSymbolicLink()) throw new Error('Expected standalone npm node_modules');
  walk(modules);
  if (count === 0) throw new Error('No extractor found; review the dependency graph before changing this guard');
  return count;
}

if (require.main === module) {
  console.log(`Verified ${applyTree(path.resolve(process.argv[2] || 'node_modules'))} patched extractor(s).`);
}
module.exports = { apply, applyTree };
