<script lang="ts">
  import { inview } from '$lib/actions/inview';
  import Button from '$lib/components/Button.svelte';
  import BottomCTA from '$lib/components/BottomCTA.svelte';

  const locations = [
    {
      name: 'Grandview Park Tennis Center',
      address: '123 Maplewood Drive, Riverton',
      image: '/images/tennis-location-012x_1tennis-location-01@2x.avif'
    },
    {
      name: 'Oakridge Sports Complex',
      address: '456 Oakridge Lane, Brookfield',
      image: '/images/tennis-location-022x_1tennis-location-02@2x.avif'
    },
    {
      name: 'Riverview Tennis Academy',
      address: '789 Pinecrest Avenue, Hillside',
      image: '/images/tennis-location-062x_1tennis-location-06@2x.avif'
    },
    {
      name: 'Pinecrest Court Club',
      address: '101 Grandview Road, Lakeshore',
      image: '/images/tennis-location-072x_1tennis-location-07@2x.avif'
    }
  ];
</script>

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
          <div class="z-index-3">
            <p class="heading-style-h3">{location.name}</p>
            <p>{location.address}</p>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</section>

<!-- Bottom CTA -->
<BottomCTA />

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

  .heading-style-h3 {
    font-family: var(--font-coolvetica);
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.1;
    text-transform: uppercase;
    color: var(--white);
    margin: 0 0 0.5rem;
  }

  .z-index-3 p:not(.heading-style-h3) {
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
</style>
