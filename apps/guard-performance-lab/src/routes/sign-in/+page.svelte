<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let error = $state<string | null>(null);
  let password = $state('');
  let pending = $state(false);

  async function signIn(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    pending = true;
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const payload = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || payload.success !== true) {
        error = payload.error || 'The project password was not accepted.';
        return;
      }
      await goto(data.redirectTo);
    } finally {
      pending = false;
    }
  }
</script>

<svelte:head><title>Unlock Guard Performance Lab</title></svelte:head>

<main class="access-shell access-entry property-performance">
  <section class="access-copy" aria-labelledby="sign-in-title">
    <p class="eyebrow">Private player project</p>
    <h1 id="sign-in-title">Open the lab.</h1>
    <p class="access-description">The player and family use one shared password. No email address or individual account is required.</p>
    {#if data.guardAccess.status === 'invalid'}
      <div class="access-message" role="alert">
        <strong>The previous session has ended.</strong>
        <span>Enter the project password again to reopen the assigned player workspace.</span>
      </div>
    {:else if data.guardAccess.status === 'unconfigured'}
      <div class="access-message" role="alert">
        <strong>The lab is not configured.</strong>
        <span>An operator must configure the password verifier, session secret, and assigned player.</span>
      </div>
    {/if}
  </section>
  <section class="access-form" aria-label="Project password form">
    <form onsubmit={signIn}>
      <p class="mono">Shared access / one player</p>
      <h2>Enter the project password.</h2>
      <label class="field" for="project-password">
        <span>Project password</span>
        <input
          class="input"
          id="project-password"
          name="password"
          type="password"
          autocomplete="current-password"
          bind:value={password}
          required
        />
      </label>
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      <button class="button" type="submit" disabled={pending}>{pending ? 'Opening…' : 'Open project'}</button>
      <p class="access-note">Keep this password within the player’s family and coaching circle.</p>
    </form>
  </section>
</main>

<style>
  form { display: grid; gap: 18px; }
  form .mono { margin: 0; color: var(--color-performance-pressure); font-size: 9px; }
  form h2 { max-width: 11ch; margin: 0 0 10px; font-size: clamp(32px, 3.5vw, 52px); font-weight: 450; line-height: .98; letter-spacing: -.035em; }
  form .field > span { color: #c9c9c3; }
  form .button { width: fit-content; }
  .form-error { margin: 0; padding: 12px 14px; border-left: 4px solid var(--color-performance-pressure); background: #2d2d2d; color: white; }
  .access-note { max-width: 32rem; margin: 0; color: #aaa; font-size: 13px; line-height: 1.5; }
  .access-message { display: grid; gap: .65rem; margin-top: 1.5rem; padding: 1rem; border-left: 4px solid var(--color-performance-risk); background: var(--color-performance-risk-soft); }
  .access-message strong { color: var(--color-performance-risk); }
</style>
