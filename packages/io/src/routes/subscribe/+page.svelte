<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { NewsletterSignup } from '@create-something/canon/newsletter';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<SEO
  title="Research Notes | CREATE SOMETHING.io"
  description="Request occasional CREATE SOMETHING notes on research, runtime evidence, and operating patterns. Confirm by email before you are subscribed."
  keywords="AI-native development research, runtime evidence, operating patterns, research notes"
  ogImage="/og-image.svg"
  propertyName="io"
/>

<div class="subscription-page">
  <section class="subscription-opening" data-page-chapter="offer" aria-labelledby="subscribe-title">
    <div class="subscription-opening__inner">
      <p class="eyebrow">IO research notes</p>
      <h1 id="subscribe-title">Get the research note.</h1>
      <p class="lede">
        Receive occasional notes on research, runtime evidence, and operating patterns that make the
        next technical decision easier to defend.
      </p>
      <div class="offer-boundary" aria-label="Publication boundary">
        <p>
          <strong>What arrives</strong><span>A concise email when the evidence earns one.</span>
        </p>
        <p>
          <strong>What does not</strong><span
            >No software access, paid plan, or launch promise.</span
          >
        </p>
      </div>
    </div>
  </section>

  <div class="signup-chapter" data-page-chapter="request">
    <NewsletterSignup
      eyebrow="Request"
      headline="Ask for the next note."
      description="Enter your email. We will send a confirmation link. You are not added until you confirm."
      actionLabel="Confirm by email"
      submitLabel="Send confirmation link"
      note="Occasional notes. Unsubscribe from any email."
      source="io"
      turnstileSiteKey={data.turnstileSiteKey}
      noScriptContactHref="mailto:micah@createsomething.io?subject=IO%20research%20note"
    />
  </div>

  <section class="subscription-process" data-page-chapter="next" aria-labelledby="next-title">
    <div class="subscription-process__inner">
      <div>
        <p class="eyebrow">What happens next</p>
        <h2 id="next-title">One request. One confirmation.</h2>
      </div>
      <ol>
        <li>
          <span>01</span>
          <p><strong>Request the note.</strong> Enter the address that should receive it.</p>
        </li>
        <li>
          <span>02</span>
          <p>
            <strong>Open the confirmation email.</strong> The link proves the address belongs to you.
          </p>
        </li>
        <li>
          <span>03</span>
          <p>
            <strong>Confirm or stop.</strong> Join only after confirming, then unsubscribe whenever the
            note stops helping.
          </p>
        </li>
      </ol>
      <a href="/papers" class="research-link">Browse the research</a>
    </div>
  </section>
</div>

<style>
  .subscription-page {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .subscription-opening,
  .subscription-process {
    padding: clamp(4.5rem, 10vw, 8rem) 1.25rem;
  }

  .subscription-opening__inner,
  .subscription-process__inner {
    width: min(70rem, 100%);
    margin: 0 auto;
  }

  .subscription-opening__inner {
    display: grid;
    gap: 1.5rem;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-performance-ink-muted, #66665f);
  }

  h1,
  h2 {
    margin: 0;
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 0.98;
  }

  h1 {
    max-width: 11ch;
    font-size: clamp(3.2rem, 9vw, 7.5rem);
  }

  h2 {
    max-width: 14ch;
    font-size: clamp(2.25rem, 6vw, 4.75rem);
  }

  .lede {
    max-width: 42rem;
    margin: 0;
    font-size: clamp(1.15rem, 2.4vw, 1.55rem);
    line-height: 1.55;
    color: var(--color-performance-ink-muted, #5f5f58);
  }

  .offer-boundary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: clamp(1rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-border, #d0d0c8);
  }

  .offer-boundary p {
    display: grid;
    gap: 0.55rem;
    margin: 0;
    padding: 1.5rem;
  }

  .offer-boundary p + p {
    border-left: 1px solid var(--color-performance-border, #d0d0c8);
  }

  .offer-boundary strong {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .offer-boundary span {
    line-height: 1.55;
    color: var(--color-performance-ink-muted, #5f5f58);
  }

  .signup-chapter {
    border-block: 1px solid var(--color-performance-ink, #090909);
  }

  .subscription-process__inner {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(20rem, 1fr);
    gap: clamp(2.5rem, 7vw, 6rem);
    align-items: start;
  }

  .subscription-process__inner > div {
    display: grid;
    gap: 1rem;
  }

  ol {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--color-performance-border, #d0d0c8);
  }

  li {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 1rem;
    padding: 1.4rem 0;
    border-bottom: 1px solid var(--color-performance-border, #d0d0c8);
  }

  li > span {
    font-family: var(--font-performance-mono, ui-monospace, monospace);
    font-size: 0.78rem;
    color: var(--color-performance-ink-muted, #66665f);
  }

  li p {
    margin: 0;
    line-height: 1.55;
  }

  li strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  .research-link {
    grid-column: 2;
    justify-self: start;
    color: inherit;
    font-weight: 700;
    text-underline-offset: 0.25em;
  }

  @media (max-width: 47.99rem) {
    .offer-boundary,
    .subscription-process__inner {
      grid-template-columns: 1fr;
    }

    .offer-boundary p + p {
      border-top: 1px solid var(--color-performance-border, #d0d0c8);
      border-left: 0;
    }

    .research-link {
      grid-column: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
    }
  }
</style>
