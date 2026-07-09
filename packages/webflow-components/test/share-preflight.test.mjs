import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  evaluatePreflight,
  parseAheadBehind,
  parseArgs,
  parseGitPorcelain,
  relevantDirtyEntries,
} from '../scripts/share-preflight.mjs';

test('parseArgs tolerates pnpm argument separator', () => {
  const originalAllowDirty = process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY;
  delete process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY;

  assert.deepEqual(parseArgs(['node', 'script', '--', '--manifest', 'webflow.cato.json', '--no-fetch']), {
    approvalEnv: 'WEBFLOW_LIBRARY_SHARE_APPROVED',
    allowDirty: false,
    fetch: false,
    manifest: 'webflow.cato.json',
    json: false,
  });

  process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY = originalAllowDirty ?? '';
  if (originalAllowDirty === undefined) delete process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY;
});

test('parseArgs supports env-based dirty override for package share scripts', () => {
  const originalAllowDirty = process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY;
  process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY = '1';

  try {
    assert.equal(parseArgs(['node', 'script']).allowDirty, true);
  } finally {
    process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY = originalAllowDirty ?? '';
    if (originalAllowDirty === undefined) delete process.env.WEBFLOW_LIBRARY_SHARE_ALLOW_DIRTY;
  }
});

test('parseAheadBehind reads git left-right counts', () => {
  assert.deepEqual(parseAheadBehind('2\t3\n'), { ahead: 2, behind: 3 });
  assert.deepEqual(parseAheadBehind('0 0'), { ahead: 0, behind: 0 });
});

test('relevantDirtyEntries filters package share-risk files', () => {
  const entries = parseGitPorcelain(
    [
      ' M packages/webflow-components/src/components/Button.tsx',
      ' M packages/webflow-components/README.md',
      ' M docs/guides/WEBFLOW_EXPORT_FIRST_AGENT_WORKFLOW.md',
      '?? packages/webflow-components/scripts/share-preflight.mjs',
    ].join('\n'),
  );

  assert.deepEqual(
    relevantDirtyEntries(entries).map((entry) => entry.path),
    [
      'packages/webflow-components/src/components/Button.tsx',
      'packages/webflow-components/README.md',
      'packages/webflow-components/scripts/share-preflight.mjs',
    ],
  );
});

test('evaluatePreflight fails closed without approval, upstream, and clean relevant files', () => {
  const result = evaluatePreflight({
    approvalValue: undefined,
    dirtyEntries: [{ raw: ' M packages/webflow-components/src/components/Button.tsx' }],
    divergence: { ahead: 0, behind: 2 },
    upstream: '',
    allowDirty: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 4);
  assert.match(result.failures.join('\n'), /WEBFLOW_LIBRARY_SHARE_APPROVED=1/);
  assert.match(result.failures.join('\n'), /No upstream branch/);
  assert.match(result.failures.join('\n'), /behind upstream by 2/);
  assert.match(result.failures.join('\n'), /Relevant package files are dirty/);
});

test('evaluatePreflight permits explicitly approved scoped dirty share with warning', () => {
  const result = evaluatePreflight({
    approvalValue: '1',
    dirtyEntries: [{ raw: ' M packages/webflow-components/README.md' }],
    divergence: { ahead: 1, behind: 0 },
    upstream: 'origin/main',
    allowDirty: true,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.warnings.length, 2);
});
