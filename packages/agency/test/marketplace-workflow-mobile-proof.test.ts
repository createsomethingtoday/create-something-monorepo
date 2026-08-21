import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(
  new URL('../src/routes/proof/marketplace-workflow/+page.svelte', import.meta.url),
  'utf8'
);
const narrativeStage = readFileSync(
  new URL(
    '../../canon/src/lib/components/performance/PerformanceNarrativeStage.svelte',
    import.meta.url
  ),
  'utf8'
);

test('previews deterministic acceptance proof before the interactive story without duplicating it', () => {
  assert.match(
    route,
    /<PerformanceNarrativeStage[\s\S]*?\{#snippet preview\(\)\}[\s\S]*?<PerformanceProofStrip[\s\S]*?items=\{acceptanceProof\}[\s\S]*?ariaLabel="Workflow compiler acceptance evidence"/
  );
  assert.equal(
    (route.match(/<PerformanceProofStrip/g) ?? []).length,
    1,
    'the acceptance metric strip should appear once before interaction'
  );
  assert.match(route, /scene\.id === 'receipt'[\s\S]*?class="acceptance-receipt"/);
  assert.match(
    route,
    /Representative fixture evidence\. No client outcome or production execution is claimed\./
  );
});

test('starts mobile proof at the top and keeps narrow scene labels intact', () => {
  assert.match(
    narrativeStage,
    /\.performance-narrative-stage\s*\{[^}]*scroll-margin-top:\s*var\(\s*--distance-performance-stage-anchor-offset/s
  );
  assert.match(
    narrativeStage,
    /@media \(max-width: 63\.99rem\)[\s\S]*?\.performance-narrative-stage__panel\s*\{[^}]*align-content:\s*start;[^}]*min-height:\s*auto;/
  );
  assert.match(
    narrativeStage,
    /@media \(max-width: 25rem\)[\s\S]*?\.performance-narrative-stage__index\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/
  );
});
