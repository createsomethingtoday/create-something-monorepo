<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { Analytics } from '@create-something/canon';
  import type { Property } from '@create-something/canon/analytics';
  import {
    getConsentState,
    updateAnalyticsConsent,
    type ConsentState
  } from '@create-something/canon/gdpr';
  import {
    captureHighIntentSearchAttribution,
    clearHighIntentSearchAttribution,
    type HighIntentSearchAttribution
  } from '$lib/analytics/high-intent-search';
  import {
    captureMarketingAttribution,
    clearMarketingAttribution,
    type MarketingAttribution
  } from '$lib/analytics/marketing-attribution';

  interface Props {
    property?: Property;
    userId?: string;
    userOptedOut?: boolean;
    globalMetadata?: Record<string, unknown>;
    compactPrompt?: boolean;
    obscured?: boolean;
    /** Keep the mobile control out of the campaign header when that space carries primary meaning. */
    mobilePlacement?: 'header-edge' | 'safe-corner';
  }

  let {
    property = 'agency',
    userId = undefined,
    userOptedOut = false,
    globalMetadata = undefined,
    compactPrompt = false,
    obscured = false,
    mobilePlacement = 'header-edge'
  }: Props = $props();

  let mounted = $state(false);
  let analyticsAllowed = $state(false);
  let showPanel = $state(false);
  let compactPromptActive = $state(false);
  let consentState = $state<ConsentState | null>(null);
  let paidSearchAttribution = $state<HighIntentSearchAttribution | undefined>(undefined);
  let marketingAttribution = $state<MarketingAttribution | undefined>(undefined);

  const hasStoredChoice = $derived(consentState !== null);
  const statusLabel = $derived(
    userOptedOut || consentState?.analytics === false ? 'Analytics off' : 'Analytics on'
  );
  const effectiveGlobalMetadata = $derived(
    globalMetadata || paidSearchAttribution || marketingAttribution
      ? { ...(globalMetadata ?? {}), ...(paidSearchAttribution ?? {}), ...(marketingAttribution ?? {}) }
      : undefined
  );

  function syncPaidSearchAttribution(url: URL) {
    if (!analyticsAllowed) return;
    paidSearchAttribution = captureHighIntentSearchAttribution(url, window.sessionStorage);
    marketingAttribution = captureMarketingAttribution(url, window.sessionStorage);
  }

  afterNavigate((navigation) => {
    if (navigation.to?.url) syncPaidSearchAttribution(navigation.to.url);
  });

  onMount(() => {
    consentState = getConsentState();
    analyticsAllowed = Boolean(consentState?.analytics) && !userOptedOut;
    if (analyticsAllowed) syncPaidSearchAttribution(new URL(window.location.href));
    compactPromptActive = compactPrompt && !consentState && !userOptedOut;
    showPanel = !consentState && !userOptedOut && !compactPromptActive;
    mounted = true;
  });

  function setAnalyticsConsent(analytics: boolean) {
    consentState = updateAnalyticsConsent(analytics);
    analyticsAllowed = analytics && !userOptedOut;
    if (analyticsAllowed) {
      syncPaidSearchAttribution(new URL(window.location.href));
    } else {
      clearHighIntentSearchAttribution(window.sessionStorage);
      clearMarketingAttribution(window.sessionStorage);
      paidSearchAttribution = undefined;
      marketingAttribution = undefined;
    }
    showPanel = false;
    compactPromptActive = false;
  }

  function openPrivacyPanel() {
    compactPromptActive = false;
    showPanel = true;
  }
</script>

