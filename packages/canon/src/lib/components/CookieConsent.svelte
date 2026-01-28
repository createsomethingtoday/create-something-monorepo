<!--
  CookieConsent - Minimal, non-intrusive consent banner for authentication cookies

  Canon: Privacy is not a feature—it's respect for the user's autonomy.

  Shows only on login/signup pages when consent is pending.
  Single action: "Continue" accepts necessary cookies.
  No cookie wall—anonymous browsing always allowed.

  Usage:
  <CookieConsent privacyPolicyUrl="/privacy" />

  Or with callback:
  <CookieConsent
    privacyPolicyUrl="/privacy"
    onAccept={() => console.log('Consent accepted')}
  />
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    hasCookieConsent,
    acceptCookieConsent,
    isCookieConsentPending
  } from '../gdpr/consent.js';

  interface Props {
    /** URL to the privacy policy page */
    privacyPolicyUrl?: string;
    /** Callback when consent is accepted */
    onAccept?: () => void;
  }

  let {
    privacyPolicyUrl = '/privacy',
    onAccept
  }: Props = $props();

  let showBanner = $state(false);
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
    // Only show banner if consent is pending
    showBanner = isCookieConsentPending();
  });

  function handleAccept() {
    acceptCookieConsent();
    showBanner = false;
    onAccept?.();
  }
</script>

{#if mounted && showBanner}
  <div class="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
    <div class="consent-content">
      <p id="cookie-consent-description" class="consent-text">
        We use essential cookies to keep you signed in.
        <a href={privacyPolicyUrl} class="privacy-link">Privacy Policy</a>
      </p>
      <button
        type="button"
        class="accept-btn"
        onclick={handleAccept}
      >
        Continue
      </button>
    </div>
  </div>
{/if}

<style>
  .cookie-consent {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-surface);
    border-top: 1px solid var(--color-border-default);
  }

  .consent-content {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .consent-text {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    margin: 0;
  }

  .privacy-link {
    color: var(--color-fg-primary);
    text-decoration: underline;
    margin-left: 0.25em;
  }

  .privacy-link:hover {
    color: var(--color-fg-secondary);
  }

  .accept-btn {
    flex-shrink: 0;
    padding: var(--space-xs) var(--space-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: var(--text-body-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background var(--duration-micro) var(--ease-standard);
  }

  .accept-btn:hover {
    background: var(--color-fg-secondary);
  }

  .accept-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    .consent-content {
      flex-direction: column;
      text-align: center;
      gap: var(--space-sm);
    }

    .accept-btn {
      width: 100%;
    }
  }
</style>
