import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareMotion } from './prepare-motion.mjs';

test('offline motion vendor is reproducible from the pinned official package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-motion-'));
  try {
    const first = await prepareMotion({ outputRoot: root });
    const code = await readFile(first.vendorPath, 'utf8');
    assert.equal(first.version, '3.15.1');
    assert.ok(code.startsWith('/* GiGi local GSAP vendor'));
    assert.match(code, /CSSPlugin/);
    assert.match(code, /gsap\.com\/standard-license/);
    assert.doesNotMatch(code, /(?:import\s*\(|from\s*)["']https?:/);
    await prepareMotion({ outputRoot: root });
    assert.equal(await readFile(first.vendorPath, 'utf8'), code);
    const { gsap } = await import(first.vendorPath);
    assert.equal(gsap.version, first.version);
    const value = { x: 0 };
    gsap.to(value, { x: 20, duration: 1, paused: true }).progress(1);
    assert.equal(value.x, 20);
    await prepareMotion({ outputRoot: root, check: true });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('stale or missing vendor output fails the packaging check', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gigi-motion-missing-'));
  try { await assert.rejects(prepareMotion({ outputRoot: root, check: true }), /motion vendor|GSAP vendor/); }
  finally { await rm(root, { recursive: true, force: true }); }
});