{#if mounted && analyticsAllowed}
  <Analytics {property} {userId} {userOptedOut} globalMetadata={effectiveGlobalMetadata} />
{/if}

{#if mounted}
  <aside
    class="privacy-choice"
    class:privacy-choice--compact={compactPromptActive}
    class:privacy-choice--obscured={obscured}
    class:privacy-choice--safe-corner={mobilePlacement === 'safe-corner'}
    aria-label="Privacy choices"
    aria-hidden={obscured}
    inert={obscured}
  >
    {#if showPanel}
      <div class="privacy-panel" role="dialog" aria-modal="false" aria-labelledby="privacy-title">
        <div class="privacy-panel__copy">
          <p class="privacy-panel__eyebrow">Privacy</p>
          <h2 id="privacy-title">First-party analytics only.</h2>
          <p>
            We use analytics to learn which workflow pages help. No ad pixels, no cross-site
            tracking.
          </p>
          <a href="/privacy">Privacy policy</a>
        </div>
        <div class="privacy-panel__actions">
          <button
            type="button"
            class="privacy-button privacy-button--ghost"
            onclick={() => setAnalyticsConsent(false)}
          >
            Necessary only
          </button>
          <button type="button" class="privacy-button" onclick={() => setAnalyticsConsent(true)}>
            Allow analytics
          </button>
        </div>
      </div>
    {:else if compactPromptActive}
      <button
        type="button"
        class="privacy-pill privacy-pill--compact"
        aria-label="Privacy choices"
        aria-expanded={showPanel}
        onclick={openPrivacyPanel}
      >
        <span>Privacy choices</span>
      </button>
    {:else}
      <button
        type="button"
        class="privacy-pill"
        aria-expanded={showPanel}
        onclick={openPrivacyPanel}
      >
        <span>{statusLabel}</span>
        {#if hasStoredChoice}
          <span class="privacy-pill__sub">Change</span>
        {:else}
          <span class="privacy-pill__sub">Choose</span>
        {/if}
      </button>
    {/if}
  </aside>
{/if}

<style>
  .privacy-choice {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: var(--z-performance-sticky, 20);
    max-width: min(24rem, calc(100vw - 2rem));
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-sans);
  }

  .privacy-panel {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-md, 4px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 2.75rem 2.75rem,
      var(--color-performance-panel, #ffffff);
    box-shadow: 0 18px 44px rgba(10, 14, 25, 0.16);
  }

  .privacy-panel__copy {
    display: grid;
    gap: 0.42rem;
  }

  .privacy-panel__eyebrow {
    width: fit-content;
    margin: 0;
    padding: 0.28rem 0.48rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    line-height: 1.12;
    text-transform: uppercase;
  }

  .privacy-panel h2 {
    margin: 0;
    font-size: 1rem;
    line-height: 1.2;
    letter-spacing: 0;
  }

  .privacy-panel p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.88rem;
    line-height: 1.52;
  }

  .privacy-panel a {
    width: fit-content;
    color: var(--color-performance-ink, #090909);
    font-size: 0.8rem;
    font-weight: var(--font-performance-medium);
    text-decoration: underline;
    text-underline-offset: 0.18em;
  }

  .privacy-panel__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .privacy-button,
  .privacy-pill {
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    cursor: pointer;
    font: inherit;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }

  .privacy-button {
    min-height: 2.75rem;
    padding: 0.55rem 0.85rem;
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    font-size: 0.83rem;
    font-weight: 700;
  }

  .privacy-button--ghost {
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .privacy-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.75rem;
    padding: 0.35rem 0.65rem;
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
    box-shadow: 0 10px 26px rgba(10, 14, 25, 0.12);
    font-size: 0.72rem;
  }

  .privacy-choice--compact {
    max-width: max-content;
  }

  .privacy-choice--obscured {
    visibility: hidden;
    pointer-events: none;
    opacity: 0;
  }

  .privacy-pill--compact {
    min-height: 2.75rem;
    padding: 0.28rem 0.5rem;
    box-shadow: 0 6px 18px rgba(10, 14, 25, 0.1);
    font-size: 0.68rem;
  }

  .privacy-pill__sub {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.62rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .privacy-button:hover,
  .privacy-pill:hover {
    border-color: var(--color-performance-ink, #090909);
    transform: translateY(-1px);
  }

  .privacy-button--ghost:hover {
    background: var(--color-performance-paper, #f3f3f0);
  }

  @media (max-width: 640px) {
    .privacy-choice {
      right: env(safe-area-inset-right);
      top: max(4.5rem, calc(4rem + env(safe-area-inset-top)));
      bottom: auto;
      left: auto;
      max-width: max-content;
    }

    .privacy-choice:has(.privacy-panel) {
      left: max(0.5rem, env(safe-area-inset-left));
      max-width: none;
    }

    .privacy-choice.privacy-choice--safe-corner {
      top: auto;
      right: max(0.75rem, env(safe-area-inset-right));
      bottom: max(0.75rem, env(safe-area-inset-bottom));
    }

    .privacy-choice.privacy-choice--safe-corner:has(.privacy-panel) {
      right: max(0.5rem, env(safe-area-inset-right));
      bottom: max(0.5rem, env(safe-area-inset-bottom));
    }

    .privacy-choice--compact {
      max-width: max-content;
    }

    .privacy-panel {
      gap: 0.42rem;
      padding: 0.52rem;
      border-radius: var(--radius-performance-sm, 4px);
    }

    .privacy-panel__copy {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      min-width: 0;
    }

    .privacy-panel__eyebrow {
      display: none;
    }

    .privacy-panel h2 {
      overflow: hidden;
      min-width: 0;
      font-size: 0.78rem;
      line-height: 1.12;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .privacy-panel p {
      display: none;
    }

    .privacy-panel a {
      flex: 0 0 auto;
      font-size: 0.68rem;
    }

    .privacy-panel__actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .privacy-button {
      min-height: 2.75rem;
      padding: 0.36rem 0.46rem;
      font-size: 0.72rem;
    }

    .privacy-pill {
      min-height: 2.75rem;
      padding: 0 0.4rem;
      border-color: var(--color-performance-line, #d7d7d2);
      border-right: 0;
      border-radius: var(--radius-performance-sm, 4px) 0 0 var(--radius-performance-sm, 4px);
      background: var(--color-performance-panel, #ffffff);
      box-shadow: none;
      color: var(--color-performance-muted, #5e6268);
      font-family: var(--font-performance-mono);
      font-size: 0.68rem;
    }

    .privacy-choice--safe-corner .privacy-pill {
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
      border-radius: var(--radius-performance-sm, 4px);
      box-shadow: 0 6px 18px rgba(10, 14, 25, 0.1);
    }

    .privacy-pill:hover {
      border-color: var(--color-performance-line-strong, #9c9c96);
      background: var(--color-performance-panel, #ffffff);
      box-shadow: 0 4px 14px rgba(10, 14, 25, 0.08);
      transform: none;
    }

    .privacy-pill:focus-visible {
      outline: 2px solid var(--color-performance-ink, #090909);
      outline-offset: 2px;
    }

    .privacy-pill > span:first-child {
      display: none;
    }

    .privacy-pill--compact > span:first-child {
      display: inline;
      font-size: 0;
    }

    .privacy-pill--compact > span:first-child::before {
      content: 'Privacy';
      font-size: 0.62rem;
    }

    .privacy-pill__sub {
      font-size: 0;
    }

    .privacy-pill__sub::before {
      content: 'Privacy';
      font-size: 0.62rem;
    }
  }
</style>
