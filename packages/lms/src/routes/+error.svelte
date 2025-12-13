<script lang="ts">
  /**
   * Error Page
   *
   * Canon-styled error states.
   * Philosophy: Even errors should embody the ethos—minimal, clear, guiding.
   */

  import { page } from '$app/stores';
  import { Home, ArrowLeft, BookOpen } from 'lucide-svelte';

  const status = $derived($page.status);
  const message = $derived($page.error?.message || 'Something went wrong');

  // Error-specific content
  const errorContent = $derived(() => {
    switch (status) {
      case 404:
        return {
          title: 'Page Not Found',
          description: 'This path has not been created yet.',
          suggestion: 'Perhaps return to familiar ground.'
        };
      case 403:
        return {
          title: 'Access Denied',
          description: 'You do not have permission to view this content.',
          suggestion: 'Try signing in or check your credentials.'
        };
      case 500:
        return {
          title: 'Server Error',
          description: 'Something went wrong on our end.',
          suggestion: 'The issue has been logged. Please try again.'
        };
      default:
        return {
          title: 'Error',
          description: message,
          suggestion: 'Please try again or return home.'
        };
    }
  });

  const content = $derived(errorContent());
</script>

<svelte:head>
  <title>{status} | CREATE SOMETHING LMS</title>
</svelte:head>

<main class="error-container">
  <div class="error-content">
    <!-- Error Code -->
    <div class="error-code">{status}</div>

    <!-- Error Message -->
    <h1 class="error-title">{content.title}</h1>
    <p class="error-description">{content.description}</p>
    <p class="error-suggestion">{content.suggestion}</p>

    <!-- Actions -->
    <div class="error-actions">
      <a href="/" class="action-btn primary">
        <Home size={18} strokeWidth={1.5} />
        <span>Home</span>
      </a>
      <button onclick={() => history.back()} class="action-btn secondary">
        <ArrowLeft size={18} strokeWidth={1.5} />
        <span>Go Back</span>
      </button>
      <a href="/paths" class="action-btn secondary">
        <BookOpen size={18} strokeWidth={1.5} />
        <span>Browse Paths</span>
      </a>
    </div>

    <!-- Philosophy Quote -->
    <div class="philosophy-quote">
      <p>"Every detour deepens understanding."</p>
      <span>The Hermeneutic Spiral</span>
    </div>
  </div>
</main>

<style>
  .error-container {
    min-height: calc(100vh - 72px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
  }

  .error-content {
    text-align: center;
    max-width: 480px;
  }

  .error-code {
    font-size: clamp(6rem, 15vw, 10rem);
    font-weight: 200;
    line-height: 1;
    color: var(--color-fg-subtle);
    margin-bottom: var(--space-md);
    font-family: var(--font-mono);
    letter-spacing: -0.05em;
  }

  .error-title {
    font-size: var(--text-h2);
    font-weight: 400;
    margin-bottom: var(--space-sm);
  }

  .error-description {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .error-suggestion {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-xl);
  }

  .error-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-2xl);
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    font-weight: 500;
    transition: all var(--duration-micro) var(--ease-standard);
    cursor: pointer;
    border: none;
    font-family: inherit;
  }

  .action-btn.primary {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  .action-btn.primary:hover {
    opacity: 0.9;
  }

  .action-btn.secondary {
    background: var(--color-bg-surface);
    color: var(--color-fg-secondary);
    border: 1px solid var(--color-border-default);
  }

  .action-btn.secondary:hover {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .philosophy-quote {
    padding-top: var(--space-xl);
    border-top: 1px solid var(--color-border-default);
  }

  .philosophy-quote p {
    color: var(--color-fg-tertiary);
    font-style: italic;
    margin-bottom: var(--space-xs);
  }

  .philosophy-quote span {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }
</style>
