<script lang="ts">
  import { onMount } from 'svelte';
  import { enrollment } from '$lib/enrollment';
  import { api } from '$lib/client';
  let recovery = $state(false);
  let next = $state('/dashboard');
  let token = $state('');
  let password = $state('');
  let confirm = $state('');
  let error = $state('');
  let busy = $state(false);
  let ready = $state(false);
  let verified = $state(false);
  onMount(() => {
    token = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    recovery = new URLSearchParams(window.location.search).get('mode') === 'recovery';
    const requested = new URLSearchParams(window.location.search).get('next');
    if (requested && /^\/(?:dashboard|library|n\/[a-z0-9-]{3,48})$/.test(requested))
      next = requested;
    // Mailbox proof stays out of history, query logs, and referrers.
    window.history.replaceState(null, '', window.location.pathname);
    ready = true;
  });
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = '';
    if (password !== confirm) {
      error = 'The passwords do not match.';
      return;
    }
    busy = true;
    try {
      const result = await enrollment('complete', { token, password });
      token = '';
      verified = true;
      try {
        await api('login', { email: result.email, password });
        window.location.assign(next);
      } catch {
        error = 'Your account is verified and your password is saved. Sign in to continue.';
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      password = '';
      confirm = '';
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Verify your account | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /><meta name="referrer" content="no-referrer" /></svelte:head
>
<main id="main" class="form-page">
  <p class="eyebrow">PRIVATE / VERIFIED ACCESS</p>
  <h1>Make it<br /><em>yours.</em></h1>
  {#if !ready}<p>Reading your verification link…</p>
  {:else if verified}<p role="status">{error || 'Account verified. Opening your workspace…'}</p>
    <a class="button" href={`/login?next=${encodeURIComponent(next)}`}>Sign in →</a>
  {:else if !token}<p>
      This page needs the link from your verification email. Request a new link to continue.
    </p>
    <a class="button" href={recovery ? '/signup?mode=recovery' : '/signup'}>Request a link →</a>
  {:else}
    <p>Choose a password for your CREATE SOMETHING account. This link can be used once.</p>
    <form onsubmit={submit}>
      <label
        >New password<input
          type="password"
          autocomplete="new-password"
          bind:value={password}
          minlength="12"
          maxlength="256"
          required
        /></label
      >
      <label
        >Confirm password<input
          type="password"
          autocomplete="new-password"
          bind:value={confirm}
          minlength="12"
          maxlength="256"
          required
        /></label
      >
      <p class="muted">Use at least 12 characters. A long, unique passphrase works well.</p>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <button class="button" disabled={busy}
        >{busy ? 'Verifying…' : 'Verify and continue'} <span aria-hidden="true">↗</span></button
      >
    </form>
    <p class="muted">
      Link expired? <a href={recovery ? '/signup?mode=recovery' : '/signup'}>Request a new one.</a>
    </p>
  {/if}
</main>
