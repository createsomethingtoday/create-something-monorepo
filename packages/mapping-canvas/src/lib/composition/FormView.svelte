<script lang="ts">
  import { tick } from 'svelte';
  import NodeView from './NodeView.svelte';
  import { resolveTree, validate, type Document, type State, type Values } from './model';
  let {
    doc,
    scripted,
    prefix = 'live'
  }: { doc: Document; scripted?: State; prefix?: string } = $props();
  let phase = $state<State>('empty');
  let values = $state<Values>({ name: '', brief: '' });
  let errors = $state<Values>({ name: '', brief: '' });
  let form: HTMLFormElement;
  $effect(() => {
    if (scripted) {
      phase = scripted;
      const next =
        scripted === 'empty' || scripted === 'invalid'
          ? { name: '', brief: '' }
          : {
              name: 'Alex Morgan',
              brief: 'Make the next step clear when a request needs another attempt.'
            };
      values = next;
      errors = scripted === 'invalid' ? validate(next) : { name: '', brief: '' };
    }
  });
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (scripted) return;
    errors = validate(values);
    if (errors.name || errors.brief) {
      phase = 'invalid';
      await tick();
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    phase = phase === 'error' ? 'recovered' : 'error';
  }
</script>

<form
  data-theme="light"
  inert={scripted !== undefined}
  bind:this={form!}
  novalidate
  onsubmit={submit}
  aria-label="Request preview"
  data-state={phase}
  data-canon-overlay="overlay.agency-atlas-public"
>
  <NodeView
    node={resolveTree(doc)}
    content={doc.content}
    bind:values
    {errors}
    state={phase}
    {prefix}
  />
  <p class="disclosure">Local demonstration · nothing is sent</p>
</form>

<style>
  form {
    --color-performance-error: var(--overlay-block);
    --color-performance-success: var(--overlay-proof);
    color-scheme: light;
    background: var(--color-performance-panel);
    padding: 36px;
    width: 100%;
    box-sizing: border-box;
    color: var(--color-performance-ink);
    font-family: var(--font-performance-sans);
  }
  form[data-canon-overlay] :global(input:focus-visible),
  form[data-canon-overlay] :global(textarea:focus-visible) {
    outline: 2px solid var(--overlay-accent);
    outline-offset: 3px;
    box-shadow: none;
  }
  /* Keep status color on the icon/border; title text uses Canon ink for AA contrast. */
  form[data-canon-overlay] :global(.alert-title) {
    color: var(--color-performance-ink);
  }
  .disclosure {
    font-size: 11px;
    color: var(--color-performance-muted);
    margin: 20px 0 0;
  }
  @media (max-width: 600px) {
    form {
      padding: 24px;
    }
  }
</style>
