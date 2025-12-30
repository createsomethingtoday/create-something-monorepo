<script lang="ts">
  import { inview } from '$lib/actions/inview';
  import Button from '$lib/components/Button.svelte';
  import BottomCTA from '$lib/components/BottomCTA.svelte';

  // Location data with court type filters
  const locations = [
    {
      name: 'Grandview Park Tennis Center',
      address: '123 Maplewood Drive, Riverton',
      image: '/images/tennis-location-012x_1tennis-location-01@2x.avif',
      courtFilter: 'grandview'
    },
    {
      name: 'Oakridge Sports Complex',
      address: '456 Oakridge Lane, Brookfield',
      image: '/images/tennis-location-022x_1tennis-location-02@2x.avif',
      courtFilter: 'oakridge'
    },
    {
      name: 'Riverview Tennis Academy',
      address: '789 Pinecrest Avenue, Hillside',
      image: '/images/tennis-location-062x_1tennis-location-06@2x.avif',
      courtFilter: 'riverview'
    },
    {
      name: 'Pinecrest Court Club',
      address: '101 Grandview Road, Lakeshore',
      image: '/images/tennis-location-072x_1tennis-location-07@2x.avif',
      courtFilter: 'pinecrest'
    }
  ];

  // Modal state
  let modalOpen = $state(false);
  let selectedLocation = $state<typeof locations[0] | null>(null);

  function openModal(location: typeof locations[0]) {
    selectedLocation = location;
    modalOpen = true;
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOpen = false;
    selectedLocation = null;
    document.body.style.overflow = '';
  }

  // Close on escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && modalOpen) {
      closeModal();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Locations - The Stack Indoor Pickleball</title>
  <meta name="description" content="Find a Stack Indoor Pickleball location near you. World-class courts, state-of-the-art facilities, and a vibrant pickleball community." />
</svelte:head>

