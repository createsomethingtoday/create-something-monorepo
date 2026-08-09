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

test('the Agency hero makes the Playbook operating grammar visible without a provider logo lockup', () => {
  const home = read('src/routes/+page.svelte');
  const campaignOpening = read('../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte');
  const field = read('src/lib/components/PlaybookField.svelte');

  assert.match(home, /title="Your people and AI need the same playbook\."/);
  assert.match(home, /#snippet artifact\(\)/);
  assert.match(home, /<PlaybookField variant="home"/);
  assert.match(home, /client-owned Playbook/);
  assert.match(home, /Offense advances approved work/);
  assert.match(home, /Defense protects decisions, proof, and recovery/);
  assert.doesNotMatch(home, /OpenAI[^\n]{0,80}<img|Cloudflare[^\n]{0,80}<img/);
  assert.match(campaignOpening, /media\?: PerformanceCampaignMedia/);
  assert.match(field, /O = owner/);
  assert.match(field, /X = opposition/);
});

test('Field Reports carries an attached-proof Playbook field instead of relying on a crop', () => {
  const reports = read('src/routes/field-reports/+page.svelte');
  const field = read('src/lib/components/PlaybookField.svelte');

  assert.match(reports, /<PlaybookField variant="proof"/);
  assert.match(reports, /Review the film\. Improve the playbook\./);
  assert.match(field, /Receipt attached/);
  assert.match(field, /@media \(max-width: 47\.99rem\)/);
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
