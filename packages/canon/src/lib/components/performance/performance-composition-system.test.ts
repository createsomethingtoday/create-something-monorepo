// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PerformanceCampaignOpening from './PerformanceCampaignOpening.svelte';
import PerformanceThesisConditions from './PerformanceThesisConditions.svelte';
import PerformanceFieldSequence from './PerformanceFieldSequence.svelte';
import PerformanceContrastChapter from './PerformanceContrastChapter.svelte';
import PerformanceEvidenceIndex from './PerformanceEvidenceIndex.svelte';
import PerformanceConversionHandoff from './PerformanceConversionHandoff.svelte';
import PerformanceNarrativeStage from './PerformanceNarrativeStage.svelte';
import PerformancePageSection from '../clear/ClearPageSection.svelte';
import PerformanceDecisionPanel from '../clear/ClearDecisionPanel.svelte';
import PropertyFunnel from '../PropertyFunnel.svelte';

let target: HTMLElement;
let instance: Record<string, unknown> | undefined;

afterEach(() => {
  if (instance) {
    unmount(instance as never);
    instance = undefined;
  }
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

describe('PerformanceCampaignOpening', () => {
  it('names the editorial property role in the public opening', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceCampaignOpening, {
      target,
      props: {
        eyebrow: 'CREATE SOMETHING .agency',
        title: 'Your operating system should be yours.',
        expression: 'editorial',
        propertyRole: 'Embedded AI operating partner'
      }
    }) as Record<string, unknown>;
    flushSync();

    const opening = target.querySelector('section.performance-campaign-opening');
    expect(opening?.getAttribute('data-expression')).toBe('editorial');
    expect(
      opening?.querySelector('.performance-campaign-opening__property-role')?.textContent
    ).toBe('Embedded AI operating partner');
  });

  it('renders a complete media-first campaign opening with proof and actions', () => {
    const actions = createRawSnippet(() => ({
      render: () => '<a href="/book" data-testid="campaign-action">Book a working session</a>'
    }));
    const artifact = createRawSnippet(() => ({
      render: () =>
        '<div data-testid="campaign-artifact">Interactive workflow remains property-owned</div>'
    }));

    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceCampaignOpening, {
      target,
      props: {
        eyebrow: 'AI Performance Lab',
        title: 'Train the system before it runs.',
        lede: 'Map signals. Route decisions. Define actions. Leave proof.',
        mode: 'ink',
        density: 'compact',
        mobileSearchBoundary: true,
        mediaMobilePlacement: 'background',
        media: {
          src: '/images/pressure-wide.webp',
          mobileSrc: '/images/pressure-tall.webp',
          alt: 'Water moving through a controlled spillway',
          width: 1920,
          height: 1080
        },
        proof: [
          { label: 'Signals', value: 'Mapped' },
          { label: 'Decisions', value: 'Assigned' }
        ],
        actions,
        artifact
      }
    }) as Record<string, unknown>;
    flushSync();

    const opening = target.querySelector('section.performance-campaign-opening');
    expect(opening?.getAttribute('data-mode')).toBe('ink');
    expect(opening?.getAttribute('data-density')).toBe('compact');
    expect(opening?.getAttribute('data-has-artifact')).toBe('true');
    expect(opening?.getAttribute('data-mobile-search-boundary')).toBe('true');
    expect(opening?.getAttribute('data-media-mobile-placement')).toBe('background');
    expect(opening?.getAttribute('aria-label')).toBe('AI Performance Lab');
    expect(opening?.querySelector('h1')?.textContent).toBe('Train the system before it runs.');
    expect(opening?.querySelector('.performance-campaign-opening__lede')?.textContent).toContain(
      'Map signals.'
    );

    const source = opening?.querySelector('picture source');
    expect(source?.getAttribute('media')).toBe('(max-width: 47.99rem)');
    expect(source?.getAttribute('srcset')).toBe('/images/pressure-tall.webp');

    const image = opening?.querySelector('picture img');
    expect(image?.getAttribute('alt')).toBe('Water moving through a controlled spillway');
    expect(image?.getAttribute('width')).toBe('1920');
    expect(image?.getAttribute('height')).toBe('1080');

    const proofItems = [
      ...(opening?.querySelectorAll('.performance-campaign-opening__proof li') ?? [])
    ];
    expect(proofItems).toHaveLength(2);
    expect(proofItems[0].textContent).toContain('Signals');
    expect(proofItems[0].textContent).toContain('Mapped');
    expect(opening?.querySelector('[data-testid="campaign-action"]')?.getAttribute('href')).toBe(
      '/book'
    );
    expect(opening?.querySelector('[data-testid="campaign-artifact"]')?.textContent).toContain(
      'property-owned'
    );
  });

  it('progressively enhances static campaign media with silent looping video', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceCampaignOpening, {
      target,
      props: {
        eyebrow: 'AI Performance Lab',
        title: 'Make one workflow safe to delegate.',
        media: {
          src: '/images/controlled-flow.webp',
          mobileSrc: '/images/controlled-flow-mobile.webp',
          alt: 'Water moving through a concrete spillway',
          video: {
            mp4: '/video/controlled-flow.mp4',
            webm: '/video/controlled-flow.webm',
            poster: '/images/controlled-flow-motion-poster.webp'
          }
        }
      }
    }) as Record<string, unknown>;
    flushSync();

    const opening = target.querySelector('section.performance-campaign-opening');
    const video = opening?.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.muted).toBe(true);
    expect(video?.hasAttribute('loop')).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video?.getAttribute('poster')).toBe('/images/controlled-flow-motion-poster.webp');
    expect(video?.querySelector('source[type="video/webm"]')?.getAttribute('src')).toBe(
      '/video/controlled-flow.webm'
    );
    expect(video?.querySelector('source[type="video/mp4"]')?.getAttribute('src')).toBe(
      '/video/controlled-flow.mp4'
    );
    expect(opening?.querySelector('picture img')?.getAttribute('src')).toBe(
      '/images/controlled-flow.webp'
    );
  });

  it('keeps campaign video absent when the operator prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceCampaignOpening, {
      target,
      props: {
        eyebrow: 'AI Performance Lab',
        title: 'Make one workflow safe to delegate.',
        media: {
          src: '/images/controlled-flow.webp',
          mobileSrc: '/images/controlled-flow-mobile.webp',
          alt: 'Water moving through a concrete spillway',
          video: {
            mp4: '/video/controlled-flow.mp4',
            webm: '/video/controlled-flow.webm'
          }
        }
      }
    }) as Record<string, unknown>;
    flushSync();

    const opening = target.querySelector('section.performance-campaign-opening');
    expect(opening?.querySelector('video')).toBeNull();
    expect(opening?.querySelector('picture img')?.getAttribute('src')).toBe(
      '/images/controlled-flow.webp'
    );
  });

  it('owns a high-contrast directional scrim for image-backed copy', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/performance/PerformanceCampaignOpening.svelte'),
      'utf8'
    );

    expect(source).toContain('--performance-campaign-scrim-copy: rgba(9, 9, 9, 0.94)');
    expect(source).toContain('--performance-campaign-scrim-mid: rgba(9, 9, 9, 0.24)');
    expect(source).toContain('--performance-campaign-scrim-edge: rgba(9, 9, 9, 0)');
    expect(source).toContain('linear-gradient(90deg,');
    expect(source).toContain('linear-gradient(0deg,');
    expect(source).toContain('@media (max-width: 47.99rem)');
  });

  it('owns mode-aware action contrast and a visible focus boundary', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/performance/PerformanceCampaignOpening.svelte'),
      'utf8'
    );

    expect(source).toContain(
      ".performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-primary)"
    );
    expect(source).toContain(
      ".performance-campaign-opening:not([data-mode='paper']) .performance-campaign-opening__actions :global(.btn-secondary)"
    );
    expect(source).toContain(
      ".performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__actions :global(.btn-primary)"
    );
    expect(source).toContain(
      ".performance-campaign-opening[data-mode='paper'] .performance-campaign-opening__actions :global(.btn-secondary)"
    );
    expect(source).toContain('.performance-campaign-opening__actions :global(.btn:focus-visible)');
    expect(source).toContain('outline: 3px solid var(--color-performance-signal-soft, #a7b8ff)');
  });

  it('composes the editorial expression as a dark visual hero with an operating artifact', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/performance/PerformanceCampaignOpening.svelte'),
      'utf8'
    );
    const compactSource = source.replace(/\s+/g, ' ');

    expect(source).toContain(".performance-campaign-opening[data-expression='editorial'] {");
    expect(source).toContain('grid-template-rows: minmax(max(44rem, 82svh), max-content)');
    expect(source).toContain('background: var(--color-performance-editorial-dark, #181312)');
    expect(compactSource).toContain(
      ".performance-campaign-opening[data-expression='editorial'] .performance-campaign-opening__content"
    );
    expect(source).toContain('font-family: var(--font-performance-editorial)');
    expect(source).toContain('background: var(--color-performance-editorial-brand, #fcaa2d)');
    expect(compactSource).toContain(
      "[data-expression='editorial'] .performance-campaign-opening__artifact"
    );
    expect(compactSource).toContain(
      "[data-expression='editorial'] .performance-campaign-opening__media"
    );
    expect(source).toContain('@media (max-width: 63.99rem)');
  });
});

