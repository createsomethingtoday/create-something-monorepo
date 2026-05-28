<script lang="ts">
  import { MessageSquarePlus, Bug, Lightbulb, MessageCircle, Send } from 'lucide-svelte';
  import { page } from '$app/stores';
  import { Dialog } from './ui';

  let isOpen = $state(false);
  let feedbackType = $state<'bug' | 'feature' | 'general'>('general');
  let message = $state('');
  let isSubmitting = $state(false);
  let submitted = $state(false);
  let error = $state<string | null>(null);

  const feedbackTypes = [
    { value: 'bug' as const, label: 'Bug', icon: Bug, color: 'var(--color-error)' },
    { value: 'feature' as const, label: 'Feature', icon: Lightbulb, color: 'var(--color-warning)' },
    { value: 'general' as const, label: 'General', icon: MessageCircle, color: 'var(--color-info)' }
  ];

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    isSubmitting = true;
    error = null;

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
          pageUrl: $page.url.pathname
        })
      });

      if (response.ok) {
        submitted = true;
        setTimeout(() => {
          isOpen = false;
          // Reset after close animation
          setTimeout(() => {
            submitted = false;
            message = '';
            feedbackType = 'general';
          }, 300);
        }, 1500);
      } else {
        const data = (await response.json()) as { error?: string };
        error = data.error || 'Failed to submit feedback';
      }
    } catch {
      error = 'Failed to submit feedback. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  function canDismiss(): boolean {
    if (!message.trim() || submitted) return true;
    if (typeof window === 'undefined') return false;
    return window.confirm('Discard unsent feedback?');
  }

  function closeFeedback() {
    isOpen = false;
    error = null;
  }
</script>

<!-- Floating button -->
<button
  class="feedback-trigger"
  onclick={() => (isOpen = true)}
  aria-label="Send feedback"
  title="Send feedback"
>
  <MessageSquarePlus size={20} />
  <span class="beta-badge">Beta</span>
</button>

<Dialog
  {isOpen}
  onClose={closeFeedback}
  beforeClose={canDismiss}
  closeOnBackdrop={!message.trim() || submitted}
  title="Send Feedback"
  size="sm"
  placement="bottom-right"
  contentPadding="none"
>
  {#if submitted}
    <div class="success-message">
      <MessageSquarePlus size={32} />
      <p>Thanks for your feedback!</p>
    </div>
  {:else}
    <form onsubmit={handleSubmit}>
      <div class="type-selector">
        {#each feedbackTypes as type}
          <button
            type="button"
            class="type-btn"
            class:selected={feedbackType === type.value}
            onclick={() => (feedbackType = type.value)}
            style="--type-color: {type.color}"
          >
            <type.icon size={16} />
            {type.label}
          </button>
        {/each}
      </div>

      <textarea
        bind:value={message}
        placeholder={feedbackType === 'bug'
          ? 'What went wrong? Steps to reproduce...'
          : feedbackType === 'feature'
            ? 'What would make this better?'
            : 'Share your thoughts...'}
        rows="4"
        maxlength="5000"
        required
      ></textarea>

      {#if error}
        <p class="error-text">{error}</p>
      {/if}

      <button type="submit" class="submit-btn" disabled={!message.trim() || isSubmitting}>
        {#if isSubmitting}
          <span class="spinner"></span>
          Sending...
        {:else}
          <Send size={16} />
          Send Feedback
        {/if}
      </button>
    </form>
  {/if}
</Dialog>

<style>
  .feedback-trigger {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-full);
    color: var(--color-fg-primary);
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: all var(--duration-micro) var(--ease-standard);
    z-index: 1000;
  }

  .feedback-trigger:hover {
    border-color: var(--color-border-emphasis);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .feedback-trigger:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .beta-badge {
    font-size: 0.625rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.375rem;
    background: var(--color-info-muted);
    color: var(--color-info);
    border-radius: var(--radius-sm);
  }

  form {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .type-selector {
    display: flex;
    gap: 0.5rem;
  }

  .type-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem;
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .type-btn:hover {
    border-color: var(--color-border-emphasis);
  }

  .type-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .type-btn.selected {
    background: var(--color-bg-elevated);
    border-color: var(--type-color);
    color: var(--type-color);
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-fg-primary);
    font-family: inherit;
    font-size: var(--text-body-sm);
    resize: vertical;
    min-height: 100px;
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  textarea::placeholder {
    color: var(--color-fg-muted);
  }

  textarea:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  textarea:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -1px;
  }

  .error-text {
    margin: 0;
    font-size: var(--text-caption);
    color: var(--color-error);
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--color-fg-primary);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-bg-pure);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-bg-pure);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1.25rem;
    color: var(--color-success);
    text-align: center;
  }

  .success-message p {
    margin: 0;
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    color: var(--color-fg-primary);
  }
</style>
