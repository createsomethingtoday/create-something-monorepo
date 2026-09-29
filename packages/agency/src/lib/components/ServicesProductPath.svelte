<script lang="ts">
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';
  import AgencyWayfindingSign from './AgencyWayfindingSign.svelte';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const mapProduct = getPublicProduct('map');
  const buildProduct = getPublicProduct('build');
  const controlProduct = getPublicProduct('control');

  const stages = [
    {
      id: 'map',
      product: mapProduct,
      role: 'Define the workflow',
      model: `${PUBLIC_PRICING.map.publicStarterLabel} · ${PUBLIC_PRICING.map.workspaceLabel}`,
      href: mapProduct.route,
      linkLabel: 'Explore Map'
    },
    {
      id: 'build',
      product: buildProduct,
      role: 'Build and test the agent',
      model: 'Scoped implementation',
      href: agencyCoreMessaging.agentFoundationHref,
      linkLabel: 'Explore Agent Foundation'
    },
    {
      id: 'control',
      product: controlProduct,
      role: 'Keep the live system working',
      model: `Managed AI Operations · ${PUBLIC_PRICING.managedControl.label} · includes Map`,
      href: controlProduct.route,
      linkLabel: 'Explore Control'
    }
  ] as const;
</script>

<section id="service-paths" class="product-path" aria-labelledby="services-product-path-title">
  <div class="product-path__heading">
    <div>
      <p class="product-path__eyebrow">Choose where to start</p>
      <h2 id="services-product-path-title">Choose the help you need.</h2>
    </div>
    <p class="product-path__description">
      Map helps you plan the work. Build creates a system your team owns. After launch, Control provides Managed AI Operations {PUBLIC_PRICING.managedControl.label.toLowerCase()} for a
      standard-risk environment. Control includes Map. New workflows and integrations are quoted separately through Build.
      The supported public source distribution is {PUBLIC_PRICING.publicSource.label}.
    </p>
  </div>

  <p class="product-path__choice-note">Choose the support you need. These are separate options; Control includes Map.</p>
  <ul class="product-path__stages" aria-label="Map, Build, and Control options">
    {#each stages as stage}
      <li data-product-stage={stage.id}>
        <AgencyWayfindingSign kind={stage.id} label={stage.id === 'build' ? 'Agent Foundation' : stage.product.shortName} href={stage.href} card heading>
          <p class="product-path__model">{stage.model}</p>
          <strong>{stage.role}</strong>
          <p class="product-path__outcome">{stage.product.outcome}</p>
          <span class="product-path__action">{stage.linkLabel}</span>
        </AgencyWayfindingSign>
      </li>
    {/each}
  </ul>
</section>

<style>
  .product-path {
    scroll-margin-top: 6rem;
    padding: clamp(4rem, 8vw, 7.5rem) clamp(1.25rem, 5vw, 6rem) clamp(2rem, 5vw, 4rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .product-path__choice-note,
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
    gap: var(--space-performance-sm);
    padding: 0;
    list-style: none;
  }

  li { min-width: 0; background: var(--color-performance-panel); }
  .product-path__choice-note { font-size: var(--text-performance-caption); line-height: 1.5; margin-bottom: var(--space-performance-md); }
  #services-product-path-title { scroll-margin-top: 6rem; }
  .product-path__model { margin-block: var(--space-performance-sm); }
  .product-path__action { display: block; margin-top: var(--space-performance-md); text-decoration: underline; text-underline-offset: .25em; font-size: var(--text-performance-caption); }

  strong {
    max-width: 24ch;
    font-size: 1rem;
    line-height: 1.3;
  }

  .product-path__outcome {
    margin-block: var(--space-performance-sm);
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.5;
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

  }
</style>
