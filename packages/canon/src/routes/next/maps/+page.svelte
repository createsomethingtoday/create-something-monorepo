<script lang="ts">
 import '$lib/styles/canon.css';
 import { onMount } from 'svelte';
 let interactive = false;
 onMount(() => interactive = true);
 import AtlasStoryCanvas from '$lib/atlas/AtlasStoryCanvas.svelte';
 import AtlasFlow from '$lib/atlas/AtlasFlow.svelte';
 import ClearWorkflowMiniArtifact from '$lib/components/clear/ClearWorkflowMiniArtifact.svelte';
 import BarChart from '$lib/diagrams/BarChart.svelte';
 import { createPublicAtlasCanvas } from '$lib/atlas/headless.js';
 import { getAccentColor } from '$lib/diagrams/theme.js';
 const canvas = createPublicAtlasCanvas();
 canvas.id = 'fictional-library';
 canvas.nodes[0].label = 'Fictional library owner';
 canvas.nodes[1].label = 'Draft reading list';
 canvas.nodes[1].status = 'run';
 canvas.nodes[2].label = 'Review before sharing';
 let selected = canvas.nodes[0].id;
 const properties = ['io', 'space', 'agency', 'ltd', 'lms'] as const;
</script>
<svelte:head><title>Canon maps — local review</title></svelte:head>
<main data-interactive={interactive}>
 <a href="/next">Back to Canon</a>
 <h1>Maps that keep the decision visible</h1>
 <p>Fictional local data. Selection and movement stay in this page; no record is submitted.</p>
 <section aria-label="Dark workflow"><h2>Black foundation</h2>
  <p class="map-instructions">Drag the map to explore. Use + and − to change scale, or Fit View for an overview. Select a node to inspect its name below.</p>
  <div class="interactive"><AtlasFlow {canvas} selectedNodeId={selected} onSelectNode={(id) => selected = id} contextLabel="Local fictional draft" initialViewport={{x:24,y:150,zoom:0.9}} /></div>
  <p>Selected: {canvas.nodes.find(node => node.id === selected)?.label}</p>
  <AtlasStoryCanvas {canvas} storyId="maps-dark" title="A reading list waits for its owner" compact />
  <div class="artifacts">{#each ['signal', 'decision', 'proof'] as kind}<ClearWorkflowMiniArtifact kind={kind as 'signal' | 'decision' | 'proof'} ariaLabel={`Fictional ${kind} illustration`} />{/each}</div>
 </section>
 <section data-theme="light" aria-label="Light workflow"><h2>Explicit light work surface</h2>
  <AtlasStoryCanvas {canvas} storyId="maps-light" title="Review the same fictional workflow" compact />
  <div class="artifacts">{#each ['signal', 'decision', 'proof'] as kind}<ClearWorkflowMiniArtifact kind={kind as 'signal' | 'decision' | 'proof'} ariaLabel={`Light ${kind} illustration`} />{/each}</div>
  <div class="chart"><BarChart data={{data: [{label:'Draft', value:3}, {label:'Review', value:2}, {label:'Receipt', value:1}]}} config={{property:'ltd', width:600, height:320, title:'Fictional reading-list counts'}} /></div>
  <ul class="series">{#each properties as property}<li><span style:background={getAccentColor(property)}></span>{property}</li>{/each}</ul>
  <section data-theme="dark" aria-label="Nested dark workflow"><h2>Nested dark record</h2><ClearWorkflowMiniArtifact kind="decision" ariaLabel="Nested dark decision states" /><div class="chart"><BarChart data={{data:[{label:'Draft',value:3},{label:'Review',value:2}]}} config={{property:'ltd',width:600,height:320,title:'Same local counts'}} /></div></section>
 </section>
 <noscript><p>The fictional workflow and chapter text remain available. Interactive graph controls require JavaScript.</p></noscript>
</main>
<style>
 main:not([data-interactive="true"]) .interactive, main:not([data-interactive="true"]) .map-instructions, main:not([data-interactive="true"]) :global(.atlas-story__map) { display:none; }
 main { max-width: 92rem; margin: auto; padding: clamp(1rem, 3vw, 3rem); }
 h1 { max-width: 22ch; } h2 { margin-block: 0 1rem; }
 section { min-width:0; margin-block: 2rem; padding:clamp(.75rem, 2vw, 2rem); background:var(--color-performance-bg-pure); color:var(--color-performance-fg-primary); border:1px solid var(--color-performance-border-default); }
 .interactive { height:36rem; } .artifacts {display:flex; flex-wrap:wrap; gap:2rem; padding-block:2rem;}
 .chart {overflow:auto;} .chart :global(svg) {max-width:100%; height:auto;} .series {display:flex;flex-wrap:wrap;gap:1rem;list-style:none;padding:0;} .series li {display:flex;align-items:center;gap:.5rem;} .series span {width:1rem;height:1rem;}
 a {display:inline-flex;min-height:44px;align-items:center;}
</style>
