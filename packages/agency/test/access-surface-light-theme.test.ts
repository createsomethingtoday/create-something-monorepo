import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const accessComponentPaths = [
  '../src/lib/components/access/CredentialMatrix.svelte',
  '../src/lib/components/access/FactList.svelte',
  '../src/lib/components/access/ProspectWorkspaceSection.svelte',
  '../src/lib/components/access/ReportSection.svelte',
  '../src/lib/components/access/ReportShell.svelte',
  '../src/lib/components/access/SummaryItem.svelte'
];

test('access reports use the shared light operational surface instead of dark-surface foregrounds', () => {
  const sources = accessComponentPaths.map((path) =>
    readFileSync(new URL(path, import.meta.url), 'utf8')
  );
  const shell = sources.find((source) => source.includes('class="report-shell')) ?? '';

  assert.match(shell, /class="report-shell property-performance"/);
  for (const source of sources) {
    assert.doesNotMatch(source, /rgba\(255,\s*255,\s*255/);
    assert.doesNotMatch(source, /--color-performance-fg-/);
  }
});

test('dashboard leads with the live access decision and describes a policy-only acceptance action', () => {
  const source = readFileSync(
    new URL('../src/routes/dashboard/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(
    source,
    /title={data\.overview\.accessAllowed \? 'Access active' : 'Access blocked'}/
  );
  assert.match(
    source,
    /This records policy acceptance only\.\s+It does not change commercial, membership, or credential status\./
  );
  assert.match(source, /href="\/bearer-token-policy"/);
});