describe('Performance composition typography', () => {
  it('defines the licensed editorial face as a local, optional performance token', () => {
    const performance = readFileSync(join(process.cwd(), 'src/lib/styles/performance.css'), 'utf8');
    const tokens = readFileSync(join(process.cwd(), 'src/lib/styles/tokens.css'), 'utf8');
    const compactTokens = tokens.replace(/\s+/g, ' ');

    expect(performance).toContain('@font-face');
    expect(performance).toContain("font-family: 'CS Editorial'");
    expect(performance).toContain("url('/fonts/create-something-editorial.woff2')");
    expect(performance).toContain('font-display: swap');
    expect(compactTokens).toContain(
      "--font-performance-editorial: 'CS Editorial', Georgia, 'Times New Roman', serif"
    );
  });

  it('keeps every composition on the shared display, kerning, weight, and tracking contract', () => {
    const components = [
      'PerformanceCampaignOpening.svelte',
      'PerformanceFieldStudy.svelte',
      'PerformanceThesisConditions.svelte',
      'PerformanceFieldSequence.svelte',
      'PerformanceContrastChapter.svelte',
      'PerformanceEvidenceIndex.svelte',
      'PerformanceConversionHandoff.svelte',
      'PerformanceNarrativeStage.svelte'
    ];

    const tokens = readFileSync(join(process.cwd(), 'src/lib/styles/tokens.css'), 'utf8');
    const compactTokens = tokens.replace(/\s+/g, ' ');
    expect(tokens).toContain('--font-performance-display: var(--font-performance-sans)');
    expect(compactTokens).toContain(
      "--font-performance-mono: 'IBM Plex Mono', 'SFMono-Regular', 'SF Mono', Menlo, Monaco, Consolas, monospace"
    );
    expect(tokens).toContain('--font-performance-display-weight: 500');
    expect(tokens).toContain('--tracking-performance-display: -0.03em');
    expect(tokens).toContain('--leading-performance-display: 0.94');

    for (const component of components) {
      const source = readFileSync(
        join(process.cwd(), 'src/lib/components/performance', component),
        'utf8'
      );
      expect(source, component).toContain('var(--font-performance-display');
      expect(source, component).toContain('var(--font-performance-display-weight');
      expect(source, component).toContain('var(--tracking-performance-display');
      expect(source, component).toContain('font-kerning: normal');
      expect(source, component).toMatch(
        /font-feature-settings:[\s\S]*?['"]kern['"] 1,[\s\S]*?['"]liga['"] 1/
      );
    }
  });

  it('uses the Meridian 1.1 leading contract for editorial proposition headings', () => {
    const tokens = readFileSync(join(process.cwd(), 'src/lib/styles/tokens.css'), 'utf8');
    expect(tokens).toContain('--leading-performance-editorial: 1.1');

    const components = [
      'performance/PerformanceCampaignOpening.svelte',
      'performance/PerformanceConversionHandoff.svelte',
      'performance/PerformanceNarrativeStage.svelte',
      'clear/ClearPageSection.svelte',
      'meridian/MeridianAccordion.svelte',
      'meridian/MeridianCardGrid.svelte',
      'meridian/MeridianEvidenceCarousel.svelte',
      'meridian/MeridianFeatureSplit.svelte',
      'meridian/MeridianMetrics.svelte',
      'meridian/MeridianOfferPanel.svelte'
    ];

    for (const component of components) {
      const source = readFileSync(join(process.cwd(), 'src/lib/components', component), 'utf8');
      expect(source, component).toContain('line-height: var(--leading-performance-editorial, 1.1)');
    }
  });

  it('loads the approved local mono source without a remote display-font request', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/styles/performance.css'), 'utf8');

    expect(source).not.toContain('fontshare');
    expect(source).toContain('@ibm/plex-mono/css/ibm-plex-mono-all.css');
    expect(source).toContain('font-family: var(--font-performance-display');
    expect(source).not.toMatch(
      /--font-performance-(sans|display|mono):\s*var\(--font-performance-\1\)/
    );
  });

  it('keeps the shared PerformancePageSection foundation on the same display contract', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/clear/ClearPageSection.svelte'),
      'utf8'
    );

    expect(source).toContain('var(--font-performance-display');
    expect(source).toContain('var(--font-performance-display-weight');
    expect(source).toContain('var(--tracking-performance-display');
    expect(source).toContain('font-kerning: normal');
    expect(source).toMatch(/font-feature-settings:[\s\S]*?['"]kern['"] 1,[\s\S]*?['"]liga['"] 1/);
  });

  it('offers the owned editorial face only through an explicit public-proposition expression', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/clear/ClearPageSection.svelte'),
      'utf8'
    );

    expect(source).toContain("type ClearSectionExpression = 'field' | 'editorial'");
    expect(source).toContain("expression = 'field'");
    expect(source).toContain('data-expression={expression}');
    expect(source).toContain(
      ".clear-page-section[data-expression='editorial'] .clear-page-section__title"
    );
    expect(source).toContain('font-family: var(--font-performance-editorial)');
  });
});

