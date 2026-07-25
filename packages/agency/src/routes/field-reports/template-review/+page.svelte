<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    PerformanceNarrativeStage,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCondition,
    type PerformanceEvidenceItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import SystemContextArtifact from '$lib/components/SystemContextArtifact.svelte';
  import {
    getTemplateReviewPacketCompletion,
    templateReviewFieldReport
  } from '$lib/data/fieldReports';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const packetCompletion = getTemplateReviewPacketCompletion(templateReviewFieldReport);

  const resultConditions: PerformanceCondition[] = [
    {
      label: 'Collection',
      title: 'The packet lane usually completed.',
      detail:
        '49 of 50 selected shadow cases produced a usable evidence packet. That is completion—not decision accuracy.',
      tone: 'signal'
    },
    {
      label: 'Limit',
      title: 'Objective checks did not explain every outcome.',
      detail:
        'Sandbox findings did not explain 17 rejected or policy cases and 10 iterative-review cases.',
      tone: 'pressure'
    },
    {
      label: 'Decision',
      title: 'The human reviewer kept the decision.',
      detail:
        'The best current specialist still missed one of two historical exceptional examples, so promotion remains blocked.',
      tone: 'growth'
    }
  ];

  const evidenceItems: PerformanceEvidenceItem[] = templateReviewFieldReport.sources.map(
    (source, index) => ({
      id: `#TR-2026-${String(index + 1).padStart(2, '0')}`,
      kind: source.kind,
      title: source.label,
      detail: source.artifact,
      state: source.state,
      date: source.date,
      href: source.href
    })
  );

  const fieldReportScenes: PerformanceNarrativeScene[] = [
    {
      id: 'result',
      label: 'Result',
      summary: '49 / 50 packets',
      title: 'The collector worked. The quality judge stayed blocked.',
      detail:
        'Evidence collection completed for 49 of 50 selected cases in a balanced shadow sample. That measures packet completion—not decision accuracy, reviewer capacity, or business impact.',
      tone: 'review',
      evidence: [
        '49 / 50 packet completion',
        'Current runtime check / Synthetic',
        'human decision retained'
      ]
    },
    {
      id: 'boundary',
      label: 'Boundary',
      summary: 'Promotion remains blocked',
      title: 'Automated judgment was not ready.',
      detail:
        'The initial broad reviewer missed both historical exceptional examples. The best later specialist still missed one of two, so evidence preparation may continue while official judgment stays human.',
      tone: 'block',
      receipts: [
        'best current run: 1 / 2 missed',
        'promotion: blocked',
        'decision owner: human reviewer'
      ]
    },
    {
      id: 'economics',
      label: 'Economics',
      summary: 'Measured cost, modeled capacity',
      title: 'One measured packet sets the cost. The supplied baseline models the capacity.',
      detail:
        'On July 13, one blind private case measured 99.5 seconds elapsed and USD 0.1117 in provider cost. Against the user-provided human baseline of two to four templates per hour, that pace models to about 36 packets per hour and 9–18× throughput. This remains a one-case cost observation and capacity scenario—not proof of equivalent review quality, reviewer verification time, or cash savings.',
      tone: 'neutral',
      evidence: [
        '99.5 seconds',
        'USD 0.1117',
        '2–4 / hour supplied baseline',
        '~36 / hour modeled capacity'
      ]
    },
    {
      id: 'evidence',
      label: 'Evidence',
      summary: 'Claims stay dated and bounded',
      title: 'The claims stay attached to dated records.',
      detail:
        'Reviewer time savings are not measured. The source records and measurement plan keep packet completion, judgment quality, capacity scenarios, and remaining unknowns separate.',
      tone: 'allow'
    }
  ];
</script>

<SEO
  title="Template Review Field Report | CREATE SOMETHING .agency"
  description="A Webflow template-review field report. Evidence collection completed for 49 of 50 cases. Automated judgment remains blocked, and reviewer time savings remain unmeasured."
  keywords="AI workflow field report, template review workflow, human in the loop review, Dify MCP workflow, workflow evidence"
  propertyName="agency"
