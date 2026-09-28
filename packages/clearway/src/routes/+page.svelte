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
    Footer,
    PublicHeader
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

<div class="clearway-public" data-canon-palette="operator">
  <PublicHeader onHome />
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
