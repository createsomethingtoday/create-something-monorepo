<script lang="ts">
  import { goto } from '$app/navigation';
  import { LoginForm } from '@create-something/canon/auth/components';
  import type { PageData } from './$types';

  export let data: PageData;

  let error: string | null = null;
  $: returnDestinationLabel = data.returnDestinationLabel;

  function friendlySignInError(code?: string): string {
    if (code === 'invalid_credentials') {
      return 'The email or password did not match. Check both and try again.';
    }
    if (code === 'rate_limited') {
      return 'Too many sign-in attempts. Wait a few minutes, then try again.';
    }
    return 'Sign-in could not be completed. Try again. If it continues, ask the app owner for help.';
  }

  async function signIn(credentials: { email: string; password: string }): Promise<boolean> {
    error = null;
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || payload.success !== true) {
        error = friendlySignInError(payload.error);
        return false;
      }
      await goto(data.redirectTo);
      return true;
    } catch {
      error = friendlySignInError('network_error');
      return false;
    }
  }
</script>

<svelte:head>
  <title>Staff sign-in · CREATE SOMETHING Agents</title>
</svelte:head>

<article class="sign-in-shell performance-paper">
  <section class="sign-in-context" data-performance-chapter="task-state">
    <div class="eyebrow">Staff access</div>
    <h1>Sign in to review the agent transition.</h1>
    <p>
      CREATE SOMETHING Identity checks your account. This app then allows only approved staff.
    </p>
    <dl class="return-destination">
      <div>
        <dt>After sign-in</dt>
        <dd>{returnDestinationLabel}</dd>
      </div>
    </dl>
  </section>

  <section class="sign-in-workspace" data-performance-chapter="workspace">
    <LoginForm
      onSubmit={signIn}
      {error}
      showMagicLinkOption={false}
      showSignupLink={false}
    />
  </section>

  <section class="sign-in-decision" data-performance-chapter="decision-receipt">
    <div>
      <div class="eyebrow">Access decision</div>
      <h2>A valid account must also be approved for this app.</h2>
      <p>
        If access is refused, the next page explains whether to sign in again or ask an
        administrator to update the staff access list.
      </p>
    </div>
    <noscript>
      <p>
        JavaScript is required to submit this sign-in form. Enable JavaScript and reload, or ask
        the app owner for another staff access path.
      </p>
    </noscript>
  </section>
</article>

<style>
  .sign-in-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
    width: min(62rem, calc(100% - 2.5rem));
    margin: 2rem auto;
  }

  .sign-in-shell > section {
    min-width: 0;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  .sign-in-context {
    border-right: 1px solid var(--color-performance-line);
  }

  .sign-in-workspace {
    display: flex;
    align-items: center;
    --color-performance-fg-primary: var(--color-performance-ink);
    --color-performance-fg-secondary: var(--color-performance-ink);
    --color-performance-fg-tertiary: var(--color-performance-muted);
    --color-performance-fg-muted: var(--color-performance-muted);
    --color-performance-bg-pure: var(--color-performance-panel);
    --color-performance-border-emphasis: var(--color-performance-ink);
    --color-performance-error: var(--color-performance-stop);
    --color-performance-error-border: var(--color-performance-stop);
    --color-performance-error-muted: var(--color-performance-stop-soft);
    --space-performance-xs: 0.35rem;
    --space-performance-sm: 0.75rem;
    --space-performance-md: 1rem;
    --space-performance-lg: 1.25rem;
    --radius-performance-scale-md: var(--radius-performance-sm);
    --radius-performance-scale-full: var(--radius-performance-sm);
  }

  .sign-in-workspace :global(.auth-form) {
    max-width: none;
  }

  .sign-in-context h1,
  .sign-in-decision h2 {
    color: var(--color-performance-ink);
    font-family: var(--font-performance-display, var(--font-heading));
    font-weight: 500;
    letter-spacing: var(--tracking-performance-display, -0.03em);
    text-wrap: balance;
  }

  .sign-in-context h1 {
    max-width: 13ch;
    margin: 0.75rem 0 0.8rem;
    font-size: clamp(2.35rem, 5vw, 4rem);
    line-height: 0.96;
  }

  .sign-in-context > p,
  .sign-in-decision p {
    max-width: 38rem;
    margin-bottom: 0;
    color: var(--color-performance-muted);
  }

  .return-destination {
    margin: 1.5rem 0 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-line);
    background: var(--color-performance-paper);
  }

  .return-destination div {
    display: grid;
    gap: 0.35rem;
  }

  .return-destination dt,
  .return-destination dd {
    margin: 0;
  }

  .return-destination dt {
    color: var(--color-performance-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .return-destination dd {
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  .sign-in-decision {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.7fr);
    gap: 2rem;
    border-top: 1px solid var(--color-performance-line);
    background: var(--color-performance-paper);
  }

  .sign-in-decision h2 {
    max-width: 24ch;
    margin: 0.75rem 0 0.6rem;
    font-size: clamp(1.45rem, 3vw, 2rem);
    line-height: 1.02;
  }

  .sign-in-decision noscript p {
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--color-performance-review);
    background: var(--color-performance-review-soft);
  }

  @media (max-width: 760px) {
    .sign-in-shell {
      grid-template-columns: 1fr;
      width: min(100% - 1.5rem, 62rem);
      margin-top: 0.75rem;
    }

    .sign-in-context {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line);
    }

    .sign-in-workspace {
      align-items: stretch;
    }

    .sign-in-decision {
      grid-column: auto;
      grid-template-columns: 1fr;
    }
  }
</style>
