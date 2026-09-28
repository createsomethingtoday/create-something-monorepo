<script lang="ts">
  let { onHome = false }: { onHome?: boolean } = $props();
  const prefix = $derived(onHome ? '' : '/');
</script>

<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
  <a class="brand" href="/" aria-label="CLEARWAY home">CLEARWAY</a>
  <nav aria-label="Public navigation">
    <a href={`${prefix}#showcase`}>Product</a>
    <a href={`${prefix}#pricing`}>Pricing</a>
    <a href={`${prefix}#request-demo`}>Request a Demo</a>
    <a href="/docs" aria-current={onHome ? undefined : 'page'}>Documentation</a>
  </nav>
</header>

<style>
  .site-header {
    max-width: 72rem;
    margin-inline: auto;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-bg-pure);
  }
  .brand {
    color: var(--color-fg-primary);
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-decoration: none;
  }
  nav {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  nav a {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0.4rem 0.65rem;
    border-radius: var(--radius-sm);
    color: var(--color-fg-secondary);
    font-size: 0.875rem;
    text-decoration: none;
  }
  nav a:hover,
  nav a[aria-current='page'] {
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }
  .skip-link {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    z-index: 100;
    padding: 0.65rem 0.9rem;
    border-radius: var(--radius-sm);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    transform: translateY(-200%);
  }
  .skip-link:focus { transform: none; }
  @media (max-width: 640px) {
    .site-header { align-items: flex-start; flex-direction: column; }
    nav { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    nav a { min-height: 36px; padding: 0.25rem 0.5rem; }
  }
</style>
