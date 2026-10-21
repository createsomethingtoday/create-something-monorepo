import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const forbidden = ['extract-zip', 'basic-ftp', 'puppeteer'];
const dependencies = (value) => ({
  ...value.dependencies,
  ...value.devDependencies,
  ...value.optionalDependencies,
  ...value.peerDependencies,
});
function inspectNames(value) {
  for (const [name, spec] of Object.entries(dependencies(value))) {
    assert.ok(
      !forbidden.includes(name),
      `Removed dependency reintroduced: ${name}`,
    );
    assert.ok(
      !forbidden.some(
        (pkg) =>
          typeof spec === 'string' &&
          (spec === pkg ||
            spec.startsWith(`npm:${pkg}@`) ||
            spec === `npm:${pkg}`),
      ),
      `Removed dependency alias: ${name}`,
    );
  }
}
export function validateRemovalDocuments(manifest, lock) {
  assert.equal(
    manifest.dependencies?.['puppeteer-core'],
    '25.15.0',
    'Reviewed core version required',
  );
  assert.equal(
    manifest.engines?.node,
    '>=22.12.0',
    'Reviewed runtime required',
  );
  assert.equal(lock.lockfileVersion, 3, 'Complete npm lockfile required');
  assert.deepEqual(
    lock.packages?.['']?.dependencies,
    manifest.dependencies,
    'Manifest/lock dependency mismatch',
  );
  assert.deepEqual(
    lock.packages?.['']?.devDependencies,
    manifest.devDependencies,
    'Manifest/lock development dependency mismatch',
  );
  inspectNames(manifest);
  assert.ok(
    !manifest.overrides && !manifest.resolutions,
    'Unreviewed standalone override',
  );
  assert.ok(
    !manifest.bundleDependencies && !manifest.bundledDependencies,
    'Unreviewed bundled dependencies',
  );
  for (const [location, metadata] of Object.entries(lock.packages)) {
    assert.ok(
      !forbidden.includes(metadata.name),
      'Removed package identity in lockfile',
    );
    assert.ok(
      !forbidden.some(
        (name) =>
          location === `node_modules/${name}` ||
          location.endsWith(`/node_modules/${name}`),
      ),
      'Removed package path in lockfile',
    );
    inspectNames(metadata);
  }
  assert.equal(
    lock.packages['node_modules/puppeteer-core']?.version,
    '25.15.0',
  );
  assert.equal(
    lock.packages['node_modules/@puppeteer/browsers']?.version,
    '3.2.5',
  );
}
export function verifyStandaloneRemoval(installation) {
  const root = realpathSync(installation);
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const manifest = read(join(root, 'package.json'));
  const lock = read(join(root, 'package-lock.json'));
  validateRemovalDocuments(manifest, lock);
  assert.ok(
    existsSync(join(root, 'node_modules')),
    'Missing installed dependency closure',
  );
  const seen = new Set();
  function visit(candidate) {
    const location = realpathSync(candidate);
    const local = relative(root, location);
    assert.ok(
      local &&
        !local.startsWith(`..${sep}`) &&
        local !== '..' &&
        !local.startsWith(sep),
      'Dependency escapes isolated installation',
    );
    if (seen.has(location)) return;
    const metadata = read(join(location, 'package.json'));
    assert.equal(
      typeof metadata.name,
      'string',
      'Missing installed package identity',
    );
    assert.ok(
      !forbidden.includes(metadata.name),
      `Removed installed dependency: ${metadata.name}`,
    );
    const locked = lock.packages[local.split(sep).join('/')];
    assert.ok(
      locked && locked.version === metadata.version,
      `Unrecorded or mismatched installed package: ${local}`,
    );
    // Published packages may describe upstream development tools that npm does not install.
    // Inspect runtime declarations here; any physically installed package is still scanned.
    inspectNames({ ...metadata, devDependencies: undefined });
    seen.add(location);
    // Every required runtime dependency must resolve inside this isolated tree.
    for (const name of Object.keys(metadata.dependencies || {})) {
      if (metadata.optionalDependencies?.[name]) continue;
      resolveDependency(location, name);
    }
    scan(join(location, 'node_modules'));
  }
  function resolveDependency(from, name) {
    assert.match(
      name,
      /^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/,
      'Invalid dependency name',
    );
    let current = from;
    while (current === root || current.startsWith(root + sep)) {
      const candidate = join(current, 'node_modules', name);
      if (existsSync(join(candidate, 'package.json'))) {
        visit(candidate);
        return;
      }
      if (current === root) break;
      current = resolve(current, '..');
    }
    throw new Error(`Missing resolved dependency: ${name}`);
  }
  function scan(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.bin' || entry.name === '.package-lock.json')
        continue;
      const candidate = join(dir, entry.name);
      if (entry.name.startsWith('@')) {
        for (const child of readdirSync(candidate))
          visit(join(candidate, child));
      } else if (!entry.name.startsWith('.')) visit(candidate);
    }
  }
  scan(join(root, 'node_modules'));
  for (const name of Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  }))
    resolveDependency(root, name);
  assert.ok(seen.size > 0, 'Empty installed closure');
  return {
    mode: 'dependency-removed',
    packagesChecked: seen.size,
    absent: forbidden,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert.ok(process.argv[2], 'Explicit standalone install required');
  console.log(JSON.stringify(verifyStandaloneRemoval(process.argv[2])));
}
