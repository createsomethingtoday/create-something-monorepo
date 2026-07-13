<script lang="ts">
  interface Props {
    status: number;
    propertyLabel: string;
    errorMessage?: string | null;
    title?: string;
    description?: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  }

  let {
    status,
    propertyLabel,
    errorMessage,
    title,
    description,
    primaryLabel,
    primaryHref,
    secondaryLabel = 'Return home',
    secondaryHref = '/'
  }: Props = $props();

  const fallbackTitle = $derived(
    status === 404
      ? 'This route is not published.'
      : status === 503
        ? 'This route is temporarily unavailable.'
        : 'This route needs attention.'
  );

  const fallbackDescription = $derived(
    status === 404
      ? 'The page may have moved, or the work may now live on another CREATE SOMETHING property.'
      : status === 503
        ? 'The service is not ready to answer this request. Try the primary path or come back shortly.'
        : 'The request did not resolve cleanly. Use the primary path below to continue from a stable surface.'
  );

  const visibleTitle = $derived(title || fallbackTitle);
  const visibleDescription = $derived(description || fallbackDescription);
</script>

<section class="clear-error-page" aria-labelledby="clear-error-title">
  <div class="clear-error-page__inner">
    <div class="clear-error-page__copy">
      <span class="clear-error-page__kicker">{propertyLabel} / {status}</span>
      <h1 id="clear-error-title">{visibleTitle}</h1>
      <p>{visibleDescription}</p>
      <div class="clear-error-page__actions" aria-label="Error recovery actions">
        <a class="clear-error-page__button clear-error-page__button--primary" href={primaryHref}>
          {primaryLabel}
        </a>
        <a
          class="clear-error-page__button clear-error-page__button--secondary"
          href={secondaryHref}
        >
          {secondaryLabel}
        </a>
      </div>
    </div>

    <aside class="clear-error-page__panel" aria-label="Route status">
      <span>Current state</span>
      <strong>{status}</strong>
      <p>{status === 404 ? 'Not found' : status === 503 ? 'Unavailable' : 'Request failed'}</p>
    </aside>
  </div>
</section>

<style>
  .clear-error-page {
    min-height: max(36rem, calc(100vh - 10rem));
    display: grid;
    align-items: center;
    color: var(--color-performance-ink, #090909);
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 4.25rem 4.25rem,
      linear-gradient(180deg, var(--color-performance-panel, #ffffff) 0%, #fbfbfb 100%);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    padding-block: clamp(4rem, 9vw, 7rem);
  }

  .clear-error-page__inner {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.36fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: center;
  }

  .clear-error-page__copy {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
  }

  .clear-error-page__kicker {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 1.9rem;
    align-items: center;
    padding: 0.36rem 0.62rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.76rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .clear-error-page h1 {
    margin: 0;
    max-width: 12ch;
    color: var(--color-performance-ink, #090909);
    font-size: clamp(3.2rem, 8vw, 5.45rem);
    font-weight: var(--font-performance-medium);
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .clear-error-page p {
    margin: 0;
    max-width: 41rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1.08rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .clear-error-page__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.35rem;
  }

  .clear-error-page__button {
    display: inline-flex;
    min-height: 2.8rem;
    align-items: center;
    justify-content: center;
    padding: 0.72rem 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.1;
    text-decoration: none;
    transition:
      background var(--duration-performance-micro) var(--ease-performance-standard),
      border-color var(--duration-performance-micro) var(--ease-performance-standard),
      color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .clear-error-page__button--primary {
    border-color: var(--color-performance-ink, #090909);
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #ffffff);
  }

  .clear-error-page__button--primary:hover {
    border-color: var(--color-performance-signal, #315cff);
    background: var(--color-performance-signal, #315cff);
  }

  .clear-error-page__button--secondary {
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .clear-error-page__button--secondary:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .clear-error-page__button:focus-visible {
    outline: 2px solid var(--color-performance-signal, #315cff);
    outline-offset: 3px;
  }

  .clear-error-page__panel {
    display: grid;
    gap: 0.7rem;
    min-height: 16rem;
    align-content: end;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .clear-error-page__panel span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.76rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .clear-error-page__panel strong {
    color: var(--color-performance-ink, #090909);
    font-size: clamp(4rem, 11vw, 7.5rem);
    font-weight: var(--font-performance-medium);
    line-height: 0.9;
  }

  .clear-error-page__panel p {
    font-size: 0.96rem;
  }

  @media (max-width: 760px) {
    .clear-error-page {
      min-height: max(34rem, calc(100vh - 7rem));
      padding-block: 3.5rem;
    }

    .clear-error-page__inner {
      grid-template-columns: 1fr;
      width: min(100% - 1.25rem, var(--content-width-performance, 85rem));
    }

    .clear-error-page__panel {
      min-height: auto;
      align-content: start;
    }

    .clear-error-page__actions,
    .clear-error-page__button {
      width: 100%;
    }
  }
</style>