<!-- Hero Section -->
<section class="section is-location-hero" use:inview>
  <div class="container-large">
    <div class="margin-bottom-72">
      <div class="max-width-720">
        <div class="margin-bottom-16">
          <h1 class="heading-style-h1">
            <span class="is-word is-1">Our</span>
            <span class="is-word is-2">Locations</span>
          </h1>
        </div>
        <div class="margin-bottom-24">
          <p class="text-size-medium">
            <strong>Discover Your Perfect Court</strong> – Ready to elevate your pickleball game?
            Experience world-class coaching, state-of-the-art facilities, and a vibrant
            pickleball community. Enroll now and be part of a legacy of excellence.
          </p>
        </div>
        <Button href="/contact">Start today</Button>
      </div>
    </div>

    <ul class="locations_grid" use:inview>
      {#each locations as location}
        <li class="locations_card shadow-card">
          <img
            src={location.image}
            alt={location.name}
            loading="lazy"
            class="img-cover"
          />
          <div class="locations_card_overlay"></div>
          <div class="z-index-3 card-content">
            <div>
              <p class="heading-style-h3">{location.name}</p>
              <p class="location-address">{location.address}</p>
            </div>
            <Button onclick={() => openModal(location)}>Book a Court</Button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</section>

<!-- Booking Section -->
<section class="section is-booking" id="book" use:inview>
  <div class="container-large">
    <div class="booking-header">
      <h2 class="heading-style-h2">
        <span class="is-word is-1">Book</span>
        <span class="is-word is-2">A Court</span>
      </h2>
      <p class="text-size-medium">Select a time slot below to reserve your court.</p>
    </div>
    <div class="booking-widget">
      <iframe
        src="https://clearway.pages.dev/embed?facility=thestack&theme=dark"
        title="Book a Court"
        frameborder="0"
        scrolling="no"
        style="width: 100%; min-height: 600px; border: none; border-radius: 12px;"
      ></iframe>
    </div>
  </div>
</section>

<!-- Bottom CTA -->
<BottomCTA />

<!-- Booking Modal -->
{#if modalOpen && selectedLocation}
  <div class="modal-overlay" onclick={closeModal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <div>
          <h2 id="modal-title" class="modal-title">{selectedLocation.name}</h2>
          <p class="modal-subtitle">{selectedLocation.address}</p>
        </div>
        <button class="modal-close" onclick={closeModal} aria-label="Close modal">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <iframe
          src="https://clearway.pages.dev/embed?facility=thestack&theme=dark&court_type={selectedLocation.courtFilter}"
          title="Book a Court at {selectedLocation.name}"
          frameborder="0"
          scrolling="no"
          class="modal-iframe"
        ></iframe>
      </div>
    </div>
  </div>
{/if}

<style>
  .section.is-location-hero {
    padding-top: 10rem;
    padding-bottom: 6rem;
    background-color: var(--black);
  }

  .container-large {
    max-width: 82rem;
    margin-left: auto;
    margin-right: auto;
    padding-left: 2rem;
    padding-right: 2rem;
  }

  .margin-bottom-72 {
    margin-bottom: 4.5rem;
  }

  .max-width-720 {
    max-width: 45rem;
  }

  .margin-bottom-16 {
    margin-bottom: 1rem;
  }

  .margin-bottom-24 {
    margin-bottom: 1.5rem;
  }

  .heading-style-h1 {
    font-family: var(--font-coolvetica);
    font-size: clamp(4rem, 10vw, 11.25rem);
    line-height: 0.95;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--white);
    margin: 0;
  }

  .heading-style-h1 .is-word {
    display: inline-block;
    opacity: 0;
    transform: translateY(0.5em);
    animation: wordReveal 0.8s var(--ease-stack) forwards;
  }

  .heading-style-h1 .is-word.is-1 {
    animation-delay: 0.1s;
  }

  .heading-style-h1 .is-word.is-2 {
    animation-delay: 0.2s;
  }

  @keyframes wordReveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .text-size-medium {
    font-family: var(--font-satoshi);
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--light-grey);
  }

  .text-size-medium strong {
    color: var(--white);
  }

  /* Locations Grid */
  .locations_grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
    opacity: 0;
    transform: translateY(0.5em);
    animation: fadeUp 0.8s var(--ease-stack) 0.4s forwards;
  }

  @keyframes fadeUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .locations_card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 25rem;
    padding: 2rem;
    border-radius: var(--hero-video-radius);
    overflow: hidden;
  }

  .locations_card .img-cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  }

  .locations_card_overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, transparent 0%, rgba(8, 8, 8, 0.8) 100%);
    z-index: 2;
  }

  .z-index-3 {
    position: relative;
    z-index: 3;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 1.5rem;
    height: 100%;
  }

  .heading-style-h3 {
    font-family: var(--font-coolvetica);
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.1;
    text-transform: uppercase;
    color: var(--white);
    margin: 0 0 0.5rem;
  }

  .location-address {
    font-family: var(--font-satoshi);
    font-size: 1rem;
    color: var(--light-grey);
    margin: 0;
  }

  .shadow-card {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  /* Responsive */
  @media (max-width: 991px) {
    .section.is-location-hero {
      padding-top: 8rem;
    }
  }

  @media (max-width: 767px) {
    .locations_grid {
      grid-template-columns: 1fr;
    }

    .locations_card {
      min-height: 20rem;
    }
  }

  @media (max-width: 479px) {
    .section.is-location-hero {
      padding-top: 6rem;
      padding-bottom: 4rem;
    }

    .margin-bottom-72 {
      margin-bottom: 3rem;
    }
  }

  /* Booking Section */
  .section.is-booking {
    padding-top: 4rem;
    padding-bottom: 6rem;
    background-color: var(--dark-grey);
  }

  .booking-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .heading-style-h2 {
    font-family: var(--font-coolvetica);
    font-size: clamp(3rem, 8vw, 7rem);
    line-height: 0.95;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--white);
    margin: 0 0 1rem;
  }

  .heading-style-h2 .is-word {
    display: inline-block;
    opacity: 0;
    transform: translateY(0.5em);
    animation: wordReveal 0.8s var(--ease-stack) forwards;
  }

  .heading-style-h2 .is-word.is-1 {
    animation-delay: 0.1s;
  }

  .heading-style-h2 .is-word.is-2 {
    animation-delay: 0.2s;
  }

  .booking-widget {
    max-width: 900px;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    background: var(--black);
  }

  .booking-widget iframe {
    display: block;
  }

  /* Booking Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background: var(--dark-grey, #1a1a1a);
    border-radius: 1rem;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s var(--ease-stack, cubic-bezier(0.4, 0, 0.2, 1));
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-title {
    font-family: var(--font-coolvetica);
    font-size: clamp(1.5rem, 4vw, 2rem);
    text-transform: uppercase;
    color: var(--white);
    margin: 0 0 0.25rem;
    line-height: 1.1;
  }

  .modal-subtitle {
    font-family: var(--font-satoshi);
    font-size: 0.875rem;
    color: var(--light-grey);
    margin: 0;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: var(--light-grey);
    cursor: pointer;
    padding: 0.5rem;
    margin: -0.5rem -0.5rem 0 0;
    border-radius: 0.5rem;
    transition: color 0.2s ease, background 0.2s ease;
  }

  .modal-close:hover {
    color: var(--white);
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  .modal-iframe {
    width: 100%;
    min-height: 500px;
    height: 60vh;
    border: none;
  }

  @media (max-width: 767px) {
    .modal-content {
      max-height: 95vh;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-iframe {
      min-height: 400px;
      height: 70vh;
    }
  }
</style>
