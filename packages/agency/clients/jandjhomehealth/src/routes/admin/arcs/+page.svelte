<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Arc Library | J AND J HOME HEALTH</title><meta name="robots" content="noindex, nofollow" /></svelte:head>

<main class="library">
  <header><div><span>Private customer workspace</span><h1>Arc Library</h1><p>Presentation-grade operating stories bound to the same governed map.</p></div><a href="/admin/contacts">Contacts</a></header>
  <article>
    <div><span>{data.document.status} · revision {data.document.revision}</span><h2>{data.document.title}</h2><p>{data.document.description}</p></div>
    <nav aria-label="App Review Governance Arc routes">
      <a class="primary" href="/admin/arcs/app-review-governance">Present Arc</a>
      <a href="/admin/arcs/app-review-governance/studio">Edit in Studio</a>
      <a href="/admin/arcs/app-review-governance/playbook">Playbook</a>
      <a href="/admin/arcs/app-review-governance/runbook">Runbook</a>
    </nav>
  </article>
  <section><h2>Recent receipts</h2>{#if data.receipts.length}<ol>{#each data.receipts as receipt}<li><strong>{receipt.action.replaceAll('_', ' ')}</strong><span>r{receipt.revision} · {receipt.actor}</span><small>{receipt.evidence}</small></li>{/each}</ol>{:else}<p>No receipts yet.</p>{/if}</section>
</main>

<style>
  .library { min-height: 100dvh; padding: clamp(1rem, 4vw, 4rem); background: #f4f0e8; color: #15130f; font-family: Arial, sans-serif; }
  header, article { display: flex; justify-content: space-between; gap: 2rem; align-items: flex-end; border-bottom: 1px solid #aaa49a; padding-block: 1.5rem; }
  h1 { margin: .35rem 0; font: 500 clamp(2.7rem, 7vw, 6rem)/.95 Georgia, serif; letter-spacing: -.04em; }
  h2 { margin: .35rem 0; font-size: clamp(1.4rem, 3vw, 2.3rem); }
  p { max-width: 46rem; color: #5f5a52; line-height: 1.5; }
  span, small { font: 650 .7rem/1.35 ui-monospace, monospace; text-transform: uppercase; }
  nav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
  a { display: inline-flex; align-items: center; min-height: 2.75rem; padding: .65rem .8rem; border: 1px solid #8f8a80; color: inherit; text-decoration: none; font: 650 .7rem/1 ui-monospace, monospace; text-transform: uppercase; }
  a.primary { background: #15130f; color: #fffdf8; }
  section { padding-block: 2rem; }
  ol { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); margin: 0; padding: 0; list-style: none; border-top: 1px solid #aaa49a; border-left: 1px solid #aaa49a; }
  li { display: grid; gap: .55rem; padding: 1rem; border-right: 1px solid #aaa49a; border-bottom: 1px solid #aaa49a; }
  li small { color: #6d6860; text-transform: none; }
  @media (max-width: 46rem) { header, article { align-items: flex-start; flex-direction: column; } nav { justify-content: flex-start; } }
</style>
