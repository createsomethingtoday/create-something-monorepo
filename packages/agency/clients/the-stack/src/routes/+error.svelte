<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Page Not Found - The Stack Indoor Pickleball</title>
</svelte:head>

<div class="utility-page-wrap">
  <a href="/" class="utility_nav">
    <img
      src="/images/logo.png"
      alt="The Stack Indoor Pickleball"
      class="nav_logo-img"
    />
  </a>

  <div class="utility-page-content">
    <div class="utility-page-inner">
      <div class="flex-center">
        <h2 class="heading-style-h2 margin-bottom-16">
          {$page.status === 404 ? 'Page Not Found' : 'Something went wrong'}
        </h2>
        <div class="max-width-250">
          <p class="text-size-regular">
            {#if $page.status === 404}
              The page you are looking for doesn't exist or has been moved
            {:else}
              {$page.error?.message ?? 'An unexpected error occurred'}
            {/if}
          </p>
        </div>
      </div>
      <a href="/" class="button">Back to homepage</a>
    </div>
  </div>

  <div class="utility_footer">
    <div class="opacity-60">
      <p class="text-size-small">© 2025 The Stack Indoor Pickleball. All rights reserved.</p>
    </div>
  </div>
</div>

<style>
  .utility-page-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--black);
    padding: 2rem;
  }

  .utility_nav {
    position: absolute;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    text-decoration: none;
  }

  .nav_logo-img {
    height: 3rem;
    width: auto;
    filter: invert(1);
  }

  .utility-page-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
  }

  .utility-page-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    text-align: center;
  }

  .flex-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .heading-style-h2 {
    font-family: var(--font-coolvetica);
    font-size: clamp(2rem, 5vw, 3.5rem);
    line-height: 1.1;
    text-transform: uppercase;
    color: var(--white);
    margin: 0;
  }

  .margin-bottom-16 {
    margin-bottom: 1rem;
  }

  .max-width-250 {
    max-width: 15.625rem;
  }

  .text-size-regular {
    font-family: var(--font-satoshi);
    font-size: 1rem;
    line-height: 1.6;
    color: var(--light-grey);
    margin: 0;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: var(--font-satoshi);
    font-size: 1rem;
    font-weight: 500;
    color: var(--black);
    text-decoration: none;
    background-color: var(--white);
    border: none;
    border-radius: var(--button-radius);
    padding: 1rem 2rem;
    cursor: pointer;
    transition: transform 0.3s var(--ease-stack), background-color 0.3s var(--ease-stack);
  }

  .button:hover {
    transform: scale(1.02);
  }

  .utility_footer {
    padding: 2rem 0;
  }

  .opacity-60 {
    opacity: 0.6;
  }

  .text-size-small {
    font-family: var(--font-satoshi);
    font-size: 0.875rem;
    color: var(--light-grey);
    margin: 0;
  }
</style>
