<script lang="ts">
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-[60vh] items-center justify-center">
  <form method="POST" class="unlock-panel flex w-full max-w-sm flex-col gap-4">
    <div>
      <span class="unlock-eyebrow">app-governance</span>
      <h1 class="unlock-title">Access key required</h1>
    </div>

    {#if form?.error}
      <p class="unlock-error" role="alert">{form.error}</p>
    {/if}

    <label class="flex flex-col gap-2">
      <span class="unlock-label">Access key</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="unlock-input"
        type="password"
        name="key"
        autocomplete="off"
        autofocus
        required
      />
    </label>

    <button type="submit" class="unlock-button">Unlock</button>
  </form>
</div>

<style>
  .unlock-panel {
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
  }

  .unlock-eyebrow {
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .unlock-title {
    font-size: var(--text-h3);
    color: var(--color-fg-primary);
    margin-top: var(--space-2xs, 0.25rem);
  }

  .unlock-label {
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .unlock-input {
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
    background: var(--color-bg-pure);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-xs) var(--space-sm);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .unlock-input:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  .unlock-error {
    font-size: var(--text-body-sm);
    color: var(--color-error);
  }

  .unlock-button {
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-bg-pure);
    background: var(--color-fg-primary);
    border: none;
    border-radius: var(--radius-sm);
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .unlock-button:hover {
    opacity: 0.85;
  }
</style>
