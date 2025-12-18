<script lang="ts">
  import { page } from '$app/stores';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  // Get redirect URL from query params
  let redirectUrl = $derived($page.url.searchParams.get('redirect') || '/dashboard');

  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const response = await fetch('https://id.createsomething.space/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.message || 'Login failed';
        return;
      }

      // Store tokens with cross-subdomain scope for unified identity
      document.cookie = `cs_access_token=${data.access_token}; path=/; domain=.createsomething.space; max-age=900; secure; samesite=lax`;
      document.cookie = `cs_refresh_token=${data.refresh_token}; path=/; domain=.createsomething.space; max-age=604800; secure; samesite=lax`;

      // Redirect to original destination or dashboard
      window.location.href = redirectUrl;
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login | CREATE SOMETHING Templates</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-card">
    <h1>Sign in</h1>
    <p class="subtitle">Access your templates and sites</p>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <form onsubmit={handleLogin}>
      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          required
          autocomplete="email"
        />
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Your password"
          required
          autocomplete="current-password"
        />
      </div>

      <button type="submit" class="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>

    <p class="switch">
      Don't have an account? <a href="/signup">Create one</a>
    </p>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    background: var(--color-bg-pure);
  }

  .auth-card {
    width: 100%;
    max-width: 400px;
    padding: var(--space-xl);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  h1 {
    margin: 0 0 var(--space-xs);
    font-size: var(--text-h2);
    font-weight: 500;
    color: var(--color-fg-primary);
  }

  .subtitle {
    margin: 0 0 var(--space-lg);
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .error {
    padding: var(--space-sm);
    margin-bottom: var(--space-md);
    background: rgba(204, 68, 68, 0.1);
    border: 1px solid rgba(204, 68, 68, 0.3);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: var(--text-body-sm);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  label {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  input {
    padding: var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  input:focus {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
    border-color: var(--color-border-emphasis);
  }

  input::placeholder {
    color: var(--color-fg-muted);
  }

  .submit {
    margin-top: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-fg-primary);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-bg-pure);
    font-size: var(--text-body);
    font-weight: 500;
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .switch {
    margin: var(--space-lg) 0 0;
    text-align: center;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .switch a {
    color: var(--color-fg-primary);
    text-decoration: underline;
  }
</style>
