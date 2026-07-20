<script lang="ts">
  import { SEO } from '@create-something/canon';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const title = $derived(
    data.success
      ? data.alreadyConfirmed
        ? 'Already confirmed.'
        : 'Research note confirmed.'
      : 'Confirmation needs another link.'
  );
</script>

<SEO
  title="Confirm Research Note"
  description="Confirm your CREATE SOMETHING research note subscription."
  propertyName="io"
  noindex={true}
/>

<section
  class="confirmation-page"
  data-page-chapter="confirmation"
  aria-labelledby="confirmation-title"
>
  <div class="confirmation-card" class:confirmation-card--success={data.success}>
    <p class="eyebrow">IO research notes</p>
    <h1 id="confirmation-title">{title}</h1>
    <p class="message" role={data.success ? 'status' : 'alert'}>{data.message}</p>

    {#if data.success}
      {#if data.email}
        <p class="email">{data.email}</p>
      {/if}
      <a href="/papers" class="primary-action">Read the research</a>
    {:else}
      <p class="recovery">
        Enter your email again. If the address still needs confirmation, we will send a fresh link.
      </p>
      <a href="/subscribe" class="primary-action">Request a new confirmation email</a>
    {/if}
  </div>
</section>

<style>
  .confirmation-page {
    min-height: min(48rem, calc(100vh - var(--height-performance-header, 4.5rem)));
    display: grid;
    place-items: center;
    padding: clamp(3rem, 8vw, 7rem) 1.25rem;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .confirmation-card {
    display: grid;
    gap: 1.25rem;
    width: min(42rem, 100%);
    padding: clamp(1.5rem, 5vw, 3rem);
    border: 1px solid var(--color-performance-border, #d0d0c8);
    border-left: 0.25rem solid var(--color-performance-error, #b42318);
    background: #ffffff;
  }

  .confirmation-card--success {
    border-left-color: var(--color-performance-success, #067647);
  }

  .eyebrow,
  h1,
  p {
    margin: 0;
  }

  .eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-performance-ink-muted, #66665f);
  }

  h1 {
    max-width: 16ch;
    font-size: clamp(2.4rem, 7vw, 4.5rem);
    font-weight: 600;
    letter-spacing: -0.045em;
    line-height: 1;
  }

  .message {
    max-width: 38rem;
    font-size: clamp(1.1rem, 2vw, 1.3rem);
    line-height: 1.55;
  }

  .email {
    width: fit-content;
    max-width: 100%;
    padding: 0.55rem 0.75rem;
    overflow-wrap: anywhere;
    background: var(--color-performance-paper, #f3f3f0);
    font-family: var(--font-performance-mono, ui-monospace, monospace);
    font-size: 0.86rem;
  }

  .recovery {
    max-width: 36rem;
    line-height: 1.6;
    color: var(--color-performance-ink-muted, #5f5f58);
  }

  .primary-action {
    width: fit-content;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.8rem 1.1rem;
    border: 1px solid var(--color-performance-ink, #090909);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    font-weight: 700;
    text-decoration: none;
  }

  .primary-action:hover {
    background: #252525;
  }

  .primary-action:focus-visible {
    outline: 3px solid var(--color-performance-signal, #315cff);
    outline-offset: 3px;
  }
</style>
