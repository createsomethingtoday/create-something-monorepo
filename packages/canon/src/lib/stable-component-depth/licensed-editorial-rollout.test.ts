import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

function routeSource(property: 'agency' | 'io' | 'ltd' | 'space'): string {
  return readFileSync(join(REPO_ROOT, 'packages', property, 'src/routes/+page.svelte'), 'utf8');
}

function layoutSource(property: 'agency' | 'io' | 'ltd' | 'space'): string {
  return readFileSync(join(REPO_ROOT, 'packages', property, 'src/routes/+layout.svelte'), 'utf8');
}

describe('Licensed Meridian public-system rollout', () => {
  it('uses property-specific shells with an exact licensed-reference palette where editorial expression applies', () => {
    const tokens = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/styles/tokens.css'),
      'utf8'
    );
    const navigation = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/components/Navigation.svelte'),
      'utf8'
    );
    const footer = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/components/Footer.svelte'),
      'utf8'
    );
    const performance = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/styles/performance.css'),
      'utf8'
    );
    const packageManifest = readFileSync(join(REPO_ROOT, 'packages/canon/package.json'), 'utf8');

    for (const property of ['agency', 'io', 'space'] as const) {
      const layout = layoutSource(property);
      expect(layout).toContain('visualStyle="editorial"');
      expect(layout).not.toContain('visualStyle="performance"');
    }

    const ltdLayout = layoutSource('ltd');
    expect(ltdLayout).toContain('visualStyle="performance"');
    expect(ltdLayout).not.toContain('visualStyle="editorial"');

    for (const value of ['#181312', '#2e2927', '#f3ebe4', '#d8cdbc', '#fcaa2d']) {
      expect(tokens).toContain(value);
    }

    expect(navigation).toContain("'editorial'");
    expect(navigation).toContain('nav-editorial');
    expect(footer).toContain("'editorial'");
    expect(footer).toContain('footer-editorial');
    expect(tokens).toContain("'Geist Variable'");
    expect(performance).toContain('@fontsource-variable/geist/wght.css');
    expect(performance).toContain('font-synthesis: none');
    expect(packageManifest).toContain('@fontsource-variable/geist');
  });

  it('maps one licensed end product and one identical self-hosted font asset to each property', () => {
    const manifest = readFileSync(
      join(REPO_ROOT, 'docs/internal/MERIDIAN_LICENSED_PUBLIC_SYSTEM.md'),
      'utf8'
    );
    const expectedHash = '42b9b1445555af9a47ff748332a0da9c7526fc6ecf403c620916640490b4765b';

    for (const property of ['agency', 'io', 'ltd', 'space'] as const) {
      const font = readFileSync(
        join(REPO_ROOT, 'packages', property, 'static/fonts/create-something-editorial.woff2')
      );
      expect(createHash('sha256').update(font).digest('hex'), property).toBe(expectedHash);
      expect(manifest).toContain(`createsomething.${property}`);
    }

    expect(manifest).toContain('No Webflow runtime');
    expect(manifest).toContain('Webflow Studio conversion is deferred');
    expect(manifest).toContain(expectedHash);
  });

  it('keeps the licensed component inventory owned while each property adopts its approved expression', () => {
    const adoptionMap = readFileSync(
      join(REPO_ROOT, 'docs/internal/MERIDIAN_COMPONENT_ADOPTION_MAP.md'),
      'utf8'
    );
    const components = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/components/meridian/index.ts'),
      'utf8'
    );
    const navigation = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/components/Navigation.svelte'),
      'utf8'
    );
    const footer = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/components/Footer.svelte'),
      'utf8'
    );

    for (const component of [
      'MeridianMetrics',
      'MeridianFeatureSplit',
      'MeridianCardGrid',
      'MeridianEvidenceCarousel',
      'MeridianAccordion',
      'MeridianOfferPanel'
    ]) {
      expect(components).toContain(component);
      expect(adoptionMap).toContain(component);
    }

    expect(navigation).toContain('nav-dropdown__menu');
    expect(navigation).toContain('nav-mobile-submenu');
    expect(navigation).toContain('class="nav-dropdown__chevron"');
    expect(navigation).toContain('viewBox="0 0 16 16"');
    expect(navigation).not.toContain('>⌄</span>');
    expect(footer).toContain("import MeridianOfferPanel from './meridian/MeridianOfferPanel.svelte'");
    expect(footer).toContain('<MeridianOfferPanel');
    expect(footer).toContain('footer-editorial-identity');
    expect(footer).toContain('.footer-editorial #newsletter');

    expect(routeSource('agency')).toContain('<MeridianMetrics');
    expect(routeSource('agency')).toContain('<MeridianEvidenceCarousel');
    expect(routeSource('agency')).toContain('<MeridianAccordion');
    expect(routeSource('io')).toContain('<MeridianFeatureSplit');
    expect(routeSource('io')).toContain('<MeridianCardGrid');
    expect(routeSource('ltd')).toContain('ltdOperatingFieldMedia');
    expect(routeSource('ltd')).toContain('<PerformanceCardGrid');
    expect(routeSource('ltd')).toContain('<PropertyFunnel');
    expect(routeSource('space')).toContain('<PerformanceDecisionPanel');
    expect(routeSource('space')).toContain('<PerformanceCardGrid');
    expect(routeSource('space')).toContain('<PerformanceConversionHandoff');
    expect(layoutSource('agency')).toContain('children: [');
  });

  it('frames .agency as the embedded operating partner and names the client-owned Playbook', () => {
    const source = routeSource('agency');

    expect(source).toContain('expression="editorial"');
    expect(source.match(/expression="editorial"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('propertyRole="Embedded AI operating partner"');
    expect(source).toContain('We embed with operators');
    expect(source).toContain('client-owned Playbook');
    expect(source).toContain(
      'The opposition is ambiguity, AI out of reach, and untrusted automation.'
    );
  });

  it('uses one artifact-led offer action with property-specific records', () => {
    const offer = readFileSync(
      join(
        REPO_ROOT,
        'packages/canon/src/lib/components/meridian/MeridianOfferPanel.svelte'
      ),
      'utf8'
    );

    expect(offer.match(/<a\s/g)).toHaveLength(1);
    expect(offer).toContain('SIGNAL → DECISION → PROOF');
    expect(offer).toContain("agency: { code: 'PB / 01'");
    expect(offer).toContain("io: { code: 'FR / 01'");
    expect(offer).toContain("ltd: { code: 'PL / 01'");
    expect(offer).toContain("space: { code: 'RT / 01'");
    expect(offer).not.toContain('Free Download');
    expect(offer).toContain('media?: MeridianOfferMedia');
    expect(offer).toContain('{#if media}');
    expect(offer).toContain('alt={media.alt}');
    expect(offer).toContain('loading="lazy"');
    expect(offer).toContain('decoding="async"');
    expect(offer).toContain('{:else}');
    expect(offer).toContain('meridian-offer-panel__artifact');
    expect(offer).not.toContain('meridian-wf-template');
  });

  it('keeps the Agency ownership proposition in the editorial public-heading expression', () => {
    const stack = readFileSync(
      join(REPO_ROOT, 'packages/agency/src/routes/stack/+page.svelte'),
      'utf8'
    );
    const metrics = readFileSync(
      join(REPO_ROOT, 'packages/canon/src/lib/components/meridian/MeridianMetrics.svelte'),
      'utf8'
    );
    const home = routeSource('agency');

    expect(stack).toContain('expression="editorial"');
    expect(metrics).toContain('grid-template-rows: auto auto minmax(2.9em, auto)');
    expect(metrics).toContain('grid-template-rows: auto auto auto');
    expect(home).toContain('Every run, wait, or stop stays explicit.');
    expect(home).toContain('Your team keeps the working system.');
  });

  it('keeps .io distinct as the research and field-evidence property', () => {
    const source = routeSource('io');

    expect(source).toContain('expression="editorial"');
    expect(source.match(/expression="editorial"/g)).toHaveLength(2);
    expect(source).toContain('propertyRole="Research + field evidence"');
    expect(source).toContain('Research for automation you can defend.');
    expect(source).toContain('Read The Papers');
  });

  it('keeps .ltd distinct as the court and Playbook operator library', () => {
    const source = routeSource('ltd');

    expect(layoutSource('ltd')).toContain('visualStyle="performance"');
    expect(source).toContain('ltdOperatingFieldMedia');
    expect(source).toContain('Run AI work people can trust.');
    expect(source).toContain('<PerformanceCardGrid');
    expect(source).toContain('<PropertyFunnel');
    expect(source).toContain('<NewsletterSignup');
  });

  it('keeps .space distinct as the public systems workbench', () => {
    const source = routeSource('space');

    expect(source).toContain('expression="editorial"');
    expect(source).toContain('propertyRole="Public systems workbench"');
    expect(source).toContain('A public workbench for testing runtime ideas.');
    expect(source).toContain('Open The Playground');
  });
});
