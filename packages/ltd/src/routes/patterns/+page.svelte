<script lang="ts">
  import {
    CanonCollectionRail,
    CanonIndexOpening,
    type CanonCollectionItem
  } from '$lib/components';
  import {
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';

  const patternItems: CanonCollectionItem[] = [
    {
      title: 'Constraint as Liberation',
      href: '/patterns/constraint-as-liberation',
      detail:
        'Start with constraints, not features. Limitation creates the boundary for useful invention.',
      points: ['Limited palette', 'Restricted components', 'Fixed grid']
    },
    {
      title: 'Breakdown and Repair',
      href: '/patterns/breakdown-and-repair',
      detail: 'Use a failure to reveal the system, repair it, and preserve what the failure taught.'
    },
    {
      title: 'Functional Transparency',
      href: '/patterns/functional-transparency',
      detail: 'Make how the thing works evident through honest structure, code, and dependencies.',
      points: ['Exposed structure', 'Self-documenting APIs', 'Clear dependency graphs']
    },
    {
      title: 'Iterative Reduction',
      href: '/patterns/iterative-reduction',
      detail: 'Start complex, then remove relentlessly until only the useful structure remains.',
      points: ['Ship and measure', 'Remove unused features', 'Refactor toward clarity']
    },
    {
      title: 'Universal Utility',
      href: '/patterns/universal-utility',
      detail:
        'Serve more people through accessibility, progressive enhancement, and sensible defaults.'
    },
    {
      title: 'Timeless Materials',
      href: '/patterns/timeless-materials',
      detail:
        'Choose standards and materials that age well instead of following a short-lived trend.'
    },
    {
      title: 'Negative Space',
      href: '/patterns/negative-space',
      detail: 'Treat what you do not build as part of the system’s quality and hierarchy.'
    },
    {
      title: 'Tool Complementarity',
      href: '/patterns/tool-complementarity',
      detail: 'Give each tool one domain and make the handoff clearer than the overlap.'
    },
    {
      title: 'Dwelling in Tools',
      href: '/patterns/dwelling-in-tools',
      detail: 'Build habits and infrastructure that recede while the practitioner works.'
    },
    {
      title: 'Principled Defaults',
      href: '/patterns/principled-defaults',
      detail: 'Trace configuration values to a principle instead of choosing arbitrary numbers.'
    },
    {
      title: 'Subtractive Triad Audit',
      href: '/patterns/subtractive-triad-audit',
      detail:
        'Unify duplication, remove what cannot justify itself, and reconnect the result to the whole.'
    },
    {
      title: 'Hermeneutic Spiral',
      href: '/patterns/hermeneutic-spiral',
      detail: 'Carry context forward so each interaction deepens rather than resets understanding.'
    },
    {
      title: 'Code Mode',
      href: '/patterns/code-mode',
      detail:
        'Let tools recede through familiar code that composes operations instead of exposing schemas.'
    },
    {
      title: 'Crystallization',
      href: '/patterns/crystallization',
      detail: 'Encode human judgment into constraints that an agent can execute within.'
    }
  ];

  const quickStarts = [
    {
      question: 'Building something new?',
      answer: 'Start with constraints, not features.',
      label: 'Constraint as Liberation',
      href: '/patterns/constraint-as-liberation'
    },
    {
      question: 'Something broke?',
      answer: 'Repair it, then preserve why it failed.',
      label: 'Breakdown and Repair',
      href: '/patterns/breakdown-and-repair'
    },
    {
      question: 'Too much complexity?',
      answer: 'Remove until only the essential structure remains.',
      label: 'Iterative Reduction',
      href: '/patterns/iterative-reduction'
    }
  ];

  const antiPatterns = [
    [
      'Feature Creep',
      'Adding features because you can, not because users need them.',
      'Start with core functionality. Add only what proves necessary.'
    ],
    [
      'Decorative Complexity',
      'Ornamentation that serves ego rather than the reader or operator.',
      'Keep only visual elements that communicate or assist.'
    ],
    [
      'Trend Chasing',
      'Choosing a framework, style, or method only because it is popular.',
      'Choose from durable principles and standards.'
    ],
    [
      'Premature Abstraction',
      'Building for hypothetical cases before the pattern is visible.',
      'Wait for repeated evidence, then abstract.'
    ],
    [
      'Metric Vanity',
      'Optimizing engagement or growth instead of useful outcomes.',
      'Measure completion, error reduction, and time saved.'
    ],
    [
      'Dishonest Documentation',
      'Hiding limitations or presenting marketing as research.',
      'Keep failures, limits, metrics, and methods visible.'
    ],
    [
      'Tool Redundancy',
      'Letting several tools compete for the same task.',
      'Assign clear domains and explicit handoffs.'
    ]
  ];

  const recognition = [
    ['Iterative Reduction', 'Removing a feature makes the product better.'],
    ['Constraint as Liberation', 'A real limitation forces a more coherent solution.'],
    ['Functional Transparency', 'The structure explains the code without extra ceremony.'],
    ['Tool Complementarity', 'Each tool has a clear domain and handoff.'],
    ['Hermeneutic Spiral', 'A returning user does not have to repeat known context.'],
    ['Code Mode', 'The operator composes tools as familiar code rather than invoking raw schemas.'],
    [
      'Crystallization',
      'An approved configuration lets agents execute expert judgment within clear boundaries.'
    ]
  ];

  const doctrineScenes: PerformanceNarrativeScene[] = [
    {
      id: 'choose',
      label: 'Choose',
      summary: 'Name the situation first',
      title: 'Start with the condition you can observe.',
      detail:
        'The right pattern follows from the current constraint, breakdown, or excess—not from a preferred technique.',
      tone: 'allow',
      evidence: ['New work', 'A breakdown', 'Excess complexity']
    },
    {
      id: 'reference',
      label: 'Reference',
      summary: 'See several patterns combine',
      title: 'Terminal as Dwelling',
      detail: 'A terminal configuration turns five patterns into inspectable choices.',
      tone: 'review',
      evidence: ['Five patterns applied', 'Two elements removed', 'Four values derived']
    },
    {
      id: 'avoid',
      label: 'Avoid',
      summary: 'Recognize the failed move',
      title: 'Anti-Patterns to Avoid',
      detail: 'These moves add surface area while weakening utility, evidence, or ownership.',
      tone: 'block',
      evidence: antiPatterns.map(([name]) => name)
    },
    {
      id: 'recognize',
      label: 'Recognize',
      summary: 'Find the pattern in practice',
      title: 'Recognizing Patterns in Your Work',
      detail: 'Name the pattern in current work.',
      tone: 'allow',
      evidence: recognition.map(([name]) => name)
    }
  ];
</script>

<SEO
  title="Operational Patterns"
  description="Reusable patterns for choosing constraints, repairing breakdowns, reducing complexity, and leaving proof behind."
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Patterns', url: 'https://createsomething.ltd/patterns' }
  ]}
