import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');
const homeSource = readFileSync(resolve(agencyRoot, 'src/routes/+page.svelte'), 'utf8');
const assetRoot = resolve(agencyRoot, 'static/images/performance-lab');
const metadataPath = resolve(
  agencyRoot,
  'content/assets/brand/agency-paper-boundary-authority-imagegen.v20260802/metadata.md'
);

const desktopAsset = 'paper-boundary-authority.webp';
const mobileAsset = 'paper-boundary-authority-mobile.webp';

test('the Boundary stage uses responsive Imagegen Paper art instead of the diagram SVG', () => {
  assert.match(homeSource, new RegExp(`/images/performance-lab/${desktopAsset}`));
  assert.match(homeSource, new RegExp(`/images/performance-lab/${mobileAsset}`));
  assert.match(homeSource, /<source\s+media="\(max-width: 640px\)"\s+srcset=/);
  assert.doesNotMatch(homeSource, /paper-boundary-study\.svg/);
  assert.ok(existsSync(resolve(assetRoot, desktopAsset)));
  assert.ok(existsSync(resolve(assetRoot, mobileAsset)));
});

test('the generated visual remains illustrative while HTML owns proof and decisions', () => {
  assert.match(homeSource, /alt="A porcelain paper decision path held at a black authority spine/);
  assert.match(homeSource, /aria-label="Workflow before and after controlled delegation"/);
  assert.match(homeSource, /aria-label="Boundary study receipt"/);
  assert.match(homeSource, /Every action leaves a record your team can review/);
});

test('the Boundary study records generation, responsive composition, rights, and hashes', () => {
  assert.ok(existsSync(metadataPath));
  const metadata = readFileSync(metadataPath, 'utf8');

  for (const required of [
    'CRE-1592',
    'boundary-authority-desktop.png',
    'boundary-authority-mobile.png',
    'OPENAI_API_KEY',
    'Mobbin comparative evidence',
    'SHA-256',
    'Rights and use',
    'Refresh condition',
    'source/prompts.md'
  ]) {
    assert.ok(metadata.includes(required), `metadata must record ${required}`);
  }

  assert.doesNotMatch(metadata, /- \[ \]/);
});
