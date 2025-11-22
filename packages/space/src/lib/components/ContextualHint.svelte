<script lang="ts">
  import { fade, slide } from 'svelte/transition';
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
    class="border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm p-4 mb-4"
    transition:slide={{ duration: 300 }}
  >
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-white/80 text-sm font-medium">Contextual Hint</span>
      </div>

      <button
        onclick={handleDismiss}
        class="text-white/40 hover:text-white/80 transition-colors"
        aria-label="Dismiss hint"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Hint Content -->
    <div class="text-white/70 text-sm leading-relaxed mb-3">
      {hint}
    </div>

    <!-- Alternative Approach (if provided) -->
    {#if alternativeApproach}
      <div class="p-3 bg-white/5 rounded border border-white/10 mb-3">
        <div class="text-white/60 text-xs uppercase tracking-wide mb-1">Alternative Approach</div>
        <div class="text-white/70 text-sm">{alternativeApproach}</div>
      </div>
    {/if}

    <!-- Feedback -->
    {#if !feedbackGiven}
      <div class="flex items-center gap-3 pt-3 border-t border-white/10">
        <span class="text-white/50 text-xs">Was this helpful?</span>
        <div class="flex gap-2">
          <button
            onclick={() => handleHelpful(true)}
            class="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded text-xs transition-colors"
          >
            Yes
          </button>
          <button
            onclick={() => handleHelpful(false)}
            class="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded text-xs transition-colors"
          >
            No
          </button>
        </div>
      </div>
    {:else}
      <div class="pt-3 border-t border-white/10 text-white/60 text-xs" transition:fade>
        Thanks for the feedback!
      </div>
    {/if}
  </div>
{/if}