/>

<main class="field-report">
  <PerformanceCampaignOpening
    eyebrow="Field report 01 / Review operations"
    title={templateReviewFieldReport.title}
    lede={templateReviewFieldReport.dek}
    media={{
      src: '/images/performance-lab/trace-wake-natural.webp',
      mobileSrc: '/images/performance-lab/trace-wake-natural-mobile.webp',
      alt: 'Aerial black-and-white view of a survey craft leaving a directional wake'
    }}
    proof={[
      { label: 'Packet completion', value: '49 / 50' },
      { label: 'Judgment', value: 'Blocked' },
      { label: 'Time saved', value: 'Unmeasured' }
    ]}
  >
    {#snippet actions()}
      <Button href="#result">Inspect the result</Button>
      <Button href="/field-reports" variant="secondary">All Field Reports</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="result"
    eyebrow="One evidence argument"
    title="Four questions, kept separate on purpose."
    description="The report separates four questions: Did collection work? Did judgment earn promotion? What did one packet cost? Which claims remain measured or unresolved?"
    scenes={fieldReportScenes}
    ariaLabel="Template review Field Report argument"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'result'}
        <section class="field-result" aria-labelledby="field-result-title">
          <header>
            <span>Decision summary</span>
            <div>
              <h2 id="field-result-title">Collection worked. Judgment did not earn promotion.</h2>
              <p>{templateReviewFieldReport.hypothesis}</p>
            </div>
          </header>
          <dl class="field-result__metrics">
            <div data-tone="growth">
              <dt>Packet completion</dt>
              <dd>49 / 50</dd>
              <small>{packetCompletion}% of selected cases</small>
            </div>
            <div data-tone="risk">
              <dt>Judgment promotion</dt>
              <dd>Blocked</dd>
              <small>1 of 2 exceptional examples missed</small>
            </div>
            <div data-tone="neutral">
              <dt>Reviewer time saved</dt>
              <dd>Unmeasured</dd>
              <small>Requires a matched pilot</small>
            </div>
          </dl>
        </section>
        <PerformanceThesisConditions
          eyebrow="What the evidence says"
          title="Measured result and limits"
          description="Packet completion, objective findings, and the official decision remain different claims."
          conditions={resultConditions}
          ariaLabel="Template review measured results and limits"
        />
        <section class="stage-evidence-block" aria-labelledby="synthetic-check-title">
          <h4 id="synthetic-check-title">
            Five Dify agents held the boundary in controlled tests.
          </h4>
          <p>
            On July 12, the central Template Review Hub and four reviewer-specific agents passed
            their current contract and safety suites. These were synthetic sessions, not production
            usage or evidence of review quality.
          </p>
          <div class="runtime-evidence" aria-label="Template Review Dify synthetic eval results">
            <article>
              <span>Central agent</span><strong>7 / 7 live checks</strong>
              <p>
                Tool routing, schema discovery, policy, narrow writes, and secret refusal passed.
              </p>
            </article>
            <article>
              <span>Four reviewer agents</span><strong>32 live boundary scenarios</strong>
              <p>All passed without forbidden writes; median response time was about 10 seconds.</p>
            </article>
            <article>
              <span>Evidence limit</span><strong>Not production usage</strong>
              <p>
                Langfuse readback was not available in this environment, so current ingestion and
                organic session volume remain unverified.
              </p>
            </article>
          </div>
        </section>
      {:else if scene.id === 'boundary'}
        <section class="failed-boundary" aria-labelledby="failed-boundary-title">
          <div class="failed-boundary__status">
            <span>Promotion blocked</span>
            <strong>
              <span class="failed-boundary__metric-value">1 / 2</span>
              <span class="failed-boundary__metric-qualifier">missed</span>
            </strong>
            <small>Best current specialist run</small>
          </div>
          <div>
            <span>Failed boundary / Judgment</span>
            <h2 id="failed-boundary-title">Automated judgment was not ready.</h2>
            <p>
              The initial broad reviewer missed both historical exceptional examples. A later
              specialist improved that result, but the best current run still missed one of two
              historical exceptional examples. Promotion remains blocked. The evidence collector can
              stay useful without turning its findings into an official review decision.
            </p>
          </div>
        </section>
      {:else if scene.id === 'economics'}
        <div
          class="runtime-evidence"
          aria-label="Template Review measured cost and modeled capacity"
        >
          <article>
            <span>Measured packet</span><strong>99.5 sec · USD 0.1117</strong>
            <p>
              One blind private case. Active stages totaled 77.6 seconds: E2B took 32.7 seconds and
              measured USD 0.00121; GPT-5.5 took 45.0 seconds and measured USD 0.11052.
            </p>
          </article>
          <article>
            <span>Supplied human baseline</span><strong>2–4 / hour</strong>
            <p>This scenario input was user-provided; it was not timed in the one-case pilot.</p>
          </article>
          <article>
            <span>Modeled capacity</span><strong>~36 / hour · 9–18×</strong>
            <p>
              Throughput only. Equivalent quality, human verification time, reviewer time saved, and
              cash savings remain unmeasured.
            </p>
          </article>
        </div>
      {:else}
        <div class="field-evidence-stack">
          <PerformanceEvidenceIndex
            eyebrow="Evidence basis"
            title="Open the dated source records."
            description="The sample, the packet result, and the failed judgment gate all remain inspectable — including the business measurement we could not close."
            items={evidenceItems}
            ariaLabel="Template review Field Report evidence records"
          />
          <section class="stage-evidence-block" aria-labelledby="measurement-plan-title">
            <h4 id="measurement-plan-title">Reviewer time savings are not measured.</h4>
            <p>{templateReviewFieldReport.savings.statement}</p>
            <div class="measurement-plan">
              <div class="measurement-plan__formula">
                <span>Capacity calculation</span><strong
                  >{templateReviewFieldReport.savings.formula}</strong
                >
                <p>
                  Report the sample size, submission mix, and quality measures beside any result.
                </p>
              </div>
              <ol>
                {#each templateReviewFieldReport.savings.instrumentation as item, index}<li>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <p>{item}</p>
                  </li>{/each}
              </ol>
            </div>
          </section>
        </div>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <section class="field-context" aria-labelledby="field-context-title">
    <header>
      <span>Operating proof</span>
      <h2 id="field-context-title">See exactly where preparation stops and human judgment begins.</h2>
      <p>
        This read-only change view uses the same public workflow definition as Control. It exposes
        the owner, authority boundary, dated evidence, and recovery path without exposing private
        records or implying live execution.
      </p>
    </header>
    <SystemContextArtifact
      defaultLens="change"
      readOnly={true}
      title="What changed around the review decision."
    />
  </section>

  <PerformanceConversionHandoff
    eyebrow="Business implication"
    title="Use automation to prepare evidence—not to assume judgment."
    description="Start with one repeated workflow, a named decision owner, and a measurable baseline. Expand authority only after the system proves both quality and business value."
    handoff={{
      owner: 'Workflow + decision owner',
      authority: 'Human approval',
      proof: 'Baseline + map + measurement plan',
      state: 'ready'
    }}
    steps={[
      {
        label: 'Map',
        title: 'Separate objective work from judgment.',
        detail: 'Identify what can be prepared and what must stay human.'
      },
      {
        label: 'Pilot',
        title: 'Run the smallest controlled path.',
        detail: 'Collect evidence without expanding authority.'
      },
      {
        label: 'Measure',
        title: 'Compare active time and quality.',
        detail: 'Publish the result only after the sample exists.'
      }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button
        href="/book?source=field-report&intent=workflow-mapping&lane=workflow_infrastructure"
        variant="secondary"
      >
        Choose a mapping session
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .field-context {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    padding: clamp(4rem, 8vw, 8rem) clamp(1rem, 4vw, 4rem);
    background: var(--color-performance-paper, #f3f3f0);
  }
  .field-context > header {
    display: grid;
    max-width: 52rem;
    gap: .7rem;
  }
  .field-context > header span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: .7rem;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .field-context > header h2,
  .field-context > header p { margin: 0; }
  .field-context > header h2 { font-size: clamp(1.8rem, 4vw, 3.5rem); line-height: 1.02; }
  .field-context > header p { max-width: 46rem; color: var(--color-performance-muted, #5e6268); line-height: 1.6; }
  .field-report {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .field-evidence-stack,
  .stage-evidence-block {
    display: grid;
    gap: 1rem;
  }

  .field-evidence-stack {
    gap: clamp(1.25rem, 3vw, 2.5rem);
  }

  .stage-evidence-block {
    padding: clamp(1rem, 2.5vw, 2rem);
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
  }

  .stage-evidence-block h4,
  .stage-evidence-block > p {
    margin: 0;
  }

  .stage-evidence-block h4 {
    max-width: 30ch;
    font-size: clamp(1.35rem, 3vw, 2.4rem);
    line-height: 1.08;
  }

  .stage-evidence-block > p {
    max-width: 52rem;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.55;
  }

  .field-result > header > span,
  .field-result__metrics dt,
  .field-result__metrics small,
  .failed-boundary span,
  .failed-boundary small,
  .measurement-plan span,
  .runtime-evidence span {
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 600);
    text-transform: uppercase;
  }

  .field-result {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: 0 auto 1.5rem;
    border: 1px solid var(--color-performance-ink, #090909);
  }

  .field-result > header {
    display: grid;
    grid-template-columns: minmax(13rem, 0.55fr) minmax(0, 1.45fr);
    min-height: 17rem;
    border-bottom: 1px solid var(--color-performance-ink, #090909);
  }

  .field-result > header > span,
  .field-result > header > div {
    padding: clamp(1.25rem, 4vw, 3.5rem);
  }
  .field-result > header > span {
    border-right: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-growth, #007a4d);
    color: #fff;
  }
  .field-result h2,
  .failed-boundary h2 {
    max-width: 14ch;
    margin: 0;
    font-family: var(--font-performance-display, var(--font-performance-sans));
    font-size: clamp(2.6rem, 5vw, 5.2rem);
    font-weight: var(--font-performance-display-weight, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
  }
  .field-result header p,
  .failed-boundary p {
    max-width: 46rem;
    margin: 1.25rem 0 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1.05rem;
    line-height: 1.55;
  }
  .field-result__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0;
  }
  .field-result__metrics > div {
    --field-result-metric-accent: var(--color-performance-line-strong, #9c9c96);
    display: grid;
    gap: var(--space-performance-xs, 0.5rem);
    min-width: 0;
    min-height: calc(
      var(--space-performance-2xl, 6.854rem) + var(--space-performance-md, 1.618rem)
    );
    padding: var(--space-performance-md, 1.618rem);
    border-top: 0.25rem solid var(--field-result-metric-accent);
    container-type: inline-size;
  }
  .field-result__metrics > div[data-tone='growth'] {
    --field-result-metric-accent: var(--color-performance-growth, #007a4d);
  }
  .field-result__metrics > div[data-tone='risk'] {
    --field-result-metric-accent: var(--color-performance-risk, #c62026);
  }
  .field-result__metrics > div + div {
    border-left: 1px solid var(--color-performance-line-strong, #9c9c96);
  }
  .field-result__metrics dd {
    margin: auto 0 0;
    font-family: var(--font-performance-mono);
    font-size: clamp(
      var(--text-performance-h2, 1.618rem),
      16cqi,
      var(--text-performance-display-sm, 2.618rem)
    );
    font-weight: var(--font-performance-medium, 500);
    font-variant-numeric: tabular-nums;
    letter-spacing: var(--tracking-performance-tight, -0.015em);
    line-height: var(--leading-performance-tight, 1.25);
    white-space: nowrap;
  }
  .field-result__metrics small {
    color: var(--color-performance-muted, #5e6268);
  }

  .failed-boundary {
    display: grid;
    grid-template-columns: minmax(16rem, 0.65fr) minmax(0, 1.35fr);
    border-block: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-paper, #f3f3f0);
  }
  .failed-boundary > div {
    padding: clamp(2rem, 6vw, 6rem);
  }
  .failed-boundary__status {
    display: grid;
    container-type: inline-size;
    align-content: space-between;
    gap: 2rem;
    padding-inline: clamp(2rem, 12%, 4rem);
    border-right: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-risk, #c62026);
    color: #fff;
  }
  .failed-boundary__status strong {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
    font-family: var(--font-performance-mono);
    font-variant-numeric: tabular-nums;
  }
  .failed-boundary__status .failed-boundary__metric-value {
    font-family: inherit;
    font-size: clamp(3rem, 20cqi, 6rem);
    line-height: 0.9;
    text-transform: none;
    white-space: nowrap;
  }
  .failed-boundary__status .failed-boundary__metric-qualifier {
    max-width: 100%;
    font-family: inherit;
    font-size: clamp(0.85rem, 5cqi, 1.25rem);
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.04em;
    line-height: 1;
    overflow-wrap: anywhere;
    text-transform: uppercase;
  }
  .failed-boundary__status small {
    color: rgba(255, 255, 255, 0.72);
  }

  .runtime-evidence {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-block: 1px solid var(--color-performance-line-strong, #9c9c96);
  }
  .runtime-evidence article {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    min-height: 13rem;
    padding: clamp(1.25rem, 3vw, 2.25rem);
  }
  .runtime-evidence article + article {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }
  .runtime-evidence strong {
    font-size: clamp(1.35rem, 2.5vw, 2rem);
    line-height: 1.05;
  }
  .runtime-evidence p {
    margin: auto 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  .measurement-plan {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
  }
  .measurement-plan__formula,
  .measurement-plan ol {
    margin: 0;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }
  .measurement-plan__formula {
    display: grid;
    align-content: start;
    gap: 1rem;
    border-right: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-ink, #090909);
    color: #fff;
  }
  .measurement-plan__formula strong {
    font-family: var(--font-performance-mono);
    font-size: clamp(1.15rem, 2.4vw, 2rem);
    line-height: 1.35;
  }
  .measurement-plan__formula p {
    margin: 0;
    color: rgba(255, 255, 255, 0.68);
    line-height: 1.5;
  }
  .measurement-plan ol {
    list-style: none;
  }
  .measurement-plan li {
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: 1rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }
  .measurement-plan li p {
    margin: 0;
    line-height: 1.45;
  }

  @media (max-width: 62rem) {
    .field-result__metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .field-result__metrics > div {
      border-bottom: 1px solid var(--color-performance-line-strong, #9c9c96);
    }
    .field-result__metrics > div:nth-child(odd) {
      border-left: 0;
    }
    .runtime-evidence {
      grid-template-columns: 1fr;
    }
    .runtime-evidence article {
      min-height: 0;
    }
    .runtime-evidence article + article {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }

  @media (max-width: 48rem) {
    .field-report :global(.performance-thesis-conditions__condition p),
    .field-report :global(.performance-conversion-handoff__step p) {
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .field-result > header,
    .failed-boundary,
    .measurement-plan {
      grid-template-columns: 1fr;
    }
    .field-result {
      width: 100%;
      border-inline: 0;
    }
    .field-result > header > span {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-ink, #090909);
    }
    .field-result__metrics {
      grid-template-columns: 1fr;
    }
    .field-result__metrics > div + div {
      border-left: 0;
    }
    .failed-boundary__status,
    .measurement-plan__formula {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-ink, #090909);
    }
  }
</style>
