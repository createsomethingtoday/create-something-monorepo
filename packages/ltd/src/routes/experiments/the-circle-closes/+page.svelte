<script lang="ts">
  /**
   * The Circle Closes
   *
   * A unified experiment demonstrating all three arcs of the hermeneutic circle:
   * 1. Self-Audit: The codebase measures itself against its own philosophy
   * 2. Visibility: The connections between properties become visible
   * 3. Feedback: Evidence from practice informs the canon
   *
   * "The tool reveals its own concealment."
   */

  import {
    HermeneuticCircle,
    IsometricAssembly,
    PerformanceNarrativeStage,
    SEO,
    TriadHealth,
    type PerformanceNarrativeScene
  } from '@create-something/canon';

  let { data } = $props();

  // Domain URLs for experiment links
  const domainUrls: Record<string, string> = {
    space: 'https://createsomething.space',
    io: 'https://createsomething.io',
    agency: 'https://createsomething.agency'
  };

  const proofScenes: PerformanceNarrativeScene[] = [
    {
      id: 'self-audit',
      label: 'Self-audit',
      summary: 'Measure the codebase',
      title: 'The system examines itself.',
      detail: 'The Subtractive Triad becomes a live audit across duplication, artifact quality, and system coherence.',
      tone: 'allow',
      evidence: ['DRY', 'Rams', 'Heidegger']
    },
    {
      id: 'visibility',
      label: 'Visibility',
      summary: 'Render the connections',
      title: 'The whole becomes inspectable.',
      detail: 'The property graph exposes connections and gaps so the hermeneutic circle can be reviewed rather than merely described.',
      tone: 'review',
      evidence: ['.ltd', '.io', '.space', '.agency']
    },
    {
      id: 'feedback',
      label: 'Feedback',
      summary: 'Return practice evidence',
      title: 'Execution pressures the canon.',
      detail: 'Experiments declare which principles they test and accumulate evidence that can corroborate or refute the governing idea.',
      tone: 'neutral',
      receipts: ['Experiment records', 'Evidence counts', 'Principle status']
    }
  ];

  function getStatusColor(status: string): string {
    switch (status) {
      case 'corroborating':
        return 'var(--color-performance-success)';
      case 'refuting':
        return 'var(--color-performance-error)';
      default:
        return 'var(--color-performance-fg-muted)';
    }
  }
</script>

<SEO
  title={data.experiment.title}
  description={data.experiment.description}
  propertyName="ltd"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.ltd' },
    { name: 'Experiments', url: 'https://createsomething.ltd/experiments' },
    { name: 'The Circle Closes', url: 'https://createsomething.ltd/experiments/the-circle-closes' }
  ]}
/>

