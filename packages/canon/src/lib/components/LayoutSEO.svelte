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
    io: { color: '#000000' },
    space: { color: '#000000' },
    agency: { color: '#000000' },
    ltd: { color: '#000000' },
    lms: { color: '#000000' }
  };

  const config = $derived(propertyConfig[property]);
</script>

<svelte:head>
  <meta name="theme-color" content={config.color} />

  <!-- Favicons -->
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" href="/favicon.png" />

  <!-- Additional SEO -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta http-equiv="x-ua-compatible" content="IE=edge" />
</svelte:head>
