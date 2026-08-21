<script lang="ts">
  export let eyebrow = '';
  export let title = '';
  export let lede = '';
  export let sideLabel = '';
  export let sideValue = '';
  export let sideMeta = '';
</script>

<div class="report-shell property-performance">
  <header class="masthead">
    <div class="masthead-copy">
      {#if eyebrow}
        <p class="eyebrow">{eyebrow}</p>
      {/if}
      <div class="title-row">
        <h1>{title}</h1>
      </div>
      {#if lede}
        <p class="lede">{lede}</p>
      {/if}
    </div>

    <aside class="identity-note">
      {#if sideLabel}
        <div class="identity-label">{sideLabel}</div>
      {/if}
      {#if sideValue}
        <div class="identity-value">{sideValue}</div>
      {/if}
      {#if sideMeta}
        <div class="identity-meta">{sideMeta}</div>
      {/if}
      <slot name="aside" />
    </aside>
  </header>

  <section class="summary-strip">
    <slot name="summary" />
  </section>

  <div class="report-grid">
    <slot />
  </div>
</div>

<style>
  .report-shell {
    max-width: 1180px;
    margin: 0 auto;
    padding: 2.2rem 1.5rem 3.5rem;
  }

  .masthead {
    display: grid;
    grid-template-columns: minmax(0, 46rem) minmax(16rem, 20rem);
    gap: 2.25rem;
    align-items: start;
    margin-bottom: 1.5rem;
    padding-bottom: 1.1rem;
    border-bottom: 1px solid var(--color-performance-line);
  }

  .eyebrow,
  .identity-label {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-performance-muted);
  }

  .title-row {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  h1 {
    margin: 0 0 0.35rem;
    font-size: clamp(2.4rem, 5vw, 3.55rem);
    line-height: 0.94;
    letter-spacing: -0.04em;
  }

  .lede,
  .identity-meta {
    color: var(--color-performance-muted);
  }

  .lede {
    max-width: 38rem;
    line-height: 1.72;
    font-size: 0.98rem;
    margin: 0;
  }

  .identity-note {
    padding-top: 0.1rem;
    display: grid;
    gap: 0.45rem;
    align-content: start;
  }

  .identity-value {
    font-size: 1.1rem;
    font-weight: 550;
    word-break: break-word;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
  }

  .summary-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0;
    padding: 0.15rem 0 1.45rem;
    border-bottom: 1px solid var(--color-performance-line);
    margin-bottom: 1.3rem;
  }

  .report-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 2.25rem;
    row-gap: 1.5rem;
  }

  @media (max-width: 900px) {
    .report-shell {
      padding-inline: 1rem;
    }

    .masthead,
    .summary-strip,
    .report-grid {
      grid-template-columns: 1fr;
    }

    .masthead {
      gap: 1.25rem;
    }
  }
</style>
