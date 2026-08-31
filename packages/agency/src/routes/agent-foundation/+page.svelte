<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { playbookHeroMedia } from '$lib/data/playbookHeroMedia';
  import {
    agentFoundationHandoff,
    agentFoundationHero,
    agentFoundationLayers,
    agentFoundationScenes,
    agentFoundationStages
  } from '$lib/data/agentFoundation';
</script>

<SEO
  title="Agent Foundation | Build an Agent You Can Keep Building"
  description="Bring the agent project you started with Codex. CREATE SOMETHING delivers one useful capability, its infrastructure, tests, policy, and client-owned continuation path."
  keywords="agent foundation, Codex agent development, client-owned AI agent, AI agent infrastructure, MCP agent tools, agent handoff, agent production promotion"
  propertyName="agency"
/>

<main class="agent-foundation-page property-performance">
  <PerformanceCampaignOpening
    eyebrow="Agent Foundation"
    propertyRole="One role · one job · one owned repository"
    expression="editorial"
    title={agentFoundationHero.title}
    lede={agentFoundationHero.lede}
    proof={agentFoundationHero.proof}
    media={playbookHeroMedia.services}
    mediaMobilePlacement="background"
    density="compact"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentFoundationBookingHref}>
        {agencyCoreMessaging.bringAgentProjectLabel}
      </Button>
      <Button href="#foundation-boundary" variant="secondary"
        >See what the foundation includes</Button
      >
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="agent-foundation-delivery"
    eyebrow="What ships"
    title="Bound the job. Build the capability. Exercise the handoff."
    description="Agent Foundation is a scoped CREATE SOMETHING Build for teams that already have a real agent project. The workflow and infrastructure stay underneath; your team receives a working, inspectable system it can continue with Codex."
    scenes={agentFoundationScenes}
    ariaLabel="Agent Foundation delivery sequence"
    density="compact"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      <aside class="foundation-receipt" aria-label={`${scene.label} delivery receipt`}>
        <span>{scene.label}</span>
        <strong>{scene.summary}</strong>
        <p>{scene.detail}</p>
      </aside>
    {/snippet}
  </PerformanceNarrativeStage>

  <section
    id="foundation-boundary"
    class="foundation-boundary"
    aria-labelledby="foundation-boundary-title"
  >
    <header class="foundation-boundary__heading">
      <div>
        <p>Ownership and authority</p>
        <h2 id="foundation-boundary-title">
          The foundation is working. Production is a promotion.
        </h2>
      </div>
      <p>
        Your team keeps the repository, source, schemas, instructions, policies, tests, runbook,
        known limits, and project history. No hidden CREATE SOMETHING account or undocumented
        credential is required for the accepted development path.
      </p>
    </header>

    <div class="foundation-layers" aria-label="Agent Foundation system layers">
      {#each agentFoundationLayers as layer}
        <article>
          <span>{layer.label}</span>
          <h3>{layer.title}</h3>
          <p>{layer.detail}</p>
        </article>
      {/each}
    </div>

    <div class="foundation-stages" aria-label="Agent Foundation and Production Promotion boundary">
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
      Foundation pricing is quoted after fit. Deployment, hosting, live writes, monitoring, signing,
      distribution, ongoing managed operation, and real-user acceptance are not implied. If the
      accepted capability should go live, Production Promotion receives its own owner, authority,
      rollback plan, and verification scope. Review the <a href="/services">full service path</a> or,
      if the application already exists and only needs a governed workflow contract, inspect the
      <a href={agencyCoreMessaging.workflowCompilerIntegrationHref}>Control Compiler Integration</a
      >.
    </p>
  </section>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Foundation fit"
    title="Bring the repository and one job for the agent."
    description="Share the project or prototype, the role the agent serves, one representative input, an acceptable result, and the intended Codex environment. We will return a fit decision and the proposed Foundation boundary before implementation is quoted."
    handoff={agentFoundationHandoff}
    steps={[
      {
        label: 'Project',
        title: 'Show what you started',
        detail: 'Bring the repository, prototype, or current working artifact.'
      },
      {
        label: 'Job',
        title: 'Name one useful capability',
        detail: 'Define the role, representative input, acceptable result, and stop boundary.'
      },
      {
        label: 'Fit',
        title: 'Choose the smallest responsible path',
        detail: 'Foundation fit, Map first, Harness or MCP-only, Production scope, or not a fit.'
      }
    ]}
    artifactPlacement="sidecar"
    density="concise"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.agentFoundationBookingHref}>
        {agencyCoreMessaging.bringAgentProjectLabel}
      </Button>
      <Button href={agencyCoreMessaging.selfMapHref} variant="secondary">Start with Map</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .agent-foundation-page {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .foundation-receipt {
    display: grid;
    gap: 0.75rem;
    min-height: 16rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .foundation-receipt span,
  .foundation-boundary__heading > div > p,
  .foundation-layers span,
  .foundation-stages span {
    margin: 0;
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .foundation-receipt strong {
    max-width: 25ch;
    font-size: clamp(1.35rem, 3vw, 2.1rem);
    line-height: 1.05;
  }

  .foundation-receipt p {
    max-width: 56ch;
    margin: auto 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.6;
  }

  .foundation-boundary {
    padding: clamp(4rem, 9vw, 8rem) clamp(1.25rem, 5vw, 6rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .foundation-boundary__heading,
  .foundation-layers,
  .foundation-stages,
  .foundation-boundary__note {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
  }

  .foundation-boundary__heading {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(18rem, 0.75fr);
    gap: clamp(2rem, 7vw, 8rem);
    align-items: end;
    margin-bottom: clamp(2.5rem, 6vw, 5rem);
  }

  .foundation-boundary__heading h2 {
    max-width: 14ch;
    margin: 0.7rem 0 0;
    font-size: clamp(2.6rem, 5.4vw, 5.4rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.055em;
    line-height: 0.94;
  }

  .foundation-boundary__heading > p,
  .foundation-boundary__note {
    margin-block: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: clamp(1rem, 1.3vw, 1.15rem);
    line-height: 1.6;
  }

  .foundation-layers,
  .foundation-stages {
    display: grid;
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
  }

  .foundation-layers {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .foundation-stages {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: clamp(1.5rem, 3vw, 2.5rem);
  }

  .foundation-layers article,
  .foundation-stages article {
    min-width: 0;
    padding: clamp(1.25rem, 3vw, 2rem);
    background: var(--color-performance-panel, #fff);
  }

  .foundation-layers h3,
  .foundation-stages h3 {
    max-width: 24ch;
    margin: 0.85rem 0 1rem;
    font-size: clamp(1.35rem, 2.4vw, 2.1rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.035em;
    line-height: 1.08;
  }

  .foundation-layers p,
  .foundation-stages li {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .foundation-layers p {
    margin: 0;
  }

  .foundation-stages ul {
    display: grid;
    gap: 0.65rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .foundation-stages li {
    position: relative;
    padding-left: 1rem;
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

  @media (max-width: 48rem) {
    .foundation-boundary {
      padding-block: 3.5rem;
    }

    .foundation-boundary__heading,
    .foundation-layers,
    .foundation-stages {
      grid-template-columns: 1fr;
    }

    .foundation-boundary__heading {
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .foundation-boundary__heading h2 {
      font-size: clamp(2.55rem, 13vw, 4.2rem);
    }
  }
</style>
