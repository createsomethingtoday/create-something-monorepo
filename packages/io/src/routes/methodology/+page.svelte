<script lang="ts">
  import { PerformanceNarrativeStage, SEO } from '@create-something/canon';
  import OrientationOpening from '$lib/components/orientation/OrientationOpening.svelte';

  const faqItems = [
    {
      question: 'How do you track AI development experiments?',
      answer:
        'Automated logging captures API costs, time, errors, prompts, and human interventions so each published result carries inspectable evidence.'
    },
    {
      question: 'What makes this different from AI development blogs?',
      answer:
        'The process, metrics, limitations, and interventions remain visible. The result is reproducible knowledge rather than an outcome-only anecdote.'
    },
    {
      question: 'Why focus on AI-native development?',
      answer:
        'AI agents generate code and influence architecture, so the practice needs explicit evaluation, supervision, and reproducibility standards.'
    },
    {
      question: 'How do you measure experiment success?',
      answer:
        'Completion time, API costs, error rates, human intervention, output quality, and the confidence of the underlying data all matter.'
    },
    {
      question: 'Can I reproduce your experiments?',
      answer:
        'Published experiments document the process, tools, prompts, interventions, and evidence needed to inspect or repeat the work.'
    }
  ];

  const process = [
    { step: '01', title: 'Build', detail: 'Work with AI agents as development partners.' },
    {
      step: '02',
      title: 'Track',
      detail: 'Hooks capture prompts, errors, costs, and interventions.'
    },
    { step: '03', title: 'Analyze', detail: 'Compare time, quality, and technical evidence.' },
    { step: '04', title: 'Publish', detail: 'Report what worked, what failed, and why.' }
  ];

  const metrics = [
    {
      name: 'Prompts',
      detail: 'Real-time logging through Claude Code hooks',
      example: '47 iterations logged'
    },
    {
      name: 'Errors',
      detail: 'Counts and resolution time',
      example: '23 errors; 8-minute average fix'
    },
    {
      name: 'Costs',
      detail: 'Token and infrastructure use from APIs',
      example: '$18.50 Claude + $8.30 Cloudflare'
    },
    {
      name: 'Interventions',
      detail: 'Where the agent needed human help',
      example: '12 manual fixes documented'
    },
    {
      name: 'Time',
      detail: 'Measured session duration',
      example: '26 hours actual vs 120 estimated'
    },
    {
      name: 'Architecture',
      detail: 'Decisions and rejected alternatives',
      example: 'Workflows over Workers, with rationale'
    }
  ];

  const visualizationPrinciples = [
    { name: 'Maximize Data-Ink Ratio', use: 'Remove decoration that obscures evidence.' },
    { name: 'Show Data Variation', use: 'Display change and patterns, not only a static total.' },
    { name: 'High Data Density', use: 'Fit more meaningful comparison into the same space.' },
    { name: 'Integrate Text & Data', use: 'Keep labels, values, and context together.' },
    { name: 'Small Multiples', use: 'Compare repeated states side by side.' },
    { name: 'Remove Chartjunk', use: 'Let the evidence, not decoration, carry emphasis.' }
  ];

  const modes = [
    {
      name: 'Real-Time Tracking',
      label: 'Ideal',
      detail: 'Track from day one for complete prompts, errors, and decisions.',
      quality: 'High confidence, precise metrics',
      use: 'New experiments'
    },
    {
      name: 'Mid-Flight Tracking',
      label: 'Practical',
      detail: 'Combine current logging with reconstructed git history.',
      quality: 'Estimated past, precise future',
      use: 'Active projects'
    },
    {
      name: 'Retroactive Documentation',
      label: 'Still valuable',
      detail: 'Reconstruct a completed project from git, APIs, and operator memory.',
      quality: 'Lower confidence with explicit limits',
      use: 'Deployed projects'
    }
  ];

  const scenes = [
    {
      id: 'method',
      label: 'Method',
      summary: 'Build, track, analyze, publish',
      title: 'The method starts before the result exists.',
      detail:
        'Choose the strongest tracking mode the work allows, then preserve the uncertainty of any reconstructed evidence instead of presenting it as precise.',
      tone: 'neutral' as const,
      evidence: ['Four-step operating loop', 'Three confidence-aware tracking modes']
    },
    {
      id: 'evidence',
      label: 'Evidence',
      summary: 'Measure and display the claim',
      title: 'A tracked result still fails if the evidence is hard to inspect.',
      detail:
        'Six recurring measurements establish the record; Tufte-informed presentation keeps the data, context, and uncertainty close together.',
      tone: 'review' as const,
      evidence: [
        'Six tracked dimensions',
        'Six visualization principles',
        'Credibility, reproducibility, efficiency'
      ]
    },
    {
      id: 'apply',
      label: 'Apply',
      summary: 'Use the method on real work',
      title: 'Adoption is a three-step practice, not a new reporting layer.',
      detail:
        'Install the tracking seam, build while it records, then publish a paper whose conclusion can be checked against the captured work.',
      tone: 'allow' as const,
      actions: [{ label: 'Browse current experiments', href: '/experiments' }]
    },
    {
      id: 'canon',
      label: 'Canon',
      summary: 'Name the governing influence',
      title: 'Edward R. Tufte defines the information-design standard behind the evidence.',
      detail:
        'Canon status is earned through practical, evidence-based use. The influence remains visible beside the concrete ways it shapes this publication.',
      tone: 'neutral' as const,
      actions: [{ label: 'Explore all masters', href: 'https://createsomething.ltd/masters' }]
    }
  ];
