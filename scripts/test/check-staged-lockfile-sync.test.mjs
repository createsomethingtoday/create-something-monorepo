import test from 'node:test';
import assert from 'node:assert/strict';

import { manifestsRequireLockfileUpdate } from '../check-staged-lockfile-sync.mjs';

test('ignores metadata-only package.json edits', () => {
  const previousText = JSON.stringify({
    name: '@create-something/example',
    version: '1.0.0',
    scripts: { check: 'vitest run' },
  });
  const nextText = JSON.stringify({
    name: '@create-something/example',
    version: '1.0.1',
    scripts: { check: 'vitest run', lint: 'eslint .' },
  });

  assert.equal(manifestsRequireLockfileUpdate('packages/example/package.json', previousText, nextText), false);
});

test('flags dependency changes in workspace manifests', () => {
  const previousText = JSON.stringify({
    name: '@create-something/example',
    devDependencies: {},
  });
  const nextText = JSON.stringify({
    name: '@create-something/example',
    devDependencies: {
      wrangler: '^4.64.0',
    },
  });

  assert.equal(manifestsRequireLockfileUpdate('packages/example/package.json', previousText, nextText), true);
});

test('flags root pnpm override changes', () => {
  const previousText = JSON.stringify({
    name: '@create-something/monorepo',
    pnpm: {
      overrides: {
        undici: '>=7.18.2',
      },
    },
  });
  const nextText = JSON.stringify({
    name: '@create-something/monorepo',
    pnpm: {
      overrides: {
        undici: '>=7.20.0',
      },
    },
  });

  assert.equal(manifestsRequireLockfileUpdate('package.json', previousText, nextText), true);
});

test('ignores new package manifests without dependency-relevant fields', () => {
  const nextText = JSON.stringify({
    name: '@create-something/example',
    version: '1.0.0',
    scripts: { check: 'tsc --noEmit' },
  });

  assert.equal(manifestsRequireLockfileUpdate('packages/example/package.json', null, nextText), false);
});

test('flags new package manifests with dependencies', () => {
  const nextText = JSON.stringify({
    name: '@create-something/example',
    dependencies: {
      zod: '^3.23.0',
    },
  });

  assert.equal(manifestsRequireLockfileUpdate('packages/example/package.json', null, nextText), true);
});
