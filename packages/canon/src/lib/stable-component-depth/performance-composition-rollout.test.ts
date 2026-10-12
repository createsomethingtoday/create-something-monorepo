import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(process.cwd(), '..', '..');

function routeSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const HOMEPAGE_SECTION_COMPONENTS = [
  'PerformanceCampaignOpening',
  'PerformanceThesisConditions',
  'PerformanceFieldSequence',
  'PerformanceContrastChapter',
  'PerformanceEvidenceIndex',
  'PerformanceConversionHandoff',
  'PerformanceNarrativeStage',
  'PerformancePageSection',
  'PerformanceDecisionPanel',
  'PropertyFunnel',
  'NewsletterSignup',
  'PapersGrid'
];

function routeMarkup(source: string): string {
  return source.split('</script>')[1]?.split('<style>')[0] ?? source;
}

function homepageSectionCount(source: string): number {
  const markup = routeMarkup(source);
  const openingPattern = new RegExp(
    `^([ \t]*)<(?:${HOMEPAGE_SECTION_COMPONENTS.join('|')}|section)\\b`,
    'gm'
  );
  const openings = [...markup.matchAll(openingPattern)].map((match) => ({
    indent: match[1].length,
    markup: match[0]
  }));
  const topLevelIndent = Math.min(...openings.map((opening) => opening.indent));
  return openings.filter((opening) => opening.indent === topLevelIndent).length;
}

function svelteSources(relativeDirectory: string): Array<{ path: string; source: string }> {
  const root = join(REPO_ROOT, relativeDirectory);
  const files: Array<{ path: string; source: string }> = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      if (entry.isFile() && entry.name.endsWith('.svelte')) {
        files.push({ path: path.slice(REPO_ROOT.length + 1), source: readFileSync(path, 'utf8') });
      }
    }
  }

  visit(root);
  return files;
}

