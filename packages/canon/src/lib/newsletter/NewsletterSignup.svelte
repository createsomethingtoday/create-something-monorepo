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
    /** Optional CTA eyebrow */
    eyebrow?: string;
    /** Property-specific headline */
    headline?: string;
    /** Property-specific description */
    description?: string;
    /** Short form panel label */
    actionLabel?: string;
    /** Submit button label */
    submitLabel?: string;
    /** Supporting note below the form */
    note?: string;
    /** API endpoint for submission */
    endpoint?: string;
    /** Optional source tracking (defaults to property) */
    source?: string;
  }

  let {
    eyebrow = 'Canon brief',
    headline = 'Stay in the loop',
    description = 'Get updates on new experiments and research.',
    actionLabel = 'Join the list',
    submitLabel = 'Join the list',
    note = 'Occasional notes. Unsubscribe whenever it stops being useful.',
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
    <div class="newsletter-copy">
      <span class="newsletter-eyebrow">{eyebrow}</span>
      <h2 class="newsletter-headline">{headline}</h2>
      <p class="newsletter-description">{description}</p>
    </div>

    <div class="newsletter-panel">
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

          <div class="form-intro">
            <span>By email</span>
            <strong>{actionLabel}</strong>
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
                <span class="visually-hidden">Sending request...</span>
              {:else}
                {submitLabel}
              {/if}
            </button>
          </div>

          <p class="newsletter-note">{note}</p>

          {#if status === 'error' && message}
            <p class="error-message" role="alert">{message}</p>
          {/if}
        </form>
      {/if}
    </div>
  </div>
</section>

<style>
  .newsletter-section {
    padding-block: clamp(4rem, 8vw, 6.5rem);
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px) 0 0 / 4rem 4rem,
      var(--color-performance-ink, #090909);
    border-block: 1px solid var(--color-performance-ink, #090909);
    color: #ffffff;
  }

  .newsletter-content {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(22rem, 0.68fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: stretch;
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .newsletter-copy {
    display: grid;
    align-content: center;
    justify-items: start;
    gap: 1rem;
    min-width: 0;
    max-width: 45rem;
  }

  .newsletter-eyebrow {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 1.9rem;
    align-items: center;
    padding: 0.36rem 0.62rem;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: var(--radius-performance-sm, 4px);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.74);
    font-family: var(--font-performance-mono);
    font-size: 0.76rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .newsletter-headline {
    margin: 0;
    max-width: 13ch;
    color: #ffffff;
    font-size: 3.25rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .newsletter-description {
    max-width: 38rem;
    margin: 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 1.08rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .newsletter-panel {
    display: grid;
    align-content: center;
    min-width: 0;
    padding: clamp(1rem, 3vw, 1.35rem);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: var(--radius-performance-sm, 4px);
    background: rgba(255, 255, 255, 0.08);
  }

  .newsletter-form {
    display: grid;
    gap: 0.85rem;
    min-width: 0;
  }

  .form-intro {
    display: grid;
    gap: 0.24rem;
    min-width: 0;
  }

  .form-intro span {
    color: rgba(255, 255, 255, 0.64);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .form-intro strong {
    color: #ffffff;
    font-size: 1.05rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.22;
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
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: var(--radius-performance-sm, 4px);
    background: rgba(255, 255, 255, 0.96);
    color: var(--color-performance-ink, #090909);
    font-family: inherit;
    font-size: 1rem;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      box-shadow var(--duration-performance-micro) var(--ease-performance-standard);
  }

  input[type='email']::placeholder {
    color: var(--color-performance-muted, #5e6268);
  }

  input[type='email']:hover:not(:disabled):not(:focus) {
    border-color: rgba(255, 255, 255, 0.46);
  }

  input[type='email']:focus {
    outline: none;
    border-color: var(--color-performance-signal, #315cff);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-performance-signal, #315cff) 16%, transparent);
  }

  input[type='email']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type='email'].has-error {
    border-color: var(--color-performance-error, #d92d20);
  }

  input[type='email'].has-error:focus {
    box-shadow: 0 0 0 3px var(--color-performance-error-muted, rgba(217, 45, 32, 0.16));
  }

  .submit-button {
    min-width: 128px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.74rem 1rem;
    border: 1px solid #ffffff;
    border-radius: var(--radius-performance-sm, 4px);
    background: #ffffff;
    color: var(--color-performance-ink, #090909);
    font-family: inherit;
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
    cursor: pointer;
    transition:
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      background var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .submit-button:hover:not(:disabled) {
    border-color: var(--color-performance-signal-soft, #dce8f5);
    background: var(--color-performance-signal-soft, #dce8f5);
  }

  .submit-button:focus-visible {
    outline: 2px solid var(--color-performance-signal, #315cff);
    outline-offset: 3px;
  }

  .submit-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-performance-ink, #090909);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin var(--duration-performance-slow) linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .newsletter-note {
    margin: 0;
    color: rgba(255, 255, 255, 0.64);
    font-size: 0.92rem;
    line-height: 1.45;
    text-wrap: pretty;
  }

  .error-message {
    margin: 0;
    color: var(--color-performance-signal-soft, #dce8f5);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-left: 0.2rem solid var(--color-performance-signal, #315cff);
    border-radius: var(--radius-performance-sm, 4px);
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
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
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
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
