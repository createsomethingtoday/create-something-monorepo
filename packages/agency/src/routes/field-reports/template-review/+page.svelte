<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceContrastChapter,
    PerformanceConversionHandoff,
    PerformanceEvidenceIndex,
    PerformancePageSection,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCardItem,
    type PerformanceCondition,
    type PerformanceEvidenceItem
  } from '@create-something/canon';
  import {
    getTemplateReviewEvidenceYield,
    templateReviewFieldReport
  } from '$lib/data/fieldReports';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const evidenceYield = getTemplateReviewEvidenceYield(templateReviewFieldReport);

  const hypothesisConditions: PerformanceCondition[] = [
    {
      label: 'Signal',
      title: 'Prepare objective evidence.',
      detail: 'Context, published-site checks, screenshots, and policy state arrive before judgment.',
      tone: 'signal'
    },
    {
      label: 'Decision',
      title: 'Keep uncertainty visible.',
      detail: 'Subjective quality, exceptions, and consequential writes remain reviewer-owned.',
      tone: 'pressure'
    },
    {
      label: 'Proof',
      title: 'Measure the boundary.',
      detail: 'Evidence yield, false decisions, escalation, and missing recall stay attached to the run.',
      tone: 'growth'
    }
  ];

  const roleOutcomes: PerformanceCardItem[] = [
    {
      eyebrow: 'Reviewer',
      title: 'Start from an evidence packet.',
      detail: 'Objective checks arrive organized so attention can move to visual quality, context, and the final decision.'
    },
    {
      eyebrow: 'Review lead',
      title: 'See where the system stops.',
      detail: 'Escalations, overrides, failed gates, and policy questions become inspectable calibration work.'
    },
    {
      eyebrow: 'Technical owner',
      title: 'Replace lanes without hiding state.',
      detail: 'Deterministic tools, Dify orchestration, MCP contracts, and model-assisted judgment remain separable.'
    },
    {
      eyebrow: 'Policy owner',
      title: 'Keep authority with named people.',
      detail: 'Approvals, rejections, creator communication, and policy promotion cannot bypass a human gate.'
    }
  ];

  const evidenceItems: PerformanceEvidenceItem[] = templateReviewFieldReport.sources.map(
    (source, index) => ({
      id: `#TR-2026-${String(index + 1).padStart(2, '0')}`,
      kind: index === 2 ? 'Delivery report' : 'Calibration record',
      title: source.label,
      detail: source.artifact,
      state: index === 2 ? 'review' : 'verified',
      date: source.date
    })
  );
</script>

