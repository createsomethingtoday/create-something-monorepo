import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const navigationSource = readFileSync(
  new URL('../../canon/src/lib/components/Navigation.svelte', import.meta.url),
  'utf8'
);
const agencyLayoutSource = readFileSync(
  new URL('../src/routes/+layout.svelte', import.meta.url),
  'utf8'
);
const privacySource = readFileSync(
  new URL('../src/lib/components/PrivacyAnalytics.svelte', import.meta.url),
  'utf8'
);
const homeSource = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
const narrativeSource = readFileSync(
  new URL(
    '../../canon/src/lib/components/performance/PerformanceNarrativeStage.svelte',
    import.meta.url
  ),
  'utf8'
);
const handoffSource = readFileSync(
  new URL(
    '../../canon/src/lib/components/performance/PerformanceConversionHandoff.svelte',
    import.meta.url
  ),
  'utf8'
);
const trustArtifactSource = readFileSync(
  new URL('../src/lib/components/HeroTrustArtifact.svelte', import.meta.url),
  'utf8'
);
const readbackSource = readFileSync(
  new URL('../src/lib/components/AgencyPerformanceReadback.svelte', import.meta.url),
  'utf8'
);
const sharedHandoffSource = readFileSync(
  new URL('../src/lib/components/AgencyPerformanceHandoff.svelte', import.meta.url),
  'utf8'
);
const compatibilityRailSource = readFileSync(
  new URL('../src/lib/components/IntegrationCompatibilityRail.svelte', import.meta.url),
  'utf8'
);
const adoptionPathSource = readFileSync(
  new URL('../src/lib/components/AdoptionPathChooser.svelte', import.meta.url),
  'utf8'
);
const campaignOpeningSource = readFileSync(
  new URL(
    '../../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte',
    import.meta.url
  ),
  'utf8'
);
const metricsSource = readFileSync(
  new URL('../../canon/src/lib/components/meridian/MeridianMetrics.svelte', import.meta.url),
  'utf8'
);
const footerSource = readFileSync(
  new URL('../../canon/src/lib/components/Footer.svelte', import.meta.url),
  'utf8'
);
const publicMapSource = readFileSync(
  new URL('../src/lib/components/PublicAtlasCanvas.svelte', import.meta.url),
  'utf8'
);
const atlasFlowStyles = readFileSync(
  new URL('../../canon/src/lib/atlas/AtlasFlow.css', import.meta.url),
  'utf8'
);
const publicAtlasFlowSource = readFileSync(
  new URL('../src/lib/components/PublicAtlasFlow.svelte', import.meta.url),
  'utf8'
);

test('mobile privacy stays at the header edge instead of covering opening proof', () => {
  assert.match(navigationSource, /onMobileMenuChange\?: \(open: boolean\) => void/);
  assert.match(navigationSource, /onMobileMenuChange\?\.\(mobileMenuOpen\)/);
  assert.match(agencyLayoutSource, /let mobileNavigationOpen = \$state\(false\)/);
  assert.match(agencyLayoutSource, /obscured=\{mobileNavigationOpen\}/);
  assert.match(agencyLayoutSource, /mobilePlacement="header-edge"/);
  assert.doesNotMatch(agencyLayoutSource, /mobilePlacement="safe-corner"/);
  assert.match(
    agencyLayoutSource,
    /onMobileMenuChange=\{\(open\) => \(mobileNavigationOpen = open\)\}/
  );
  assert.match(privacySource, /obscured\?: boolean/);
  assert.match(privacySource, /class:privacy-choice--obscured=\{obscured\}/);
  assert.doesNotMatch(privacySource, /z-index:\s*80/);
  assert.match(privacySource, /z-index:\s*var\(--z-performance-sticky/);
});

test('Escape closes mobile navigation and returns focus to its trigger', () => {
  assert.match(navigationSource, /bind:this=\{mobileMenuButton\}/);
  assert.match(navigationSource, /event\.key !== 'Escape'/);
  assert.match(navigationSource, /mobileMenuButton\?\.focus\(\)/);
  assert.match(navigationSource, /<svelte:window onkeydown=\{handleWindowKeydown\}/);
});

test('the mobile operating story does not repeat proof already carried by its boundary artifact', () => {
  const mapScene = homeSource.slice(
    homeSource.indexOf("id: 'map'"),
    homeSource.indexOf("id: 'build'")
  );

  assert.doesNotMatch(mapScene, /\bevidence:/);
  assert.doesNotMatch(mapScene, /\breceipts:/);
  assert.match(homeSource, /Every action leaves a record your team can review/);
  assert.match(homeSource, /aria-label="Boundary study receipt"/);

  const controlScene = homeSource.slice(
    homeSource.indexOf("id: 'control'"),
    homeSource.indexOf('];', homeSource.indexOf("id: 'control'"))
  );
  assert.doesNotMatch(
    controlScene,
    /\bactions:/,
    'Control destinations already live in its artifact'
  );
  assert.match(homeSource, /class="service-flow-action"/);
  assert.match(homeSource, /href="\/stack"/);
});

test('compact mobile composition reduces spacing while retaining readable control targets', () => {
  assert.match(
    narrativeSource,
    /@media \(max-width: 47\.99rem\)[\s\S]*?\.performance-narrative-stage\[data-density='compact'\]\s*\{[\s\S]*?padding-block:\s*1\.5rem;/
  );
  assert.match(
    narrativeSource,
    /\.performance-narrative-stage__panel\s*\{[\s\S]*?gap:\s*0\.9rem;[\s\S]*?padding:\s*0\.85rem;/
  );
  assert.match(
    handoffSource,
    /data-artifact-placement='full-width'\]\[data-density='compact'\][\s\S]*?padding-block:\s*1\.5rem;/
  );
  const handoffRootRule = handoffSource.match(
    /\.performance-conversion-handoff\s*\{([^}]*)\}/
  )?.[1];
  assert.match(
    handoffRootRule ?? '',
    /\bpadding:\s*0;/,
    'handoff must reset inherited section padding'
  );
  assert.match(
    trustArtifactSource,
    /@media \(max-width: 640px\)[\s\S]*?\.hero-trust-artifact__path[\s\S]*?gap:\s*0\.4rem;[\s\S]*?padding:\s*0\.45rem;/
  );
  assert.match(narrativeSource, /min-height:\s*var\(--height-performance-control-min, 2\.75rem\)/);
});

test('the narrow narrative rail reveals every scene label instead of clipping the final stage', () => {
  assert.match(
    narrativeSource,
    /@media \(max-width: 25rem\)[\s\S]*?\.performance-narrative-stage__index\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);[\s\S]*?grid-auto-flow:\s*row;[\s\S]*?overflow-x:\s*visible;/
  );
  assert.match(
    narrativeSource,
    /@media \(max-width: 25rem\)[\s\S]*?\.performance-narrative-stage__index-copy small\s*\{[\s\S]*?display:\s*none;/
  );
});

test('the concise conversion handoff keeps its proof beside the action without a full-width repeat', () => {
  assert.match(handoffSource, /density\?: 'standard' \| 'compact' \| 'concise'/);
  assert.match(
    handoffSource,
    /data-density='concise'\] \.performance-conversion-handoff__copy\s*\{[^}]*min-height:\s*clamp\(18rem,\s*26vw,\s*23rem\)/
  );
  assert.match(homeSource, /artifactPlacement="sidecar"/);
  assert.match(homeSource, /density="concise"/);
  assert.doesNotMatch(homeSource, /artifactPlacement="full-width"/);
});

