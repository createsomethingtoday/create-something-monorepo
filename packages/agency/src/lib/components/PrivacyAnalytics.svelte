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
    max-width: min(24rem, calc(100vw - 2rem));
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-sans);
  }

  .privacy-panel {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-clear-border-strong, #cecece);
    border-radius: var(--radius-clear-md, 8px);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 2.75rem 2.75rem,
      var(--color-clear-panel, #ffffff);
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
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: var(--font-semibold);
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
    color: var(--color-clear-grey, #636363);
    font-size: 0.88rem;
    line-height: 1.52;
  }

  .privacy-panel a {
    width: fit-content;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.8rem;
    font-weight: var(--font-medium);
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
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
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
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
    font-size: 0.83rem;
    font-weight: 700;
  }

  .privacy-button--ghost {
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .privacy-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2rem;
    padding: 0.35rem 0.65rem;
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-grey, #636363);
    box-shadow: 0 10px 26px rgba(10, 14, 25, 0.12);
    font-size: 0.72rem;
  }

  .privacy-pill__sub {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .privacy-button:hover,
  .privacy-pill:hover {
    border-color: var(--color-clear-onyx, #0a0e19);
    transform: translateY(-1px);
  }

  .privacy-button--ghost:hover {
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  @media (max-width: 640px) {
    .privacy-choice {
      right: max(0.5rem, env(safe-area-inset-right));
      bottom: max(0.5rem, env(safe-area-inset-bottom));
      max-width: min(22rem, calc(100vw - 1rem));
    }

    .privacy-panel {
      gap: 0.65rem;
      padding: 0.72rem;
      border-radius: var(--radius-clear-sm, 4px);
    }

    .privacy-panel__copy {
      gap: 0.25rem;
    }

    .privacy-panel__eyebrow {
      padding: 0.24rem 0.42rem;
      font-size: 0.62rem;
    }

    .privacy-panel h2 {
      font-size: 0.92rem;
      line-height: 1.15;
    }

    .privacy-panel p {
      display: none;
    }

    .privacy-panel a {
      font-size: 0.74rem;
    }

    .privacy-panel__actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .privacy-button {
      min-height: 2.1rem;
      padding: 0.45rem 0.52rem;
      font-size: 0.76rem;
    }

    .privacy-pill {
      min-height: 1.9rem;
      padding: 0.36rem 0.5rem;
      font-size: 0.68rem;
    }

    .privacy-pill > span:first-child {
      display: none;
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
