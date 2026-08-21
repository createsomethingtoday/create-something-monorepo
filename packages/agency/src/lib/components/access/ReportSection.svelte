<script lang="ts">
  export let title = '';
  export let description = '';
  export let href: string | null = null;
  export let actionLabel: string | null = null;
  export let fullWidth = false;
</script>

<section class:full-width={fullWidth} class="report-section">
  <div class:section-head-inline={href && actionLabel} class="section-head">
    <div>
      <h2>{title}</h2>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    {#if href && actionLabel}
      <a {href}>{actionLabel}</a>
    {/if}
  </div>

  <slot />
</section>

<style>
  .report-section {
    border-top: 1px solid var(--color-performance-line);
    padding-top: 0.9rem;
    min-width: 0;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .section-head {
    margin-bottom: 0.95rem;
  }

  .section-head-inline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  h2 {
    margin: 0 0 0.28rem;
    font-size: 1.02rem;
    line-height: 1.25;
  }

  p {
    margin: 0;
    line-height: 1.62;
    font-size: 0.92rem;
    color: var(--color-performance-muted);
    max-width: 38rem;
  }

  a {
    color: var(--color-performance-ink);
    text-decoration: underline;
    text-underline-offset: 0.18em;
    font-size: 0.82rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  @media (max-width: 700px) {
    .section-head-inline {
      display: grid;
    }
  }
</style>
