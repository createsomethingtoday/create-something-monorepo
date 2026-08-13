<script lang="ts">
  /**
   * Layout SEO Component
   *
   * Site-wide browser metadata for CREATE SOMETHING properties.
   *
   * Page identity belongs to the route-level <SEO> component. SvelteKit does
   * not replace repeated canonical, robots, Open Graph, or JSON-LD elements
   * across nested components, so emitting defaults here creates conflicting
   * search directives on every child route.
   *
   * Philosophy: SEO infrastructure recedes into transparent use.
   * The tool disappears—developers work with property name, not meta mechanics.
   */

  interface Props {
    property: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
  }

  let { property }: Props = $props();

  const propertyConfig = {
    io: { color: '#000000', hasCompleteIdentityAssets: true },
    space: { color: '#000000', hasCompleteIdentityAssets: true },
    agency: { color: '#000000', hasCompleteIdentityAssets: true },
    ltd: { color: '#000000', hasCompleteIdentityAssets: true },
    // LMS is not part of the public-property asset release. Keep its existing
    // served SVG link rather than advertising files it does not own.
    lms: { color: '#000000', hasCompleteIdentityAssets: false }
  };

  const config = $derived(propertyConfig[property]);
</script>

<svelte:head>
  <meta name="theme-color" content={config.color} />

  <!-- Favicons -->
  {#if config.hasCompleteIdentityAssets}
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
    <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    <link rel="mask-icon" href="/mask-icon.svg" color={config.color} />
  {:else}
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
  {/if}

  <!-- Additional SEO -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta http-equiv="x-ua-compatible" content="IE=edge" />
</svelte:head>
