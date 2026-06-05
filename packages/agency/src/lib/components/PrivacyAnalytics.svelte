<script lang="ts">
  import { onMount } from 'svelte';
  import { Analytics } from '@create-something/canon';
  import type { Property } from '@create-something/canon/analytics';
  import {
    getConsentState,
    updateAnalyticsConsent,
    type ConsentState
  } from '@create-something/canon/gdpr';

  interface Props {
    property?: Property;
    userId?: string;
    userOptedOut?: boolean;
    globalMetadata?: Record<string, unknown>;
  }

  let {
    property = 'agency',
    userId = undefined,
    userOptedOut = false,
    globalMetadata = undefined
  }: Props = $props();

  let mounted = $state(false);
  let analyticsAllowed = $state(false);
  let showPanel = $state(false);
  let consentState = $state<ConsentState | null>(null);

  const hasStoredChoice = $derived(consentState !== null);
  const statusLabel = $derived(
    userOptedOut || consentState?.analytics === false ? 'Analytics off' : 'Analytics on'
  );

  onMount(() => {
    consentState = getConsentState();
    analyticsAllowed = Boolean(consentState?.analytics) && !userOptedOut;
    showPanel = !consentState && !userOptedOut;
    mounted = true;
  });

  function setAnalyticsConsent(analytics: boolean) {
    consentState = updateAnalyticsConsent(analytics);
    analyticsAllowed = analytics && !userOptedOut;
    showPanel = false;
  }
</script>

{#if mounted && analyticsAllowed}
  <Analytics {property} {userId} {userOptedOut} {globalMetadata} />
{/if}

{#if mounted}
  <aside class="privacy-choice" aria-label="Privacy choices">
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
          <button type="button" class="privacy-button privacy-button--ghost" onclick={() => setAnalyticsConsent(false)}>
            Necessary only
          </button>
          <button type="button" class="privacy-button" onclick={() => setAnalyticsConsent(true)}>
            Allow analytics
          </button>
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="privacy-pill"
        aria-expanded={showPanel}
        onclick={() => (showPanel = true)}
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
    z-index: 80;
    max-width: min(23rem, calc(100vw - 2rem));
    color: var(--color-fg-primary);
    font-family: var(--font-sans);
  }

  .privacy-panel {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.018)),
      rgba(8, 8, 10, 0.92);
    box-shadow:
      0 18px 50px rgba(0, 0, 0, 0.48),
      inset 0 0 0 1px rgba(255, 255, 255, 0.025);
    backdrop-filter: blur(18px);
  }

  .privacy-panel__copy {
    display: grid;
    gap: 0.42rem;
  }

  .privacy-panel__eyebrow {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
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
    color: var(--color-fg-secondary);
    font-size: 0.88rem;
    line-height: 1.52;
  }

  .privacy-panel a {
    width: fit-content;
    color: var(--color-fg-muted);
    font-size: 0.8rem;
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
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    cursor: pointer;
    font: inherit;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }

  .privacy-button {
    min-height: 2.25rem;
    padding: 0.55rem 0.85rem;
    background: rgba(255, 255, 255, 0.92);
    color: rgb(4, 4, 5);
    font-size: 0.83rem;
    font-weight: 700;
  }

  .privacy-button--ghost {
    background: rgba(255, 255, 255, 0.035);
    color: var(--color-fg-secondary);
  }

  .privacy-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2rem;
    padding: 0.35rem 0.65rem;
    background: rgba(8, 8, 10, 0.68);
    color: var(--color-fg-secondary);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(14px);
    font-size: 0.72rem;
  }

  .privacy-pill__sub {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .privacy-button:hover,
  .privacy-pill:hover {
    border-color: rgba(255, 255, 255, 0.24);
    transform: translateY(-1px);
  }

  @media (max-width: 640px) {
    .privacy-choice {
      right: 0.8rem;
      bottom: 0.8rem;
      max-width: calc(100vw - 1.6rem);
    }

    .privacy-panel {
      padding: 0.9rem;
    }
  }
</style>
