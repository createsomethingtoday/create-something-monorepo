<script lang="ts">
  /**
   * Login Page
   *
   * Authenticates via Identity Worker for unified CREATE SOMETHING identity.
   *
   * Canon: Authentication recedes into use.
   */

  import CookieConsent from '$canon/components/CookieConsent.svelte';
  import { hasCookieConsent, acceptCookieConsent } from '@create-something/canon/gdpr';
  import { friendlyIdentityError } from '$lib/auth/messages';
  import { labelLearnReturnPath } from '$lib/auth/return-path';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  interface LoginResponse {
    message?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }

  const redirectTo = $derived(data.redirectTo);
  const returnDestinationLabel = $derived(labelLearnReturnPath(redirectTo));

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const response = await fetch('https://id.createsomething.space/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        error = friendlyIdentityError('login', response.status, data.message);
        return;
      }

      if (!data.access_token || !data.refresh_token || typeof data.expires_in !== 'number') {
        error = 'Authentication response was incomplete. Please try again.';
        return;
      }

      // Check cookie consent before setting session cookies
      // If not already consented, accept implicitly on login (user is actively authenticating)
      if (!hasCookieConsent()) {
        acceptCookieConsent();
      }

      // Set cookies with cross-subdomain scope for unified identity
      document.cookie = `cs_access_token=${data.access_token}; path=/; domain=.createsomething.space; max-age=${data.expires_in}; secure; samesite=lax`;
      document.cookie = `cs_refresh_token=${data.refresh_token}; path=/; domain=.createsomething.space; max-age=604800; secure; samesite=lax`;

      // Redirect on success
      window.location.href = redirectTo;
    } catch {
      error = friendlyIdentityError('login', 503);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login | CREATE SOMETHING LMS</title>
</svelte:head>

<div class="container">
  <div class="auth-card">
    <section data-performance-chapter="task-state" class="auth-chapter">
      <h1>Sign in to keep learning.</h1>
      <p class="subtitle">Use the email and password for your CREATE SOMETHING account.</p>
      <p class="return-destination">After signing in, continue to {returnDestinationLabel}.</p>
      <noscript>
        <p class="noscript-notice">
          JavaScript is required to submit this sign-in form. Enable JavaScript and reload.
        </p>
      </noscript>
    </section>

    <section data-performance-chapter="workspace" class="auth-chapter" aria-label="Sign-in form">
      {#if error}
        <div id="login-error" class="error-message" role="alert" aria-live="polite">{error}</div>
      {/if}

      <form onsubmit={handleSubmit}>
        <div class="field">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            required
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            autocomplete="email"
          />
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            bind:value={password}
            required
            aria-required="true"
            aria-invalid={!!error}
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="submit-btn" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </section>

    <section data-performance-chapter="decision-receipt" class="auth-chapter auth-handoff">
      <h2>Need an account?</h2>
      <p class="switch-auth">
        <a href="/signup?redirect={encodeURIComponent(redirectTo)}">Create one</a>, or
        <a href="/paths">browse the course list</a> first.
      </p>
    </section>
  </div>
</div>

<CookieConsent privacyPolicyUrl="/privacy" />

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
  }

  .auth-chapter {
    padding: 0;
  }

  .auth-chapter + .auth-chapter {
    margin-top: var(--space-lg);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--color-border-default);
  }

  .auth-handoff h2 {
    font-size: var(--text-body);
    font-weight: 600;
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
    margin-bottom: var(--space-lg);
  }

  .noscript-notice {
    padding: var(--space-sm);
    border: 1px solid var(--color-border-emphasis);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-md);
  }

  .error-message {
    padding: var(--space-sm);
    background: var(--color-error-muted);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    margin-bottom: var(--space-md);
    font-size: var(--text-body-sm);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  label {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  input {
    padding: var(--space-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    color: var(--color-fg-primary);
    font-family: inherit;
    font-size: var(--text-body);
  }

  input:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-color: var(--color-border-emphasis);
  }

  .submit-btn {
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

  .submit-btn:hover:not(:disabled) {
    background: var(--color-fg-secondary);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .switch-auth {
    margin-top: var(--space-lg);
    text-align: center;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  .switch-auth a {
    color: var(--color-fg-primary);
    text-decoration: underline;
  }
</style>
