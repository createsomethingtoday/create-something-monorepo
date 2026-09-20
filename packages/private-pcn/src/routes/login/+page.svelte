<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { api, BOOKING_URL } from '$lib/client';
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);
  async function login(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    try {
      await api('login', { email, password });
      window.location.assign('/library');
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Member sign in | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="form-page">
  <p class="eyebrow">PRIVATE / MEMBER ACCESS</p>
  <h1>Welcome<br /><em>back.</em></h1>
  <p>
    Sign in to your knowledge network with your CREATE SOMETHING account. Private sessions are
    available to invited members.
  </p>
  <form onsubmit={login}>
    <label>Email<input type="email" autocomplete="username" bind:value={email} required /></label
    ><label
      >Password<input
        type="password"
        autocomplete="current-password"
        bind:value={password}
        required
      /></label
    >{#if error}<p role="alert" class="error">{error}</p>{/if}<button class="button" disabled={busy}
      >{busy ? 'Signing in…' : 'Sign in'}
      <span aria-hidden="true"><Icon name="arrow-right" /></span></button
    >
  </form>
  <p class="muted">
    Need access or help with your account? <a href={BOOKING_URL}>Speak with CREATE SOMETHING.</a>
  </p>
  <a href="/library">Browse public previews <Icon name="arrow-right" /></a>
</main>
