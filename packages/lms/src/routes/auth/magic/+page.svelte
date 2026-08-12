<script lang="ts">
  /**
   * Magic Link Landing Page
   *
   * Handles magic link clicks from emails.
   * URL format: /auth/magic?token=<token>&session=<sessionId>
   *
   * Canon: One click, authenticated.
   */

  import { onMount } from 'svelte';
  import { friendlyMagicError } from '$lib/auth/messages';
  import { labelLearnReturnPath } from '$lib/auth/return-path';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let status = $state<'loading' | 'success' | 'error'>('loading');
  let errorType = $state<'expired' | 'used' | 'invalid' | 'network' | null>(null);
  let errorMessage = $state('');
  let retrying = $state(false);

  interface MagicLinkVerifyResponse {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
  }

  const token = $derived(data.token);
  const sessionId = $derived(data.sessionId);
  const redirectTo = $derived(data.redirectTo);
  const returnDestinationLabel = $derived(labelLearnReturnPath(redirectTo));

  async function verifyMagicLink() {
    if (!token || !sessionId) {
      status = 'error';
      errorType = 'invalid';
      errorMessage = 'Invalid magic link. Missing required parameters.';
      return;
    }

    try {
      const response = await fetch('/api/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, sessionId })
      });

      const data = (await response.json()) as MagicLinkVerifyResponse;

      if (!response.ok) {
        const failure = friendlyMagicError(response.status, data.message);
        errorType = failure.type;
        errorMessage = failure.message;
        status = 'error';
        return;
      }

      if (!data.accessToken || !data.refreshToken) {
        status = 'error';
        errorType = 'invalid';
        errorMessage = 'Authentication response was incomplete. Please request a new link.';
        return;
      }

      // Set cookies with cross-subdomain scope for unified identity
      document.cookie = `cs_access_token=${data.accessToken}; path=/; domain=.createsomething.space; max-age=900; secure; samesite=lax`;
      document.cookie = `cs_refresh_token=${data.refreshToken}; path=/; domain=.createsomething.space; max-age=604800; secure; samesite=lax`;

      status = 'success';

      // Redirect after brief success message
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1500);
    } catch (err) {
      console.error('Magic link verification error:', err);
      const failure = friendlyMagicError(503);
      status = 'error';
      errorType = failure.type;
      errorMessage = failure.message;
    }
  }

  async function handleRetry() {
    retrying = true;
    status = 'loading';
    errorType = null;
    errorMessage = '';
    await verifyMagicLink();
    retrying = false;
  }

  onMount(() => {
    verifyMagicLink();
  });
</script>

<svelte:head>
  <title>Verifying Magic Link | CREATE SOMETHING LMS</title>
</svelte:head>

<div class="container">
  <div class="auth-card">
    <section data-performance-chapter="task-state" class="auth-chapter">
      <p class="eyebrow">Email sign-in</p>
      <p class="return-destination">
        After we verify the link, continue to {returnDestinationLabel}.
      </p>
    </section>

    <section data-performance-chapter="workspace" class="auth-chapter" aria-live="polite">
      <noscript>
        <style>
          .loading-state .spinner,
          .loading-state .subtitle {
            display: none !important;
          }
        </style>
        <p class="noscript-notice">
          This link cannot sign you in until JavaScript is enabled. Enable JavaScript and reload, or <a
            href="/login?redirect={encodeURIComponent(redirectTo)}">request a new link</a
          >.
        </p>
      </noscript>
      {#if status === 'loading'}
        <div class="loading-state">
          <div class="spinner"></div>
          <h1>Check your sign-in link.</h1>
          <p class="subtitle">Learn is verifying it now.</p>
        </div>
      {:else if status === 'success'}
        <div class="success-state">
          <div class="success-icon">✓</div>
          <h1>Your link worked.</h1>
          <p class="subtitle">Continuing to {returnDestinationLabel} now.</p>
        </div>
      {:else if status === 'error'}
        <div class="error-state">
          <div class="error-icon">!</div>
          <h1>
            {#if errorType === 'expired'}
              This link has expired
            {:else if errorType === 'used'}
              This link has already been used
            {:else if errorType === 'network'}
              We could not check the link
            {:else}
              This link is not valid
            {/if}
          </h1>
          <p class="error-message">{errorMessage}</p>

          {#if errorType === 'network'}
            <button onclick={handleRetry} disabled={retrying} class="retry-btn">
              {retrying ? 'Trying again...' : 'Try again'}
            </button>
          {/if}
        </div>
      {/if}
    </section>

    <section data-performance-chapter="decision-receipt" class="auth-chapter auth-handoff">
      {#if status === 'success'}
        <h2>Next: {returnDestinationLabel}</h2>
        <p>Learn will continue automatically.</p>
      {:else}
        <h2>Need another way in?</h2>
        <div class="actions">
          <a href="/login?redirect={encodeURIComponent(redirectTo)}" class="action-link">Sign in</a>
          <a href="/signup?redirect={encodeURIComponent(redirectTo)}" class="action-link secondary">
            Create an account
          </a>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    padding: var(--space-xl);
    background: var(--color-bg-surface);
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .auth-chapter {
    padding: 0;
  }

  .auth-chapter + .auth-chapter {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border-default);
  }

  .eyebrow {
    font-size: var(--text-caption);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-xs);
  }

  .auth-handoff h2 {
    font-size: var(--text-body);
    font-weight: 600;
    margin-bottom: var(--space-sm);
  }

  h1 {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .subtitle {
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-xs);
  }

  .return-destination {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    margin: 0 0 var(--space-lg);
  }

  .noscript-notice {
    padding: var(--space-sm);
    border: 1px solid var(--color-border-emphasis);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-md);
  }

  .noscript-notice a {
    color: var(--color-fg-primary);
    text-decoration: underline;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid var(--color-border-default);
    border-top-color: var(--color-fg-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Success State */
  .success-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .success-icon {
    width: 64px;
    height: 64px;
    background: var(--color-success);
    color: var(--color-bg-pure);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
    animation: scaleIn var(--duration-standard) var(--ease-standard);
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }

  /* Error State */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .error-icon {
    width: 64px;
    height: 64px;
    background: var(--color-error);
    color: var(--color-bg-pure);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
  }

  .error-message {
    padding: var(--space-sm);
    background: var(--color-error-muted);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    font-size: var(--text-body-sm);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    width: 100%;
  }

  .retry-btn {
    padding: var(--space-sm) var(--space-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border: none;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: var(--text-body);
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .retry-btn:hover:not(:disabled) {
    background: var(--color-fg-secondary);
  }

  .retry-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-link {
    padding: var(--space-sm) var(--space-md);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    border-radius: var(--radius-sm);
    font-size: var(--text-body);
    text-decoration: none;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .action-link:hover {
    background: var(--color-fg-secondary);
  }

  .action-link.secondary {
    background: var(--color-bg-elevated);
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-default);
  }

  .action-link.secondary:hover {
    border-color: var(--color-border-emphasis);
  }
</style>
