import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(resolve(agencyRoot, relativePath), 'utf8');

test('Agency uses its property-owned outlined logo assets without changing Canon defaults', () => {
  const navigation = read('../canon/src/lib/components/Navigation.svelte');
  const footer = read('../canon/src/lib/components/Footer.svelte');
  const layout = read('src/routes/+layout.svelte');
  const headerLogo = resolve(agencyRoot, 'static/brand/create-something-horizontal-black.svg');
  const footerLogo = resolve(agencyRoot, 'static/brand/create-something-agency-white.svg');
  const mobileMark = resolve(agencyRoot, 'static/brand/create-something-mark-black.svg');
  const favicon = resolve(agencyRoot, 'static/favicon.svg');
  const maskIcon = resolve(agencyRoot, 'static/mask-icon.svg');
  const manifest = JSON.parse(read('static/manifest.json')) as {
    icons: Array<{ src: string; sizes: string; type?: string; purpose?: string }>;
  };

  assert.match(navigation, /logoAsset\?: NavigationLogoAsset/);
  assert.match(navigation, /mobileSrc\?: string/);
  assert.match(navigation, /<picture class="nav-logo-asset-picture">/);
  assert.match(navigation, /media="\(max-width: 640px\)" srcset=\{logoAsset\.mobileSrc\}/);
  assert.match(
    navigation,
    /@media \(max-width: 640px\)[\s\S]*?\.nav-clear \.nav-logo-asset\s*\{[\s\S]*?height:\s*2\.5rem;/
  );
  assert.match(footer, /brandAsset\?: FooterBrandAsset/);
  assert.match(
    footer,
    /<img class="footer-editorial-identity__asset" src=\{brandAsset\.src\} alt="" \/>/
  );
  assert.match(layout, /create-something-horizontal-black\.svg/);
  assert.match(layout, /create-something-mark-black\.svg/);
  assert.match(layout, /create-something-agency-white\.svg/);
  assert.match(layout, /enableRouteLogoMotion=\{true\}/);
  for (const asset of [headerLogo, footerLogo]) {
    assert.ok(existsSync(asset), `${asset} must be served by the Agency package`);
    assert.ok(statSync(asset).size > 1_000, `${asset} must be a substantive outlined vector`);
  }
  assert.ok(existsSync(mobileMark), `${mobileMark} must be served by the Agency package`);
  assert.ok(
    statSync(mobileMark).size > 300,
    'the master mobile mark must retain substantive V3 vector geometry'
  );
  assert.ok(existsSync(favicon), `${favicon} must be served by the Agency package`);
  assert.ok(
    statSync(favicon).size > 300,
    'the V3 favicon must retain its rounded-square site-icon geometry'
  );
  assert.ok(existsSync(maskIcon), `${maskIcon} must be served by the Agency package`);
  assert.deepEqual(manifest.icons, [
    { src: 'favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: 'favicon.png', type: 'image/png', sizes: '512x512' }
  ]);
});

test('Agency serves the approved V3 logo files byte-for-byte at its public asset paths', () => {
  const expectedSha256 = new Map([
    [
      'static/brand/create-something-horizontal-black.svg',
      '1f4ff733da74d0a5514988513e659a4eef457c711eb54e135011530a185753bb'
    ],
    [
      'static/brand/create-something-agency-white.svg',
      '44a3adcadc32632cc69038c60c7860c1efb01fe13e4f053cbcd89ceb091293d8'
    ],
    [
      'static/brand/create-something-mark-black.svg',
      'd50ace76dbeabc2fee672599e81434addfe0e83dc41e35e0865ebc4f69942ff2'
    ],
    ['static/favicon.svg', '30e68ec91bd9f550e1efdba377802a581ec2cfb924d8d6e431187f27a5a8403d'],
    ['static/mask-icon.svg', 'd50ace76dbeabc2fee672599e81434addfe0e83dc41e35e0865ebc4f69942ff2']
  ]);

  for (const [relativePath, expected] of expectedSha256) {
    const asset = readFileSync(resolve(agencyRoot, relativePath));
    const actual = createHash('sha256').update(asset).digest('hex');
    assert.equal(actual, expected, `${relativePath} must preserve the approved V3 source`);
  }
});

test('the Agency footer uses one linked lockup instead of repeating the brand inside its link panel', () => {
  const footer = read('../canon/src/lib/components/Footer.svelte');

  assert.match(
    footer,
    /class="footer-editorial-identity footer-editorial-identity--link"[\s\S]*?aria-label=\{`\$\{brandAsset\.label\} home`\}/
  );
  assert.match(footer, /\{#if usesPerformanceStyle && !usesEditorialStyle\}/);
  assert.match(footer, /\.footer-editorial-identity--link:focus-visible/);
});

test('the Agency operating story uses a scoped GSAP motion intent with an immediate reduced-motion state', () => {
  const home = read('src/routes/+page.svelte');
  const narrative = read(
    '../canon/src/lib/components/performance/PerformanceNarrativeStage.svelte'
  );

  assert.match(home, /id: 'agency-operating-story-v1'/);
  assert.match(home, /event: 'agency\.operating-story\.scene\.selected'/);
  assert.match(home, /reducedMotion: 'settle-immediately'/);
  assert.match(home, /motionIntent=\{agencyOperatingStoryMotion\}/);
  assert.match(narrative, /motionIntent\?: MotionIntent/);
  assert.match(narrative, /await import\('gsap'\)/);
  assert.match(narrative, /prefers-reduced-motion: reduce/);
  assert.match(narrative, /cancelSceneMotion\(\);/);
  assert.doesNotMatch(home, /ScrollTrigger|Lenis|SmoothScroll/);
});

test('the Agency hero makes the Playbook operating grammar visible without a provider logo lockup', () => {
  const home = read('src/routes/+page.svelte');
  const campaignOpening = read(
    '../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
  );
  const field = read('src/lib/components/PlaybookField.svelte');

  assert.match(home, /title="Build an agent you can keep building\."/);
  assert.match(home, /media=\{playbookHomeHeroMedia\}/);
  assert.match(home, /mediaMobilePlacement="background"/);
  assert.match(home, /client-owned Playbook/);
  assert.match(home, /Advance approved work/);
  assert.match(home, /Protect every decision/);
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
  assert.match(map, /src=\{playbookMapSectionMedia\.src\}/);
  assert.match(map, /srcset=\{playbookMapSectionMedia\.mobileSrc\}/);
  assert.match(map, /data-campaign-media="map-overhead-study"/);
  assert.doesNotMatch(map, /<PlaybookField variant="map"/);
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

test('Workflow library opens with a route-specific macro Playbook hero and authored mobile companion', () => {
  const workflows = read('src/routes/workflows/+page.svelte');
  const heroMedia = read('src/lib/data/playbookHeroMedia.ts');
  const desktop = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-workflows-guide-junction.webp'
  );
  const mobile = resolve(
    agencyRoot,
    'static/images/performance-lab/playbook-workflows-guide-junction-mobile.webp'
  );

  assert.match(workflows, /media=\{playbookHeroMedia\.workflows\}/);
  assert.match(workflows, /mediaMobilePlacement="background"/);
  assert.doesNotMatch(workflows, /artifactOwnsMedia|artifactMobilePlacement/);
  assert.match(heroMedia, /workflows: \{[\s\S]*?playbook-workflows-guide-junction\.webp/);
  for (const image of [desktop, mobile]) {
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
