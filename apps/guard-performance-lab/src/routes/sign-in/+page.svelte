<script lang="ts">
  import { goto } from '$app/navigation';
  import { LoginForm } from '@create-something/canon/auth/components';
  import PlayerLoginForm from '$lib/PlayerLoginForm.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let error = $state<string | null>(null);
  let accessMode = $state<'player' | 'adult'>('player');

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

  async function playerSignIn(credentials: { player_code: string; passphrase: string }): Promise<boolean> {
    error = null;
    const response = await fetch('/api/auth/player-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const payload = await response.json() as { success?: boolean; error?: string };
    if (!response.ok || payload.success !== true) {
      error = payload.error === 'rate_limited'
        ? 'Too many tries. Wait a few minutes, then try again.'
        : 'That player code or secret phrase did not match.';
      return false;
    }
    await goto(data.redirectTo);
    return true;
  }
</script>

<svelte:head><title>Guard Performance Lab sign-in</title></svelte:head>

<main class="access-shell access-entry property-performance">
  <section class="access-copy" aria-labelledby="sign-in-title">
    <p class="eyebrow">Private player development</p>
    <h1 id="sign-in-title">Return to the lab.</h1>
    <p class="access-description">Players can enter without an email. Every sign-in still opens only the exact player workspace assigned by Guard Lab.</p>
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
  </section>
  <section class="access-form" aria-label="Sign in form">
    <div class="access-mode" aria-label="Choose access type">
      <button class:active={accessMode === 'player'} aria-pressed={accessMode === 'player'} onclick={() => { accessMode = 'player'; error = null; }}>Player</button>
      <button class:active={accessMode === 'adult'} aria-pressed={accessMode === 'adult'} onclick={() => { accessMode = 'adult'; error = null; }}>Parent / coach</button>
    </div>
    {#if accessMode === 'player'}
      <PlayerLoginForm onSubmit={playerSignIn} {error} />
    {:else}
      <LoginForm onSubmit={signIn} {error} showMagicLinkOption={false} showSignupLink={false} />
    {/if}
  </section>
</main>

<style>
  .access-message { display: grid; gap: .65rem; margin-top: 1.5rem; padding: 1rem; border-left: 4px solid var(--color-performance-risk); background: var(--color-performance-risk-soft); }
  .access-message strong { color: var(--color-performance-risk); }
  .access-message a { width: fit-content; color: var(--color-performance-ink); font: 700 10px var(--font-performance-mono); text-transform: uppercase; }
  .access-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: min(100%, 440px); margin-bottom: var(--space-performance-lg); padding: 4px; background: var(--color-performance-bg-muted); border-radius: var(--radius-performance-scale-full); }
  .access-mode button { min-height: 40px; border: 0; border-radius: var(--radius-performance-scale-full); background: transparent; color: var(--color-performance-fg-secondary); font: 700 var(--text-performance-body-sm) var(--font-performance-sans); cursor: pointer; }
  .access-mode button.active { background: var(--color-performance-bg-pure); color: var(--color-performance-fg-primary); box-shadow: var(--shadow-performance-sm); }
  .access-mode button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 2px; }
</style>
