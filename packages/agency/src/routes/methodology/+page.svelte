<script lang="ts">
  import {
    Button,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const disciplines = [
    {
      level: 1,
      name: 'DRY',
      domain: 'Implementation',
      question: 'Have we built this before?',
      action: 'Unify',
      description:
        'I look for duplicate tools, repeated workflows, and the same data being entered twice. If three teams solve the same problem three different ways, that is design debt. We map it, measure it, and collapse it into one clearer system.',
      outcome: 'Less duplication, cleaner data, lower drag.'
    },
    {
      level: 2,
      name: 'Rams',
      domain: 'Evidence',
      question: 'Does this earn its existence?',
      action: 'Remove',
      description:
        'Named for Dieter Rams: less, but better. Every tool, workflow, and automation has to justify its place in the stack. If nobody would miss it, trust it, or measure it, we stop carrying it.',
      outcome: 'A leaner stack where every component earns its keep.'
    },
    {
      level: 3,
      name: 'Heidegger',
      domain: 'System',
      question: 'Does this serve the whole?',
      action: 'Reconnect',
      description:
        'Named for the hermeneutic circle: every part must serve the whole, and the whole gives meaning to every part. The tools that survive the first two cuts must connect into one operating system, not a row of isolated islands.',
      outcome: 'A connected system where every component serves the mission.'
    }
  ];

  const phases = [
    {
      weeks: 'Step 1',
      name: 'Map the manual coverage burden',
      description:
        'Name the handoff, owner, systems, exceptions, and current human execution or monitoring burden.'
    },
    {
      weeks: 'Step 2',
      name: 'Subtract the noise',
      description:
        'Remove duplicated work, excess tools, and disconnected records before adding automation.'
    },
    {
      weeks: 'Step 3',
      name: 'Classify the decisions',
      description:
        'Define what can auto-run, what needs approval, and what should block with a reason.'
    },
    {
      weeks: 'Step 4',
      name: 'Ship the operator path',
      description:
        'Deliver the first controlled connection, runbook, operating notes, and operator brief surface.'
    }
  ];

  const methodologyScenes: PerformanceNarrativeScene[] = [
    {
      id: 'principle',
      label: 'Principle',
      summary: 'Subtract before control',
      title: 'The Core Principle',
      detail:
        'Most automation strategies fail because they add more tools, exceptions, and hidden handoffs than the operator can monitor. Remove what does not belong first, then control the records, actions, judgment states, and receipts that remain.',
      tone: 'block',
      receipts: ['less duplication', 'less excess', 'less disconnection']
    },
    {
      id: 'checks',
      label: 'Checks',
      summary: 'Unify → remove → reconnect',
      title: 'The Three Checks',
      detail:
        'One principle applies at three scales so the workflow becomes simpler before it becomes faster.',
      tone: 'review',
      evidence: ['DRY / Implementation', 'Rams / Evidence', 'Heidegger / System']
    },
    {
      id: 'process',
      label: 'Process',
      summary: 'Map → subtract → classify → ship',
      title: 'The Process Applied',
      detail:
        'The Triad becomes a calm operating path by naming the burden, removing noise, classifying decisions, and shipping the smallest operator surface.',
      tone: 'allow'
    },
    {
      id: 'map',
      label: 'Map',
      summary: 'Make the boundary visible',
      title: 'The method as a map',
      detail:
        'The same canvas language shows what can run, what waits for judgment, what stops, and where proof lands before a workflow earns more authority.',
      tone: 'neutral',
      actions: [{ label: 'Map one workflow', href: agencyCoreMessaging.selfMapHref }]
    }
  ];
</script>

<SEO
  title="How It Works | CREATE SOMETHING .agency"
  description="CREATE SOMETHING removes duplication, excess, and disconnection before turning a workflow into a controlled operating path."
  keywords="how CREATE SOMETHING works, workflow control layer, controlled workflow, first controlled connection, automation audit, Subtractive Triad"
  ogImage="/og-image.png"
  propertyName="agency"
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'How It Works', url: '/methodology' }
  ]}
/>

