<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { safeReturnPath } from '$lib/return-path';
  import { page } from '$app/state';
  import { enrollment } from '$lib/enrollment';
  let email = $state('');
  let busy = $state(false);
  let error = $state('');
  let sent = $state(false);
  const next = $derived(safeReturnPath(page.url.searchParams.get('next')));
  const collecting = $derived(next === '/collection' || next.includes('/assets/'));
  const recovery = $derived(page.url.searchParams.get('mode') === 'recovery');
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    try {
      await enrollment('start', {
        email,
        purpose: recovery ? 'recovery' : 'signup',
        next_path: next
      });
      sent = true;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title
    >{recovery ? 'Recover your account' : 'Create your account'} | CREATE SOMETHING Private</title
  ><meta name="robots" content="noindex" /></svelte:head
>
<main id="main" class="form-page">
  <p class="eyebrow">
    PRIVATE / {recovery
      ? 'ACCOUNT RECOVERY'
      : collecting
        ? 'YOUR BUILDER COLLECTION'
        : 'BUILDER ACCESS'}
  </p>
  <h1>
    {recovery ? 'Find your' : 'Make it'}<br /><em>{recovery ? 'way back.' : 'yours.'}</em>
  </h1>
  {#if sent}
    <div role="status">
      <h2>Check your email.</h2>
      <p>
        If your address can receive account verification, a link will arrive shortly. It expires in
        15 minutes. Check your spam folder too.
      </p>
    </div>
    <button
      type="button"
      class="button secondary"
      onclick={() => {
        sent = false;
      }}>Try another email</button
    >
  {:else}
    <p>
      {recovery
        ? 'Verify your email to choose a new password for your CREATE SOMETHING account.'
        : collecting
          ? 'Use your invited email to verify your account and create a password. We’ll return you to your asset. Creating an account does not purchase anything or start a network subscription.'
          : 'Private starts with an invitation. Use the email invited to a network or by an approved creator. Verify your email to learn from builders, collect useful assets or apply to teach your own practice. Account creation is free; publishing requires a separate creator review.'}
    </p>
    <form onsubmit={submit}>
      <label
        >Email<input
          type="email"
          bind:value={email}
          autocomplete="email"
          maxlength="254"
          required
        /></label
      >
      {#if !recovery}<p class="muted">
          By continuing, you agree to the <a href="/terms">Terms</a>
          and acknowledge the <a href="/privacy">Privacy Policy</a>.
        </p>{/if}
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <button class="button" disabled={busy}
        >{busy ? 'Requesting link…' : 'Email verification link'}
        <span aria-hidden="true"><Icon name="arrow-right" /></span></button
      >
    </form>
  {/if}
  <p class="muted">
    Already have an account? <a href={`/login?next=${encodeURIComponent(next)}`}
      >Sign in <Icon name="arrow-right" /></a
    >
  </p>
</main>
