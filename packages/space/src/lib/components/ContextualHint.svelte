<script lang="ts">
  import { trackLearningEvent } from '$lib/services/learning-analytics';

  interface Props {
    paperId: string;
    sessionId: string;
    experimentType: 'terminal' | 'code';
    stepIndex: number;
    hint: string;
    alternativeApproach?: string;
    onDismiss?: () => void;
    onHelpful?: () => void;
  }

  let {
    paperId,
    sessionId,
    experimentType,
    stepIndex,
    hint,
    alternativeApproach,
    onDismiss,
    onHelpful
  }: Props = $props();

  let isDismissed = $state(false);
  let feedbackGiven = $state(false);

  function handleDismiss() {
    isDismissed = true;
    onDismiss?.();
  }

  async function handleHelpful(helpful: boolean) {
    feedbackGiven = true;

    if (helpful) {
      await trackLearningEvent({
        paperId,
        sessionId,
        experimentType,
        stepIndex,
        action: 'hint_helpful'
      });
      onHelpful?.();
    }

    // Auto-dismiss after feedback
    setTimeout(() => {
      isDismissed = true;
    }, 2000);
  }
</script>

{#if !isDismissed}
  <div
    class="hint-card p-4 mb-4 animate-slide-down"
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <svg class="hint-icon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="hint-title">Contextual Hint</span>
      </div>

      <button
        onclick={handleDismiss}
        class="dismiss-button"
        aria-label="Dismiss hint"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Hint Content -->
    <div class="hint-content mb-3">
      {hint}
    </div>

    <!-- Alternative Approach (if provided) -->
    {#if alternativeApproach}
      <div class="alternative-card p-3 mb-3">
        <div class="alternative-label mb-1">Alternative Approach</div>
        <div class="alternative-text">{alternativeApproach}</div>
      </div>
    {/if}

    <!-- Feedback -->
    {#if !feedbackGiven}
      <div class="feedback-section flex items-center gap-3 pt-3">
        <span class="feedback-label">Was this helpful?</span>
        <div class="flex gap-2">
          <button
            onclick={() => handleHelpful(true)}
            class="feedback-button"
          >
            Yes
          </button>
          <button
            onclick={() => handleHelpful(false)}
            class="feedback-button"
          >
            No
          </button>
        </div>
      </div>
    {:else}
      <div class="thanks-message pt-3 animate-fade-in">
        Thanks for the feedback!
      </div>
    {/if}
  </div>
{/if}

<style>
  .hint-card {
    border: 1px solid var(--color-performance-border-emphasis);
    border-radius: var(--radius-performance-scale-lg);
    background: var(--color-performance-hover);
    backdrop-filter: blur(4px);
  }

  .hint-icon {
    color: var(--color-performance-fg-secondary);
  }

  .hint-title {
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    font-weight: 500;
  }

  .dismiss-button {
    color: var(--color-performance-fg-muted);
    transition: color var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .dismiss-button:hover {
    color: var(--color-performance-fg-secondary);
  }

  .hint-content {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
    line-height: 1.6;
  }

  .alternative-card {
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-sm);
  }

  .alternative-label {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .alternative-text {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
  }

  .feedback-label {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-caption);
  }

  .feedback-button {
    padding: 0.25rem 0.75rem;
    background: var(--color-performance-active);
    color: var(--color-performance-fg-secondary);
    border-radius: var(--radius-performance-scale-sm);
    font-size: var(--text-performance-caption);
    transition: background var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .feedback-button:hover {
    background: var(--color-performance-border-emphasis);
  }

  .thanks-message {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-caption);
  }

  .animate-slide-down {
    opacity: 0;
    transform: translateY(-12px);
    animation: slide-down 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  .animate-fade-in {
    opacity: 0;
    animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes slide-down {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in {
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-slide-down,
    .animate-fade-in {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