</script>

<SEO
  title="Research Methodology"
  description="How CREATE SOMETHING produces credible knowledge about AI-native development through tracked work, explicit limitations, and reproducible evidence."
  keywords="research methodology, experiment tracking, AI-native development, reproducible research, Claude Code, systems thinking"
  canonical="https://createsomething.io/methodology"
  propertyName="io"
  {faqItems}
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io/' },
    { name: 'Methodology', url: 'https://createsomething.io/methodology' }
  ]}
/>

<OrientationOpening
  active="methodology"
  eyebrow="Research operating method"
  title="Document the process, not only the result"
  description="CREATE SOMETHING turns AI-native development from an anecdote into an inspectable experiment. The record tracks the work, its costs, its failures, and the interventions that changed it."
  summary={[
    { label: 'Loop', value: '4 steps' },
    { label: 'Evidence', value: '6 dimensions' },
    { label: 'Modes', value: '3 confidence levels' }
  ]}
/>

<div class="orientation-stage">
  <PerformanceNarrativeStage
    id="research-method"
    eyebrow="From work to knowledge"
    title="One operating loop connects collection, interpretation, and publication."
    description="Move from the method to its evidence, then inspect how to apply it and which information-design standard governs the result."
    {scenes}
    ariaLabel="Research methodology"
  >
    {#snippet artifact(_scene, index)}
      {#if index === 0}
        <div class="method-artifact">
          <ol class="process-grid">
            {#each process as item}
              <li>
                <span>{item.step}</span><strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            {/each}
          </ol>

          <div class="mode-grid">
            {#each modes as mode}
              <article>
                <div>
                  <h3>{mode.name}</h3>
                  <span>{mode.label}</span>
                </div>
                <p>{mode.detail}</p>
                <dl>
                  <div>
                    <dt>Data quality</dt>
                    <dd>{mode.quality}</dd>
                  </div>
                  <div>
                    <dt>Use when</dt>
                    <dd>{mode.use}</dd>
                  </div>
                </dl>
              </article>
            {/each}
          </div>
        </div>
      {:else if index === 1}
        <div class="evidence-artifact">
          <div class="metric-grid">
            {#each metrics as metric}
              <article>
                <h3>{metric.name}</h3>
                <p>{metric.detail}</p>
                <code>{metric.example}</code>
              </article>
            {/each}
          </div>

          <blockquote>
            Excellence in quantitative communication requires clarity, precision, and efficiency.
            <cite>Edward Tufte, The Visual Display of Quantitative Information</cite>
          </blockquote>

          <div class="principle-grid">
            {#each visualizationPrinciples as principle}
              <article>
                <h3>{principle.name}</h3>
                <p>{principle.use}</p>
              </article>
            {/each}
          </div>

          <div class="tracking-contrast">
            <article>
              <h3>Without tracking</h3>
              <ul>
                <li>“I built X with AI” remains an anecdote</li>
                <li>The work cannot be reproduced</li>
                <li>The claim cannot be checked</li>
              </ul>
            </article>
            <article>
              <h3>With tracking</h3>
              <ul>
                <li>Time, costs, errors, and savings are explicit</li>
                <li>Other practitioners can repeat the experiment</li>
                <li>The methodology and limits remain visible</li>
              </ul>
            </article>
          </div>

          <p class="why-evidence">
            Clear evidence protects credibility, makes reproduction possible, and lets a researcher
            extract the relevant signal without scrolling through decorative explanation.
          </p>
        </div>
      {:else if index === 2}
        <div class="apply-artifact">
          <ol class="adoption-grid">
            <li>
              <span>01</span><strong>Install the skill</strong>
              <p>Add tracking to the AI development setup.</p>
            </li>
            <li>
              <span>02</span><strong>Build and track</strong>
              <p>Let automatic logging capture the working process.</p>
            </li>
            <li>
              <span>03</span><strong>Generate papers</strong>
              <p>Turn the record into reproducible research.</p>
            </li>
          </ol>

          <article class="historical-example">
            <div>
              <span>Historical experiment example</span>
              <h3>Zoom Transcript Automation</h3>
              <p>
                The original detail route is no longer a live publication destination. Its retained
                measurements still demonstrate how the method joins outcome, cost, intervention, and
                source evidence.
              </p>
            </div>
            <dl>
              <div>
                <dt>Hours</dt>
                <dd>26</dd>
              </div>
              <div>
                <dt>Errors</dt>
                <dd>47</dd>
              </div>
              <div>
                <dt>Interventions</dt>
                <dd>12</dd>
              </div>
              <div>
                <dt>Time savings</dt>
                <dd>78%</dd>
              </div>
            </dl>
            <p>
              <strong>Data sources:</strong> real-time prompt logging, Claude Code Analytics API, Cloudflare
              billing API, and git history.
            </p>
            <p>
              <strong>Reproducibility:</strong> starting prompt, tracking logs, and architecture decisions
              were documented.
            </p>
            <div class="example-actions">
              <a href="/experiments">Browse current experiments</a>
              <a
                href="https://github.com/createsomethingtoday/create-something-experiments"
                target="_blank"
                rel="noopener noreferrer">Inspect the historical research repository</a
              >
            </div>
          </article>
        </div>
      {:else}
        <div class="canon-artifact">
          <article class="master-card">
            <div>
              <span>Data visualization</span>
              <h3>Edward R. Tufte</h3>
              <p>Professor Emeritus, Yale University</p>
            </div>
            <p>
              <em>The Visual Display of Quantitative Information</em> established principles for showing
              complex evidence with less decoration and more inspectable variation.
            </p>
            <div class="master-columns">
              <div>
                <strong>Principles applied</strong>
                <ul>
                  <li>Maximize data-ink ratio</li>
                  <li>Show data variation</li>
                  <li>Remove chartjunk</li>
                </ul>
              </div>
              <div>
                <strong>Implemented in</strong>
                <ul>
                  <li>Analytics dashboards</li>
                  <li>Experiment metrics</li>
                  <li>Research-paper evidence</li>
                </ul>
              </div>
            </div>
            <div class="master-links">
              <a href="https://createsomething.ltd/masters/edward-tufte">Full Canon entry</a>
              <a href="https://www.edwardtufte.com/tufte/" target="_blank" rel="noopener noreferrer"
                >Official site</a
              >
            </div>
          </article>

          <article class="canon-criteria">
            <h3>How work enters the Canon</h3>
            <ul>
              <li>
                <strong>Foundational impact</strong><span>Established a principle used here.</span>
              </li>
              <li>
                <strong>Practical application</strong><span
                  >The work changed an implementation.</span
                >
              </li>
              <li>
                <strong>Evidence-based approach</strong><span>The influence can be inspected.</span>
              </li>
              <li>
                <strong>Timeless relevance</strong><span>The principle survives a tool change.</span
                >
              </li>
            </ul>
            <p>The Canon grows through proven practice, not speculative affiliation.</p>
          </article>
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>
</div>

<section class="orientation-handoff" aria-labelledby="method-handoff-title">
  <div>
    <p>Continue with the artifact</p>
    <h2 id="method-handoff-title">
      Inspect the experiments, then test whether the evidence changes practice.
    </h2>
    <div>
      <a class="primary" href="/experiments">Browse experiments</a>
      <a href="/papers">Read research papers</a>
      <a href="https://createsomething.ltd/masters">Explore the Canon</a>
    </div>
  </div>
</section>

<style>
  .method-artifact,
  .evidence-artifact,
  .apply-artifact,
  .canon-artifact {
    display: grid;
    gap: var(--space-performance-lg);
  }

  .process-grid,
  .adoption-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    gap: var(--space-performance-sm);
    list-style: none;
  }

  .adoption-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .process-grid li,
  .adoption-grid li,
  .mode-grid article,
  .metric-grid article,
  .principle-grid article,
  .tracking-contrast article,
  .historical-example,
  .master-card,
  .canon-criteria {
    display: grid;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-md);
    border: 1px solid var(--color-performance-border-default);
    background: var(--color-performance-bg-surface);
  }

  .process-grid span,
  .adoption-grid span,
  .historical-example span,
  .master-card span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .process-grid p,
  .adoption-grid p,
  .mode-grid p,
  .metric-grid p,
  .principle-grid p,
  .historical-example p,
  .master-card p,
  .canon-criteria p {
    margin: 0;
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .mode-grid,
  .metric-grid,
  .principle-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  .mode-grid article > div {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-performance-sm);
  }

  .mode-grid h3,
  .metric-grid h3,
  .principle-grid h3,
  .tracking-contrast h3,
  .historical-example h3,
  .master-card h3,
  .canon-criteria h3 {
    margin: 0;
    font-size: var(--text-performance-body-lg);
  }

  .mode-grid article > div > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .mode-grid dl,
  .historical-example dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: var(--space-performance-sm) 0 0;
    gap: var(--space-performance-sm);
  }

  .mode-grid dt,
  .historical-example dt {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .mode-grid dd,
  .historical-example dd {
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  .metric-grid code {
    width: fit-content;
    max-width: 100%;
    padding: 0.3rem 0.45rem;
    background: var(--color-performance-bg-subtle);
    overflow-wrap: anywhere;
  }

  blockquote {
    display: grid;
    margin: 0;
    padding: var(--space-performance-lg);
    gap: var(--space-performance-sm);
    border-left: 0.25rem solid var(--color-performance-fg-primary);
    background: var(--color-performance-bg-subtle);
    font-size: var(--text-performance-body-lg);
  }

  blockquote cite {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
  }

  .tracking-contrast {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-sm);
  }

  .tracking-contrast ul,
  .master-columns ul,
  .canon-criteria ul {
    display: grid;
    margin: 0;
    padding: 0;
    gap: var(--space-performance-xs);
    list-style: none;
  }

  .tracking-contrast li,
  .master-columns li,
  .canon-criteria li {
    color: var(--color-performance-fg-secondary);
  }

  .why-evidence {
    margin: 0;
    padding-left: var(--space-performance-md);
    border-left: 0.25rem solid var(--color-performance-fg-primary);
    color: var(--color-performance-fg-secondary);
    font-weight: var(--font-performance-semibold);
  }

  .historical-example {
    gap: var(--space-performance-md);
  }

  .historical-example > div:first-child {
    display: grid;
    gap: var(--space-performance-xs);
  }

  .historical-example dl {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .historical-example dl div {
    padding: var(--space-performance-sm);
    background: var(--color-performance-bg-subtle);
  }

  .historical-example dd {
    font-size: var(--text-performance-h2);
  }

  .example-actions,
  .master-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
  }

  .example-actions a,
  .master-links a {
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  .canon-artifact {
    grid-template-columns: 1.25fr 0.75fr;
  }

  .master-card,
  .canon-criteria {
    gap: var(--space-performance-md);
  }

  .master-card > div:first-child {
    display: grid;
    gap: 0.25rem;
  }

  .master-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .master-columns > div {
    display: grid;
    gap: var(--space-performance-sm);
  }

  .canon-criteria li {
    display: grid;
    gap: 0.2rem;
    padding-block: var(--space-performance-xs);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .canon-criteria li span {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
  }

  .orientation-handoff {
    padding: clamp(3rem, 7vw, 5rem) 1.5rem;
  }

  .orientation-handoff > div {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-md);
  }

  .orientation-handoff p,
  .orientation-handoff h2 {
    margin: 0;
  }

  .orientation-handoff p {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .orientation-handoff h2 {
    max-width: 28ch;
    font-size: var(--text-performance-h2);
  }

  .orientation-handoff > div > div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
  }

  .orientation-handoff a {
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--color-performance-border-default);
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  .orientation-handoff a.primary {
    border-color: var(--color-performance-fg-primary);
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
  }

  @media (max-width: 900px) {
    .process-grid,
    .mode-grid,
    .metric-grid,
    .principle-grid,
    .tracking-contrast,
    .canon-artifact {
      grid-template-columns: 1fr;
    }

    .process-grid,
    .adoption-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .process-grid,
    .adoption-grid,
    .master-columns,
    .historical-example dl {
      grid-template-columns: 1fr;
    }

    .orientation-handoff {
      padding-inline: 1.25rem;
    }
  }
</style>
