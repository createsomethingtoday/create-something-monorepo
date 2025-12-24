<script lang="ts">
  import { invalidate } from '$app/navigation';

  interface Props {
    slug: string;
    enabled: boolean;
    isAuthenticated: boolean;
  }

  let { slug, enabled = $bindable(), isAuthenticated }: Props = $props();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function togglePlugin() {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/auth/login?redirect=/plugins/' + slug;
      return;
    }

    loading = true;
    error = null;

    // Store original state for rollback
    const originalState = enabled;

    // Optimistic update
    enabled = !enabled;

    try {
      const method = enabled ? 'POST' : 'DELETE';
      const response = await fetch(`/api/plugins/user/${slug}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update plugin');
      }

      // Invalidate to refresh server data
      await invalidate('app:plugins');
    } catch (err) {
      // Rollback on error
      enabled = originalState;
      error = 'Failed to update plugin. Please try again.';
      console.error('Toggle error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="plugin-toggle">
  <button
    class="toggle-button"
    class:enabled
    class:loading
    onclick={togglePlugin}
    disabled={loading}
    aria-label={enabled ? 'Disable plugin' : 'Enable plugin'}
  >
    <span class="toggle-track">
      <span class="toggle-thumb"></span>
    </span>
    <span class="toggle-label">
      {#if loading}
        Updating...
      {:else if enabled}
        Enabled
      {:else}
        Disabled
      {/if}
    </span>
  </button>

  {#if error}
    <p class="error-message">{error}</p>
  {/if}

  {#if !isAuthenticated}
    <p class="auth-prompt">Sign in to enable plugins</p>
  {/if}
</div>

<style>
  .plugin-toggle {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .toggle-button {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .toggle-button:hover {
    background: var(--color-hover);
    border-color: var(--color-border-emphasis);
  }

  .toggle-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-track {
    position: relative;
    width: 48px;
    height: 24px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    transition: background var(--duration-micro) var(--ease-standard);
  }

  .toggle-button.enabled .toggle-track {
    background: var(--color-success);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: var(--color-fg-primary);
    border-radius: var(--radius-full);
    transition: transform var(--duration-micro) var(--ease-standard);
  }

  .toggle-button.enabled .toggle-thumb {
    transform: translateX(24px);
  }

  .toggle-label {
    font-weight: 500;
  }

  .error-message {
    font-size: var(--text-body-sm);
    color: var(--color-error);
  }

  .auth-prompt {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  @media (prefers-reduced-motion: reduce) {
    .toggle-track,
    .toggle-thumb,
    .toggle-button {
      transition: none;
    }
  }
</style>