describe('PerformanceThesisConditions', () => {
  it('scales nested thesis typography from its own inline size', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/performance/PerformanceThesisConditions.svelte'),
      'utf8'
    );

    expect(source).toContain('container-type: inline-size');
    expect(source).toContain('@container (max-width: 64rem)');
    expect(source).toContain('font-size: clamp(2.5rem, 5cqi, 3.5rem)');
    expect(source).toContain('gap: clamp(1.5rem, 3.5cqi, 2.5rem)');
  });

  it('pairs one governing thesis with explicit operating conditions', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceThesisConditions, {
      target,
      props: {
        eyebrow: 'Operating principle',
        title: 'Governance is the channel, not the dam.',
        description: 'Movement stays legible, accountable, and bounded.',
        conditions: [
          {
            label: 'Pressure',
            title: 'Test under real conditions.',
            detail: 'Stress before delegation.',
            tone: 'pressure'
          },
          {
            label: 'Boundary',
            title: 'Design the limits.',
            detail: 'Stop conditions remain visible.',
            tone: 'signal'
          }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const section = target.querySelector('section.performance-thesis-conditions');
    expect(section?.getAttribute('aria-label')).toBe('Operating principle');
    expect(section?.querySelector('h2')?.textContent).toBe(
      'Governance is the channel, not the dam.'
    );
    const conditions = [
      ...(section?.querySelectorAll('.performance-thesis-conditions__condition') ?? [])
    ];
    expect(conditions).toHaveLength(2);
    expect(conditions[0].getAttribute('data-tone')).toBe('pressure');
    expect(conditions[1].textContent).toContain('Stop conditions remain visible.');
  });
});

