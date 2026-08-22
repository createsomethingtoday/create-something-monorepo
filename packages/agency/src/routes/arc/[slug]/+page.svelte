<script lang="ts">
  import {
    PerformanceNarrativeStage,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import type { AtlasCompositionScene } from '@create-something/atlas-composition';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const composition = $derived(data.arc.composition);
  const arcRoute = $derived(composition.routes.find((route) => route.kind === 'arc'));
  const sourceScenes = $derived.by(() => {
    if (!arcRoute) throw new Error(`Arc route missing for ${data.arc.slug}`);
    return arcRoute.sceneIds.map((sceneId) => {
      const scene = composition.scenes.find((candidate) => candidate.id === sceneId);
      if (!scene) throw new Error(`Unknown Arc scene: ${sceneId}`);
      return scene;
    });
  });
  const toneByKind: Record<AtlasCompositionScene['kind'], PerformanceNarrativeScene['tone']> = {
    signal: 'review',
    automation: 'neutral',
    map: 'neutral',
    judgment: 'review',
    runbook: 'allow',
    receipt: 'allow'
  };
  const scenes: PerformanceNarrativeScene[] = $derived(sourceScenes.map((scene) => ({
    id: scene.id,
    label: scene.label,
    summary: scene.presentation.reader.takeaway,
    title: scene.presentation.reader.heading,
    detail: scene.presentation.reader.explanation,
    stakeholders: scene.presentation.reader.stakeholders,
    tone: toneByKind[scene.kind],
    evidence: scene.evidence,
    receipts: scene.kind === 'receipt' ? ['Expected proof · no run claimed'] : undefined
  })));

  function nodeLabel(id: string): string {
    return id
      .replace(`${composition.id}-`, '')
      .replace(/^step-\d+-/, '')
      .replaceAll('-', ' ');
  }
</script>

<!-- search-policy: noindex; generated Arcs are read-only registry projections. -->
<svelte:head>
  <title>{data.arc.title} Arc · CREATE SOMETHING</title>
  <meta name="description" content={data.arc.description} />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="registry-arc property-performance">
  <header class="registry-arc__hero">
    <div>
      <a href="/arcs">Arc catalog</a>
      <p>{data.arc.source.kind.replaceAll('-', ' ')} · read only</p>
      <h1>{data.arc.title}</h1>
      <p class="registry-arc__lede">{data.arc.description}</p>
    </div>
    <dl>
      <div>
        <dt>Registry</dt>
        <dd>{data.arc.source.registry}</dd>
      </div>
      <div>
        <dt>Scenes</dt>
        <dd>{sourceScenes.length}</dd>
      </div>
      <div>
        <dt>Routes</dt>
        <dd>Arc · Playbook · Runbook</dd>
      </div>
      <div>
        <dt>Authority</dt>
        <dd>No external writes</dd>
      </div>
    </dl>
  </header>

  <PerformanceNarrativeStage
    id={`arc-${data.arc.slug}`}
    eyebrow="Presentation-native operating route"
    title="Read the method. Follow the route. Inspect the proof."
    description="This Arc is generated from the registered source. It adds a presentation view without copying workflow authority or claiming a completed run."
    {scenes}
    ariaLabel={`${data.arc.title} Arc scenes`}
    enablePresentation
  >
    {#snippet artifact(_scene, index)}
      {@const scene = sourceScenes[index]}
      <section class="registry-arc__artifact" data-layout={scene.presentation.layout}>
        {#if scene.presentation.relationships?.length}
          <ol class="registry-arc__route" aria-label="Registered route relationships">
            {#each scene.presentation.relationships as relationship}
              <li>
                <strong>{nodeLabel(relationship.fromNodeId)}</strong>
                <span>{relationship.label}</span>
                <strong>{nodeLabel(relationship.toNodeId)}</strong>
              </li>
            {/each}
          </ol>
        {:else if scene.presentation.branches?.length}
          <ol class="registry-arc__steps" aria-label="Runbook steps">
            {#each scene.presentation.branches as branch}
              <li>
                <strong>{branch.label}</strong>
                <p>{branch.explanation}</p>
                <small>Next · {branch.next}</small>
              </li>
            {/each}
          </ol>
        {:else}
          <div class="registry-arc__callout">
            <span>{scene.presentation.callout?.label ?? scene.label}</span>
            <strong>{scene.presentation.callout?.value ?? scene.title}</strong>
            <p>{scene.presentation.callout?.detail ?? scene.detail}</p>
          </div>
        {/if}
      </section>
    {/snippet}
  </PerformanceNarrativeStage>

  <section class="registry-arc__contract" aria-labelledby="registry-arc-contract-title">
    <div>
      <span>One source · three views</span>
      <h2 id="registry-arc-contract-title">The map remains the operating center.</h2>
    </div>
    <ol>
      {#each composition.routes as route}
        <li>
          <strong>{route.kind}</strong>
          <p>{route.description}</p>
          <small>{route.sceneIds.length} linked scenes</small>
        </li>
      {/each}
    </ol>
  </section>
</main>

<style>
  .registry-arc {
    min-height: 100vh;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }
  .registry-arc__hero,
  .registry-arc__contract {
    width: min(calc(100% - 2rem), 1120px);
    margin-inline: auto;
  }
  .registry-arc__hero {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(17rem, 0.8fr);
    gap: clamp(2rem, 8vw, 7rem);
    padding: clamp(4rem, 10vw, 8rem) 0 3rem;
  }
  .registry-arc__hero a,
  .registry-arc__hero > div > p:first-of-type,
  .registry-arc__hero dt,
  .registry-arc__contract > div > span,
  .registry-arc__artifact span,
  .registry-arc__artifact small {
    font: 650 0.68rem/1.35 var(--font-performance-mono, ui-monospace, monospace);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .registry-arc__hero a {
    color: inherit;
    text-underline-offset: 0.3rem;
  }
  .registry-arc__hero > div > p:first-of-type,
  .registry-arc__hero dt,
  .registry-arc__contract > div > span {
    color: var(--color-performance-muted, #5f605a);
  }
  .registry-arc h1 {
    max-width: 12ch;
    margin: 0.75rem 0 1.25rem;
    font-size: clamp(3rem, 7vw, 6.5rem);
    letter-spacing: -0.07em;
    line-height: 0.9;
  }
  .registry-arc__lede {
    max-width: 60ch;
    font-size: clamp(1.05rem, 2vw, 1.24rem);
    line-height: 1.55;
  }
  .registry-arc__hero dl {
    align-self: end;
    margin: 0;
    border-top: 1px solid;
  }
  .registry-arc__hero dl div {
    display: grid;
    grid-template-columns: 6rem 1fr;
    gap: 1rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }
  .registry-arc__hero dd {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.82rem;
    font-weight: 650;
  }
  .registry-arc__artifact {
    overflow: auto;
    border: 1px solid;
    background: #111;
    color: #f3f3f0;
  }
  .registry-arc__route,
  .registry-arc__steps {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .registry-arc__route li {
    display: grid;
    grid-template-columns: minmax(9rem, 1fr) minmax(6rem, 0.45fr) minmax(9rem, 1fr);
    align-items: center;
    min-width: 36rem;
    border-bottom: 1px solid rgb(255 255 255 / 0.2);
  }
  .registry-arc__route li:last-child {
    border-bottom: 0;
  }
  .registry-arc__route strong,
  .registry-arc__route span {
    padding: 1rem;
  }
  .registry-arc__route span {
    border-inline: 1px solid rgb(255 255 255 / 0.2);
    color: #ebd26c;
    text-align: center;
  }
  .registry-arc__steps {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(16rem, 1fr);
    min-width: max-content;
  }
  .registry-arc__steps li {
    width: min(20rem, 74vw);
    padding: 1rem;
    border-right: 1px solid rgb(255 255 255 / 0.2);
  }
  .registry-arc__steps p {
    color: #c9c8c0;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .registry-arc__steps small {
    color: #e1d687;
  }
  .registry-arc__callout {
    display: grid;
    align-content: end;
    min-height: 18rem;
    padding: clamp(1.5rem, 5vw, 3.5rem);
    background: radial-gradient(circle at 85% 15%, rgb(0 87 184 / 0.4), transparent 34%), #111;
  }
  .registry-arc__callout span {
    color: #e1d687;
  }
  .registry-arc__callout strong {
    max-width: 16ch;
    margin: 0.7rem 0 1rem;
    font-size: clamp(1.8rem, 4vw, 3.8rem);
    line-height: 0.95;
  }
  .registry-arc__callout p {
    max-width: 55ch;
    color: #c9c8c0;
    line-height: 1.5;
  }
  .registry-arc__contract {
    display: grid;
    grid-template-columns: minmax(14rem, 0.5fr) minmax(0, 1fr);
    gap: 2rem;
    padding: 3rem 0 5rem;
  }
  .registry-arc__contract h2 {
    max-width: 10ch;
    margin: 0.5rem 0 0;
    font-size: clamp(1.8rem, 3vw, 2.8rem);
    line-height: 1;
  }
  .registry-arc__contract ol {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    padding: 0;
    border: 1px solid;
    list-style: none;
  }
  .registry-arc__contract li {
    padding: 1rem;
    border-right: 1px solid;
  }
  .registry-arc__contract li:last-child {
    border-right: 0;
  }
  .registry-arc__contract li > strong {
    color: var(--color-performance-signal, #0057b8);
    font: 750 0.72rem/1 var(--font-performance-mono, ui-monospace, monospace);
    text-transform: uppercase;
  }
  .registry-arc__contract li p {
    font-size: 0.82rem;
    line-height: 1.4;
  }
  .registry-arc__contract li small {
    color: var(--color-performance-muted, #5f605a);
  }
  @media (max-width: 760px) {
    .registry-arc__hero,
    .registry-arc__contract {
      grid-template-columns: 1fr;
    }
    .registry-arc__contract ol {
      grid-template-columns: 1fr;
    }
    .registry-arc__contract li {
      border-right: 0;
      border-bottom: 1px solid;
    }
    .registry-arc__contract li:last-child {
      border-bottom: 0;
    }
  }
</style>