/>

<CanonIndexOpening
  current="patterns"
  title="Patterns"
  description="Name the condition you can observe, then choose the pattern that changes what the team does next."
  recommendation={{
    label: 'Begin with Constraint as Liberation',
    detail:
      'When the situation is still unclear, start by defining the boundary before adding features.',
    href: '/patterns/constraint-as-liberation'
  }}
/>

<CanonCollectionRail
  id="pattern-collection"
  title="Choose the pattern that matches the condition."
  description="Every card opens a direct pattern source. Use the condition and practical consequence to choose before reading the full doctrine."
  items={patternItems}
  emptyMessage="No pattern sources are available. Return to Canon foundations and begin with the governing constraints."
  columns={3}
/>

<PerformanceNarrativeStage
  id="pattern-operating-doctrine"
  eyebrow="Apply the pattern"
  title="Choose, inspect, avoid, recognize."
  description="Supporting doctrine stays in one sequence after the direct collection, so it helps the decision without competing with it."
  scenes={doctrineScenes}
  ariaLabel="Pattern operating doctrine"
>
  {#snippet artifact(scene)}
    {#if scene.id === 'choose'}
      <div class="quick-start">
        {#each quickStarts as item}
          <article>
            <strong>{item.question}</strong>
            <p>{item.answer}</p>
            <a href={item.href}>{item.label} →</a>
          </article>
        {/each}
      </div>
    {:else if scene.id === 'reference'}
      <div class="reference">
        <header>
          <strong>Terminal as Dwelling</strong>
          <span>WezTerm + Shell Configuration</span>
        </header>
        <div class="reference__grid">
          <article>
            <span>Derived</span>
            <p>
              15pt type, 1.5 line height, golden-ratio padding, and functional colors all trace to
              Canon.
            </p>
          </article>
          <article>
            <span>Removed</span>
            <p>
              The Claude launcher failed the feature test; resize keybindings conflicted with the
              system.
            </p>
          </article>
          <article>
            <span>Verified</span>
            <p>
              Part and whole agree: the palette, spacing, and restrained behavior reveal the same
              ethos.
            </p>
          </article>
        </div>
        <a
          href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/terminal"
          target="_blank"
          rel="noopener noreferrer">Inspect the terminal source →</a
        >
      </div>
    {:else if scene.id === 'avoid'}
      <div class="anti-patterns">
        {#each antiPatterns as [name, failure, repair]}
          <article>
            <strong>{name}</strong>
            <p>{failure}</p>
            <span>Instead: {repair}</span>
          </article>
        {/each}
      </div>
    {:else}
      <div class="recognition">
        {#each recognition as [name, signal]}
          <article>
            <strong>{name}</strong>
            <p>{signal}</p>
          </article>
        {/each}
        <blockquote>
          “The ability to simplify means to eliminate the unnecessary so that the necessary may
          speak.” <cite>— Hans Hofmann</cite>
        </blockquote>
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<style>
  .quick-start,
  .reference__grid,
  .anti-patterns,
  .recognition {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    min-width: 0;
  }

  .quick-start article,
  .reference__grid article,
  .anti-patterns article,
  .recognition article {
    display: grid;
    align-content: start;
    gap: 0.55rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .quick-start p,
  .reference p,
  .anti-patterns p,
  .recognition p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .reference {
    display: grid;
    gap: 1rem;
    min-width: 0;
  }

  .reference > header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .reference span,
  .anti-patterns span,
  blockquote cite {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-style: normal;
    text-transform: uppercase;
  }

  .anti-patterns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  blockquote {
    grid-column: 1 / -1;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
  }

  @media (max-width: 720px) {
    .quick-start,
    .reference__grid,
    .anti-patterns,
    .recognition {
      grid-template-columns: 1fr;
    }
  }
</style>
