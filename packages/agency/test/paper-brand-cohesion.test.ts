import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(agencyRoot, relativePath), 'utf8');

test('Agency opts into a visible desktop wordmark without changing Canon defaults', () => {
  const navigation = read('../canon/src/lib/components/Navigation.svelte');
  const layout = read('src/routes/+layout.svelte');

  assert.match(navigation, /showDesktopLogoText\?: boolean/);
  assert.match(navigation, /showDesktopLogoText = false/);
  assert.match(navigation, /class:nav-show-desktop-logo-text=\{showDesktopLogoText\}/);
  assert.match(navigation, /@media \(min-width: 641px\)[\s\S]*?\.nav-show-desktop-logo-text \.nav-logo-text/);
  assert.match(layout, /showDesktopLogoText=\{true\}/);
});

test('the Agency hero makes the Paper operating grammar visible without a provider logo lockup', () => {
  const home = read('src/routes/+page.svelte');
  const campaignOpening = read('../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte');

  assert.match(home, /title="Put the work on paper before you put AI to work\."/);
  assert.match(home, /#snippet ornament\(\)/);
  assert.match(home, /CS \/ OS-01/);
  assert.match(home, /Source sheet/);
  assert.match(home, /Decision boundary/);
  assert.match(home, /Proof attached/);
  assert.match(home, /Then we build the system with OpenAI and Cloudflare\./);
  assert.doesNotMatch(home, /OpenAI[^\n]{0,80}<img|Cloudflare[^\n]{0,80}<img/);
  assert.match(campaignOpening, /ornament\?: Snippet/);
  assert.match(campaignOpening, /performance-campaign-opening__ornament/);
});

test('Field Reports carries a visible attached-proof marker in its opening instead of relying on a white-on-white crop', () => {
  const reports = read('src/routes/field-reports/+page.svelte');

  assert.match(reports, /field-report-proof-marker/);
  assert.match(reports, /Receipt attached/);
  assert.match(reports, /border-left: 0\.45rem solid #708426/);
  assert.match(reports, /@media \(max-width: 640px\)[\s\S]*?top: 47%/);
});

test('the shared social preview is a current, served Paper operating-system artifact', () => {
  const svgPath = resolve(agencyRoot, 'static/og-image.svg');
  const pngPath = resolve(agencyRoot, 'static/og-image.png');
  const svg = read('static/og-image.svg');

  assert.ok(existsSync(svgPath));
  assert.ok(existsSync(pngPath));
  assert.ok(statSync(pngPath).size > 50_000, 'served raster social card should not be a placeholder');
  for (const label of [
    'OPERATING SYSTEMS',
    'FOR AI WORK',
    'MAP',
    'BUILD',
    'CONTROL',
    'SOURCE SHEET',
    'DECISION BOUNDARY',
    'ATTACHED RECEIPT',
    'SIGNAL → DECISION → PROOF'
  ]) {
    assert.ok(svg.includes(label), `social preview must include ${label}`);
  }
  assert.doesNotMatch(svg, /Agentic Systems Engineering|AI Automation • Autonomous Systems/);
});
