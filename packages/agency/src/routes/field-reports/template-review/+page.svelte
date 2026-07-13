<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    PerformancePageSection,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCondition,
    type PerformanceEvidenceItem
  } from '@create-something/canon';
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
</script>

<SEO
  title="Template Review Field Report | CREATE SOMETHING .agency"
  description="A Webflow template-review field report: evidence collection completed for 49 of 50 selected cases, automated judgment remains blocked, and reviewer time savings are not yet measured."
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

  <section id="result" class="field-result" aria-labelledby="field-result-title">
    <header>
      <span>Decision summary</span>
      <div>
        <h2 id="field-result-title">The collector worked. The quality judge stayed blocked.</h2>
        <p>
          Evidence collection completed for 49 of 50 selected cases in a deliberately balanced
          shadow sample. That result measures packet completion—not decision accuracy, reviewer
          capacity, or business impact.
        </p>
      </div>
    </header>
    <dl class="field-result__metrics">
      <div>
        <dt>Packet completion</dt>
        <dd>49 / 50</dd>
        <small>{packetCompletion}% of selected cases</small>
      </div>
      <div>
        <dt>Judgment promotion</dt>
        <dd>Blocked</dd>
        <small>1 of 2 exceptional examples missed</small>
      </div>
      <div>
        <dt>Reviewer time saved</dt>
        <dd>Unmeasured</dd>
        <small>Requires a matched pilot</small>
      </div>
    </dl>
  </section>

  <PerformanceThesisConditions
    eyebrow="What the evidence says"
    title="Collection worked. Judgment did not earn promotion."
    description={templateReviewFieldReport.hypothesis}
    conditions={resultConditions}
    ariaLabel="Template review measured results and limits"
  />

  <PerformancePageSection
    variant="soft"
    eyebrow="Current runtime check / Synthetic"
    title="Five Dify agents held the boundary in controlled tests."
    description="On July 12, the central Template Review Hub and four reviewer-specific agents passed their current contract and safety suites. These were synthetic sessions, not production usage or evidence of review quality."
  >
    {#snippet after()}
      <div class="runtime-evidence" aria-label="Template Review Dify synthetic eval results">
        <article>
          <span>Central agent</span>
          <strong>7 / 7 live checks</strong>
          <p>Tool routing, schema discovery, policy, narrow writes, and secret refusal passed.</p>
        </article>
        <article>
          <span>Four reviewer agents</span>
          <strong>32 live boundary scenarios</strong>
          <p>All passed without forbidden writes; median response time was about 10 seconds.</p>
        </article>
        <article>
          <span>Evidence limit</span>
          <strong>Not production usage</strong>
          <p>
            Langfuse readback was not available in this environment, so current ingestion and
            organic session volume remain unverified.
          </p>
        </article>
      </div>
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    eyebrow="Paid provider pilot / One case"
    title="One live packet cost about eleven cents."
    description="On July 13, one blind private case ran through the direct evidence collector and GPT-5.5 reviewer. This is a one-case cost observation—not a human-time comparison, annual forecast, or savings claim."
  >
    {#snippet after()}
      <div class="runtime-evidence" aria-label="Template Review single-case provider cost pilot">
        <article>
          <span>Evidence collector</span>
          <strong>32.7 seconds</strong>
          <p>Direct E2B collection measured USD 0.00121 in compute for this packet.</p>
        </article>
        <article>
          <span>Model reviewer</span>
          <strong>45.0 seconds</strong>
          <p>GPT-5.5 used 8,118 total tokens and measured USD 0.11052 for this response.</p>
        </article>
        <article>
          <span>Measured boundary</span>
          <strong>USD 0.1117</strong>
          <p>
            Active stages totaled 77.6 seconds and the workflow took 99.5 seconds elapsed. Storage,
            tools, maintenance, reviewer time saved, and annual cash savings remain unmeasured.
          </p>
        </article>
      </div>
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    eyebrow="Modeled capacity / Supplied baseline"
    title="One observed packet models to about 36 an hour."
    description="Against the user-provided human baseline of two to four templates per hour, the measured 99.5-second agent packet models to about 36 packets per hour in serial. This is a capacity scenario—not proof of equivalent review quality or realized savings."
  >
    {#snippet after()}
      <div class="runtime-evidence" aria-label="Template Review modeled capacity scenario">
        <article>
          <span>Human scenario input</span>
          <strong>2–4 / hour</strong>
          <p>This rate was supplied for the scenario; it was not timed in the one-case pilot.</p>
        </article>
        <article>
          <span>Measured agent basis</span>
          <strong>99.5 seconds</strong>
          <p>One end-to-end packet models to about 36 packets per hour in serial.</p>
        </article>
        <article>
          <span>Modeled capacity range</span>
          <strong>9–18×</strong>
          <p>
            The range compares throughput only. Equivalent quality, human verification time, and
            cash savings remain unmeasured.
          </p>
        </article>
      </div>
    {/snippet}
  </PerformancePageSection>

  <section class="failed-boundary" aria-labelledby="failed-boundary-title">
    <div class="failed-boundary__status">
      <span>Promotion blocked</span>
      <strong>1 / 2 missed</strong>
      <small>Best current specialist run</small>
    </div>
    <div>
      <span>Failed boundary / Judgment</span>
      <h2 id="failed-boundary-title">Automated judgment was not ready.</h2>
      <p>
        The initial broad reviewer missed both historical exceptional examples. A later specialist
        improved that result, but the best current run still missed one of two historical
        exceptional examples. Promotion remains blocked. The evidence collector can stay useful
        without turning its findings into an official review decision.
      </p>
    </div>
  </section>

  <PerformanceEvidenceIndex
    eyebrow="Evidence basis"
    title="The claims stay attached to dated records."
    description="Open the dated source records for the selected sample, packet result, failed judgment gate, synthetic runtime checks, and unresolved business measurement."
    items={evidenceItems}
    ariaLabel="Template review Field Report evidence records"
  />

  <PerformancePageSection
    variant="soft"
    eyebrow="What remains unproven"
    title="Reviewer time savings are not measured."
    description={templateReviewFieldReport.savings.statement}
  >
    {#snippet after()}
      <div class="measurement-plan">
        <div class="measurement-plan__formula">
          <span>Capacity calculation</span>
          <strong>{templateReviewFieldReport.savings.formula}</strong>
          <p>Report the sample size, submission mix, and quality measures beside any result.</p>
        </div>
        <ol>
          {#each templateReviewFieldReport.savings.instrumentation as item, index}
            <li>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{item}</p>
            </li>
          {/each}
        </ol>
      </div>
    {/snippet}
  </PerformancePageSection>

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
  .field-report {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
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
    margin: clamp(3rem, 7vw, 7rem) auto;
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
    display: grid;
    gap: 0.55rem;
    min-height: 11rem;
    padding: 1.25rem;
  }
  .field-result__metrics > div + div {
    border-left: 1px solid var(--color-performance-line-strong, #9c9c96);
  }
  .field-result__metrics dd {
    margin: auto 0 0;
    font-family: var(--font-performance-mono);
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-variant-numeric: tabular-nums;
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
    align-content: space-between;
    gap: 2rem;
    border-right: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-risk, #c62026);
    color: #fff;
  }
  .failed-boundary__status strong {
    font-family: var(--font-performance-mono);
    font-size: clamp(3rem, 6vw, 6rem);
    font-variant-numeric: tabular-nums;
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
