<script lang="ts">
  type WorkflowSignalIconName = 'objects' | 'actions' | 'states' | 'receipts';

  export let name: WorkflowSignalIconName;
  export let title: string | undefined = undefined;
</script>

<svg
  class="workflow-signal-icon workflow-signal-icon--{name}"
  viewBox="0 0 24 24"
  focusable="false"
  aria-hidden={title ? undefined : 'true'}
  aria-label={title}
  role={title ? 'img' : undefined}
>
  {#if name === 'objects'}
    <rect width="6" height="6" x="16" y="16" rx="1" />
    <rect width="6" height="6" x="2" y="16" rx="1" />
    <rect width="6" height="6" x="9" y="2" rx="1" />
    <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3m-7-4V8" />
  {:else if name === 'actions'}
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  {:else if name === 'states'}
    <path d="M13 5h8m-8 7h8m-8 7h8M3 17l2 2l4-4M3 7l2 2l4-4" />
  {:else}
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5M9 15l2 2l4-4" />
  {/if}
</svg>

<style>
  .workflow-signal-icon {
    width: var(--workflow-signal-icon-size, 2.25rem);
    height: var(--workflow-signal-icon-size, 2.25rem);
    overflow: visible;
    fill: none;
    color: var(--workflow-signal-icon-color, rgba(232, 237, 255, 0.66));
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.18;
    vector-effect: non-scaling-stroke;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.08));
  }

  .workflow-signal-icon--actions {
    color: var(--workflow-signal-icon-color, rgba(238, 242, 255, 0.7));
  }

  .workflow-signal-icon--states {
    color: var(--workflow-signal-icon-color, rgba(225, 231, 255, 0.68));
  }

  .workflow-signal-icon--receipts {
    color: var(--workflow-signal-icon-color, rgba(226, 232, 240, 0.7));
  }
</style>
