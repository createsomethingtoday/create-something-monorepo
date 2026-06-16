<script lang="ts">
  import { goto } from '$app/navigation';
  import WebflowLogo from '$lib/components/WebflowLogo.svelte';

  let email = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let emailError = $state<string | null>(null);

	const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	function validateEmail() {
		if (!email.trim()) {
			emailError = 'Email is required.';
			return;
		}

		emailError = !EMAIL_REGEX.test(email.trim())
			? 'Enter a valid email address, e.g. you@webflow.com.'
			: null;
	}

  async function handleSubmit(e: Event) {
    e.preventDefault();

    validateEmail();
    if (emailError) return;

    loading = true;
    error = null;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        // Redirect to verify page (same as original Next.js behavior)
        goto('/verify');
      } else {
        const data = (await response.json()) as { error?: string };
        error = data.error || 'Login failed. Please check your email and try again.';
      }
    } catch {
      error = 'An error occurred during the login process. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
  <div class="login-card">
    <div class="logo">
      <WebflowLogo />
    </div>

    <h1>Asset Dashboard</h1>
    <p class="subtitle">Sign in to manage your Webflow assets</p>

    <form onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="email">Email address</label>
        <input
          type="email"
          id="email"
          name="email"
          bind:value={email}
          placeholder="you@webflow.com"
          required
          disabled={loading}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? 'email-error' : undefined}
          onblur={validateEmail}
          oninput={() => (emailError = null)}
        />
        {#if emailError}
          <p class="field-error" id="email-error">{emailError}</p>
        {/if}
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <button type="submit" class="submit-button" disabled={loading || !email}>
        {#if loading}
          <span class="spinner"></span>
          Sending...
        {:else}
          Continue with Email
        {/if}
      </button>
    </form>

    <p class="footer-text">Only authorized Webflow asset creators can access this dashboard.</p>

    <p class="signup-text">
      Need access?
      <a href="/signup">Create a creator account</a>
    </p>
  </div>
</main>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }

  .login-card {
    width: 100%;
    max-width: 400px;
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
  }

  .logo {
    display: flex;
    justify-content: center;
    margin-bottom: var(--space-md);
  }

  h1 {
    font-family: var(--font-heading);
    font-size: var(--text-h2);
    font-weight: var(--font-semibold);
    letter-spacing: 0.01em;
    color: var(--color-fg-primary);
    text-align: center;
    margin: 0 0 var(--space-xs);
  }

  .subtitle {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    text-align: center;
    margin: 0 0 var(--space-lg);
  }

  .form-group {
    margin-bottom: var(--space-md);
  }

  label {
    display: block;
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  input {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    color: var(--color-fg-primary);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-shell-border-default);
    border-radius: 999px;
    outline: none;
    box-shadow: var(--shadow-sm);
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  input:focus {
    border-color: var(--color-info);
    box-shadow: 0 0 0 4px var(--color-info-muted);
  }

  input:focus-visible {
    outline: none;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  input::placeholder {
    color: var(--color-fg-muted);
  }

  .field-error {
    font-size: var(--text-caption);
    color: var(--color-error);
    margin: var(--space-xs) 0 0;
    line-height: 1.4;
  }

  input[aria-invalid='true'] {
    border-color: var(--color-error);
  }

  .error-message {
    padding: 0.75rem 1rem;
    font-size: var(--text-body-sm);
    color: var(--color-error);
    background: var(--color-error-muted);
    border: 1px solid var(--color-error-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }

  .submit-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: var(--text-body);
    font-weight: var(--font-medium);
    color: #ffffff;
    background: var(--color-info);
    border: 1px solid var(--color-info);
    border-radius: 999px;
    box-shadow: 0 8px 18px rgba(20, 110, 245, 0.16);
    cursor: pointer;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .submit-button:hover:not(:disabled) {
    background: #0055d4;
    transform: translateY(-1px);
  }

  .submit-button:disabled {
    color: var(--color-fg-muted);
    background: var(--color-bg-subtle);
    border-color: var(--color-shell-border-default);
    box-shadow: none;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .footer-text {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-align: center;
    margin: var(--space-lg) 0 0;
  }

  .signup-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    text-align: center;
    margin: var(--space-sm) 0 0;
  }

  .signup-text a {
    color: var(--color-info);
    text-decoration: none;
  }

  .signup-text a:hover {
    text-decoration: underline;
  }

  @media (max-width: 640px) {
    .container {
      align-items: flex-start;
      padding: var(--space-md);
    }

    .login-card {
      margin: auto 0;
      padding: var(--space-md);
      border-radius: var(--radius-lg);
    }

    h1 {
      font-size: var(--text-h3);
    }

    .subtitle {
      margin-bottom: var(--space-md);
    }

    .submit-button,
    input {
      min-height: 2.75rem;
    }
  }
</style>
