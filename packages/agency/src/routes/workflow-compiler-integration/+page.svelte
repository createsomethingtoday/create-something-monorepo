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
    workflowCompilerIntegrationClose,
    workflowCompilerIntegrationHandoff,
    workflowCompilerIntegrationHero,
    workflowCompilerIntegrationScenes,
    workflowCompilerIntegrationScope
  } from '$lib/data/workflowCompilerIntegration';
</script>

<SEO
  title="Workflow Compiler Integration | CREATE SOMETHING"
  description="Install one governed AI workflow contract, its MCP or agent tool boundary, policy artifacts, receipts, and CI gate in your repository."
  keywords="workflow compiler integration, governed AI workflow, MCP integration, agent CI gate, workflow policy artifacts"
  propertyName="agency"
/>

<main class="compiler-integration-page">
  <PerformanceCampaignOpening
    eyebrow="Control Compiler Integration"
    expression="editorial"
    title={workflowCompilerIntegrationHero.title}
    lede={workflowCompilerIntegrationHero.lede}
    density="compact"
    media={playbookHeroMedia.services}
    mediaMobilePlacement="background"
    proof={workflowCompilerIntegrationHero.proof}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowCompilerIntegrationBookingHref}>
        Book an integration fit call
      </Button>
      <Button
        href="https://www.npmjs.com/package/@createsomething/workflow-compiler"
        variant="secondary"
      >
        Inspect the open-source compiler
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="workflow-compiler-integration-story"
    eyebrow="What ships"
    title="A governed workflow your builders can keep composing."
    description="The engagement turns one consequential workflow into a local and CI contract without introducing a hosted runtime or transferring operating authority."
    scenes={workflowCompilerIntegrationScenes}
    ariaLabel="Workflow Compiler Integration delivery sequence"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      <aside class="integration-record" aria-label={`${scene.label} integration record`}>
        <span>{scene.label}</span>
        <strong>{scene.summary}</strong>
        <p>{scene.detail}</p>
      </aside>
    {/snippet}
  </PerformanceNarrativeStage>

  <section class="scope" aria-labelledby="compiler-scope-title">
    <div class="scope__heading">
      <p>Fixed-scope Build</p>
      <h2 id="compiler-scope-title">A narrow integration boundary, written down.</h2>
      <div>
        <a href="/services">See the Map → Build → Control path</a>
        <a href="/map">Start with Map if the workflow is not yet defined</a>
      </div>
    </div>

    <div class="scope__grid">
      {#each workflowCompilerIntegrationScope as group}
        <article>
          <p>{group.label}</p>
          <h3>{group.title}</h3>
          <ul>
            {#each group.items as item}
              <li>{item}</li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  </section>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="The commercial boundary"
    title={workflowCompilerIntegrationClose.title}
    description={workflowCompilerIntegrationClose.description}
    handoff={workflowCompilerIntegrationHandoff}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowCompilerIntegrationBookingHref}>
        Book an integration fit call
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .integration-record {
    display: grid;
    gap: 0.75rem;
    min-height: 16rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #fff);
  }

  .integration-record span,
  .scope__heading > p,
  article > p {
    margin: 0;
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .integration-record strong {
    max-width: 24ch;
    font-size: clamp(1.35rem, 3vw, 2.1rem);
    line-height: 1.05;
  }

  .integration-record p {
    max-width: 54ch;
    margin: auto 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.6;
  }

  .scope {
    padding: clamp(4rem, 9vw, 8rem) clamp(1.25rem, 5vw, 6rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .scope__heading,
  .scope__grid {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
  }

  .scope__heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.45fr);
    gap: 1rem clamp(2rem, 8vw, 9rem);
    align-items: end;
    margin-bottom: clamp(2.5rem, 6vw, 5rem);
  }

  .scope__heading > p,
  .scope__heading h2 {
    grid-column: 1;
  }

  .scope__heading h2 {
    max-width: 14ch;
    margin: 0;
    font-size: clamp(2.5rem, 5.4vw, 5.3rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.055em;
    line-height: 0.96;
  }

  .scope__heading div {
    grid-column: 2;
    grid-row: 1 / 3;
    display: grid;
    gap: 0.85rem;
    align-self: end;
  }

  .scope__heading a {
    color: inherit;
    font-size: 0.9rem;
    line-height: 1.4;
    text-underline-offset: 0.25rem;
  }

  .scope__heading a:hover,
  .scope__heading a:focus-visible {
    color: var(--color-performance-signal, #0f62fe);
  }

  .scope__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
  }

  article {
    min-width: 0;
    padding: clamp(1.25rem, 3vw, 2rem);
    background: var(--color-performance-panel, #fff);
  }

  article h3 {
    min-height: 3.4em;
    margin: 0.85rem 0 1.5rem;
    font-size: clamp(1.4rem, 2.5vw, 2.2rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.035em;
    line-height: 1.08;
  }

  article ul {
    display: grid;
    gap: 0.7rem;
    margin: 0;
    padding: 0;
    color: var(--color-performance-muted, #5e6268);
    list-style: none;
  }

  article li {
    position: relative;
    padding-left: 1rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  article li::before {
    position: absolute;
    top: 0.65em;
    left: 0;
    width: 0.35rem;
    height: 1px;
    background: var(--color-performance-line-strong, #a7a7a2);
    content: '';
  }

  @media (max-width: 48rem) {
    .scope__heading {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .scope__heading > p,
    .scope__heading h2,
    .scope__heading div {
      grid-column: 1;
      grid-row: auto;
    }

    .scope__heading div {
      margin-top: 1rem;
    }

    .scope__grid {
      grid-template-columns: 1fr;
    }

    article h3 {
      min-height: auto;
    }
  }
</style>
