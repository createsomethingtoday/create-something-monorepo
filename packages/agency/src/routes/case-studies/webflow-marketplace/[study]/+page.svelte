<script lang="ts">
  import { SEO } from '@create-something/canon';
  import WebflowWalkthrough from '$lib/components/WebflowWalkthrough.svelte';
  import WebflowUsageEvidence from '$lib/components/WebflowUsageEvidence.svelte';
  import { webflowStudies, webflowAttribution } from '$lib/data/webflowMarketplace';
  import '$lib/styles/webflow-case-study.css';
  let { data } = $props();
  const studies = webflowStudies.slice(1);
  let index = $derived(studies.findIndex(study => study.id === data.study.id));
</script>
{#key data.study.id}
  <SEO propertyName="agency" canonical={`https://createsomething.agency/case-studies/webflow-marketplace/${data.study.id}`} title={`${data.study.label} | Webflow Marketplace study`} description={data.study.summary} />
{/key}
<article class="webflow-case property-performance">
  <header class="case-opening" data-performance-chapter="opening"><a class="back" href="/case-studies/webflow-marketplace#studies">← All eight Webflow studies</a><p class="eyebrow">Webflow Marketplace / {String(index + 1).padStart(2, '0')} of 08</p><h1>{data.study.title}</h1><p class="lede">{data.study.summary}</p><p class="attribution">{webflowAttribution}</p><p class="focus">Contribution focus: {data.study.focus}</p>{#if data.study.id === "review-mcp"}<p class="focus">MCP is the Model Context Protocol, which connects an AI assistant to structured tools and information.</p>{/if}</header>
<div data-performance-chapter="evidence">
  {#each data.study.captures as capture (capture.video)}<section class="case-film" aria-label={capture.label}><WebflowWalkthrough {capture} /></section>{/each}
  {#if data.study.id === 'review-mcp' || data.study.id === 'asset-dashboard'}
    <WebflowUsageEvidence study={data.study.id} />
  {/if}
  <section class="case-narrative"><p class="eyebrow">The problem</p><h2>{data.study.label}</h2><p>{data.study.problem}</p></section>
  <section class="case-narrative"><p class="eyebrow">The contribution</p><h2>The work behind the interface.</h2>{#each data.study.approach as paragraph}<p>{paragraph}</p>{/each}</section>
  <section class="case-narrative"><p class="eyebrow">The key decision</p><h2>What needed to stay clear.</h2><p>{data.study.decision}</p></section>
  <section class="case-narrative evidence-limits"><p class="eyebrow">The documented result</p><h2>What the evidence shows.</h2><p>{data.study.result}</p><p>{data.study.limit}</p><p>Portfolio evidence captured October 2026. Historical implementation and recordings do not establish the current state of every production system.</p></section>
  </div><nav data-performance-chapter="handoff" class="case-handoff" aria-label="Continue the Webflow study"><a href="/case-studies/webflow-marketplace">The complete story →</a>{#if studies[index + 1]}<a href={`/case-studies/webflow-marketplace/${studies[index + 1].id}`}>Next: {studies[index + 1].label} ↗</a>{/if}</nav>
</article>