describe('Performance composition cross-property rollout', () => {
  it('keeps compact decision consoles full-width below the desktop split', () => {
    const source = routeSource('packages/canon/src/lib/components/clear/ClearDecisionPanel.svelte');
    const responsiveRules = source.slice(source.indexOf('@media (max-width: 1180px)'));

    expect(responsiveRules).toContain(
      ".clear-decision-panel[data-density='compact'] .clear-decision-panel__inner,"
    );
    expect(responsiveRules).toContain('grid-template-columns: 1fr;');
  });

  it('keeps the Agency support journey and proof in a single ordered composition', () => {
    const source = routeMarkup(routeSource('packages/agency/src/routes/+page.svelte'));
    const sequence = [
      'AgencyHero',
      'WorkflowSignalBand',
      'ServiceJourney',
      'BuiltWork',
      'FilmCollection',
      'SelectedClientWork',
      'MembershipOffer',
      'MeridianAccordion'
    ];
    let previous = -1;
    for (const name of sequence) {
      expect(source.split(`<${name}`).length - 1, name).toBe(1);
      expect(source.indexOf(`<${name}`), name).toBeGreaterThan(previous);
      previous = source.indexOf(`<${name}`);
    }
  });

  it('keeps .ltd as a court and Playbook operator library instead of restoring the editorial shell', () => {
    const source = routeSource('packages/ltd/src/routes/+page.svelte');

    expect(homepageSectionCount(source)).toBeLessThanOrEqual(6);
    expect(source).toContain('aria-label="The operating sequence"');
    expect(source).toContain('Run AI work people can trust.');
    expect(source).toContain('class="ltd-operator-hero"');
    expect(source).toContain('PerformanceCardGrid');
    expect(source).not.toContain('PerformanceDecisionPanel');
    expect(source).toContain('PropertyFunnel');
    expect(source).toContain('NewsletterSignup');
    expect(source).not.toContain('PerformanceThesisConditions');
    expect(source).not.toContain('PerformancePlatformHero');
    expect(source).not.toContain('PerformanceLabBand');
  });

  it('keeps the research opening, artifact collection, decision path and handoff', () => {
    const source = routeSource('packages/io/src/routes/+page.svelte');
    expect(homepageSectionCount(source)).toBe(4);
    for (const marker of [
      'research-opening',
      'research-collection',
      'research-method',
      '<PropertyFunnel',
      'featuredExperiments',
      'decisionStates',
      'methodology',
      'cost, speed, and maintenance drag'
    ])
      expect(source).toContain(marker);
    expect(source.indexOf('<section class="research-collection"')).toBeLessThan(
      source.indexOf('<PropertyFunnel')
    );
  });

  it('keeps the public workshop opening, projects, tools and source handoff', () => {
    const source = routeSource('packages/space/src/routes/+page.svelte');
    expect(homepageSectionCount(source)).toBe(4);
    for (const marker of [
      'workshop-title',
      'selected-title',
      'workbench-title',
      'closing-title',
      '<ProjectCard',
      'workbenchTools',
      'https://github.com/createsomethingtoday'
    ])
      expect(source).toContain(marker);
  });

  it('keeps learning paths, the governed loop and evidence handoff intact', () => {
    const source = routeSource('packages/lms/src/routes/+page.svelte');
    expect(homepageSectionCount(source)).toBe(3);
    for (const marker of [
      'Build agents whose work you can explain.',
      'paths-title',
      'Understand. Build. Govern. Prove.',
      'Keep humans in control',
      'Keep a receipt',
      'work contract, runnable loop, source ledger, policy, evaluation traces, and a handoff.'
    ])
      expect(source).toContain(marker);
  });

  it('preserves every primary homepage destination inside the sharper compositions', () => {
    const destinationsByRoute = {
      'packages/agency/src/lib/components/films/AgencyHero.svelte': [
        'agencyCoreMessaging.workflowMappingSessionHref',
        '/services#membership',
        '/agent-foundation',
        '/stack#openai-qualifications'
      ],
      'packages/agency/src/lib/components/BuiltWork.svelte': ['/services', '/products'],
      'packages/agency/src/lib/components/MembershipOffer.svelte': [
        'agencyCoreMessaging.membershipInquiryHref',
        'agencyCoreMessaging.teamMembershipInquiryHref',
        '/stack'
      ],
      'packages/ltd/src/routes/+page.svelte': [
        '/playbooks',
        '/readiness',
        'PropertyFunnel',
        'NewsletterSignup'
      ],
      'packages/io/src/routes/+page.svelte': [
        '/papers',
        '/experiments',
        '/methodology',
        '/graph',
        'createsomething.space',
        'createsomething.agency/practice'
      ],
      'packages/lms/src/routes/+page.svelte': ['/paths', 'firstLessonHref']
    };

    for (const [route, destinations] of Object.entries(destinationsByRoute)) {
      const source = routeSource(route);
      for (const destination of destinations) expect(source).toContain(destination);
    }
  });

  it('uses shared product compositions on the staff agent roster', () => {
    const source = routeSource('packages/ona-agents/src/routes/agents/+page.svelte');

    expect(source).toContain('PerformanceThesisConditions');
    expect(source).toContain('PerformanceEvidenceIndex');
    expect(source).not.toContain('class="agents-header');
    expect(source).not.toContain('class="proof-strip');
    expect(source).not.toContain('class="agent-grid');
  });

  it('keeps active Performance consumers off legacy composition shells', () => {
    const consumers = [
      ...svelteSources('packages/agency/src'),
      ...svelteSources('packages/ltd/src'),
      ...svelteSources('packages/io/src'),
      ...svelteSources('packages/space/src'),
      ...svelteSources('packages/lms/src'),
      ...svelteSources('packages/ona-agents/src')
    ];
    const legacyNames = ['PerformancePlatformHero', 'PerformanceLabBand', 'PerformanceCtaBand'];
    const violations = consumers.flatMap(({ path, source }) =>
      legacyNames.filter((name) => source.includes(name)).map((name) => `${path}: ${name}`)
    );

    expect(violations).toEqual([]);
  });
});
