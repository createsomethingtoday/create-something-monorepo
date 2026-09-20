<script lang="ts">
  import { api } from '$lib/client';
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
      const next = page.url.searchParams.get('next');
      window.location.assign(
        next && /^\/(?:dashboard|n\/[a-z0-9-]+(?:\/studio|\/settings)?|library)$/.test(next)
          ? next
          : '/dashboard'
      );
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
      >{busy ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">↗</span></button
    >
  </form>
  <p class="muted">
    New here? <a
      href={`/signup?next=${encodeURIComponent(page.url.searchParams.get('next') || '/dashboard')}`}
      >Create an account.</a
    ><br /><a href="/signup?mode=recovery">Forgot your password?</a>
  </p>
  <a href="/library">Browse public previews →</a>
</main>