describe('PerformanceFieldSequence', () => {
  it('renders ordered field studies as one named evidence sequence', () => {
    const sharedProof = {
      id: '#PR-2026-0710',
      owner: 'Platform Team',
      state: 'RUN',
      verified: 'Jul 10, 2026'
    };
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceFieldSequence, {
      target,
      props: {
        eyebrow: 'Field protocol',
        title: 'Test the workflow in sequence.',
        layout: 'sticky',
        studies: [
          {
            image: '/one.webp',
            alt: 'Pressure test',
            title: 'Apply pressure.',
            description: 'Expose the failure mode.',
            principle: 'Pressure reveals risk.',
            metrics: [{ label: 'Checks', value: '7 / 7' }],
            proof: sharedProof
          },
          {
            image: '/two.webp',
            alt: 'Proof settles',
            title: 'Settle the proof.',
            description: 'Make the outcome public.',
            principle: 'Evidence creates trust.',
            metrics: [{ label: 'Receipts', value: '3' }],
            proof: sharedProof,
            stage: 'receipt-settled'
          }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const sequence = target.querySelector('section.performance-field-sequence');
    expect(sequence?.getAttribute('data-layout')).toBe('sticky');
    expect(sequence?.querySelector('h2')?.textContent).toBe('Test the workflow in sequence.');
    const studies = [...(sequence?.querySelectorAll('.performance-field-study') ?? [])];
    expect(studies).toHaveLength(2);
    expect(studies[0].textContent).toContain('Figure 01');
    expect(studies[1].textContent).toContain('Figure 02');
    expect(studies[1].getAttribute('data-motion-stage')).toBe('receipt-settled');
  });
});

describe('PerformanceContrastChapter', () => {
  it('creates an explicit principle-to-intervention contrast with an artifact seam', () => {
    const artifact = createRawSnippet(() => ({
      render: () => '<div data-testid="contrast-artifact">Live workflow graph</div>'
    }));
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceContrastChapter, {
      target,
      props: {
        density: 'compact',
        eyebrow: 'Performance principle',
        title: 'A system should expose its wake.',
        description: 'Every consequential action leaves evidence.',
        intervention: {
          label: 'Intervention 03',
          title: 'Public proof surface',
          detail: 'Receipts make delegation inspectable.'
        },
        mode: 'ink-to-paper',
        artifact
      }
    }) as Record<string, unknown>;
    flushSync();

    const chapter = target.querySelector('section.performance-contrast-chapter');
    expect(chapter?.getAttribute('data-mode')).toBe('ink-to-paper');
    expect(chapter?.getAttribute('data-density')).toBe('compact');
    expect(chapter?.querySelector('h2')?.textContent).toBe('A system should expose its wake.');
    expect(chapter?.querySelector('h3')?.textContent).toBe('Public proof surface');
    expect(chapter?.querySelector('[data-testid="contrast-artifact"]')?.textContent).toBe(
      'Live workflow graph'
    );
  });

  it('can promote a live artifact to a full-width operating surface', () => {
    const artifact = createRawSnippet(() => ({
      render: () => '<div data-testid="full-width-artifact">Live canvas</div>'
    }));
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceContrastChapter, {
      target,
      props: {
        title: 'Map the work before AI runs it.',
        intervention: {
          label: 'Intervention 01',
          title: 'Atlas workflow map',
          detail: 'The canvas stays inspectable.'
        },
        artifactPlacement: 'full-width',
        artifact
      }
    }) as Record<string, unknown>;
    flushSync();

    const chapter = target.querySelector('section.performance-contrast-chapter');
    expect(chapter?.getAttribute('data-artifact-placement')).toBe('full-width');
    const promoted = chapter?.querySelector('.performance-contrast-chapter__artifact--full-width');
    expect(promoted?.querySelector('[data-testid="full-width-artifact"]')?.textContent).toBe(
      'Live canvas'
    );

    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/performance/PerformanceContrastChapter.svelte'),
      'utf8'
    );
    expect(source).toContain('grid-column: 1 / -1');
  });
});

