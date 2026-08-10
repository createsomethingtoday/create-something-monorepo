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
  assert.match(
    navigation,
    /@media \(min-width: 641px\)[\s\S]*?\.nav-show-desktop-logo-text \.nav-logo-text/
  );
  assert.match(layout, /showDesktopLogoText=\{true\}/);
});

test('the Agency hero makes the Playbook operating grammar visible without a provider logo lockup', () => {
  const home = read('src/routes/+page.svelte');
  const campaignOpening = read(
    '../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
  );
  const field = read('src/lib/components/PlaybookField.svelte');

  assert.match(home, /title="Your people and AI need the same playbook\."/);
  assert.match(home, /media=\{playbookHomeHeroMedia\}/);
  assert.match(home, /mediaMobilePlacement="background"/);
  assert.match(home, /client-owned Playbook/);
  assert.match(home, /Offense advances approved work/);
  assert.match(home, /Defense protects decisions, proof, and recovery/);
  assert.doesNotMatch(home, /OpenAI[^\n]{0,80}<img|Cloudflare[^\n]{0,80}<img/);
  assert.match(campaignOpening, /media\?: PerformanceCampaignMedia/);
  assert.match(field, /O = owner/);
  assert.match(field, /X = opposition/);
});

test('shared campaign titles keep every period optically separated from display letters', () => {
  const campaignOpening = read(
    '../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
  );

  assert.match(campaignOpening, /let titleParts = \$derived\(title\.split\('\.'\)\);/);
  assert.match(campaignOpening, /\{#each titleParts as part, index\}/);
  assert.match(
    campaignOpening,
    /titleParts\.length - 1\}<span[\s\S]*?class="performance-campaign-opening__period">\.<\/span\s*>/
  );
  assert.match(
    campaignOpening,
    /\.performance-campaign-opening__period\s*\{[\s\S]*?margin-inline-start:\s*0\.055em;/
  );
});

test('the Agency footer handoff uses its own macro-real decision-gate image without replacing live CTA copy', () => {
  const layout = read('src/routes/+layout.svelte');
  const footer = read('../canon/src/lib/components/Footer.svelte');
  const offerPanel = read('../canon/src/lib/components/meridian/MeridianOfferPanel.svelte');
  const image = resolve(agencyRoot, 'static/images/performance-lab/playbook-footer-decision-gate-macro.webp');
  const metadata = read(
    'content/assets/brand/agency-footer-playbook-decision-gate-macro.v20260810/metadata.md'
  );

  assert.match(layout, /media: agencyFooterMacroMedia/);
  assert.match(layout, /playbook-footer-decision-gate-macro\.webp/);
  assert.match(footer, /media\?: \{[\s\S]*?src: string;[\s\S]*?alt: string;/);
  assert.match(footer, /media=\{footerCta\.media\}/);
  assert.match(offerPanel, /media\?: MeridianOfferMedia/);
  assert.match(offerPanel, /\{#if media\}[\s\S]*?<img[\s\S]*?alt=\{media\.alt\}/);
  assert.match(
    offerPanel,
    /@media \(max-width: 760px\)[\s\S]*?\.meridian-offer-panel__visual\.has-media\s*\{[\s\S]*?aspect-ratio:\s*2 \/ 3;/
  );
  assert.ok(existsSync(image));
  assert.ok(statSync(image).size > 100_000, 'footer media must be a substantive raster asset');
  assert.match(metadata, /campaign material only/i);
  assert.match(metadata, /text, logos, people/i);
});

test('Field Reports carries an attached-proof Playbook macro study with its authored mobile companion', () => {
  const reports = read('src/routes/field-reports/+page.svelte');

  assert.match(reports, /media=\{playbookHeroMedia\.fieldReports\}/);
  assert.match(reports, /mediaMobilePlacement="background"/);
  assert.match(reports, /Review the film\. Improve the playbook\./);
  assert.doesNotMatch(reports, /<PlaybookField variant="proof"/);
});

test('the shared social preview is a current, served Paper operating-system artifact', () => {
  const svgPath = resolve(agencyRoot, 'static/og-image.svg');
  const pngPath = resolve(agencyRoot, 'static/og-image.png');
  const svg = read('static/og-image.svg');

  assert.ok(existsSync(svgPath));
  assert.ok(existsSync(pngPath));
  assert.ok(
    statSync(pngPath).size > 50_000,
    'served raster social card should not be a placeholder'
  );
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
