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
    border: 1px solid var(--color-border-emphasis);
    border-radius: var(--radius-lg);
    background: var(--color-hover);
    backdrop-filter: blur(4px);
  }

  .hint-icon {
    color: var(--color-fg-secondary);
  }

  .hint-title {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: 500;
  }

  .dismiss-button {
    color: var(--color-fg-muted);
    transition: color var(--duration-standard) var(--ease-standard);
  }

  .dismiss-button:hover {
    color: var(--color-fg-secondary);
  }

  .hint-content {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    line-height: 1.6;
  }

  .alternative-card {
    background: var(--color-hover);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-default);
  }

  .alternative-label {
    color: var(--color-fg-tertiary);
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .alternative-text {
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .feedback-section {
    border-top: 1px solid var(--color-border-default);
  }

  .feedback-label {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  .feedback-button {
    padding: 0.25rem 0.75rem;
    background: var(--color-active);
    color: var(--color-fg-secondary);
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    transition: background var(--duration-standard) var(--ease-standard);
  }

  .feedback-button:hover {
    background: var(--color-border-emphasis);
  }

  .thanks-message {
    border-top: 1px solid var(--color-border-default);
    color: var(--color-fg-tertiary);
    font-size: var(--text-caption);
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
