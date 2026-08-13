import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const pagePath = new URL('../src/routes/papers/threshold-dwelling/+page.svelte', import.meta.url);
const experimentDirectory = new URL(
  '../../canon/src/lib/experiments/threshold-dwelling/',
  import.meta.url
);

const pageSource = readFileSync(pagePath, 'utf8');
const floorPlanSource = readFileSync(
  new URL('../../canon/src/lib/experiments/threshold-dwelling/FloorPlan.svelte', import.meta.url),
  'utf8'
);
const experimentSource = readdirSync(experimentDirectory)
  .filter((file) => file.endsWith('.svelte'))
  .map((file) => readFileSync(join(experimentDirectory.pathname, file), 'utf8'))
  .join('\n');

test('Threshold Dwelling resolves every architectural variable through its Performance surface', () => {
  const referencedTokens = new Set(
    [...`${pageSource}\n${experimentSource}`.matchAll(/var\((--arch-[A-Za-z0-9-]+)/g)].map(
      (match) => match[1]
    )
  );
  const definitions = new Map(
    [...pageSource.matchAll(/^\s*(--arch-[A-Za-z0-9-]+):\s*([^;]+);/gm)].map((match) => [
      match[1],
      match[2].trim()
    ])
  );
  const missingTokens = [...referencedTokens].filter((token) => !definitions.has(token)).sort();

  assert.deepEqual(missingTokens, []);
  assert.match(pageSource, /background:\s*var\(--color-performance-paper\)/);
  assert.match(pageSource, /color:\s*var\(--color-performance-ink\)/);
  assert.match(pageSource, /font-family:\s*var\(--font-performance-display\)/);
  assert.match(pageSource, /getPropertyValue\('--color-performance-panel'\)/);
  assert.doesNotMatch(pageSource, /ctx\.fillStyle\s*=\s*['"]#000000['"]/);

  for (const [token, value] of definitions) {
    if (/^(?:transparent|\d+(?:\.\d+)?)$/.test(value)) continue;
    assert.match(
      value,
      /--color-performance-/,
      `${token} must derive from the current Performance color contract`
    );
  }
});

test('Threshold Dwelling presents the Canon-owned aligned construction allowance', () => {
  assert.match(pageSource, /THRESHOLD_DWELLING_DESIGN/);
  assert.doesNotMatch(pageSource, /\n\s+materials:\s*\{/);
  assert.doesNotMatch(pageSource, /const materialPalette\s*:/);
  assert.doesNotMatch(
    pageSource,
    /Texas Gulf Coast|Post-tensioned slab|Cedar board & batten|Cedar decking|Native Ashe Juniper throughout/
  );
  assert.match(pageSource, />Base construction</);
  assert.match(pageSource, />Design contingency</);
  assert.match(pageSource, />Working construction allowance</);
  assert.match(pageSource, /Base \{formatCurrency\(baseCostPerSF\)\}\/SF/);
  assert.match(pageSource, /With contingency \{formatCurrency\(/);
  assert.match(pageSource, />Material distribution</);
  assert.match(pageSource, />Excluded owner costs</);
});

test('Threshold Dwelling exposes build quantities and unit-rate cost drivers', () => {
  assert.match(pageSource, />Build & layout basis</);
  assert.match(pageSource, /buildMetrics\.conditionedFloorAreaSF/);
  assert.match(pageSource, /buildMetrics\.grossExteriorWallAreaSF/);
  assert.match(pageSource, /buildMetrics\.glazingAreaSF/);
  assert.match(pageSource, /buildMetrics\.roofAreaSF/);
  assert.match(pageSource, /item\.quantity/);
  assert.match(pageSource, /item\.unitRate/);
  assert.match(pageSource, /Planning allowance/);
});

test('Threshold Dwelling presents the approved 10 by 27 foot east projection consistently', () => {
  assert.match(pageSource, /overhang\(65, 13, 10, 14, 'Covered\\nEntry'\)/);
  assert.match(pageSource, /overhang\(65, 13, 10, 14, 'Entry'\)/);
  assert.match(pageSource, /entry:\s*\{ x: 75, y: 16 \}/);
  assert.doesNotMatch(pageSource, /overhang\(65, 13, 8, 14/);
});

test('Threshold Dwelling keeps interactive diagrams outside fullscreen trigger buttons', () => {
  for (const component of ['LightStudy', 'Circulation', 'DailyRhythm']) {
    assert.match(
      pageSource,
      new RegExp(
        `<div class="interactive-view">\\s*<${component}[^>]*\\/>[\\s\\S]*?class="interactive-expand-control"`
      ),
      `${component} must sit beside its fullscreen control`
    );
  }

  assert.equal((pageSource.match(/class="interactive-expand-control"/g) ?? []).length, 3);
});

test('FloorPlan derives its scale bar from the reactive SVG height', () => {
  assert.match(floorPlanSource, /\$:\s*scaleBarY\s*=\s*svgHeight\s*-\s*10/);
  assert.doesNotMatch(floorPlanSource, /const\s+scaleBarY\s*=\s*svgHeight/);
});
