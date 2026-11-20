<script lang="ts">
 import '$lib/styles/canon.css';
 import FilterTogglePanel from '$lib/filtering/FilterTogglePanel.svelte';
 import IntegrationFlow from '$lib/interactive/IntegrationFlow.svelte';
 import type {FilterState} from '$lib/filtering/types.js';
 let light=$state(false);let filters=$state<FilterState>({});let calls=$state(0);
 const integrations=[{label:'Ca',name:'Capture notes'},{label:'Re',name:'Review draft'},{label:'Sh',name:'Share after approval'}];
 function change(next:FilterState){filters=next;calls+=1;}
</script>
<svelte:head><title>Filters and integration flow · Local Canon review</title></svelte:head>
<div class="fixture" data-theme={light?'light':'dark'}><main>
 <header><a href="/next">Canon</a><button onclick={()=>light=!light}>{light?'Dark':'Light'} appearance</button></header>
 <h1>Choose what matters.</h1><p>Local fictional filter and integration examples. No production events or external actions.</p>
 <noscript><p>Filters require JavaScript to update this local preview. The named filter choices and ordered integration steps remain readable.</p></noscript>
 <section aria-label="Filter review"><FilterTogglePanel filterState={filters} onFilterChange={change}/><div><h2>Current filter callback</h2><p>Local callback count: <output id="calls">{calls}</output></p><pre id="filter-state">{JSON.stringify(filters,null,2)}</pre></div></section>
 <h2>Stable integration flow</h2><IntegrationFlow {integrations} description="Capture notes → Review the draft → Decide whether to share" showConnectors animateFlow/>
 <h2>Missing custom icon</h2><IntegrationFlow integrations={[{label:'Dr',name:'Draft retained'},{label:'Re',name:'Review required'}]} description="Text and service names remain without a custom icon."/>
 <h2>Glass compatibility opt in</h2><IntegrationFlow {integrations} description="Decorative glass remains an explicit choice." glassMode="smooth" showGrid={false} showConnectors animateFlow/>
 </main></div>
<style>
 .fixture{background:var(--color-performance-bg-pure);color:var(--color-performance-fg-primary);min-height:100vh}main{max-width:70rem;padding:clamp(1rem,4vw,3rem);margin:auto}header{display:flex;justify-content:space-between;align-items:center;gap:1rem}a{color:inherit}a,button{font:inherit;display:inline-flex;align-items:center;min-height:44px;min-width:44px}button{background:var(--color-performance-bg-subtle);color:var(--color-performance-fg-primary);border:1px solid var(--color-performance-border-default);padding:.5rem 1rem;border-radius:var(--radius-performance-scale-md)}a:focus-visible,button:focus-visible{outline:2px solid var(--color-performance-focus);outline-offset:3px}h1{font-size:clamp(2rem,5vw,4rem);margin-block:2rem 1rem}h2{margin-block:2rem 1rem}p{margin-block:1rem;max-width:65ch}section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem;margin-block:2rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.875rem}@media(max-width:650px){section{grid-template-columns:minmax(0,1fr)}}

 .fixture { overflow-wrap: anywhere; }
 header { flex-wrap: wrap; } header button { max-width: 100%; }

</style>
