<script lang="ts">
  // CLEARWAY Landing Page
  // The infrastructure disappears; courts get booked.

  import {
    HeroSection,
    StackShowcase,
    ValueGrid,
    PhilosophySection,
    PricingSection,
    ProgressiveForm,
    Footer
  } from '$lib/components/landing';
</script>

<svelte:head>
  <title>CLEARWAY - When Scheduling Works, You Forget It Exists</title>
  <meta
    name="description"
    content="CLEARWAY doesn't automate court booking. It removes the need to think about it. AI-powered scheduling that recedes into invisibility."
  />
  <meta property="og:title" content="CLEARWAY - When Scheduling Works, You Forget It Exists" />
  <meta property="og:description" content="When scheduling works, you forget it exists." />
  <meta property="og:type" content="website" />
</svelte:head>

<div class="clearway-public">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="CLEARWAY home">CLEARWAY</a>
    <nav aria-label="On this page">
      <a href="#showcase">Product</a>
      <a href="#pricing">Pricing</a>
      <a href="#request-demo">Request a Demo</a>
    </nav>
  </header>
  <main id="main-content" tabindex="-1">
    <HeroSection />
    <StackShowcase />
    <ValueGrid />
    <PhilosophySection />
    <PricingSection />
    <div id="request-demo"><ProgressiveForm /></div>
  </main>
  <Footer />
</div>

<style>
  .clearway-public {
    --radius-md: var(--radius-performance-sm);
    --radius-lg: var(--radius-performance-md);
    --space-2xl: clamp(3rem, 6vw, 5rem);
    --color-focus: var(--color-fg-primary);
  }
  .site-header {
    max-width: 72rem;
    margin-inline: auto;
    padding: var(--space-sm) var(--space-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-lg);
    border-bottom: 1px solid var(--color-border-default);
  }
  .brand {
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-md);
  }
  .site-header a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    text-decoration: none;
  }
  .site-header a:hover {
    color: var(--color-fg-primary);
    text-decoration: underline;
    text-underline-offset: 0.25em;
  }
  .skip-link {
    position: absolute;
    top: var(--space-xs);
    left: var(--space-xs);
    z-index: 100;
    padding: var(--space-sm);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    transform: translateY(-200%);
  }
  .skip-link:focus {
    transform: none;
  }
  .clearway-public :global(#showcase),
  .clearway-public :global(#pricing),
  #request-demo {
    scroll-margin-top: var(--space-md);
  }
  .clearway-public :global(:focus-visible) {
    outline: 2px solid var(--color-focus);
    outline-offset: 4px;
  }
</style>
