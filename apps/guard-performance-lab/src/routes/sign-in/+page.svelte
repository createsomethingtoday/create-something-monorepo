<script lang="ts">
  import { goto } from '$app/navigation';
  import { LoginForm } from '@create-something/canon/auth/components';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let error = $state<string | null>(null);

  async function signIn(credentials: { email: string; password: string }): Promise<boolean> {
    error = null;
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const payload = await response.json() as { success?: boolean; error?: string };
    if (!response.ok || payload.success !== true) {
      error = payload.error || 'Sign-in failed. Check your credentials and try again.';
      return false;
    }
    await goto(data.redirectTo);
    return true;
  }
</script>

<svelte:head><title>Guard Performance Lab sign-in</title></svelte:head>

<main class="access-shell property-performance">
  <p class="eyebrow">First-party identity</p>
  <h1>Sign in to Guard Performance Lab.</h1>
  <p>CREATE SOMETHING Identity verifies the credential. Guard Lab then applies an exact operator or assigned-player subject binding.</p>
  {#if data.guardAccess.status === 'blocked' || data.guardAccess.status === 'invalid'}
    <div class="access-message" role="alert">
      <strong>Access is not assigned.</strong>
      <span>This identity is valid, but it does not have an operator or player workspace assignment.</span>
      <a href="/api/auth/logout">Clear this session</a>
    </div>
  {:else if data.guardAccess.status === 'unconfigured'}
    <div class="access-message" role="alert">
      <strong>The lab is not configured.</strong>
      <span>An operator must configure exact Guard subject assignments.</span>
    </div>
  {/if}
  <LoginForm onSubmit={signIn} {error} showMagicLinkOption={false} showSignupLink={false} />
</main>

<style>
  .access-message { display: grid; gap: .65rem; margin: 0 0 1.5rem; padding: 1rem; border-left: 4px solid var(--color-performance-risk); background: var(--color-performance-risk-soft); }
  .access-message strong { color: var(--color-performance-risk); }
  .access-message a { width: fit-content; color: var(--color-performance-ink); font: 700 10px var(--font-performance-mono); text-transform: uppercase; }
</style>
