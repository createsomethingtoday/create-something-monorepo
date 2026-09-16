import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'marketing-screenshot-image.mjs');

function runCli(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
}

async function createFixture(directory) {
  const fixture = path.join(directory, 'provider-results.png');
  await sharp({
    create: {
      width: 100,
      height: 80,
      channels: 4,
      background: '#334455'
    }
  })
    .png()
    .toFile(fixture);
  return fixture;
}

test('fails closed when screenshot evidence has no redaction declaration', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-screenshot-'));
  const fixture = await createFixture(directory);
  const result = runCli('--input', fixture, '--output-dir', directory, '--slug', 'unsafe');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /redact/i);
});

test('creates a redacted source, LinkedIn composite, and provenance manifest', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-screenshot-'));
  const fixture = await createFixture(directory);
  const result = runCli(
    '--',
    '--input',
    fixture,
    '--background',
    fixture,
    '--output-dir',
    directory,
    '--slug',
    'npg-coverage',
    '--redact',
    '0.2,0.2,0.4,0.4',
    '--headline',
    'Find the market before you recruit it.',
    '--dek',
    'Nationwide provider coverage with verification gates.',
    '--proof',
    '1,111 coverage candidates',
    '--proof',
    'Weekly source refresh',
    '--owner',
    'CREATE SOMETHING',
    '--review-status',
    'approved',
    '--rights-note',
    'Operator-captured product evidence.',
    '--source-url',
    'https://udify.app/agent/example',
    '--checked-date',
    '2026-09-04',
    '--refresh-due',
    '2026-09-11'
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.surface, 'linkedin');

  const redactedPath = path.join(directory, 'npg-coverage-redacted.png');
  const compositePath = path.join(directory, 'npg-coverage-linkedin.png');
  const manifestPath = path.join(directory, 'npg-coverage-manifest.json');

  const redacted = sharp(redactedPath);
  const redactedMetadata = await redacted.metadata();
  assert.deepEqual(
    { width: redactedMetadata.width, height: redactedMetadata.height },
    { width: 100, height: 80 }
  );

  const outside = await redacted
    .clone()
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.deepEqual([...outside.slice(0, 3)], [51, 68, 85]);

  const inside = await redacted
    .clone()
    .extract({ left: 30, top: 25, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.notDeepEqual([...inside.slice(0, 3)], [51, 68, 85]);

  const compositeMetadata = await sharp(compositePath).metadata();
  assert.deepEqual(
    { width: compositeMetadata.width, height: compositeMetadata.height },
    { width: 1080, height: 1350 }
  );

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.source.file, 'provider-results.png');
  assert.match(manifest.source.sha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.outputs.linkedin.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.redactions.length, 1);
  assert.equal(manifest.owner, 'CREATE SOMETHING');
  assert.equal(manifest.reviewStatus, 'approved');
  assert.equal(manifest.generatedImage, false);
  assert.deepEqual(manifest.provenance, {
    sourceUrl: 'https://udify.app/agent/example',
    checkedDate: '2026-09-04',
    refreshDue: '2026-09-11'
  });
});
