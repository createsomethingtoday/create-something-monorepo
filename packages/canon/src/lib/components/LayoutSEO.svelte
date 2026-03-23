<script lang="ts">
  /**
   * Layout SEO Component
   *
   * Root layout head primitives shared across CREATE SOMETHING properties.
   * Page-level <SEO> owns canonical/title/description/OG/Twitter/schema output.
   *
   * Philosophy: keep global document chrome here, keep page semantics with the page.
   */

  interface Props {
    property: 'io' | 'space' | 'agency' | 'ltd' | 'lms';
  }

  let { property }: Props = $props();
</script>

<svelte:head>
  <!-- Favicons -->
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" href="/favicon.png" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&display=swap"
    rel="stylesheet"
  />

  <!-- Additional SEO -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta http-equiv="x-ua-compatible" content="IE=edge" />
</svelte:head>
