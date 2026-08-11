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

test('shared campaign titles keep every period optically separated and attached to its word', () => {
  const campaignOpening = read(
    '../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
  );

  assert.match(campaignOpening, /title\.split\('\.'\)\.map\(\(part\) =>/);
  assert.match(campaignOpening, /\{#each titleParts as part, index\}/);
  assert.match(
    campaignOpening,
    /class="performance-campaign-opening__punctuated-word"[\s\S]*?class="performance-campaign-opening__period">\.<\/span\s*>/
  );
  assert.match(
    campaignOpening,
    /\.performance-campaign-opening__period\s*\{[\s\S]*?display:\s*inline;[\s\S]*?margin-inline-start:\s*0\.055em;/
  );
  assert.doesNotMatch(
    campaignOpening,
    /\.performance-campaign-opening__period\s*\{[\s\S]*?display:\s*inline-block;/
  );
  assert.match(
    campaignOpening,
    /\.performance-campaign-opening__punctuated-word\s*\{[\s\S]*?white-space:\s*nowrap;/
  );
});

test('the Agency footer handoff uses its own macro-real decision-gate image without replacing live CTA copy', () => {
  const layout = read('src/routes/+layout.svelte');
  const footer = read('../canon/src/lib/components/Footer.svelte');
  const offerPanel = read('../canon/src/lib/components/meridian/MeridianOfferPanel.svelte');
  const image = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-footer-decision-gate-macro.webp'
  );
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

test('Map and Template Review each carry a route-specific Playbook court hero with a mobile companion', () => {
  const map = read('src/routes/map/+page.svelte');
  const templateReview = read('src/routes/field-reports/template-review/+page.svelte');
  const heroMedia = read('src/lib/data/playbookHeroMedia.ts');
  const mapDesktop = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-map-operating-junction.webp'
  );
  const mapMobile = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-map-operating-junction-mobile.webp'
  );
  const reviewDesktop = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-template-review-human-gate.webp'
  );
  const reviewMobile = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-template-review-human-gate-mobile.webp'
  );

  assert.match(map, /media=\{playbookHeroMedia\.map\}/);
  assert.match(map, /mediaMobilePlacement="background"/);
  assert.doesNotMatch(map, /artifactOwnsMedia|artifactMobilePlacement/);
  assert.match(map, /<PlaybookField variant="map" embedded \/>/);
  assert.match(templateReview, /media=\{playbookHeroMedia\.templateReview\}/);
  assert.match(templateReview, /mediaMobilePlacement="background"/);
  assert.doesNotMatch(templateReview, /paperAttachedReceiptMedia/);
  assert.match(heroMedia, /map: \{[\s\S]*?playbook-map-operating-junction\.webp/);
  assert.match(heroMedia, /templateReview: \{[\s\S]*?playbook-template-review-human-gate\.webp/);
  for (const image of [mapDesktop, mapMobile, reviewDesktop, reviewMobile]) {
    assert.ok(existsSync(image), `${image} must be served by the Agency package`);
    assert.ok(statSync(image).size > 20_000, `${image} must be a substantive raster asset`);
  }
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
