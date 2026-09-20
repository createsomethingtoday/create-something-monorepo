<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { api } from '$lib/client';
  import { safeReturnPath } from '$lib/return-path';
  import { page } from '$app/state';
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
      window.location.assign(safeReturnPath(page.url.searchParams.get('next')));
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head
  ><title>Sign in | CREATE SOMETHING Private</title><meta
    name="robots"
    content="noindex"
  /></svelte:head
>
<main id="main" class="form-page">
  <p class="eyebrow">PRIVATE / BUILDER ACCESS</p>
  <h1>Welcome<br /><em>back.</em></h1>
  <p>
    Sign in to your CREATE SOMETHING account to open your collection or manage your network. Private
    networks may require a member invitation. Creator publishing requires approval.
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
    New here? <a
      href={`/signup?next=${encodeURIComponent(safeReturnPath(page.url.searchParams.get('next')))}`}
      >Create an account.</a
    ><br /><a
      href={`/signup?mode=recovery&next=${encodeURIComponent(safeReturnPath(page.url.searchParams.get('next')))}`}
      >Forgot your password?</a
    >
  </p>
  <a href="/library">Browse public previews <Icon name="arrow-right" /></a>
</main>