describe('PerformanceEvidenceIndex', () => {
  it('renders inspectable evidence rows and a truthful empty state', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceEvidenceIndex, {
      target,
      props: {
        title: 'Evidence index',
        items: [
          {
            id: '#PR-0710-01',
            kind: 'Report',
            title: 'Workflow readiness',
            detail: 'Seven signals mapped.',
            state: 'verified',
            date: 'Jul 10, 2026',
            href: '/evidence/readiness'
          },
          {
            id: '#PR-0710-02',
            kind: 'Receipt',
            title: 'Delegation boundary',
            detail: 'Three stop conditions attached.',
            state: 'review',
            date: 'Jul 10, 2026'
          }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const index = target.querySelector('section.performance-evidence-index');
    expect(index?.querySelectorAll('.performance-evidence-index__item')).toHaveLength(2);
    expect(index?.querySelector('a[href="/evidence/readiness"]')?.textContent).toContain(
      'Workflow readiness'
    );
    expect(index?.querySelector('[data-state="review"]')?.textContent).toContain('#PR-0710-02');

    unmount(instance as never);
    instance = mount(PerformanceEvidenceIndex, {
      target,
      props: { title: 'Evidence index', items: [] }
    }) as Record<string, unknown>;
    flushSync();
    expect(target.querySelector('[data-empty="true"]')?.textContent).toContain(
      'No public evidence has been attached yet.'
    );
  });
});

describe('PerformanceConversionHandoff', () => {
  it('carries owner, authority, and proof into the conversion boundary', () => {
    const actions = createRawSnippet(() => ({
      render: () => '<a href="/book" data-testid="handoff-action">Map the workflow</a>'
    }));
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceConversionHandoff, {
      target,
      props: {
        eyebrow: 'Next protocol',
        title: 'Make one workflow safe to delegate.',
        description: 'Start with a bounded operating path and its proof surface.',
        handoff: {
          owner: 'AI Performance Lab',
          authority: 'Operator approval',
          proof: 'Public receipt',
          state: 'ready'
        },
        steps: [
          {
            label: 'Map',
            title: 'Name the boundary',
            detail: 'Expose the workflow and its owner.'
          },
          { label: 'Prove', title: 'Attach the receipt', detail: 'Keep evidence with the action.' }
        ],
        actions
      }
    }) as Record<string, unknown>;
    flushSync();

    const handoff = target.querySelector('section.performance-conversion-handoff');
    expect(handoff?.getAttribute('data-state')).toBe('ready');
    expect(handoff?.querySelector('h2')?.textContent).toBe('Make one workflow safe to delegate.');
    const values = [...(handoff?.querySelectorAll('dd') ?? [])].map((node) => node.textContent);
    expect(values).toEqual(['AI Performance Lab', 'Operator approval', 'Public receipt', 'ready']);
    expect(handoff?.querySelectorAll('.performance-conversion-handoff__step')).toHaveLength(2);
    expect(handoff?.textContent).toContain('Attach the receipt');
    expect(handoff?.querySelector('[data-testid="handoff-action"]')?.getAttribute('href')).toBe(
      '/book'
    );
  });

  it('gives wide operating artifacts a full-width handoff surface', () => {
    const aside = createRawSnippet(() => ({
      render: () => '<div data-testid="delegation-artifact">Delegation artifact</div>'
    }));
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceConversionHandoff, {
      target,
      props: {
        title: 'Bring one workflow your team is ready to delegate.',
        headingLevel: 'h1',
        handoff: {
          owner: 'CREATE SOMETHING',
          authority: 'Operator approval',
          proof: 'Workflow map',
          state: 'ready'
        },
        artifactPlacement: 'full-width',
        aside
      }
    }) as Record<string, unknown>;
    flushSync();

    const handoff = target.querySelector('section.performance-conversion-handoff');
    expect(handoff?.getAttribute('data-artifact-placement')).toBe('full-width');
    expect(handoff?.querySelector('h1')?.textContent).toBe(
      'Bring one workflow your team is ready to delegate.'
    );
    expect(
      handoff?.querySelector(
        ':scope > .performance-conversion-handoff__artifact [data-testid="delegation-artifact"]'
      )
    ).not.toBeNull();
    expect(
      handoff?.querySelector(
        '.performance-conversion-handoff__boundary [data-testid="delegation-artifact"]'
      )
    ).toBeNull();
  });

  it('exposes compact density without weakening the handoff ledger', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceConversionHandoff, {
      target,
      props: {
        title: 'Make the boundary explicit.',
        density: 'compact',
        handoff: { owner: 'Operator', authority: 'Review', proof: 'Receipt', state: 'ready' }
      }
    }) as Record<string, unknown>;
    flushSync();

    const handoff = target.querySelector('section.performance-conversion-handoff');
    expect(handoff?.getAttribute('data-density')).toBe('compact');
    expect(handoff?.querySelectorAll('dd')).toHaveLength(4);
  });
});

