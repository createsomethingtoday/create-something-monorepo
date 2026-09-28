<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    SEO
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import {
    marketingCadence,
    marketingEvidenceRules,
    marketingEditorialStatus
  } from '$lib/data/marketingSchedule';
</script>

<SEO
  title="CREATE SOMETHING Dispatch | Work, Evidence, and Field Notes"
  description="CREATE SOMETHING editorial status, published field notes, and current field reports, with evidence before publication."
  keywords="AI workflow field notes, agent engineering demonstrations, governed automation evidence, CREATE SOMETHING dispatch"
  propertyName="agency"
/>

<div class="dispatch property-performance">
  <PerformanceCampaignOpening
    eyebrow="Dispatch / Editorial status"
    expression="editorial"
    title="We publish the work after the evidence."
    lede="We choose changes worth explaining. We show what happened, what we learned, and where the result has limits."
    density="compact"
    proof={[
      { label: 'Source', value: 'Repository' },
      { label: 'Email', value: 'Up to twice monthly' },
      { label: 'Claim', value: 'Evidence-gated' }
    ]}
  >
    {#snippet actions()}
      <Button href="#schedule">See editorial status</Button>
      <Button href="/field-reports" variant="secondary">Inspect field reports</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <main>
    <section class="section" aria-labelledby="cadence-title">
      <p class="eyebrow">Working rhythm</p>
      <h2 id="cadence-title">One lesson, carried across the right formats.</h2>
      <p class="lede">
        Our planned rhythm depends on evidence review and approval of the exact content and destination.
        Email is capped at two validated sends per month; these review slots do not promise publication.
      </p>
      <div class="cadence-grid">
        {#each marketingCadence as item}
          <article>
            <p>{item.day}</p>
            <h3>{item.channel}</h3>
            <span>{item.purpose}</span>
          </article>
        {/each}
      </div>
    </section>

    <section class="section schedule" id="schedule" aria-labelledby="schedule-title">
      <p class="eyebrow">Current editorial status</p>
      <h2 id="schedule-title">{marketingEditorialStatus.title}</h2>
      <p class="lede">{marketingEditorialStatus.detail}</p>
      <p class="lede">
        Every new selection passes evidence review before drafting and approval. Publication and email
        delivery are confirmed separately, after they happen.
      </p>
    </section>

    <section class="section" aria-labelledby="reader-title">
      <p class="eyebrow">Read or put it to work</p>
      <h2 id="reader-title">Choose your next step.</h2>
      <div class="reader-grid">
        <article>
          <h3>Field notes by email</h3>
          <p>
            The published field-note archive and email signup live on CREATE SOMETHING .io.
            Read an edition now or request the next one when it is ready.
          </p>
          <div class="reader-actions">
            <Button href="https://createsomething.io/newsletters">Read published field notes</Button>
            <Button href="https://createsomething.io/newsletters#subscribe" variant="secondary"
              >Get field notes by email</Button
            >
          </div>
        </article>
        <article>
          <h3>Evidence for your workflow</h3>
          <p>
            Explore current field reports on CREATE SOMETHING .agency. If a lesson connects to your
            team’s work, map the handoff, tools, and decisions with us.
          </p>
          <div class="reader-actions">
            <Button href="/field-reports">Explore current field reports</Button>
            <Button href={agencyCoreMessaging.selfMapHref} variant="secondary"
              >{agencyCoreMessaging.selfMapLabel}</Button
            >
          </div>
        </article>
      </div>
    </section>

    <section class="section method" aria-labelledby="method-title">
      <p class="eyebrow">Publication boundary</p>
      <h2 id="method-title">A commit is the start of the story.</h2>
      <div class="method-grid">
        {#each marketingEvidenceRules as rule, index}
          <article>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{rule}</p>
          </article>
        {/each}
      </div>
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
  .cadence-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1px;
    margin-top: 3rem;
    background: var(--color-performance-line, rgba(17, 17, 17, 0.16));
    border: 1px solid var(--color-performance-line, rgba(17, 17, 17, 0.16));
  }
  .cadence-grid article {
    min-height: 190px;
    padding: 1.25rem;
    background: var(--color-performance-panel, #f3f3f0);
  }
  .cadence-grid article > p {
    margin: 0 0 2rem;
    color: var(--color-performance-muted, #67675f);
    font: 0.68rem var(--font-performance-mono, monospace);
    text-transform: uppercase;
  }
  h3 {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.15;
  }
  .cadence-grid span {
    display: block;
    margin-top: 0.75rem;
    color: var(--color-performance-muted, #55554f);
    line-height: 1.45;
  }
  .reader-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2rem;
    margin-top: 3rem;
  }
  .reader-grid article {
    border-top: 2px solid var(--color-performance-ink, #111);
    padding-top: 1rem;
  }
  .reader-grid p {
    line-height: 1.55;
  }
  .reader-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .method-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-top: 3rem;
  }
  .method-grid article {
    border-top: 2px solid var(--color-performance-ink, #111);
    padding-top: 1rem;
  }
  .method-grid span {
    font: 0.7rem var(--font-performance-mono, monospace);
  }
  .method-grid p {
    line-height: 1.5;
  }
  @media (max-width: 900px) {
    .cadence-grid,
    .method-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 560px) {
    main {
      padding: 0 1rem;
    }
    .cadence-grid,
    .method-grid {
      grid-template-columns: 1fr;
    }
    .reader-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
