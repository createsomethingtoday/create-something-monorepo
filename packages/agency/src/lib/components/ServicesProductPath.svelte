<script lang="ts">
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';

  const mapProduct = getPublicProduct('map');
  const buildProduct = getPublicProduct('build');
  const controlProduct = getPublicProduct('control');

  const stages = [
    {
      id: 'map',
      number: '01',
      product: mapProduct,
      role: 'Define the workflow',
      model: 'Standalone subscription',
      href: mapProduct.route,
      linkLabel: 'Explore Map'
    },
    {
      id: 'build',
      number: '02',
      product: buildProduct,
      role: 'Build the owned system',
      model: 'Scoped implementation',
      href: agencyCoreMessaging.servicesMappingSessionHref,
      linkLabel: 'Discuss a Build'
    },
    {
      id: 'control',
      number: '03',
      product: controlProduct,
      role: 'Operate with approvals and proof',
      model: 'Standalone subscription · includes Map',
      href: controlProduct.route,
      linkLabel: 'Explore Control'
    }
  ] as const;
</script>

<section class="product-path" aria-labelledby="services-product-path-title">
  <div class="product-path__heading">
    <div>
      <p class="product-path__eyebrow">Product and service path</p>
      <h2 id="services-product-path-title">From mapped workflow to governed operation.</h2>
    </div>
    <p class="product-path__description">
      Map and Control stand on their own. Build is the implementation service between them when a
      team wants CREATE SOMETHING to turn an approved definition into an owned system. Control
      includes Map.
    </p>
  </div>

  <ol class="product-path__stages" aria-label="Map, Build, and Control path">
    {#each stages as stage}
      <li data-product-stage={stage.id}>
        <div class="product-path__index" aria-hidden="true">
          <span>{stage.number}</span>
          <i></i>
        </div>
        <p class="product-path__model">{stage.model}</p>
        <h3>{stage.product.shortName}</h3>
        <strong>{stage.role}</strong>
        <p class="product-path__outcome">{stage.product.outcome}</p>
        <a href={stage.href}>{stage.linkLabel}<span aria-hidden="true">↗</span></a>
      </li>
    {/each}
  </ol>
</section>

<style>
  .product-path {
    padding: clamp(4rem, 8vw, 7.5rem) clamp(1.25rem, 5vw, 6rem) clamp(2rem, 5vw, 4rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .product-path__heading,
  .product-path__stages {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
  }

  .product-path__heading {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
    align-items: end;
    gap: clamp(2rem, 6vw, 7rem);
    margin-bottom: clamp(2.75rem, 6vw, 5rem);
  }

  .product-path__eyebrow,
  .product-path__model {
    margin: 0;
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 15ch;
    margin: 0.7rem 0 0;
    font-size: clamp(2.6rem, 5.4vw, 5.4rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.055em;
    line-height: 0.94;
  }

  .product-path__description {
    max-width: 40rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: clamp(1rem, 1.35vw, 1.2rem);
    line-height: 1.55;
  }

  .product-path__stages {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
    list-style: none;
  }

  li {
    display: grid;
    grid-template-rows: auto auto auto auto 1fr auto;
    gap: 0.85rem;
    min-width: 0;
    padding: clamp(1.25rem, 2.5vw, 2rem);
    background: var(--color-performance-panel, #ffffff);
  }

  .product-path__index {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.6rem;
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.75rem;
  }

  .product-path__index i {
    position: relative;
    height: 1px;
    background: var(--color-performance-line-strong, #a7a7a2);
  }

  li:not(:last-child) .product-path__index i::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -0.15rem;
    width: 0.45rem;
    height: 0.45rem;
    border-top: 1px solid currentColor;
    border-right: 1px solid currentColor;
    transform: translateY(-50%) rotate(45deg);
  }

  h3 {
    margin: 0;
    font-size: clamp(2rem, 3.2vw, 3.4rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.045em;
    line-height: 1;
  }

  strong {
    max-width: 24ch;
    font-size: 1rem;
    line-height: 1.3;
  }

  .product-path__outcome {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  a {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    color: inherit;
    font-size: 0.82rem;
    font-weight: var(--font-performance-semibold, 650);
    text-decoration: none;
  }

  a:hover,
  a:focus-visible {
    color: var(--color-performance-signal, #0f62fe);
  }

  @media (max-width: 48rem) {
    .product-path {
      padding-block: 3.5rem 2rem;
    }

    .product-path__heading {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    h2 {
      font-size: clamp(2.55rem, 13vw, 4.2rem);
    }

    .product-path__stages {
      grid-template-columns: 1fr;
    }

    li {
      grid-template-columns: 2.3rem 1fr;
      grid-template-rows: repeat(5, auto);
      column-gap: 1rem;
    }

    .product-path__index {
      grid-row: 1 / -1;
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      justify-items: center;
      margin: 0;
    }

    .product-path__index i {
      width: 1px;
      height: 100%;
      min-height: 8rem;
    }

    li:not(:last-child) .product-path__index i::after {
      top: auto;
      right: auto;
      bottom: -0.1rem;
      left: 50%;
      transform: translateX(-50%) rotate(135deg);
    }

    .product-path__model,
    h3,
    strong,
    .product-path__outcome,
    a {
      grid-column: 2;
    }
  }
</style>
