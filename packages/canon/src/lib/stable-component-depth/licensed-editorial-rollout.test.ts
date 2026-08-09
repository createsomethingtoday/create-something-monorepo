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

describe('Licensed editorial public-system rollout', () => {
  it('uses one owned editorial shell and exact licensed-reference palette across all four properties', () => {
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

    for (const property of ['agency', 'io', 'ltd', 'space'] as const) {
      const layout = layoutSource(property);
      expect(layout).toContain('visualStyle="editorial"');
      expect(layout).not.toContain('visualStyle="performance"');
    }

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

  it('adopts every licensed navigation, section, card, proof, form, and footer pattern as owned components', () => {
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
      'MeridianAccordion'
    ]) {
      expect(components).toContain(component);
      expect(adoptionMap).toContain(component);
    }

    expect(navigation).toContain('nav-dropdown__menu');
    expect(navigation).toContain('nav-mobile-submenu');
    expect(footer).toContain('footer-editorial-identity');
    expect(footer).toContain('.footer-editorial #newsletter');

    expect(routeSource('agency')).toContain('<MeridianMetrics');
    expect(routeSource('agency')).toContain('<MeridianEvidenceCarousel');
    expect(routeSource('agency')).toContain('<MeridianAccordion');
    expect(routeSource('io')).toContain('<MeridianFeatureSplit');
    expect(routeSource('io')).toContain('<MeridianCardGrid');
    expect(routeSource('ltd')).toContain('<MeridianFeatureSplit');
    expect(routeSource('ltd')).toContain("kind: 'profile'");
    expect(routeSource('space')).toContain('<MeridianCardGrid');
    expect(layoutSource('agency')).toContain('children: [');
  });

  it('frames .agency as the embedded operating partner and names the client-owned Playbook', () => {
    const source = routeSource('agency');

    expect(source).toContain('expression="editorial"');
    expect(source.match(/expression="editorial"/g)).toHaveLength(2);
    expect(source).toContain('propertyRole="Embedded AI operating partner"');
    expect(source).toContain('We embed with operators');
    expect(source).toContain('client-owned Playbook');
    expect(source).toContain(
      'The opposition is ambiguity, AI out of reach, and untrusted automation.'
    );
  });

  it('keeps .io distinct as the research and field-evidence property', () => {
    const source = routeSource('io');

    expect(source).toContain('expression="editorial"');
    expect(source.match(/expression="editorial"/g)).toHaveLength(2);
    expect(source).toContain('propertyRole="Research + field evidence"');
    expect(source).toContain('Research for automation you can defend.');
    expect(source).toContain('Read The Papers');
  });

  it('keeps .ltd distinct as the canon and operating-standards property', () => {
    const source = routeSource('ltd');

    expect(source).toContain('expression="editorial"');
    expect(source.match(/expression="editorial"/g)).toHaveLength(2);
    expect(source).toContain('propertyRole="Canon + operating standards"');
    expect(source).toContain('The philosophy of automation infrastructure.');
    expect(source).toContain('Read The Canon');
  });

  it('keeps .space distinct as the public systems workbench', () => {
    const source = routeSource('space');

    expect(source).toContain('expression="editorial"');
    expect(source).toContain('propertyRole="Public systems workbench"');
    expect(source).toContain('A public workbench for testing runtime ideas.');
    expect(source).toContain('Open The Playground');
  });
});