describe('Performance compact density', () => {
  it('keeps PageSection and DecisionPanel content available in compact mode', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformancePageSection, {
      target,
      props: {
        title: 'One sharp chapter.',
        description: 'The content remains visible.',
        density: 'compact'
      }
    }) as Record<string, unknown>;
    flushSync();

    const section = target.querySelector('section.clear-page-section');
    expect(section?.getAttribute('data-density')).toBe('compact');
    expect(section?.textContent).toContain('The content remains visible.');

    unmount(instance as never);
    target.innerHTML = '';
    instance = mount(PerformanceDecisionPanel, {
      target,
      props: {
        title: 'Build, govern, prove.',
        density: 'compact',
        autoRotate: false,
        items: [
          {
            label: 'Build',
            summary: 'Connect',
            title: 'Name the connection.',
            detail: 'Keep the judgment explicit.'
          }
        ]
      }
    }) as Record<string, unknown>;
    flushSync();

    const panel = target.querySelector('section.clear-decision-panel');
    expect(panel?.getAttribute('data-density')).toBe('compact');
    expect(panel?.textContent).toContain('Keep the judgment explicit.');
  });

  it('renders a compact property rail with every step and an optional handoff boundary', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PropertyFunnel, {
      target,
      props: {
        current: 'lms',
        density: 'compact',
        handoff: {
          owner: 'Learner',
          authority: 'Artifact review',
          proof: 'Working workflow',
          state: 'ready'
        }
      }
    }) as Record<string, unknown>;
    flushSync();

    const funnel = target.querySelector('section.property-funnel');
    expect(funnel?.getAttribute('data-density')).toBe('compact');
    expect(funnel?.querySelectorAll('.property-funnel__step')).toHaveLength(5);
    expect(funnel?.querySelectorAll('.property-funnel__step-summary')).toHaveLength(5);
    expect(funnel?.querySelector('.property-funnel__handoff')?.textContent).toContain(
      'Working workflow'
    );
  });
});

