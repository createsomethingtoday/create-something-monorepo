<script lang="ts">
  import { ArcDeck } from '@create-something/arc';
  import { APP_REVIEW_GOVERNANCE_COMPOSITION } from '@create-something/atlas-composition';

  const composition = APP_REVIEW_GOVERNANCE_COMPOSITION;
  const motionArtifact = composition.artifacts.find(
    (artifact) => artifact.id === 'motion-authoring-contract'
  );

  function formatCost(costUsd: number | null): string {
    return costUsd === null ? 'Not separately metered' : `$${costUsd.toFixed(2)}`;
  }
</script>

<!-- search-policy: noindex; this Arc exposes a local-action fixture, not an indexable marketing route. -->
<svelte:head>
  <title>App Review Governance Arc · CREATE SOMETHING</title>
  <meta
    name="description"
    content="A presentation-native Arc showing how App Review intake, Preflight evidence, governed action, and receipts fit together."
  />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="arc-prototype property-performance">
  <header class="arc-hero">
    <div>
      <p>Arc / App Review Governance / reference artifact</p>
      <h1>Tell the whole operating story.</h1>
      <span>
        Follow an app from submission to a decision, a clear next step, and proof of what happened.
        Open the deck to see the process one human-readable slide at a time.
      </span>
    </div>
    <dl aria-label="What this means for you">
      <div><dt>Creator</dt><dd>What happens to my app?</dd></div>
      <div><dt>Reviewer</dt><dd>What do I decide?</dd></div>
      <div><dt>Partnerships & Support</dt><dd>How do exceptions move?</dd></div>
      <div><dt>Leadership</dt><dd>Where is the proof?</dd></div>
    </dl>
  </header>

  <ArcDeck
    {composition}
    routeId="app-review-governance-arc"
    title="App Review, explained for the people involved"
    description="Submission → decision → next step → proof"
    ariaLabel="App Review Governance Arc scenes"
    actionEndpoint="/api/arcs/app-review-governance"
    enablePresentation
  />

  <section class="arc-contract" aria-labelledby="arc-contract-title">
    <div>
      <span>Reuse this story</span>
      <h2 id="arc-contract-title">The same review can guide different kinds of work.</h2>
    </div>
    <ol>
      {#each composition.routes as route}
        <li data-route-kind={route.kind}>
          <strong>{route.kind}</strong>
          <span>{route.description}</span>
          <small>{route.sceneIds.length} linked scenes · one shared map</small>
        </li>
      {/each}
    </ol>
  </section>

  {#if motionArtifact}
    <aside class="arc-motion-note">
      <span>AI-native presentation boundary</span>
      <p>{motionArtifact.summary}</p>
      <small>
        Model: {motionArtifact.provenance.model} · Prompt: {motionArtifact.provenance.promptReference}
        · Rights: {motionArtifact.provenance.rights} · Cost: {formatCost(motionArtifact.provenance.costUsd)}
      </small>
    </aside>
  {/if}
</main>

<style>
  .arc-prototype { min-height: 100vh; background: var(--color-performance-paper, #f3f3f0); color: var(--color-performance-ink, #090909); }
  .arc-hero, .arc-contract, .arc-motion-note { width: min(calc(100% - 2rem), 72rem); margin-inline: auto; }
  .arc-hero { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(16rem, .7fr); gap: clamp(2rem, 8vw, 7rem); padding: clamp(4rem, 11vw, 8rem) 0 clamp(2.5rem, 5vw, 4rem); }
  .arc-hero p, .arc-contract > div > span, .arc-motion-note > span { color: var(--color-performance-muted, #5f605a); font: 600 .7rem/1.2 var(--font-performance-mono, ui-monospace, monospace); letter-spacing: .1em; text-transform: uppercase; }
  .arc-hero h1 { max-width: 10ch; margin: .85rem 0 1.15rem; font-size: clamp(3.25rem, 8vw, 7.25rem); letter-spacing: -.075em; line-height: .88; }
  .arc-hero > div > span { display: block; max-width: 60ch; font-size: clamp(1.06rem, 2vw, 1.28rem); line-height: 1.55; }
  .arc-hero dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-self: end; margin: 0; border-top: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero dl div { padding: 1rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
  .arc-hero dt { color: var(--color-performance-muted, #5f605a); font-size: .72rem; text-transform: uppercase; }
  .arc-hero dd { margin: .4rem 0 0; font-size: .9rem; font-weight: 650; }
  .arc-contract { display: grid; grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr); gap: 2rem; padding: 1.75rem 0; border-top: 1px solid; }
  .arc-contract h2 { max-width: 12ch; margin: .5rem 0 0; font-size: clamp(1.75rem, 3vw, 2.7rem); line-height: 1; }
  .arc-contract ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; margin: 0; padding: 0; background: var(--color-performance-line, #d7d7d2); list-style: none; }
  .arc-contract li { display: grid; gap: .55rem; padding: 1rem; background: var(--color-performance-paper, #f3f3f0); }
  .arc-contract li strong { color: var(--color-performance-controlled, #0057b8); font: 700 .75rem/1 var(--font-performance-mono, ui-monospace, monospace); text-transform: uppercase; }
  .arc-contract li span { font-size: .86rem; line-height: 1.42; }
  .arc-contract li small, .arc-motion-note small { color: var(--color-performance-muted, #5f605a); font-size: .72rem; line-height: 1.45; }
  .arc-motion-note { padding: 2rem 0 4rem; border-top: 1px solid; }
  .arc-motion-note p { max-width: 55ch; margin: .5rem 0; font-size: .98rem; }
  @media (max-width: 48rem) { .arc-hero, .arc-contract { grid-template-columns: 1fr; } .arc-contract ol { grid-template-columns: 1fr; } }
</style>
