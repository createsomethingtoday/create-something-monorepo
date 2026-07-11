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
  <LoginForm onSubmit={signIn} {error} showMagicLinkOption={false} showSignupLink={false} />
</main>