<main class="methodology-page">
  <!-- Hero -->
  <section class="hero">
    <div class="hero-grid"></div>
    <div class="hero-content">
      <BlurFade delay={0}>
        <p class="hero-eyebrow">How It Works</p>
      </BlurFade>
      <BlurFade delay={0.1}>
        <h1 class="hero-title">Subtract first. Control what remains.</h1>
      </BlurFade>
      <BlurFade delay={0.2}>
        <p class="hero-subtitle">
          Calm, transparent workflow systems do not start by adding more agents. They start by
          removing duplication, stripping excess, reconnecting what matters, and then deciding what
          agents and tools can do, what needs approval, and what should stop.
        </p>
      </BlurFade>
    </div>
  </section>

  <PerformanceNarrativeStage
    id="methodology-argument"
    eyebrow="One subtractive method"
    title="Remove what obscures, then test what survives."
    description="The method is one continuous argument: simplify the system, test each surviving part against the whole, turn the result into an operating path, and make its authority boundary visible."
    scenes={methodologyScenes}
    ariaLabel="Subtractive methodology argument"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'principle'}
        <div class="principle-card methodology-artifact">
          <p class="principle-body">
            Most automation strategies fail because they add more tools, more exceptions, and more
            hidden handoffs than the operator can actually monitor. The Subtractive Triad inverts
            that instinct. Remove what does not belong first, then control the workflow that
            remains: records, actions, judgment states, and receipts.
          </p>
        </div>
      {:else if scene.id === 'checks'}
        <div class="disciplines-stack methodology-artifact">
          {#each disciplines as discipline}
            <div class="discipline-card">
              <div class="discipline-header">
                <div class="discipline-level">
                  <span class="level-number">Level {discipline.level}</span>
                  <span class="level-domain">{discipline.domain}</span>
                </div>
                <div class="discipline-meta">
                  <h3 class="discipline-name">{discipline.name}</h3>
                  <div class="discipline-action">
                    <span class="action-label">Action:</span><span class="action-value"
                      >{discipline.action}</span
                    >
                  </div>
                </div>
              </div>
              <div class="discipline-question">
                <span class="question-mark">"</span>{discipline.question}<span class="question-mark"
                  >"</span
                >
              </div>
              <div class="discipline-body">
                <p class="discipline-description">{discipline.description}</p>
                <div class="discipline-outcome">
                  <span class="outcome-label">Outcome</span>
                  <p class="outcome-text">{discipline.outcome}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else if scene.id === 'process'}
        <div class="phases-grid methodology-artifact">
          {#each phases as phase, i}
            <div class="phase-card">
              <div class="phase-weeks">{phase.weeks}</div>
              <h3 class="phase-name">{phase.name}</h3>
              <p class="phase-description">{phase.description}</p>
              {#if i < phases.length - 1}
                <div class="phase-connector" aria-hidden="true">→</div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="methodology-artifact methodology-map-artifact">
          <PublicAtlasStoryCanvas
            starterId="revops-lead-handoff"
            storyId="methodology-revops-lead-handoff-story"
            eyebrow="Method canvas"
            title="A workflow becomes trustworthy when the boundary is visible."
            description="One owner, one workflow artifact, and one stop rule. Automation stays inside that boundary, and every run leaves something you can inspect."
            compact
          />
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    eyebrow="Apply the method"
    title="Ready to make the workflow quieter?"
    description="Every project starts with this operating model. We remove what does not belong, then ship the smallest controlled path that lets the operator stop watching everything."
    handoff={{
      owner: 'Workflow owner',
      authority: 'One named handoff',
      proof: 'Map + subtractive delivery plan',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
      <Button href="/services" variant="secondary">How I work</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  /* ─── Layout ─── */
  .methodology-page {
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    --color-performance-fg-primary: var(--color-performance-ink, #090909);
    --color-performance-fg-secondary: #252a34;
    --color-performance-fg-muted: var(--color-performance-muted, #5e6268);
    --color-performance-fg-tertiary: var(--color-performance-muted, #5e6268);
    --color-performance-bg-pure: var(--color-performance-panel, #ffffff);
    --color-performance-bg-surface: var(--color-performance-panel, #ffffff);
    --color-performance-bg-subtle: var(--color-performance-paper, #f3f3f0);
    --color-performance-border-emphasis: var(--color-performance-line, #d7d7d2);
  }

  /* ─── Hero ─── */
  .hero {
    position: relative;
    padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem)
      var(--section-padding, 6rem);
    overflow: hidden;
  }

  .hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    text-align: center;
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }

  .hero-eyebrow {
    font-size: var(--text-performance-body-sm);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-performance-fg-muted);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .hero-title {
    font-size: var(--text-performance-display);
    font-weight: var(--font-performance-semibold);
    color: var(--color-performance-fg-primary);
    margin-bottom: var(--space-5, 1.5rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-performance-tighter, -0.025em);
  }

  .hero-subtitle {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-secondary);
    max-width: 42rem;
    margin: 0 auto;
    line-height: var(--leading-performance-relaxed);
  }

  .principle-card {
    max-width: 44rem;
    margin: 0 auto;
    padding: var(--space-8, 3rem) var(--space-7, 2.5rem);
    border-radius: var(--radius-performance-scale-xl, 16px);
    background: var(--color-performance-bg-pure);
    box-shadow: var(--glass-shine-soft);
    text-align: center;
  }

  .methodology-map-artifact {
    min-width: 0;
    overflow: hidden;
  }

  .principle-body {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .disciplines-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-5, 1.5rem);
    max-width: 52rem;
    margin: 0 auto;
  }

  .discipline-card {
    position: relative;
    border-radius: var(--radius-performance-scale-xl, 16px);
    background: var(--color-performance-bg-pure);
    box-shadow: var(--glass-shine-soft);
    overflow: hidden;
    transition:
      border-color var(--duration-performance-standard) var(--ease-performance-standard),
      box-shadow var(--duration-performance-standard) var(--ease-performance-standard),
      transform var(--duration-bounce) var(--ease-bounce);
  }

  .discipline-card:hover {
    border-color: var(--color-performance-border-emphasis);
    box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
    transform: translateY(-2px);
  }

  .discipline-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 10%;
    right: 10%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  }

  .discipline-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-5, 1.5rem);
    padding: var(--space-6, 2rem) var(--space-6, 2rem) 0;
  }

  .discipline-level {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1, 0.25rem);
    flex-shrink: 0;
    min-width: 4.5rem;
  }

  .level-number {
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-performance-fg-muted);
  }

  .level-domain {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .discipline-meta {
    flex: 1;
  }

  .discipline-name {
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
    letter-spacing: var(--tracking-performance-tight, -0.015em);
    margin-bottom: var(--space-1, 0.25rem);
  }

  .discipline-action {
    font-size: var(--text-performance-body-sm);
  }

  .action-label {
    color: var(--color-performance-fg-muted);
    margin-right: 0.35rem;
  }

  .action-value {
    color: var(--color-performance-fg-secondary);
    font-weight: var(--font-performance-semibold);
  }

  .discipline-question {
    padding: var(--space-5, 1.5rem) var(--space-6, 2rem);
    font-size: var(--text-performance-body-lg);
    font-style: italic;
    color: var(--color-performance-fg-primary);
    margin: var(--space-5, 1.5rem) 0 0;
    background: var(--color-performance-bg-subtle);
  }

  .question-mark {
    color: var(--color-performance-fg-muted);
    font-style: normal;
  }

  .discipline-body {
    padding: var(--space-5, 1.5rem) var(--space-6, 2rem) var(--space-6, 2rem);
  }

  .discipline-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
    margin-bottom: var(--space-5, 1.5rem);
  }

  .discipline-outcome {
    padding: var(--space-4, 1rem) var(--space-5, 1.5rem);
    border-radius: var(--radius-performance-scale-lg, 12px);
    background: var(--color-performance-bg-surface);
  }

  .outcome-label {
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-performance-fg-muted);
    display: block;
    margin-bottom: var(--space-1, 0.25rem);
  }

  .outcome-text {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-medium);
  }

  .phases-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4, 1rem);
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }

  .phase-card {
    position: relative;
    padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
    border-radius: var(--radius-performance-scale-lg, 12px);
    background: var(--color-performance-bg-pure);
    box-shadow: var(--glass-shine-soft);
    text-align: center;
    transition:
      border-color var(--duration-performance-standard) var(--ease-performance-standard),
      box-shadow var(--duration-performance-standard) var(--ease-performance-standard),
      transform var(--duration-bounce) var(--ease-bounce);
  }

  .phase-card:hover {
    border-color: var(--color-performance-border-emphasis);
    box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
    transform: translateY(-2px);
  }

  .phase-weeks {
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-performance-fg-muted);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .phase-name {
    font-size: var(--text-performance-body-lg);
    font-weight: var(--font-performance-semibold);
    color: var(--color-performance-fg-primary);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .phase-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .phase-connector {
    display: none;
    position: absolute;
    right: -18px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-performance-fg-muted);
    z-index: 1;
  }

  @media (min-width: 769px) {
    .phase-connector {
      display: block;
    }
  }

  /* ─── Responsive ─── */
  @media (max-width: 1024px) {
    .phases-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .hero {
      padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
    }

    .hero-title {
      font-size: var(--text-performance-h1);
    }

    .phases-grid {
      grid-template-columns: 1fr;
      max-width: 24rem;
      margin: 0 auto;
    }

    .discipline-header {
      flex-direction: column;
      gap: var(--space-2, 0.5rem);
    }

    .discipline-level {
      flex-direction: row;
      gap: var(--space-2, 0.5rem);
    }

    .principle-card {
      padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
    }
  }
</style>
