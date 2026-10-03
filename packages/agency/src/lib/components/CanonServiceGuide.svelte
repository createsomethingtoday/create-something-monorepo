<script lang="ts">
  import { tick, onMount } from 'svelte';
  import CanonCompanion from './CanonCompanion.svelte';
  import { canonServiceQuestions, canonServiceAnswers, type ServiceQuestion } from '$lib/data/canonServiceGuide';
  let { showSuggestions = false }: { showSuggestions?: boolean } = $props();
  let ready = $state(false);
  let mobile = $state(true);
  let characterTrigger = $state(0);
  onMount(() => {
    ready = true;
    const narrow = matchMedia('(max-width: 900px)');
    const sync = () => { mobile = narrow.matches; };
    sync(); narrow.addEventListener('change', sync);
    return () => narrow.removeEventListener('change', sync);
  });
  let open = $state(false);
  let selected = $state<ServiceQuestion | null>(null);
  let scoping = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let guideRoot = $state<HTMLDivElement>();
  let suggestedList = $state<HTMLUListElement>();
  let panel = $state<HTMLElement>();
  let heading = $state<HTMLHeadingElement>();
  const answer = $derived(selected ? canonServiceAnswers[selected] : null);
  async function toggle() {
    if (open) { close(); return; }
    open = true; selected = null; scoping = false; characterTrigger++;
    await tick(); if (showSuggestions) suggestedList?.querySelector('button')?.focus(); else heading?.focus();
  }
  function close() { open = false; selected = null; scoping = false; trigger?.focus(); }
  async function choose(id: ServiceQuestion) { if (!open) characterTrigger++; open = true; selected = id; scoping = false; await tick(); heading?.focus(); }
  async function back() { selected = null; scoping = false; await tick(); if (showSuggestions) suggestedList?.querySelector('button')?.focus(); else heading?.focus(); }
  async function scope() { scoping = true; await tick(); heading?.focus(); }
</script>

<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape' && guideRoot?.contains(event.target as Node)) { event.preventDefault(); close(); } }} />

<div class="canon-guide" bind:this={guideRoot}>
  <div class="guide-introduction">
    <CanonCompanion action="waving" trigger={characterTrigger} staticOnly={mobile} />
    <div><button class="guide-trigger" bind:this={trigger} onclick={toggle} disabled={!ready} aria-expanded={open} aria-controls="canon-service-guide">Ask canon <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <span class="guide-label">Canon service guide · local prototype / scripted answers</span></div>
  </div>
  {#if showSuggestions}
    <ul class="questions suggested" bind:this={suggestedList} aria-label="Suggested questions for Canon">{#each canonServiceQuestions as question}<li><button disabled={!ready} onclick={() => choose(question.id)} aria-controls="canon-service-guide">{question.label}<span aria-hidden="true">↗</span></button></li>{/each}</ul>
  {/if}
  {#if open}
    <section id="canon-service-guide" class="guide-panel" bind:this={panel} aria-labelledby="canon-guide-title">
      <header>
        <div><p class="prototype-label">Local prototype / scripted service guide</p><p>Answers from our published service pages. No live AI or message submission.</p></div>
        <button class="close" onclick={close} aria-label="Close Canon guide">Close <span aria-hidden="true">×</span></button>
      </header>
      <h2 id="canon-guide-title" bind:this={heading} tabindex="-1">{scoping ? 'Prepare a useful inquiry.' : answer?.title ?? 'What would help you choose a next step?'}</h2>
      {#if scoping}
        <p>Bring this context to a conversation. Nothing is entered or sent here.</p>
        <ol class="scope-list"><li>The tools and people involved.</li><li>What should happen, and what happens now.</li><li>Who approves changes and checks the result.</li><li>The next improvement you want to agree on.</li></ol>
        <a href="/book?source=agency&intent=workflow-mapping&lane=workflow_infrastructure">Talk through the workflow ↗</a>
        <button class="back" onclick={() => { scoping = false; void tick().then(() => heading?.focus()); }}>Back to the answer</button>
      {:else if answer}
        {#each answer.paragraphs as paragraph}<p>{paragraph}</p>{/each}
        <nav class="sources" aria-label="Published sources for this answer">{#each answer.links as link}<a href={link.href}>{link.label} ↗</a>{/each}</nav>
        <div class="answer-actions"><button onclick={scope}>Help me scope an inquiry</button><button class="back" onclick={back}>Back to questions</button></div>
      {:else}
        {#if showSuggestions}<p>Choose one of the questions above to see an answer and its published sources.</p>
        {:else}<ul class="questions">{#each canonServiceQuestions as question}<li><button onclick={() => choose(question.id)}>{question.label}<span aria-hidden="true">↗</span></button></li>{/each}</ul>{/if}
      {/if}
    </section>
  {/if}
</div>

<style>
  .canon-guide { margin-top: var(--space-performance-sm); }
  button, a { min-height: 44px; }
  button { font: inherit; color: inherit; cursor: pointer; background: transparent; }
  .guide-introduction { display: flex; align-items: center; gap: var(--space-performance-sm); }
  .guide-introduction :global(.canon) { width: 56px; }
  .guide-introduction > div { min-width: 0; }
  div.canon-guide .guide-introduction button.guide-trigger { background: transparent; border: 0; padding: 0; text-decoration: underline; text-underline-offset: .3em; }
  .guide-label { display: block; color: var(--color-performance-fg-tertiary); font-size: var(--text-performance-caption); line-height: 1.6; }
  .guide-panel { margin-top: var(--space-performance-md); padding: var(--space-performance-md); border: 1px solid var(--color-performance-shell-border-strong); max-width: 65ch; }
  header { display: flex; align-items: start; gap: var(--space-performance-sm); }
  header > div { flex: 1; }
  header p { margin-top: 0; font-size: var(--text-performance-caption); }
  .prototype-label { font-family: var(--font-performance-mono); text-transform: uppercase; }
  .close { border: 0; padding: 0 var(--space-performance-xs); }
  h2 { font: var(--font-performance-medium) var(--text-performance-body)/1.3 var(--font-performance-interface); margin-block: var(--space-performance-md); }
  p, li { font-size: var(--text-performance-caption); line-height: 1.65; }
  .questions { list-style: none; margin: 0; padding: 0; }
  .suggested { margin-top: var(--space-performance-sm); }
  div.canon-guide .questions button { width: 100%; display: flex; justify-content: space-between; text-align: left; gap: var(--space-performance-sm); background: transparent; border: 0; border-top: 1px solid var(--color-performance-shell-border-default); padding: var(--space-performance-sm) 0; }
  .sources, .answer-actions { display: flex; flex-wrap: wrap; gap: var(--space-performance-sm) var(--space-performance-md); margin-top: var(--space-performance-md); }
  .sources a, .guide-panel > a { display: inline-flex; align-items: center; }
  .answer-actions button, .back { border: 0; padding: 0; text-decoration: underline; text-underline-offset: .3em; }
  .guide-panel > .back { display: block; }
  a { color: inherit; text-underline-offset: .3em; }
  a:focus-visible, button:focus-visible, h2:focus { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  @media(max-width:640px) { .guide-panel { padding: var(--space-performance-sm); } header { flex-wrap: wrap; } header .close { margin-left: auto; } }
</style>
