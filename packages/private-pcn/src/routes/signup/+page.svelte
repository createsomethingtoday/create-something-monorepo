<script lang="ts">
  import { page } from '$app/state';
  import { enrollment } from '$lib/enrollment';
  let email = $state('');
  let busy = $state(false);
  let error = $state('');
  let sent = $state(false);
  const recovery = $derived(page.url.searchParams.get('mode') === 'recovery');
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    try {
      await enrollment('start', {
        email,
        purpose: recovery ? 'recovery' : 'signup',
        next_path: page.url.searchParams.get('next')
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
  <p class="eyebrow">PRIVATE / {recovery ? 'ACCOUNT RECOVERY' : 'CREATOR ACCESS'}</p>
  <h1>
    {recovery ? 'Find your' : 'Start your'}<br /><em>{recovery ? 'way back.' : 'network.'}</em>
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
        : 'Verify your email, create a password, and set up your first private network. Creating an account does not charge you.'}
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
          By continuing, you agree to the <a href="https://createsomething.agency/terms">Terms</a>
          and acknowledge the <a href="https://createsomething.agency/privacy">Privacy Policy</a>.
        </p>{/if}
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <button class="button" disabled={busy}
        >{busy ? 'Requesting link…' : 'Email verification link'}
        <span aria-hidden="true">↗</span></button
      >
    </form>
  {/if}
  <p class="muted">Already have an account? <a href="/login">Sign in →</a></p>
</main>
