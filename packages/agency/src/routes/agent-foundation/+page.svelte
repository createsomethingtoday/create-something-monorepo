<script lang="ts">
  import { Button, PerformanceCampaignOpening, SEO } from '@create-something/canon';
  import { getAnalytics } from '@create-something/canon/analytics';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';
  import {
    agentFoundationChecks,
    agentFoundationFit,
    agentFoundationHero,
    agentFoundationRepository,
    agentFoundationStages
  } from '$lib/data/agentFoundation';

  function trackFoundationBooking(location: 'opening' | 'handoff') {
    getAnalytics()?.conversion('agent_foundation_booking_clicked', {
      surface: 'agent-foundation',
      location,
      destination: agencyCoreMessaging.agentFoundationBookingHref
    });
  }
</script>

<SEO
  title="Agent Foundation | One Useful Job in Your Repository"
  description="Bring the agent you started with Codex. CREATE SOMETHING gets one useful job working in your repository, then proves you can continue."
  keywords="agent foundation, Codex agent development, client-owned AI agent, AI agent infrastructure, MCP agent tools, agent handoff, agent production promotion"
  propertyName="agency"
/>

<main class="agent-foundation-page property-performance">
  <PerformanceCampaignOpening
    eyebrow="Agent Foundation"
    propertyRole="One role · one job · your repository"
    expression="editorial"
    title={agentFoundationHero.title}
    lede={agentFoundationHero.lede}
    proof={agentFoundationHero.proof}
    media={playbookHeroMedia.services}
    mediaMobilePlacement="background"
    density="compact"
  >
    {#snippet actions()}
      <Button
        href={agencyCoreMessaging.agentFoundationBookingHref}
        onclick={() => trackFoundationBooking('opening')}
      >
        {agencyCoreMessaging.bookAgentFoundationLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <section
    class="foundation-proof"
    data-agent-foundation-proof
    aria-labelledby="foundation-proof-title"
  >
    <header class="foundation-proof__heading">
      <div>
        <p>The handoff</p>
        <h2 id="foundation-proof-title">Inside your repository.</h2>
      </div>
      <p>
        We define the job, build it, and prove the handoff. You receive the working path and the
        records needed to understand what the agent can do.
      </p>
    </header>

    <div class="foundation-proof__workbench">
      <article class="repository-record" aria-labelledby="repository-record-title">
        <header>
          <div>
            <span>Example handoff structure</span>
            <h3 id="repository-record-title">agent-foundation/</h3>
          </div>
          <small>Illustrative · not a client result</small>
        </header>
        <dl class="job-example" aria-label="Illustrative agent job">
          <div>
            <dt>Illustrative job</dt>
            <dd>Turn meeting notes into a reviewable action list.</dd>
          </div>
          <div>
            <dt>Input</dt>
            <dd>Meeting notes</dd>
          </div>
          <div>
            <dt>Draft result</dt>
            <dd>Actions with owners and due dates</dd>
          </div>
          <div>
            <dt>Approval</dt>
            <dd>Human review before any external write</dd>
          </div>
        </dl>
        <ul>
          {#each agentFoundationRepository as entry}
            <li>
              <code>{entry.path}</code>
              <span>{entry.purpose}</span>
            </li>
          {/each}
        </ul>
      </article>

      <aside class="continuation-record" aria-labelledby="continuation-record-title">
        <span>Handoff proof</span>
        <h3 id="continuation-record-title">You make the next change.</h3>
        <ol>
          {#each agentFoundationChecks as check, index}
            <li>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>{check}</span>
            </li>
          {/each}
        </ol>
        <p>Foundation proves this continuation path. It does not prove every future change.</p>
      </aside>
    </div>
  </section>

  <section
    id="foundation-boundary"
    class="foundation-boundary"
    aria-labelledby="foundation-boundary-title"
  >
    <header class="foundation-boundary__heading">
      <div>
        <p>Ownership and production</p>
        <h2 id="foundation-boundary-title">What works at handoff—and what going live adds.</h2>
      </div>
      <p>
        You keep the repository and everything needed to understand it: source, schemas,
        instructions, policies, tests, runbook, known limits, and project history. No hidden CREATE
        SOMETHING account or undocumented credential is required for the agreed development
        environment.
      </p>
    </header>

    <div class="foundation-stages" aria-label="Foundation and Production Promotion boundary">
      {#each agentFoundationStages as stage}
        <article>
          <span>{stage.state}</span>
          <h3>{stage.title}</h3>
          <ul>
            {#each stage.items as item}
              <li>{item}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>

    <p class="foundation-boundary__note">
      We quote the Foundation after we review the project and agree on the job. Production
      credentials, deployment, live writes, monitoring, and real-user acceptance require a
      separately scoped Production Promotion.
    </p>
  </section>

  <section class="foundation-fit" aria-labelledby="foundation-fit-title">
    <div class="foundation-fit__inner">
      <div class="foundation-fit__copy">
        <p>Foundation fit</p>
        <h2 id="foundation-fit-title">Bring your repository and one job for the agent.</h2>
        <p>
          On the call, we’ll agree on the first useful job. If there’s a fit, you leave with the
          proposed scope and the basis for a quote.
        </p>
        <Button
          href={agencyCoreMessaging.agentFoundationBookingHref}
          onclick={() => trackFoundationBooking('handoff')}
        >
          {agencyCoreMessaging.bookAgentFoundationLabel}
        </Button>
        <small>If the role is still unclear, we may recommend mapping the job first.</small>
      </div>

      <dl class="foundation-fit__brief" aria-label="What to bring to an Agent Foundation fit call">
        {#each agentFoundationFit as item}
          <div>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        {/each}
      </dl>
    </div>
  </section>
</main>

<style>
  .agent-foundation-page {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .foundation-proof,
  .foundation-boundary,
  .foundation-fit {
    padding: clamp(4rem, 9vw, 8rem) clamp(1.25rem, 5vw, 6rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .foundation-proof {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .foundation-proof__heading,
  .foundation-proof__workbench,
  .foundation-boundary__heading,
  .foundation-stages,
  .foundation-boundary__note,
  .foundation-fit__inner {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
  }

  .foundation-proof__heading,
  .foundation-boundary__heading {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
    gap: clamp(2rem, 7vw, 8rem);
    align-items: end;
    margin-bottom: clamp(2.5rem, 6vw, 5rem);
  }

  .foundation-proof__heading > div > p,
  .foundation-boundary__heading > div > p,
  .repository-record header span,
  .continuation-record > span,
  .foundation-stages > article > span,
  .foundation-fit__copy > p:first-child,
  .foundation-fit dt {
    margin: 0;
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .foundation-proof__heading h2,
  .foundation-boundary__heading h2,
  .foundation-fit h2 {
    max-width: 14ch;
    margin: 0.7rem 0 0;
    font-size: clamp(2.6rem, 5.4vw, 5.4rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.055em;
    line-height: 0.94;
  }

  .foundation-proof__heading > p,
  .foundation-boundary__heading > p,
  .foundation-boundary__note,
  .foundation-fit__copy > p:nth-of-type(2) {
    margin-block: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: clamp(1rem, 1.3vw, 1.15rem);
    line-height: 1.6;
  }

  .foundation-proof__workbench {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(20rem, 0.92fr);
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--color-performance-line-strong, #a7a7a2);
    background: var(--color-performance-line-strong, #a7a7a2);
  }

  .repository-record,
  .continuation-record {
    min-width: 0;
    margin: 0;
    padding: clamp(1.25rem, 3vw, 2rem);
  }

  .repository-record {
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.04) 1px, transparent 1px) 0 0 / 3rem 3rem,
      var(--color-performance-panel, #fff);
  }

  .repository-record header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .repository-record h3,
  .continuation-record h3 {
    margin: 0.65rem 0 0;
    font-size: clamp(1.5rem, 3vw, 2.5rem);
    font-weight: var(--font-performance-medium, 500);
    letter-spacing: -0.035em;
    line-height: 1;
  }

  .repository-record small {
    max-width: 16ch;
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    line-height: 1.4;
    text-align: right;
    text-transform: uppercase;
  }

  .repository-record ul,
  .continuation-record ol,
  .foundation-stages ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .job-example {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    margin: 1.5rem 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
  }

  .job-example > div {
    min-width: 0;
    padding: 0.85rem;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .job-example dt {
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .job-example dd {
    margin: 0.35rem 0 0;
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .repository-record li {
    display: grid;
    grid-template-columns: minmax(8rem, 0.34fr) minmax(0, 0.66fr);
    gap: 1rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .repository-record code {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.82rem;
    font-weight: var(--font-performance-semibold, 650);
  }

  .repository-record li > span {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .continuation-record {
    display: grid;
    align-content: start;
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #fff);
  }

  .continuation-record > span {
    color: var(--color-performance-growth, #23a779);
  }

  .continuation-record ol {
    margin-top: clamp(2rem, 5vw, 4rem);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .continuation-record li {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: 1rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .continuation-record li b {
    color: var(--color-performance-growth, #23a779);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
  }

  .continuation-record li span,
  .continuation-record > p {
    color: rgba(255, 255, 255, 0.78);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .continuation-record > p {
    margin: 1.5rem 0 0;
  }

  .foundation-boundary {
    background: var(--color-performance-panel, #fff);
  }

  .foundation-stages {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
  }

  .foundation-stages article {
    min-width: 0;
    padding: clamp(1.25rem, 3vw, 2rem);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .foundation-stages h3 {
    max-width: 24ch;
    margin: 0.85rem 0 1rem;
    font-size: clamp(1.35rem, 2.4vw, 2.1rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.035em;
    line-height: 1.08;
  }

  .foundation-stages li {
    position: relative;
    padding-left: 1rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .foundation-stages li + li {
    margin-top: 0.65rem;
  }

  .foundation-stages li::before {
    position: absolute;
    top: 0.7em;
    left: 0;
    width: 0.35rem;
    height: 1px;
    background: var(--color-performance-line-strong, #a7a7a2);
    content: '';
  }

  .foundation-boundary__note {
    max-width: min(72rem, 100%);
    margin-top: clamp(1.5rem, 3vw, 2.5rem);
    padding-left: 1rem;
    border-left: 3px solid var(--color-performance-gold, #b7791f);
  }

  .foundation-fit__inner {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(22rem, 0.8fr);
    gap: clamp(3rem, 8vw, 8rem);
    align-items: end;
  }

  .foundation-fit {
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #fff);
  }

  .foundation-fit__copy {
    display: grid;
    justify-items: start;
    gap: 1.25rem;
  }

  .foundation-fit h2 {
    margin-top: 0;
  }

  .foundation-fit__copy > p:first-child {
    color: var(--color-performance-growth, #23a779);
  }

  .foundation-fit__copy > p:nth-of-type(2),
  .foundation-fit__copy small {
    color: rgba(255, 255, 255, 0.72);
  }

  .foundation-fit__copy small {
    max-width: 42ch;
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .foundation-fit__brief {
    margin: 0;
    border-top: 2px solid var(--color-performance-growth, #23a779);
  }

  .foundation-fit__brief div {
    display: grid;
    grid-template-columns: 5rem minmax(0, 1fr);
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .foundation-fit dt {
    color: var(--color-performance-growth, #23a779);
  }

  .foundation-fit dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.82);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  @media (max-width: 48rem) {
    .foundation-proof,
    .foundation-boundary,
    .foundation-fit {
      padding-block: 3.5rem;
    }

    .foundation-proof__heading,
    .foundation-boundary__heading,
    .foundation-proof__workbench,
    .foundation-stages,
    .foundation-fit__inner {
      grid-template-columns: 1fr;
    }

    .foundation-proof__heading,
    .foundation-boundary__heading {
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .foundation-proof__heading h2,
    .foundation-boundary__heading h2,
    .foundation-fit h2 {
      font-size: clamp(2.55rem, 13vw, 4.2rem);
    }

    .repository-record header {
      align-items: end;
    }

    .repository-record li {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    .foundation-fit__inner {
      gap: 3rem;
    }
  }
</style>
