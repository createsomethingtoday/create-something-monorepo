import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { manifest } from './manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const app = dirname(here);
const lock = JSON.parse(readFileSync(join(here, 'generator-lock.json'), 'utf8'));
const mode = process.argv[2] ?? '--check';
assert.ok(['--check', '--write'].includes(mode), 'Use --check or --write');
assert.ok(lock.status === 'reviewed_upstream' && /^[a-f0-9]{40}$/.test(lock.revision ?? '') &&
  lock.revision !== lock.baselineRevision,
  'BLOCKED: pin a reviewed upstream Forge fix from CRE-186 before regeneration; the pilot patch is not a release.');
assert.equal(lock.repository, 'https://github.com/cloudflare/forge.git');
assert.match(lock.fernImageDigest, /^sha256:[a-f0-9]{64}$/);
assert.match(lock.fernGenerator, /^\d+\.\d+\.\d+$/);
assert.equal(process.version, lock.node, 'Use the pinned Node runtime');
assert.equal(execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(), lock.pnpm);
const scratchRoot = process.env.PAPERCLIP_RUN_SCRATCH_DIR ?? process.env.RUNNER_TEMP ?? process.env.FORGE_SCRATCH_DIR;
assert.ok(scratchRoot, 'Set FORGE_SCRATCH_DIR outside Paperclip/CI; receipts are retained there.');
mkdirSync(scratchRoot, { recursive: true });
const scratch = mkdtempSync(join(resolve(scratchRoot), 'scheduler-forge-'));
console.log(`Generation receipts: ${scratch}`);
const src = join(scratch, 'forge');
const env = { ...process.env, FERN_TYPESCRIPT_SHARD_COUNT: '1',
  DOCKER_DEFAULT_PLATFORM: lock.platform, TMPDIR: scratch };
function run(command, args, cwd, logName) {
  const logPath = join(scratch, logName);
  const fd = openSync(logPath, 'w');
  const result = spawnSync(command, args, { cwd, env, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${logPath}\n${readFileSync(logPath, 'utf8').slice(-4000)}`);
}
run('git', ['clone', '--no-checkout', lock.repository, src], scratch, 'clone.log');
run('git', ['checkout', '--detach', lock.revision], src, 'checkout.log');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: src, encoding: 'utf8' }).trim(), lock.revision);
run('pnpm', ['install', '--frozen-lockfile'], src, 'install.log');
const generatorPackage = join(src, 'packages/cloudflare-forge-transformer-sdk-ts');
assert.equal(JSON.parse(readFileSync(join(generatorPackage, 'package.json'), 'utf8')).dependencies['fern-api'], lock.fernCli);
const generatorConfig = readFileSync(join(src, 'packages/cloudflare-fern-config/fern/generators.yml'), 'utf8');
assert.ok(generatorConfig.includes(`version: ${lock.fernGenerator}`), 'Fern generator pin drift');
const spec = join(scratch, 'openapi.readonly.json');
run(process.execPath, ['--import', 'tsx', join(here, 'project.mjs'), spec], app, 'projection.log');
assert.equal(readFileSync(spec, 'utf8'), readFileSync(join(here, 'openapi.readonly.json'), 'utf8'), 'Projection drift: run project:public-read');
cpSync(spec, join(src, 'packages/cloudflare-fern-config/fern/openapi.json'));
cpSync(spec, join(src, 'openapi.json'));
run(process.execPath, ['--import', 'tsx', 'packages/cloudflare-forge-transformer-sdk-ts/scripts/build-package.ts'], src, 'build.log');

// Upstream wraps a version tag. Resolve that pull to the pinned digest without
// changing any generator source; the wrapper's own transformations stay upstream-owned.
const docker = execFileSync('which', ['docker'], { encoding: 'utf8' }).trim();
const sh = (value) => `'${value.replaceAll("'", "'\\''")}'`;
const image = `fernapi/fern-typescript-sdk:${lock.fernGenerator}`;
const digestImage = `fernapi/fern-typescript-sdk@${lock.fernImageDigest}`;
const bin = join(scratch, 'bin');
mkdirSync(bin);
writeFileSync(join(bin, 'docker'), `#!/bin/sh\nset -eu\nif [ "$#" = 2 ] && [ "$1" = pull ] && [ "$2" = ${sh(image)} ]; then\n  ${sh(docker)} pull --platform ${sh(lock.platform)} ${sh(digestImage)}\n  exec ${sh(docker)} tag ${sh(digestImage)} ${sh(image)}\nfi\nexec ${sh(docker)} "$@"\n`, { mode: 0o755 });
// Start from the pinned base, replacing any cached mutable wrapper for this tag.
run(docker, ['pull', '--platform', lock.platform, digestImage], src, 'image-pull.log');
run(docker, ['tag', digestImage, image], src, 'image-tag.log');
env.PATH = `${bin}:${process.env.PATH}`;
env.BASH_ENV = join(scratch, 'bash-env');
writeFileSync(env.BASH_ENV, `export PATH=${sh(env.PATH)}\nmktemp() {\n  if [ "$#" = 1 ] && [ "$1" = -d ]; then command mktemp -d ${sh(join(scratch, 'tmp.XXXXXXXX'))}; else command mktemp "$@"; fi\n}\n`);
const outputs = [join(scratch, 'first'), join(scratch, 'second')];
for (const [index, out] of outputs.entries()) {
  run(process.execPath, [join(generatorPackage, 'dist/cli.js'), spec, '--out', out], src, `generation-${index + 1}.log`);
  writeFileSync(join(scratch, `manifest-${index + 1}.json`), `${JSON.stringify(manifest(out), null, 2)}\n`);
  const map = JSON.parse(readFileSync(join(out, 'sdk/sdk-map.json'), 'utf8'));
  assert.deepEqual(Object.keys(map).sort(), ['getLink', 'listAvailability']);
  assert.deepEqual(Object.values(map).map(({ httpMethod, path }) => [httpMethod, path]), [
    ['GET', '/api/v1/links/createsomething/together'], ['GET', '/api/v1/availability']
  ]);
}
assert.deepEqual(manifest(outputs[0]), manifest(outputs[1]), 'Non-deterministic generated bytes');
run('git', ['diff', '--exit-code'], src, 'generator-source-clean.log');
const committed = join(here, 'generated');
if (mode === '--check') {
  assert.deepEqual(manifest(outputs[1]), manifest(committed), 'Generated drift: review --write output');
} else {
  rmSync(committed, { recursive: true });
  cpSync(outputs[1], committed, { recursive: true });
}
writeFileSync(join(scratch, 'receipt.json'), `${JSON.stringify({ lock, mode, sourceUnmodified: true,
  identicalGenerations: true, fileCount: manifest(outputs[1]).length }, null, 2)}\n`);
console.log(`Verified two byte-identical generations; mode=${mode}; receipts=${scratch}`);
