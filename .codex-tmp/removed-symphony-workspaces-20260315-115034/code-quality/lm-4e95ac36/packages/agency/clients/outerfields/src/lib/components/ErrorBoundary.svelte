<!--
  ErrorBoundary Component
  
  Catches JavaScript errors in child components, tracks them for
  pattern analysis, and displays a friendly fallback UI.
  
  Usage:
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
    
  Or with custom fallback:
    <ErrorBoundary>
      <YourComponent />
      {#snippet fallback(error, reset)}
        <div>Something went wrong: {error.message}</div>
        <button onclick={reset}>Try again</button>
      {/snippet}
    </ErrorBoundary>
-->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { tracker } from '$lib/utils/event-tracker';
  
  interface Props {
    children: Snippet;
    fallback?: Snippet<[Error, () => void]>;
    onError?: (error: Error) => void;
  }
  
  let { children, fallback, onError }: Props = $props();
  
  let error = $state<Error | null>(null);
  let componentStack = $state<string | undefined>(undefined);
  
  /**
   * Reset the error boundary
   */
  function reset(): void {
    error = null;
    componentStack = undefined;
  }
  
  /**
   * Handle caught errors
   */
  function handleError(e: Error, stack?: string): void {
    error = e;
    componentStack = stack;
    
    // Track the error for pattern analysis
    tracker.trackError(e, stack);
    
    // Call custom error handler if provided
    onError?.(e);
    
    // Log to console in development
    console.error('[ErrorBoundary] Caught error:', e);
    if (stack) {
      console.error('[ErrorBoundary] Component stack:', stack);
    }
  }
  
  onMount(() => {
    // Catch unhandled errors in this subtree
    const handleWindowError = (event: ErrorEvent) => {
      // Only handle if we're in a broken state or this is a render error
      if (event.error instanceof Error) {
        handleError(event.error);
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        handleError(event.reason);
      }
    };
    
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  });
</script>

{#if error}
  {#if fallback}
    {@render fallback(error, reset)}
  {:else}
    <div class="error-boundary">
      <div class="error-content">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
          </svg>
        </div>
        
        <h2 class="error-title">Something went wrong</h2>
        
        <p class="error-message">
          We've recorded this issue and will look into it.
        </p>
        
        <div class="error-actions">
          <button class="btn-primary" onclick={reset}>
            Try again
          </button>
          <button class="btn-secondary" onclick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
        
        {#if import.meta.env.DEV}
          <details class="error-details">
            <summary>Error details (dev only)</summary>
            <pre>{error.message}</pre>
            {#if error.stack}
              <pre class="error-stack">{error.stack}</pre>
            {/if}
            {#if componentStack}
              <pre class="error-stack">{componentStack}</pre>
            {/if}
          </details>
        {/if}
      </div>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
  }
  
  .error-content {
    text-align: center;
    max-width: 400px;
  }
  
  .error-icon {
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    margin-bottom: 1rem;
  }
  
  .error-title {
    font-size: var(--text-heading-md, 1.25rem);
    font-weight: 600;
    color: var(--color-fg-primary, #fff);
    margin: 0 0 0.5rem;
  }
  
  .error-message {
    font-size: var(--text-body-md, 1rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    margin: 0 0 1.5rem;
  }
  
  .error-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  
  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: var(--color-brand, #7c2bee);
    color: var(--color-fg-primary);
    border: none;
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-body-md, 1rem);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
  }
  
  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
  
  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-body-md, 1rem);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-micro, 200ms) var(--ease-standard, ease);
  }
  
  .btn-secondary:hover {
    border-color: var(--color-border-emphasis, rgba(255, 255, 255, 0.2));
    color: var(--color-fg-primary, #fff);
  }
  
  .error-details {
    margin-top: 2rem;
    text-align: left;
    background: var(--color-bg-surface, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    border-radius: var(--radius-md, 8px);
    padding: 1rem;
  }
  
  .error-details summary {
    cursor: pointer;
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    font-size: var(--text-body-sm, 0.875rem);
  }
  
  .error-details pre {
    margin: 0.5rem 0 0;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm, 4px);
    font-size: var(--text-code-sm, 0.75rem);
    color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  
  .error-stack {
    max-height: 200px;
    overflow-y: auto;
  }
</style>
