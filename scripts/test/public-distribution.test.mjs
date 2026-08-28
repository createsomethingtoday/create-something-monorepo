import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { assertAllowedPublicPath, assertSafePublicContent } from '../public-distribution.mjs';

const execFileAsync = promisify(execFile);
const CLI = fileURLToPath(new URL('../public-distribution.mjs', import.meta.url));
const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));

async function writeFixture(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

async function createPublicRepositoryFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'public-distribution-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const fixturePolicy = {
    schemaVersion: 1,
    id: 'fixture-public-source',
    releaseStage: 'general-availability',
    license: 'MIT',
    sourcePrice: { currency: 'USD', amount: 0 },
    managedService: {
      name: 'CREATE SOMETHING Control',
      startsAt: { currency: 'USD', amount: 900, interval: 'month' }
    },
    includeRoots: [
      'LICENSE',
      'PUBLIC_DISTRIBUTION.md',
      'config/public-distribution.v1.json',
      'packages/pi-policy-os'
    ],
    deniedSegments: ['clients', 'internal'],
    deniedBasenames: ['.env', 'credentials.json']
  };

  await writeFixture(path.join(root, 'LICENSE'), 'MIT fixture\n');
  await writeFixture(path.join(root, 'PUBLIC_DISTRIBUTION.md'), 'Source price: $0 / MIT.\n');
  await writeFixture(
    path.join(root, 'config/public-distribution.v1.json'),
    `${JSON.stringify(fixturePolicy, null, 2)}\n`
  );
  await writeFixture(
    path.join(root, 'packages/pi-policy-os/package.json'),
    `${JSON.stringify({ name: '@fixture/pi-policy-os', version: '1.0.0', license: 'MIT' })}\n`
  );
  await writeFixture(path.join(root, 'packages/pi-policy-os/README.md'), 'Public package.\n');
  await writeFixture(path.join(root, 'packages/clients/acme/private.md'), 'must not ship\n');

  await execFileAsync('git', ['init', '--quiet'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  await execFileAsync('git', ['add', '.'], { cwd: root });
  await execFileAsync('git', ['commit', '--quiet', '-m', 'fixture'], {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
      GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z'
    }
  });
  return root;
}

const policy = {
  includeRoots: ['LICENSE', 'PUBLIC_DISTRIBUTION.md', 'packages/pi-policy-os'],
  deniedSegments: ['clients', 'internal'],
  deniedBasenames: ['.env', 'credentials.json']
};

test('public distribution accepts only normalized files inside the explicit allowlist', () => {
  assert.equal(assertAllowedPublicPath('LICENSE', policy), 'LICENSE');
  assert.equal(
    assertAllowedPublicPath('packages/pi-policy-os/README.md', policy),
    'packages/pi-policy-os/README.md'
  );

  assert.throws(() => assertAllowedPublicPath('../LICENSE', policy), /normalized repository path/);
  assert.throws(
    () => assertAllowedPublicPath('packages/pi-policy-os/clients/acme.md', policy),
    /denied path segment/
  );
  assert.throws(
    () => assertAllowedPublicPath('docs/README.md', policy),
    /outside the public distribution allowlist/
  );
  assert.throws(
    () => assertAllowedPublicPath('packages/pi-policy-os/.env', policy),
    /credential-like filename/
  );
});

test('public distribution fails closed on private keys and provider credential patterns', () => {
  assert.equal(
    assertSafePublicContent('packages/pi-policy-os/README.md', 'Use TOKEN=example in tests.\n'),
    undefined
  );

  assert.throws(
    () =>
      assertSafePublicContent(
        'packages/pi-policy-os/secret.pem',
        '-----BEGIN PRIVATE KEY-----\nnot-public\n'
      ),
    /private key material/
  );
  assert.throws(
    () =>
      assertSafePublicContent(
        'packages/pi-policy-os/config.ts',
        `export const key = '${['AI', 'za', '01234567890123456789012345678901234'].join('')}';\n`
      ),
    /Google API key pattern/
  );
});

test('public distribution rejects non-text source instead of silently normalizing it', () => {
  assert.throws(
    () => assertSafePublicContent('packages/pi-policy-os/image.bin', Buffer.from([0xff, 0xfe, 0xfd])),
    /UTF-8 text source/
  );
});

test('public distribution emits the same allowlisted GA artifact and receipt at one commit', async (t) => {
  const root = await createPublicRepositoryFixture(t);
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'public-distribution-output-'));
  t.after(() => rm(outputRoot, { recursive: true, force: true }));
  const first = path.join(outputRoot, 'first.tar.gz');
  const second = path.join(outputRoot, 'second.tar.gz');

  for (const output of [first, second]) {
    await execFileAsync(
      process.execPath,
      [
        CLI,
        '--root',
        root,
        '--policy',
        'config/public-distribution.v1.json',
        '--ref',
        'HEAD',
        '--output',
        output,
        '--json'
      ],
      { cwd: root }
    );
  }

  assert.deepEqual(await readFile(first), await readFile(second));
  const { stdout: listing } = await execFileAsync('tar', ['-tzf', first]);
  const archiveEntries = listing.trim().split('\n').sort();
  assert.deepEqual(archiveEntries.filter((entry) => !entry.endsWith('/')), [
    'LICENSE',
    'PUBLIC_DISTRIBUTION.md',
    'config/public-distribution.v1.json',
    'packages/pi-policy-os/README.md',
    'packages/pi-policy-os/package.json'
  ]);
  assert.deepEqual(archiveEntries.filter((entry) => entry.endsWith('/')), [
    'config/',
    'packages/',
    'packages/pi-policy-os/'
  ]);

  const receipt = JSON.parse(await readFile(`${first}.manifest.json`, 'utf8'));
  assert.equal(receipt.license, 'MIT');
  assert.deepEqual(receipt.sourcePrice, { currency: 'USD', amount: 0 });
  assert.deepEqual(receipt.managedService.startsAt, {
    currency: 'USD',
    amount: 900,
    interval: 'month'
  });
  assert.equal(receipt.releaseStage, 'general-availability');
  assert.equal(receipt.files.length, 5);
  assert.match(await readFile(`${first}.sha256`, 'utf8'), /^[a-f0-9]{64}  first\.tar\.gz\n$/);
});

test('repository GA policy exposes only the two public Pi packages and release contract', async () => {
  const repositoryPolicy = JSON.parse(
    await readFile(path.join(REPOSITORY_ROOT, 'config/public-distribution.v1.json'), 'utf8')
  );
  assert.deepEqual(repositoryPolicy.includeRoots, [
    'LICENSE',
    'PUBLIC_DISTRIBUTION.md',
    'config/public-distribution.v1.json',
    'packages/pi-policy-os',
    'packages/pi-three-tier-framework'
  ]);
  assert.equal(repositoryPolicy.sourcePrice.amount, 0);
  assert.equal(repositoryPolicy.license, 'MIT');
  assert.equal(repositoryPolicy.managedService.startsAt.amount, 900);
  assert.equal(
    assertAllowedPublicPath('packages/pi-three-tier-framework/README.md', repositoryPolicy),
    'packages/pi-three-tier-framework/README.md'
  );
  assert.throws(
    () => assertAllowedPublicPath('packages/agency/clients/acme/README.md', repositoryPolicy),
    /denied path segment|outside the public distribution allowlist/
  );
  assert.throws(
    () => assertAllowedPublicPath('docs/internal/strategy.md', repositoryPolicy),
    /denied path segment|outside the public distribution allowlist/
  );
});
