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
    marketingSchedule
  } from '$lib/data/marketingSchedule';
</script>

<SEO
  title="CREATE SOMETHING Dispatch | Work, Evidence, and Field Notes"
  description="The CREATE SOMETHING publishing schedule: practical lessons from verified repository work, inspectable artifacts, and named limits."
  keywords="AI workflow field notes, agent engineering demonstrations, governed automation evidence, CREATE SOMETHING dispatch"
  propertyName="agency"
/>

<div class="dispatch property-performance">
  <PerformanceCampaignOpening
    eyebrow="Dispatch / Publishing schedule"
    expression="editorial"
    title="We publish the work after the evidence."
    lede="Each week starts with one change worth explaining. We trace it to an operating lesson, check the artifact, name the limit, and show what another builder can use."
    density="compact"
    proof={[
      { label: 'Source', value: 'Repository' },
      { label: 'Lesson', value: 'One per week' },
      { label: 'Claim', value: 'Evidence-gated' }
    ]}
  >
    {#snippet actions()}
      <Button href="#schedule">See the current schedule</Button>
      <Button href="/field-reports" variant="secondary">Inspect field reports</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <main>
    <section class="section" aria-labelledby="cadence-title">
      <p class="eyebrow">Working rhythm</p>
      <h2 id="cadence-title">One lesson, carried across the right formats.</h2>
      <p class="lede">
        LinkedIn is the main conversation. YouTube shows the complete workflow twice a month. Email
        keeps only the lessons that have earned a durable record.
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
      <p class="eyebrow">Current editorial queue</p>
      <h2 id="schedule-title">Four questions from work already in the repository.</h2>
      <p class="lede">
        Dates reserve editorial attention. A topic publishes only after its public-safe evidence
        passes review.
      </p>
      <div class="schedule-list">
        {#each marketingSchedule as item, index}
          <article>
            <div class="index">{String(index + 1).padStart(2, '0')}</div>
            <div>
              <p class="week">Week of {item.weekOf}</p>
              <h3>{item.readerQuestion}</h3>
              <p>{item.theme}. Source: {item.source}.</p>
              <dl>
                <div>
                  <dt>Evidence</dt>
                  <dd>{item.evidence}</dd>
                </div>
                <div>
                  <dt>Channels</dt>
                  <dd>{item.channels.join(' · ')}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{item.state}</dd>
                </div>
              </dl>
            </div>
          </article>
        {/each}
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
    description="We will map its owner, tools, decision boundary, and proof before proposing a build."
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
    color: #111;
  }
  main {
    max-width: 1180px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  .section {
    padding: clamp(4rem, 8vw, 7rem) 0;
    border-top: 1px solid rgba(17, 17, 17, 0.16);
  }
  .eyebrow,
  .week,
  dt {
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
    background: rgba(17, 17, 17, 0.16);
    border: 1px solid rgba(17, 17, 17, 0.16);
  }
  .cadence-grid article {
    min-height: 190px;
    padding: 1.25rem;
    background: #f3f3f0;
  }
  .cadence-grid article > p {
    margin: 0 0 2rem;
    color: #67675f;
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
    color: #55554f;
    line-height: 1.45;
  }
  .schedule-list {
    margin-top: 3rem;
    border-top: 1px solid #111;
  }
  .schedule-list > article {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 1.5rem;
    padding: 2rem 0;
    border-bottom: 1px solid rgba(17, 17, 17, 0.25);
  }
  .index {
    font: 1.4rem var(--font-performance-mono, monospace);
  }
  .week {
    margin-bottom: 0.5rem;
    color: #67675f;
  }
  .schedule-list h3 {
    max-width: 760px;
    font-size: clamp(1.5rem, 3vw, 2.6rem);
  }
  .schedule-list article > div > p:not(.week) {
    max-width: 720px;
    line-height: 1.5;
  }
  dl {
    display: grid;
    grid-template-columns: 2fr 1fr 0.7fr;
    gap: 1rem;
    margin: 1.5rem 0 0;
  }
  dt {
    margin: 0 0 0.35rem;
    color: #67675f;
  }
  dd {
    margin: 0;
    line-height: 1.4;
  }
  .method-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-top: 3rem;
  }
  .method-grid article {
    border-top: 2px solid #111;
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
    dl {
      grid-template-columns: 1fr;
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
    .schedule-list > article {
      grid-template-columns: 44px 1fr;
      gap: 0.75rem;
    }
  }
</style>