<article class="experiment">
  <header class="header">
    <div class="meta">
      <span class="category">{data.experiment.category}</span>
      <span class="reading-time">{data.experiment.reading_time_minutes} min read</span>
    </div>

    <h1 class="title">{data.experiment.title}</h1>
    <p class="subtitle">{data.experiment.subtitle}</p>

    <p class="description">{data.experiment.description}</p>

    <div class="tags">
      {#each data.experiment.tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>

    <!-- Visual Canon: Isometric Assembly -->
    <div class="visual-canon">
      <IsometricAssembly animateOnScroll={true} title="Parts become whole" size={320} />
    </div>

    <!-- ASCII Art (fallback/alternative) -->
    <details class="ascii-details">
      <summary class="ascii-toggle">View ASCII diagram</summary>
      <pre class="ascii-art">{`
       ┌─────────────────────────────────────────────────────┐
       │                                                     │
       │            .ltd ◄──────────────────┐                │
       │          (Philosophy)              │                │
       │              │                     │                │
       │              ▼                     │                │
       │            .io                     │                │
       │          (Research)            feedback             │
       │              │                     │                │
       │              ▼                     │                │
       │          .space                    │                │
       │         (Practice)                 │                │
       │              │                     │                │
       │              ▼                     │                │
       │          .agency ──────────────────┘                │
       │         (Services)                                  │
       │                                                     │
       │         The hermeneutic circle closes               │
       │         when practice informs philosophy            │
       │                                                     │
       └─────────────────────────────────────────────────────┘
`}</pre>
    </details>
  </header>

  <PerformanceNarrativeStage
    id="circle-proof-story"
    eyebrow="Three proofs"
    title="Measure. Reveal. Return."
    description="The experiment closes the circle through three inspectable proof states. Focus one state at a time without separating it from the complete argument."
    scenes={proofScenes}
    ariaLabel="The Circle Closes proof sequence"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      <div class="experiment-scene-artifact">
        {#if scene.id === 'self-audit'}
    <!-- Section 1: Self-Audit -->
    <section class="proof-section" id="self-audit">
      <h2 class="section-title">
        <span class="section-number">01</span>
        Self-Audit
      </h2>
      <p class="section-description">
        The codebase measures itself against its own philosophy. The Subtractive Triad applied
        recursively: DRY, Rams, Heidegger.
      </p>

      <div class="proof-content">
        <TriadHealth
          data={data.auditData}
          selfAuditData={data.selfAuditData}
          loading={!data.auditData}
        />
      </div>
    </section>

        {:else if scene.id === 'visibility'}

    <!-- Section 2: Visibility -->
    <section class="proof-section" id="visibility">
      <h2 class="section-title">
        <span class="section-number">02</span>
        Visibility
      </h2>
      <p class="section-description">
        The hermeneutic circle rendered. Four properties, their connections, their gaps. What is
        concealed becomes visible.
      </p>

      <div class="proof-content circle-container">
        <HermeneuticCircle
          state={data.circleState}
          loading={!data.circleState}
          interactive={true}
          showGaps={true}
        />
      </div>

      {#if data.circleState}
        {@const gaps = data.circleState.edges.filter((e) => e.strength === 0)}
        {#if gaps.length === 0}
          <p class="proof-verdict valid">The circle closes.</p>
        {:else}
          <p class="proof-verdict pending">
            {gaps.length} connection{gaps.length > 1 ? 's' : ''} awaiting.
          </p>
        {/if}
      {/if}
    </section>

        {:else}

    <!-- Section 3: Feedback -->
    <section class="proof-section" id="feedback">
      <h2 class="section-title">
        <span class="section-number">03</span>
        Feedback
      </h2>
      <p class="section-description">
        Practice informs philosophy. Experiments declare which principles they test; evidence
        accumulates through execution.
      </p>

      <div class="proof-content evidence-grid">
        {#if data.evidence.length > 0}
          {#each data.evidence as item}
            <div class="evidence-card" style="--status-color: {getStatusColor(item.status)}">
              <div class="evidence-header">
                <span class="master-name">{item.masterName}</span>
                <span class="principle-title">{item.principleTitle}</span>
              </div>

              <div class="evidence-metrics">
                <div class="metric">
                  <span class="metric-value">{item.evidenceCount}</span>
                  <span class="metric-label">experiment{item.evidenceCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div class="evidence-status">
                <span class="status-indicator" style="background: {getStatusColor(item.status)}"
                ></span>
                <span class="status-label">{item.status}</span>
              </div>

              {#if item.experiments.length > 0}
                <div class="evidence-experiments">
                  {#each item.experiments as exp}
                    <a href="{domainUrls[exp.domain]}/experiments/{exp.slug}" class="exp-link">
                      {exp.title} →
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {:else}
          <p class="no-evidence">
            Evidence collection awaiting experiment executions. Practice to generate data.
          </p>
        {/if}
      </div>

      {#if data.evidence.length > 0}
        {@const corroborating = data.evidence.filter((e) => e.status === 'corroborating')}
        {#if corroborating.length > 0}
          <p class="proof-verdict valid">
            {corroborating.length} principle{corroborating.length > 1 ? 's' : ''} corroborated by practice.
          </p>
        {/if}
      {/if}
    </section>
        {/if}
      </div>
    {/snippet}
  </PerformanceNarrativeStage>

  <!-- Synthesis -->
  <section class="synthesis">
    <h2 class="synthesis-title">The Circle</h2>
    <blockquote class="synthesis-quote">
      "We understand parts through the whole, and the whole through its parts. Understanding is
      never complete but always in motion."
      <cite>— Martin Heidegger, Being and Time</cite>
    </blockquote>

    <p class="synthesis-text">
      This experiment is itself part of the circle—an experiment on .ltd that demonstrates how .ltd
      connects to .space, .io, and .agency. The tool reveals its own concealment by measuring
      itself, visualizing itself, and accumulating evidence about itself. Meta-hermeneutic.
    </p>
  </section>

  <footer class="experiment-footer">
    <p class="footer-text">
      Part of <a href="https://createsomething.ltd/ethos">The Canon</a> at CREATE SOMETHING.
    </p>
  </footer>
</article>

<style>
  /* ==========================================================================
	   The Circle Closes - Canon Design Tokens
	   All styles derive from shared Canon tokens
	   ========================================================================== */

  .experiment {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-performance-lg);
    font-family: var(--font-performance-sans);
    color: var(--color-performance-fg-secondary);
  }

  .experiment-scene-artifact {
    min-width: 0;
    overflow: hidden;
  }

  .experiment-scene-artifact :global(*) {
    min-width: 0;
    max-width: 100%;
  }

  /* Header */
  .header {
    margin-bottom: var(--space-performance-xl);
    text-align: center;
  }

  /* Visual Canon */
  .visual-canon {
    margin: var(--space-performance-lg) auto;
    display: flex;
    justify-content: center;
  }

  .ascii-details {
    margin: var(--space-performance-sm) auto;
    max-width: fit-content;
  }

  .ascii-toggle {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-muted);
    cursor: pointer;
    text-align: center;
    padding: var(--space-performance-xs) var(--space-performance-sm);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .ascii-toggle:hover {
    color: var(--color-performance-fg-tertiary);
  }

  .ascii-art {
    margin: var(--space-performance-sm) auto 0;
    padding: var(--space-performance-sm);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    line-height: 1.3;
    color: var(--color-performance-fg-tertiary);
    overflow-x: auto;
    white-space: pre;
    text-align: left;
  }

  .meta {
    display: flex;
    gap: var(--space-performance-sm);
    justify-content: center;
    margin-bottom: var(--space-performance-sm);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-widest);
    color: var(--color-performance-fg-muted);
  }

  .title {
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    margin: 0 auto var(--space-performance-xs) auto;
    letter-spacing: var(--tracking-performance-tight);
  }

  .subtitle {
    font-size: var(--text-performance-body-lg);
    color: var(--color-performance-fg-tertiary);
    margin: 0 0 var(--space-performance-md) 0;
    font-style: italic;
  }

  .description {
    max-width: 600px;
    margin: 0 auto var(--space-performance-md);
    line-height: var(--leading-performance-relaxed);
    color: var(--color-performance-fg-secondary);
  }

  .tags {
    display: flex;
    gap: var(--space-performance-xs);
    justify-content: center;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.25rem 0.75rem;
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-full);
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-tertiary);
  }

  /* Proof Sections */
  .proof-section {
    border-radius: var(--radius-performance-scale-lg);
    padding: var(--space-performance-lg);
  }

  .section-title {
    font-size: var(--text-performance-body-lg);
    font-weight: var(--font-performance-semibold);
    margin: 0 0 var(--space-performance-xs) 0;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.75rem;
  }

  .section-number {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-subtle);
    font-family: var(--font-performance-mono);
  }

  .section-description {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    margin: 0 0 var(--space-performance-md) 0;
    line-height: var(--leading-performance-normal);
    text-align: center;
  }

  .proof-content {
    margin-bottom: var(--space-performance-sm);
  }

  .circle-container {
    display: flex;
    justify-content: center;
  }

  .proof-verdict {
    font-size: var(--text-performance-body-sm);
    font-style: italic;
    margin: var(--space-performance-sm) 0 0 0;
    text-align: center;
  }

  .proof-verdict.valid {
    color: var(--color-performance-success);
  }

  .proof-verdict.pending {
    color: var(--color-performance-fg-muted);
  }

  /* Evidence Grid */
  .evidence-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
  }

  .evidence-card {
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-md);
    padding: var(--space-performance-sm);
  }

  .evidence-header {
    display: flex;
    gap: var(--space-performance-xs);
    align-items: baseline;
    margin-bottom: 0.75rem;
  }

  .master-name {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-wider);
    color: var(--color-performance-fg-muted);
  }

  .principle-title {
    font-weight: var(--font-performance-semibold);
    font-size: var(--text-performance-body-sm);
  }

  .evidence-metrics {
    display: flex;
    gap: var(--space-performance-md);
    margin-bottom: 0.75rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
  }

  .metric-value {
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-body-lg);
    font-weight: var(--font-performance-semibold);
  }

  .metric-label {
    font-size: 0.7rem;
    color: var(--color-performance-fg-muted);
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-wider);
  }

  .evidence-status {
    display: flex;
    align-items: center;
    gap: var(--space-performance-xs);
    margin-bottom: 0.75rem;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-performance-scale-full);
  }

  .status-label {
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-wider);
    color: var(--status-color);
  }

  .evidence-experiments {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .exp-link {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    text-decoration: none;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .exp-link:hover {
    color: var(--color-performance-fg-primary);
  }

  .no-evidence {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    font-style: italic;
    text-align: center;
    padding: var(--space-performance-lg);
  }

  /* Synthesis */
  .synthesis {
    max-width: 600px;
    margin: 0 auto var(--space-performance-lg);
    text-align: center;
  }

  .synthesis-title {
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-semibold);
    margin: 0 0 var(--space-performance-md) 0;
  }

  .synthesis-quote {
    font-style: italic;
    color: var(--color-performance-fg-secondary);
    margin: 0 0 var(--space-performance-md) 0;
    padding: var(--space-performance-sm) var(--space-performance-md);
    border-left: 2px solid var(--color-performance-border-emphasis);
    text-align: left;
  }

  .synthesis-quote cite {
    display: block;
    margin-top: 0.75rem;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
  }

  .synthesis-text {
    line-height: var(--leading-performance-loose);
    color: var(--color-performance-fg-tertiary);
  }

  /* Footer */
  .experiment-footer {
    text-align: center;
    padding-top: var(--space-performance-lg);
  }

  .footer-text {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
  }

  .footer-text a {
    color: var(--color-performance-fg-tertiary);
    text-decoration: underline;
  }

  .footer-text a:hover {
    color: var(--color-performance-fg-primary);
  }
</style>