describe('PerformanceNarrativeStage', () => {
  const scenes = [
    {
      id: 'map',
      label: 'Map',
      summary: 'Boundary visible',
      title: 'See the whole workflow.',
      detail: 'Name the systems, owner, risk, and proof before implementation.',
      evidence: ['Systems are named'],
      receipts: ['workflow map']
    },
    {
      id: 'decide',
      label: 'Decide',
      summary: 'Authority routed',
      title: 'Keep consequential judgment.',
      detail: 'Safe work runs and exceptions reach a named operator.',
      evidence: ['Run, wait, and stop are explicit'],
      receipts: ['decision policy']
    },
    {
      id: 'prove',
      label: 'Prove',
      summary: 'Receipt attached',
      title: 'Leave an inspectable wake.',
      detail: 'Source evidence, policy, action, and recovery remain connected.',
      evidence: ['Outcome maps back to policy'],
      receipts: ['proof record'],
      actions: [{ label: 'Inspect proof', href: '/proof' }]
    }
  ];

  it('renders the editorial narrative as one aligned decision and receipt spread', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceNarrativeStage, {
      target,
      props: {
        title: 'Map the play. Build the system. Keep control.',
        expression: 'editorial',
        scenes
      }
    }) as Record<string, unknown>;
    flushSync();

    const stage = target.querySelector('section.performance-narrative-stage');
    expect(stage?.getAttribute('data-expression')).toBe('editorial');

    const source = readFileSync(
      join(process.cwd(), 'src/lib/components/performance/PerformanceNarrativeStage.svelte'),
      'utf8'
    );
    expect(source).toContain(".performance-narrative-stage[data-expression='editorial'] {");
    expect(source).toContain('font-family: var(--font-performance-editorial)');
    expect(source).toContain('border-radius: var(--radius-performance-editorial, 0.375rem)');
    expect(source).toContain(".performance-narrative-stage[data-expression='editorial'] h2 {");
    expect(source).toContain(
      ".performance-narrative-stage[data-expression='editorial']\n    .performance-narrative-stage__scene-head\n    h3 {"
    );
    expect(source).toContain('line-height: var(--leading-performance-editorial, 1.1);');
  });

  it('keeps every scene summary visible while one complete proof scene holds focus', () => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceNarrativeStage, {
      target,
      props: {
        id: 'workflow-story',
        eyebrow: 'Operating sequence',
        title: 'Map. Decide. Prove.',
        description: 'One argument, held in one stage.',
        scenes
      }
    }) as Record<string, unknown>;
    flushSync();

    const stage = target.querySelector('section.performance-narrative-stage');
    const tabs = [...(stage?.querySelectorAll('[role="tab"]') ?? [])];
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      expect.stringContaining('Boundary visible'),
      expect.stringContaining('Authority routed'),
      expect.stringContaining('Receipt attached')
    ]);
    expect(stage?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Map'
    );
    expect(stage?.querySelector('[role="tabpanel"]:not([hidden])')?.textContent).toContain(
      'See the whole workflow.'
    );

    (tabs[2] as HTMLButtonElement).click();
    flushSync();

    expect(stage?.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Prove'
    );
    const activePanel = stage?.querySelector('[role="tabpanel"]:not([hidden])');
    expect(activePanel?.textContent).toContain('Leave an inspectable wake.');
    expect(activePanel?.textContent).toContain('Outcome maps back to policy');
    expect(activePanel?.textContent).toContain('proof record');
    expect(activePanel?.querySelector('a')?.getAttribute('href')).toBe('/proof');
  });

  it('renders an optional evidence preview before scene navigation', () => {
    const preview = createRawSnippet(() => ({
      render: () =>
        '<div data-testid="narrative-evidence-preview">15 artifacts · 5 cases · 2 matching compilations</div>'
    }));

    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceNarrativeStage, {
      target,
      props: {
        id: 'workflow-story',
        title: 'Map. Decide. Prove.',
        scenes,
        preview
      }
    }) as Record<string, unknown>;
    flushSync();

    const previewElement = target.querySelector('[data-testid="narrative-evidence-preview"]');
    const tablist = target.querySelector('[role="tablist"]');

    expect(previewElement).not.toBeNull();
    expect(previewElement?.compareDocumentPosition(tablist as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('supports roving keyboard selection and fragment-addressable scenes', () => {
    window.history.replaceState(null, '', '#workflow-story-decide');
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = mount(PerformanceNarrativeStage, {
      target,
      props: { id: 'workflow-story', title: 'Map. Decide. Prove.', scenes }
    }) as Record<string, unknown>;
    flushSync();

    let selected = target.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toContain('Decide');
    selected?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    flushSync();

    selected = target.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toContain('Prove');
    expect(document.activeElement).toBe(selected);
    expect(window.location.hash).toBe('#workflow-story-prove');
  });
});
