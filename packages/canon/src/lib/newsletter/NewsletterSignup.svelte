<script lang="ts">
  import { getAnalytics } from '../analytics/client.js';

  /**
   * NewsletterSignup Component
   *
   * A Canon-compliant newsletter signup form with email capture.
   * Includes loading states, success/error feedback, and honeypot protection.
   *
   * Canon: The form recedes into the action; only the commitment remains.
   */

  interface Props {
    /** Property-specific headline */
    headline?: string;
    /** Property-specific description */
    description?: string;
    /** API endpoint for submission */
    endpoint?: string;
    /** Optional source tracking (defaults to property) */
    source?: string;
  }

  let {
    headline = 'Stay in the loop',
    description = 'Get updates on new experiments and research.',
    endpoint = '/api/newsletter',
    source
  }: Props = $props();

  let email = $state('');
  let honeypot = $state(''); // Hidden field to catch bots
  let status: 'idle' | 'loading' | 'success' | 'error' = $state('idle');
  let message = $state('');

  async function handleSubmit(event: Event) {
    event.preventDefault();

    // Don't submit if already loading
    if (status === 'loading') return;

    // Basic validation
    if (!email.trim()) {
      status = 'error';
      message = 'Email is required';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      status = 'error';
      message = 'Please enter a valid email';
      return;
    }

    status = 'loading';
    message = '';

    try {
      const analytics = getAnalytics();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          website: honeypot, // Honeypot field
          source,
          sessionId: analytics?.getSessionId(),
          sourceProperty: analytics?.getSourceProperty() ?? undefined,
          landingUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          referrer: typeof document !== 'undefined' ? document.referrer : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        status = 'success';
        message = data.message || 'Check your email to confirm.';
        analytics?.conversion('newsletter_requested', {
          source,
          surface: 'newsletter_signup'
        });
        email = '';
      } else {
        status = 'error';
        message = data.message || 'Something went wrong. Please try again.';
      }
    } catch {
      status = 'error';
      message = 'Network error. Please try again.';
    }
  }

  function handleInput() {
    // Clear error state when user starts typing
    if (status === 'error') {
      status = 'idle';
      message = '';
    }
  }
</script>

<section class="newsletter-section">
  <div class="newsletter-content">
    <h2 class="newsletter-headline">{headline}</h2>
    <p class="newsletter-description">{description}</p>

    {#if status === 'success'}
      <div class="success-message" role="status">
        <svg
          class="success-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{message}</span>
      </div>
    {:else}
      <form class="newsletter-form" onsubmit={handleSubmit}>
        <!-- Honeypot field - hidden from humans, visible to bots -->
        <div class="honeypot" aria-hidden="true">
          <label for="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            bind:value={honeypot}
            tabindex="-1"
            autocomplete="off"
          />
        </div>

        <div class="form-row">
          <div class="input-wrapper">
            <label for="newsletter-email" class="visually-hidden">Email address</label>
            <input
              type="email"
              id="newsletter-email"
              name="email"
              placeholder="your@email.com"
              bind:value={email}
              oninput={handleInput}
              disabled={status === 'loading'}
              class:has-error={status === 'error'}
              required
              autocomplete="email"
            />
          </div>
          <button type="submit" class="submit-button" disabled={status === 'loading'}>
            {#if status === 'loading'}
              <span class="loading-spinner" aria-hidden="true"></span>
              <span class="visually-hidden">Subscribing...</span>
            {:else}
              Subscribe
            {/if}
          </button>
        </div>

        {#if status === 'error' && message}
          <p class="error-message" role="alert">{message}</p>
        {/if}
      </form>
    {/if}
  </div>
</section>

<style>
  .newsletter-section {
    padding-block: 4.5rem;
    background: var(--color-clear-porcelain, #f9f9f9);
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .newsletter-content {
    display: grid;
    grid-template-columns: minmax(0, 0.82fr) minmax(18rem, 0.72fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: end;
    width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .newsletter-headline {
    max-width: 13ch;
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 3.1rem;
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .newsletter-description {
    max-width: 36rem;
    margin: 0.9rem 0 0;
    color: var(--color-clear-grey, #636363);
    font-size: 1.08rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .newsletter-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
  }

  .form-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
  }

  .honeypot {
    position: absolute;
    left: -9999px;
    opacity: 0;
    pointer-events: none;
  }

  .input-wrapper {
    min-width: 0;
  }

  input[type='email'] {
    width: 100%;
    min-height: 44px;
    padding: 0.74rem 1rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    font-family: inherit;
    font-size: 1rem;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  input[type='email']::placeholder {
    color: var(--color-clear-grey, #636363);
  }

  input[type='email']:hover:not(:disabled):not(:focus) {
    border-color: var(--color-clear-border-strong, #cecece);
  }

  input[type='email']:focus {
    outline: none;
    border-color: var(--color-clear-ocean, #315cff);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-clear-ocean, #315cff) 16%, transparent);
  }

  input[type='email']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type='email'].has-error {
    border-color: var(--color-error, #d92d20);
  }

  input[type='email'].has-error:focus {
    box-shadow: 0 0 0 3px var(--color-error-muted, rgba(217, 45, 32, 0.16));
  }

  .submit-button {
    min-width: 120px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.74rem 1rem;
    border: 1px solid var(--color-clear-onyx, #0a0e19);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
    font-family: inherit;
    font-size: 1rem;
    font-weight: var(--font-semibold);
    cursor: pointer;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .submit-button:hover:not(:disabled) {
    border-color: #1a2030;
    background: #1a2030;
  }

  .submit-button:focus-visible {
    outline: 2px solid var(--color-clear-ocean, #315cff);
    outline-offset: 3px;
  }

  .submit-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin var(--duration-slow) linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    margin: 0;
    color: var(--color-error, #d92d20);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-left: 0.2rem solid var(--color-clear-ocean, #315cff);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1rem;
    line-height: 1.45;
  }

  .success-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 760px) {
    .newsletter-section {
      padding-block: 2.75rem;
    }

    .newsletter-content {
      grid-template-columns: 1fr;
      width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
    }

    .newsletter-headline {
      max-width: none;
      font-size: 2.35rem;
      line-height: 1.04;
    }

    .newsletter-description {
      font-size: 1rem;
      line-height: 1.56;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .submit-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-spinner {
      animation: none;
    }

    input[type='email'],
    .submit-button {
      transition: none;
    }
  }
</style>