<SEO
  title="Template Review Field Report | CREATE SOMETHING .agency"
  description="A truthful field report from a governed Webflow template-review workflow: 49 of 50 usable evidence packets, 98 screenshots, zero external writes, and a promotion gate that stopped an unready reviewer."
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
      { label: 'Evidence yield', value: `${evidenceYield}%` },
      { label: 'External writes', value: '0' },
      { label: 'Promotion', value: 'Blocked' }
    ]}
  >
    {#snippet actions()}
      <Button href="#result">Inspect the result</Button>
      <Button href="/field-reports" variant="secondary">All Field Reports</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceThesisConditions
    eyebrow="Business hypothesis"
    title="Prepare the evidence before asking for judgment."
    description={templateReviewFieldReport.hypothesis}
    conditions={hypothesisConditions}
    ariaLabel="Template review business hypothesis"
  />

  <PerformanceContrastChapter
    eyebrow="Operating boundary"
    title="Parallel evidence is useful only when uncertainty stays visible."
    description="The workflow was designed as a coordinator with bounded lanes—not one agent pretending to own the entire review."
    intervention={{
      label: 'Operator intervention',
      title: 'The human reviewer owns the decision.',
      detail: 'The system can gather, normalize, compare, and draft. It cannot silently approve, reject, contact a creator, or promote policy.'
    }}
    artifactPlacement="full-width"
  >
    {#snippet artifact()}
      <div class="review-map" aria-label="Template review operating map">
        <article class="review-map__stage review-map__stage--signal">
          <span>01 / Signal</span>
          <strong>Submission context</strong>
          <p>Asset version, published surface, prior state, policy snapshot.</p>
        </article>
        <div class="review-map__lanes" aria-label="Parallel evidence lanes">
          <article><span>02A</span><strong>Objective validation</strong><small>Deterministic</small></article>
          <article><span>02B</span><strong>Rendered evidence</strong><small>Sandboxed</small></article>
          <article><span>02C</span><strong>Context comparison</strong><small>Review assist</small></article>
        </div>
        <article class="review-map__stage review-map__stage--proof">
          <span>03 / Proof</span>
          <strong>Normalized packet</strong>
          <p>Findings, screenshots, provenance, escalation, and missing evidence.</p>
        </article>
        <article class="review-map__stage review-map__stage--decision">
          <span>04 / Decision</span>
          <strong>Human reviewer</strong>
          <p>Confirm, override, request more evidence, or stop with a reason.</p>
        </article>
      </div>
    {/snippet}
  </PerformanceContrastChapter>

  <section id="result" class="field-result" aria-labelledby="field-result-title">
    <header>
      <span>Measured result / Evidence collection</span>
      <div>
        <h2 id="field-result-title">49 of 50 cases produced usable evidence.</h2>
        <p>
          The balanced calibration covered five outcome strata and eight reviewer buckets. It
          produced 98 screenshots—two per selected case—and made no external writes.
        </p>
      </div>
    </header>
    <dl class="field-result__metrics">
      <div><dt>Usable packets</dt><dd>49 / 50</dd><small>Measured</small></div>
      <div><dt>Evidence yield</dt><dd>{evidenceYield}%</dd><small>Derived / 98% from 49 / 50</small></div>
      <div><dt>Screenshots</dt><dd>98</dd><small>Measured</small></div>
      <div><dt>Reviewer buckets</dt><dd>8</dd><small>Measured</small></div>
      <div><dt>External writes</dt><dd>0</dd><small>Measured</small></div>
    </dl>
  </section>

  <PerformancePageSection
    variant="white"
    eyebrow="What changed for the team"
    title="Capacity begins with a better starting point."
    description="The system does not remove judgment. It changes what is ready when judgment begins."
  >
    {#snippet after()}
      <PerformanceCardGrid items={roleOutcomes} columns={4} ariaLabel="Field Report role outcomes" />
    {/snippet}
  </PerformancePageSection>

  <section class="failed-boundary" aria-labelledby="failed-boundary-title">
    <div class="failed-boundary__status">
      <span>Promotion blocked</span>
      <strong>2 / 2 missed</strong>
      <small>Historical exceptional examples</small>
    </div>
    <div>
      <span>Failed boundary / Judgment</span>
      <h2 id="failed-boundary-title">The broader reviewer was not ready.</h2>
      <p>
        The eight-case multimodal run stayed clear of false approvals and false rejections in its
        small sample, but it missed both historical exceptional examples. The promotion gate was
        tightened and the reviewer remained blocked. The evidence collector stayed useful; the
        quality judge did not inherit authority it had not earned.
      </p>
    </div>
  </section>

  <PerformanceEvidenceIndex
    eyebrow="Evidence basis"
    title="The claims stay attached to dated records."
    description="These repo-owned artifacts contain the calibration shape, measured outputs, failed gate, and unresolved business measurement."
    items={evidenceItems}
    ariaLabel="Template review Field Report evidence records"
  />

  <PerformancePageSection
    variant="soft"
    eyebrow="Measurement plan"
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
            <li><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></li>
          {/each}
        </ol>
      </div>
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="white"
    eyebrow="System hierarchy"
    title="One method. One map. Three operating surfaces."
    description="Performance Lab supplies the method. The mapping engagement names the boundary. Atlas holds the map. Signal, Decision, and Proof operate it. Substrate keeps the state and receipts owned."
  >
    {#snippet after()}
      <div class="system-hierarchy" aria-label="CREATE SOMETHING system hierarchy">
        <article><span>Method</span><strong>Performance Lab</strong><p>Train and test the workflow.</p></article>
        <article><span>Entry</span><strong>Mapping engagement</strong><p>Name the operating boundary.</p></article>
        <article><span>Map</span><strong>Atlas</strong><p>Systems, owners, gates, and evidence.</p></article>
        <article><span>Operate</span><strong>Signal / Decision / Proof</strong><p>Watch, route, and record.</p></article>
        <article><span>Own</span><strong>Substrate</strong><p>State, policy, access, and receipts.</p></article>
      </div>
    {/snippet}
  </PerformancePageSection>

  <PerformanceConversionHandoff
    eyebrow="Apply the learning"
    title="Map the objective work before measuring the savings."
    description="Start with one repeated workflow, a named decision owner, and a baseline the team can measure without exposing secrets."
    handoff={{
      owner: 'Workflow + decision owner',
      authority: 'Human approval',
      proof: 'Baseline + map + measurement plan',
      state: 'ready'
    }}
    steps={[
      { label: 'Map', title: 'Separate objective work from judgment.', detail: 'Identify what can be prepared and what must stay human.' },
      { label: 'Pilot', title: 'Run the smallest controlled path.', detail: 'Collect evidence without expanding authority.' },
      { label: 'Measure', title: 'Compare active time and quality.', detail: 'Publish the result only after the sample exists.' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href="/book?source=field-report&intent=workflow-mapping&lane=workflow_infrastructure" variant="secondary">
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

  .review-map {
    display: grid;
    grid-template-columns: minmax(10rem, 0.8fr) minmax(20rem, 1.5fr) minmax(10rem, 0.8fr) minmax(10rem, 0.8fr);
    gap: 0;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-panel, #fff);
  }

  .review-map__stage,
  .review-map__lanes article {
    display: grid;
    align-content: start;
    gap: 0.55rem;
    min-width: 0;
    padding: clamp(1rem, 2.5vw, 2rem);
  }

  .review-map__stage + *,
  .review-map__lanes + * {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .review-map span,
  .review-map small,
  .field-result > header > span,
  .field-result__metrics dt,
  .field-result__metrics small,
  .failed-boundary span,
  .failed-boundary small,
  .measurement-plan span,
  .system-hierarchy span {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold, 600);
    text-transform: uppercase;
  }

  .review-map strong { font-size: 1.05rem; }
  .review-map p { margin: 0; color: var(--color-performance-muted, #5e6268); line-height: 1.45; }
  .review-map__lanes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .review-map__lanes article + article { border-left: 1px solid var(--color-performance-line, #d7d7d2); }
  .review-map__lanes small { color: var(--color-performance-muted, #5e6268); }
  .review-map__stage--signal { border-top: 4px solid var(--color-performance-signal, #0057b8); }
  .review-map__stage--proof { border-top: 4px solid var(--color-performance-risk, #c62026); }
  .review-map__stage--decision { border-top: 4px solid var(--color-performance-pressure, #e54800); }

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
  .field-result > header > div { padding: clamp(1.25rem, 4vw, 3.5rem); }
  .field-result > header > span { border-right: 1px solid var(--color-performance-ink, #090909); background: var(--color-performance-growth, #007a4d); color: #fff; }
  .field-result h2,
  .failed-boundary h2 {
    max-width: 14ch;
    margin: 0;
    font-family: var(--font-performance-display, var(--font-sans));
    font-size: clamp(2.6rem, 5vw, 5.2rem);
    font-weight: var(--font-performance-display-weight, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
  }
  .field-result header p,
  .failed-boundary p { max-width: 46rem; margin: 1.25rem 0 0; color: var(--color-performance-muted, #5e6268); font-size: 1.05rem; line-height: 1.55; }
  .field-result__metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; }
  .field-result__metrics > div { display: grid; gap: 0.55rem; min-height: 11rem; padding: 1.25rem; }
  .field-result__metrics > div + div { border-left: 1px solid var(--color-performance-line-strong, #9c9c96); }
  .field-result__metrics dd { margin: auto 0 0; font-family: var(--font-mono); font-size: clamp(2rem, 4vw, 3.5rem); font-variant-numeric: tabular-nums; }
  .field-result__metrics small { color: var(--color-performance-muted, #5e6268); }

  .failed-boundary {
    display: grid;
    grid-template-columns: minmax(16rem, 0.65fr) minmax(0, 1.35fr);
    border-block: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-paper, #f3f3f0);
  }
  .failed-boundary > div { padding: clamp(2rem, 6vw, 6rem); }
  .failed-boundary__status { display: grid; align-content: space-between; gap: 2rem; border-right: 1px solid var(--color-performance-ink, #090909); background: var(--color-performance-risk, #c62026); color: #fff; }
  .failed-boundary__status strong { font-family: var(--font-mono); font-size: clamp(3rem, 6vw, 6rem); font-variant-numeric: tabular-nums; }
  .failed-boundary__status small { color: rgba(255,255,255,.72); }

  .measurement-plan { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); border: 1px solid var(--color-performance-line-strong, #9c9c96); }
  .measurement-plan__formula,
  .measurement-plan ol { margin: 0; padding: clamp(1.25rem, 3vw, 2.5rem); }
  .measurement-plan__formula { display: grid; align-content: start; gap: 1rem; border-right: 1px solid var(--color-performance-line-strong, #9c9c96); background: var(--color-performance-ink, #090909); color: #fff; }
  .measurement-plan__formula strong { font-family: var(--font-mono); font-size: clamp(1.15rem, 2.4vw, 2rem); line-height: 1.35; }
  .measurement-plan__formula p { margin: 0; color: rgba(255,255,255,.68); line-height: 1.5; }
  .measurement-plan ol { list-style: none; }
  .measurement-plan li { display: grid; grid-template-columns: 2rem 1fr; gap: 1rem; padding: 0.85rem 0; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .measurement-plan li p { margin: 0; line-height: 1.45; }

  .system-hierarchy { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); border: 1px solid var(--color-performance-line-strong, #9c9c96); }
  .system-hierarchy article { display: grid; align-content: start; gap: 0.6rem; min-height: 12rem; padding: 1.25rem; }
  .system-hierarchy article + article { border-left: 1px solid var(--color-performance-line, #d7d7d2); }
  .system-hierarchy strong { font-size: 1.12rem; }
  .system-hierarchy p { margin: auto 0 0; color: var(--color-performance-muted, #5e6268); line-height: 1.4; }

  @media (max-width: 62rem) {
    .review-map { grid-template-columns: 1fr 1fr; }
    .review-map__stage + *, .review-map__lanes + * { border-left: 0; }
    .review-map__lanes { grid-column: 1 / -1; grid-row: 2; border-block: 1px solid var(--color-performance-line, #d7d7d2); }
    .review-map__stage--proof { border-left: 1px solid var(--color-performance-line, #d7d7d2); }
    .review-map__stage--decision { grid-column: 2; grid-row: 3; border-left: 1px solid var(--color-performance-line, #d7d7d2); }
    .field-result__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .field-result__metrics > div { border-bottom: 1px solid var(--color-performance-line-strong, #9c9c96); }
    .field-result__metrics > div:nth-child(odd) { border-left: 0; }
    .system-hierarchy { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .system-hierarchy article { border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
    .system-hierarchy article:nth-child(odd) { border-left: 0; }
  }

  @media (max-width: 48rem) {
    .review-map,
    .field-result > header,
    .failed-boundary,
    .measurement-plan,
    .system-hierarchy { grid-template-columns: 1fr; }
    .review-map__lanes { grid-column: 1; grid-row: auto; grid-template-columns: 1fr; }
    .review-map__lanes article + article { border-left: 0; border-top: 1px solid var(--color-performance-line, #d7d7d2); }
    .review-map__stage--proof,
    .review-map__stage--decision { grid-column: 1; grid-row: auto; border-left: 0; }
    .field-result { width: 100%; border-inline: 0; }
    .field-result > header > span { border-right: 0; border-bottom: 1px solid var(--color-performance-ink, #090909); }
    .field-result__metrics { grid-template-columns: 1fr; }
    .field-result__metrics > div + div { border-left: 0; }
    .failed-boundary__status,
    .measurement-plan__formula { border-right: 0; border-bottom: 1px solid var(--color-performance-ink, #090909); }
    .system-hierarchy article + article { border-left: 0; }
  }
</style>
