<script lang="ts">
  import { goto } from '$app/navigation';
  import { LoginForm } from '@create-something/canon/auth/components';
  import type { PageData } from './$types';

  export let data: PageData;

  let error: string | null = null;

  async function signIn(credentials: { email: string; password: string }): Promise<boolean> {
    error = null;
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };
    if (!response.ok || payload.success !== true) {
      error = payload.error || 'Sign-in failed. Check your credentials and try again.';
      return false;
    }
    await goto(data.redirectTo);
    return true;
  }
</script>

<svelte:head>
  <title>Staff sign-in · CREATE SOMETHING Agents</title>
</svelte:head>

<section class="sign-in-shell performance-paper">
  <div class="sign-in-context">
    <div class="eyebrow">First-party identity</div>
    <h1>Sign in to the operator surface.</h1>
    <p class="muted">
      Credentials are verified by CREATE SOMETHING Identity. Agent keys remain server-side and the
      app applies its own explicit staff allow rules after authentication.
    </p>
  </div>
  <LoginForm
    onSubmit={signIn}
    {error}
    showMagicLinkOption={false}
    showSignupLink={false}
  />
</section>

<style>
  .sign-in-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
    gap: 2rem;
    width: min(var(--content-width-performance), calc(100% - 2.5rem));
    margin: 2rem auto;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  .sign-in-context h1 {
    max-width: 12ch;
    margin: 0.5rem 0 0.8rem;
  }

  .sign-in-context p {
    max-width: 42rem;
  }

  @media (max-width: 760px) {
    .sign-in-shell {
      grid-template-columns: 1fr;
    }
  }
</style>
