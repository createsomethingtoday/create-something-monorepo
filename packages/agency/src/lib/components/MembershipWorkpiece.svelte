<script lang="ts">
  import WorkflowBench from './WorkflowBench.svelte';
  let { stage = 0 }: { stage?: number } = $props();
  const captions = [
    { title: 'The agreed task', description: 'One intake handoff. Access and a decision owner are clear.' },
    { title: 'The connected handoff', description: 'A request becomes a draft. Sending waits for a person.' },
    { title: 'The checked handoff', description: 'The same work, with checks, a guide and a next step.' }
  ];
  const caption = $derived(captions[stage]);
</script>

<figure class="membership-workpiece" data-stage={stage} aria-label={`Illustrated intake handoff: ${caption.title}`}>
  <p class="example-label">Illustrated example / intake handoff</p>
  <WorkflowBench active={stage} />
  <figcaption><strong>{caption.title}</strong><span>{caption.description}</span></figcaption>
</figure>

<style>
  .membership-workpiece { margin: 0; color: var(--color-performance-fg-primary); }
  .example-label { margin: 0; font: .65rem/1.6 var(--font-performance-mono); text-transform: uppercase; letter-spacing: .04em; color: var(--color-performance-fg-secondary); }
  figcaption { border-top: 1px solid var(--color-performance-shell-border-default); padding-top: 1rem; }
  figcaption strong { display: block; margin-bottom: .35rem; font-size: 1.1rem; line-height: 1.3; font-weight: 500; }
  figcaption span { display: block; max-width: 38ch; font-size: .8125rem; line-height: 1.6; color: var(--color-performance-fg-secondary); }
</style>
