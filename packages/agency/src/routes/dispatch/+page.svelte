<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    SEO
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { marketingEditorialStatus } from '$lib/data/marketingSchedule';
</script>

<SEO
  title="CREATE SOMETHING Dispatch | Work, Evidence, and Field Notes"
  description="Practical lessons from building AI workflows. Read what worked, what failed, and what your team can use."
  keywords="AI workflow field notes, agent engineering demonstrations, governed automation evidence, CREATE SOMETHING dispatch"
  propertyName="agency"
/>

<div class="dispatch property-performance">
  <PerformanceCampaignOpening
    eyebrow="Dispatch / Field notes"
    expression="editorial"
    title="The work, with evidence."
    lede="What happened, what we learned, and where each result has limits."
    density="compact"
    proof={[
      { label: 'Work', value: 'Real workflows' },
      { label: 'Email', value: 'Up to twice monthly' },
      { label: 'Results', value: 'Evidence and limits' }
    ]}
  >
    {#snippet actions()}
      <Button href="#featured-report">Read the featured report</Button>
      <Button href="https://createsomething.io/newsletters" variant="secondary">Read field notes</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <main>
    <section class="section" id="featured-report" aria-labelledby="report-title">
      <p class="eyebrow">Review operations / May–June 2026</p>
      <h2 id="report-title">Automation prepared the evidence. Human judgment still decided.</h2>
      <p class="lede">
        Evidence collection completed for 49 of 50 selected cases in a template-review test.
        Automated judgment did not earn promotion, and reviewer time savings remain unmeasured.
      </p>
      <p class="lede">
        The lesson: test evidence preparation separately from the decision to approve or reject.
      </p>
      <div class="reader-actions">
        <Button href="/field-reports/template-review">Read the result and its limits</Button>
        <Button href="/field-reports" variant="secondary">Browse field reports</Button>
      </div>
    </section>

    <section class="section" aria-labelledby="reader-title">
      <p class="eyebrow">Read or put it to work</p>
      <h2 id="reader-title">Choose your next step.</h2>
      <div class="reader-grid">
        <article>
          <h3>Field notes by email</h3>
          <p>
            Sign up on CREATE SOMETHING .io for future field notes, or read a published edition.
            Email is limited to two validated sends per month.
          </p>
          <div class="reader-actions">
            <Button href="https://createsomething.io/newsletters#subscribe">Get field notes by email</Button>
            <a class="archive-link" href="https://createsomething.io/newsletters">Read published field notes</a>
          </div>
        </article>
        <article>
          <h3>Put a lesson to work</h3>
          <p>
            If a report connects to your team’s work, bring the task and tools you use.
            We’ll map the handoff and identify which decisions need a person.
          </p>
          <div class="reader-actions">
            <Button href="/field-reports">Explore current field reports</Button>
          </div>
        </article>
      </div>
    </section>

    <section class="section method" aria-labelledby="method-title">
      <p class="eyebrow">How we report the work</p>
      <h2 id="method-title">The result, with enough context to judge it.</h2>
      <p class="lede">
        Each report names what was tested, what the evidence supports, and what remains unknown.
        A test result does not establish production performance. Client-private records stay private.
      </p>
      <details id="schedule">
        <summary>Editorial status and email frequency</summary>
        <p>{marketingEditorialStatus.title}</p>
        <p>
          We publish after reviewing the evidence and approving the content.
          Email is capped at two validated sends per month. A planned review date does not confirm
          publication or email delivery.
        </p>
      </details>
    </section>
  </main>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Bring the next workflow"
    title="Show us the handoff your team still rebuilds by hand."
    description="We’ll look at the task, tools, approvals, and expected result before proposing a build."
    handoff={{
      owner: 'Workflow owner',
      authority: 'Human approval',
      proof: 'Map + evidence plan',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
      <Button href={agencyCoreMessaging.servicesMappingSessionHref} variant="secondary"
        >{agencyCoreMessaging.bookMappingSessionLabel}</Button
      >
    {/snippet}
  </PerformanceConversionHandoff>
</div>

<style>
  .dispatch {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #111);
  }
  main {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  .section {
    padding: clamp(4rem, 8vw, 7rem) 0;
    border-top: 1px solid var(--color-performance-line, rgba(17, 17, 17, 0.16));
  }
  .eyebrow {
    margin: 0 0 1rem;
    font: 600 0.72rem/1.4 var(--font-performance-mono, monospace);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 {
    max-width: 820px;
    margin: 0;
    font-size: clamp(2rem, 5vw, 4.5rem);
    line-height: 0.98;
    letter-spacing: -0.045em;
  }
  .lede {
    max-width: 700px;
    margin: 1.5rem 0 0;
    font-size: clamp(1rem, 1.6vw, 1.28rem);
    line-height: 1.55;
  }
  h3 {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.15;
  }
  .reader-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
    margin-top: 3rem;
  }
  .reader-grid article {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-top: 2px solid var(--color-performance-ink, #111);
    padding-top: 1rem;
  }
  .reader-grid h3 {
    line-height: 1.3;
  }
  .reader-grid p {
    margin: 1rem 0 0;
    max-width: 52ch;
    line-height: 1.55;
  }
  .reader-grid .reader-actions {
    margin-top: auto;
    padding-top: 1.5rem;
  }
  .archive-link {
    color: var(--color-performance-muted);
    text-underline-offset: 0.2em;
  }
  .archive-link:hover {
    color: var(--color-performance-ink);
  }
  .archive-link:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
  .reader-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  details {
    margin-top: 2rem;
    max-width: 700px;
    line-height: 1.55;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
    padding: 1rem 0;
  }
  summary:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
  @media (max-width: 560px) {
    main { padding: 0 1rem; }
    .reader-grid { grid-template-columns: 1fr; }
  }
</style>