test('the homepage boundary comparison is one compact proof object on desktop and mobile', () => {
  assert.match(homeSource, /<PerformanceNarrativeStage[\s\S]*?density="compact"/);
  assert.match(homeSource, /class="boundary-study__outcomes"/);
  assert.doesNotMatch(homeSource, /class="operator-outcomes"/);
  assert.match(homeSource, /\.service-flow-artifact\s*\{[\s\S]*?min-height:\s*17rem/);
  assert.match(
    homeSource,
    /@media \(max-width: 640px\)[\s\S]*?\.boundary-study__outcomes\s*\{[\s\S]*?grid-template-columns:\s*1fr/
  );
});

test('homepage section components reset inherited shell padding before applying their own rhythm', () => {
  for (const [name, source, selector] of [
    ['campaign opening', campaignOpeningSource, '.performance-campaign-opening'],
    ['scoreboard metrics', metricsSource, '.meridian-metrics'],
    ['adoption paths', adoptionPathSource, '.adoption-paths'],
    ['compatibility rail', compatibilityRailSource, '.compatibility-rail']
  ] as const) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rootRule = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
    assert.match(rootRule, /\bpadding:\s*0;/, `${name} must reset inherited section padding`);
  }
});

test('standalone calls to action and legal links expose explicit touch height', () => {
  assert.match(
    readbackSource,
    /a\s*\{[\s\S]*?min-height:\s*var\(--height-performance-control-min, 2\.75rem\)/
  );
  const sharedHandoffActionRule = sharedHandoffSource.match(
    /\.performance-handoff__actions a\s*\{([^}]*)\}/
  )?.[1];
  assert.match(
    sharedHandoffActionRule ?? '',
    /min-height:\s*var\(--height-performance-control-min, 2\.75rem\)/
  );
  assert.match(
    compatibilityRailSource,
    /\.compatibility-rail__catalog-link\s*\{[\s\S]*?min-height:\s*var\(--height-performance-control-min, 2\.75rem\)/
  );
  assert.match(footerSource, /\.legal-link\s*\{[\s\S]*?min-height:\s*1\.5rem;/);
  assert.match(
    navigationSource,
    /\.nav-logo\s*\{[\s\S]*?min-height:\s*var\(--height-performance-control-min/
  );
  assert.doesNotMatch(navigationSource, /\.nav-clear \.nav-logo\s*\{[^}]*min-width:\s*0;/);
  assert.match(
    footerSource,
    /\.social-link\s*\{[\s\S]*?min-width:\s*var\(--height-performance-control-min/
  );
});

test('privacy, navigation, and public Map controls keep a 44px interaction target', () => {
  assert.match(navigationSource, /\.nav-cta\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(privacySource, /\.privacy-button\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(privacySource, /\.privacy-pill\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(publicMapSource, /\.focus-strip button\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(publicMapSource, /\.agent-suggestions button\s*\{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(atlasFlowStyles, /\.svelte-flow__controls-button\s*\{[\s\S]*?width:\s*2\.75rem/);
  assert.match(publicAtlasFlowSource, /minimumTouchableZoom\s*=\s*0\.38/);
  assert.match(publicAtlasFlowSource, /minZoom=\{minimumTouchableZoom\}/);
  assert.match(atlasFlowStyles, /\.svelte-flow__node\s*\{[\s\S]*?min-height:\s*7\.25rem/);
  assert.match(atlasFlowStyles, /\.public-atlas-flow-node\s*\{[\s\S]*?min-height:\s*10rem/);
});
