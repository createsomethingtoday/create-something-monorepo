<script lang="ts">
  import { onMount, tick } from 'svelte';
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
  import { browserBlocksMetaMarketing, createMetaMarketingClient, type MetaMarketingConsent } from '$lib/analytics/meta-marketing-client';
  import { sanitizeMetaPageUrl } from '$lib/analytics/meta-policy';

  interface Props {
    property?: Property;
    userId?: string;
    userOptedOut?: boolean;
    /** Only a verified account preference may durably revoke Meta consent. */
    metaAccountOptedOut?: boolean;
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
    metaAccountOptedOut = false,
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
  let marketingConsent = $state<MetaMarketingConsent>({ marketing: false, available: false, blocked: false });
  let analyticsChoice = $state(false);
  let marketingChoice = $state(false);
  let marketingLoading = $state(true);
  let saving = $state(false);
  let privacyError = $state('');
  let marketingTouched = false;
  let privacyTrigger = $state<HTMLButtonElement | undefined>(undefined);
  let analyticsCheckbox = $state<HTMLInputElement | undefined>(undefined);
  let marketingClient: ReturnType<typeof createMetaMarketingClient> | undefined;
  let readVersion = 0;

  const hasStoredChoice = $derived(consentState !== null);
  const statusLabel = $derived(
    marketingConsent.marketing ? 'Meta marketing on' : analyticsAllowed ? 'Analytics on' : 'Tracking off'
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
    if (navigation.to?.url) {
      syncPaidSearchAttribution(navigation.to.url);
      if (mounted) void syncMetaMarketing(navigation.to.url);
    }
  });

  $effect(() => {
    if (mounted && metaAccountOptedOut) void syncMetaMarketing(new URL(window.location.href), false);
  });

  async function syncMetaMarketing(url: URL, track = true) {
    if (!marketingClient) return;
    const version = ++readVersion;
    try {
      const next = track ? await marketingClient.trackPage(url) : await marketingClient.refresh();
      if (version !== readVersion) return;
      marketingConsent = next;
      if (!marketingTouched) marketingChoice = next.marketing;
    } catch {
      if (version !== readVersion) return;
      marketingConsent = marketingClient.state;
      if (!marketingTouched) marketingChoice = false;
    } finally {
      if (version === readVersion) marketingLoading = false;
    }
  }

  onMount(() => {
    consentState = getConsentState();
    analyticsAllowed = Boolean(consentState?.analytics) && !userOptedOut;
    analyticsChoice = analyticsAllowed;
    if (analyticsAllowed) syncPaidSearchAttribution(new URL(window.location.href));
    compactPromptActive = compactPrompt && !consentState && !userOptedOut;
    showPanel = !consentState && !userOptedOut && !compactPromptActive;
    if (property === 'agency') {
      marketingClient = createMetaMarketingClient({
        sanitizePageUrl: sanitizeMetaPageUrl,
        privacyBlocked: () => metaAccountOptedOut || browserBlocksMetaMarketing()
      });
      void syncMetaMarketing(new URL(window.location.href));
    } else {
      marketingLoading = false;
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void syncMetaMarketing(new URL(window.location.href));
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    mounted = true;
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
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
  }

  async function saveChoices(necessaryOnly = false) {
    if (saving) return;
    saving = true;
    privacyError = '';
    ++readVersion;
    const nextAnalytics = necessaryOnly ? false : analyticsChoice;
    const nextMarketing = !necessaryOnly && marketingChoice && !marketingConsent.blocked && !userOptedOut;
    setAnalyticsConsent(nextAnalytics);
    analyticsChoice = nextAnalytics;
    try {
      if (marketingClient) marketingConsent = await marketingClient.setConsent(nextMarketing);
      marketingChoice = marketingConsent.marketing;
      marketingTouched = false;
      showPanel = false;
      compactPromptActive = false;
      await tick();
      privacyTrigger?.focus();
      if (marketingConsent.marketing) void syncMetaMarketing(new URL(window.location.href));
    } catch {
      marketingConsent = marketingClient?.state ?? { marketing: false, available: false, blocked: false };
      marketingChoice = false;
      privacyError = 'Your analytics choice is saved. We could not confirm the Meta marketing change. Marketing requests from this page are paused. Please try again.';
    } finally {
      marketingLoading = false;
      saving = false;
    }
  }

  async function openPrivacyPanel() {
    compactPromptActive = false;
    analyticsChoice = analyticsAllowed;
    marketingChoice = marketingConsent.marketing;
    marketingTouched = false;
    privacyError = '';
    showPanel = true;
    void syncMetaMarketing(new URL(window.location.href), false);
    await tick();
    analyticsCheckbox?.focus();
  }
</script>

{#if mounted && analyticsAllowed}
  <Analytics {property} {userId} {userOptedOut} globalMetadata={effectiveGlobalMetadata} />
{/if}

{#if mounted}
  <aside
    class="privacy-choice"
    class:privacy-choice--expanded={showPanel}
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
          <h2 id="privacy-title">Your privacy choices</h2>
          <p>
            Choose how we measure visits. Both choices are optional, and you can change them here.
          </p>
          <a href="/privacy">Privacy policy</a>
        </div>
        <div class="privacy-options">
          <label class="privacy-option">
            <input bind:this={analyticsCheckbox} type="checkbox" bind:checked={analyticsChoice} disabled={saving || userOptedOut} aria-label="First-party analytics" />
            <span><strong>First-party analytics</strong><span>Help us learn which pages and workflows are useful.</span></span>
          </label>
          {#if property === 'agency'}
            <label class="privacy-option">
              <input type="checkbox" bind:checked={marketingChoice} onchange={() => { marketingTouched = true; }} disabled={saving || marketingLoading || !marketingConsent.available || marketingConsent.blocked || userOptedOut} aria-label="Meta marketing" aria-describedby="meta-marketing-detail meta-marketing-status" />
              <span><strong>Meta marketing</strong><span id="meta-marketing-detail">Share public page visits and saved inquiries with Meta to measure Facebook and Instagram campaigns. Inquiries include a hashed email for matching.</span></span>
            </label>
            <p id="meta-marketing-status" class="privacy-option-status" role="status">
              {#if marketingLoading}Checking marketing availability…
              {:else if marketingConsent.blocked || userOptedOut}Meta marketing is off because of your privacy settings.
              {:else if !marketingConsent.available}Meta marketing is currently unavailable and stays off.
              {:else}Off unless you choose to allow it. Your analytics choice does not enable Meta marketing.{/if}
            </p>
          {/if}
        </div>
        {#if privacyError}<p class="privacy-error" role="alert">{privacyError}</p>{/if}
        <div class="privacy-panel__actions">
          <button
            type="button"
            class="privacy-button privacy-button--ghost"
            disabled={saving}
            onclick={() => saveChoices(true)}
          >
            Necessary only
          </button>
          <button type="button" class="privacy-button" disabled={saving} onclick={() => saveChoices()}>
            {saving ? 'Saving…' : 'Save choices'}
          </button>
        </div>
      </div>
    {:else if compactPromptActive}
      <button
        bind:this={privacyTrigger}
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
        bind:this={privacyTrigger}
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
    max-height: min(38rem, calc(100dvh - 6rem));
    overflow-y: auto;
  }

  .privacy-choice--expanded {
    z-index: var(--z-performance-modal, 100);
  }

  .privacy-options {
    display: grid;
    gap: 0.65rem;
  }

  .privacy-option {
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr);
    align-items: start;
    gap: 0.65rem;
    min-height: 2.75rem;
    padding-block: 0.3rem;
    cursor: pointer;
  }

  .privacy-option input {
    width: 1.1rem;
    height: 1.1rem;
    margin: 0.1rem 0 0;
    accent-color: var(--color-performance-ink, #090909);
  }

  .privacy-option > span,
  .privacy-option > span > span {
    display: block;
  }

  .privacy-option strong {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.84rem;
  }

  .privacy-option > span > span,
  .privacy-option-status,
  .privacy-error {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .privacy-option-status,
  .privacy-error {
    margin: 0;
  }

  .privacy-error {
    border-left: 2px solid var(--color-performance-ink, #090909);
    padding-left: 0.65rem;
  }

  .privacy-button:disabled,
  .privacy-option:has(input:disabled) {
    cursor: default;
    opacity: 0.7;
  }

  .privacy-button:focus-visible,
  .privacy-option input:focus-visible {
    outline: 2px solid var(--color-performance-ink, #090909);
    outline-offset: 3px;
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
      gap: 0.75rem;
      padding: 0.85rem;
      border-radius: var(--radius-performance-sm, 4px);
    }

    .privacy-panel__copy {
      display: grid;
      gap: 0.4rem;
      min-width: 0;
    }

    .privacy-panel__eyebrow {
      display: none;
    }

    .privacy-panel h2 {
      font-size: 1rem;
      line-height: 1.25;
    }

    .privacy-panel p {
      font-size: 0.76rem;
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
