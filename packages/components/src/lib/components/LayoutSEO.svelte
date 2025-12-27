<script lang="ts">
  /**
   * Layout SEO Component
   *
   * Root layout SEO for CREATE SOMETHING properties.
   * Handles property-specific defaults, JSON-LD schemas, and static meta.
   * Can be overridden by page-level <SEO> component via SvelteKit head merging.
   *
   * Philosophy: SEO infrastructure recedes into transparent use.
   * The tool disappears—developers work with property name, not meta mechanics.
   */

  interface Props {
    property: 'io' | 'space' | 'agency' | 'ltd';
  }

  let { property }: Props = $props();

  const propertyConfig = {
    io: {
      domain: 'https://createsomething.io',
      name: 'CREATE SOMETHING',
      tagline: 'Systems Thinking for AI-Native Development - Research papers with tracked experiments and rigorous methodology',
      description: 'Research papers on AI-native development with tracked experiments and rigorous methodology. Covering Claude Code, agentic systems, and systematic approaches to building with AI.',
      color: '#000000',
    },
    space: {
      domain: 'https://createsomething.space',
      name: 'CREATE SOMETHING SPACE',
      tagline: 'Interactive Tutorials for AI-Native Development - Learn by doing with runnable code examples',
      description: 'Interactive tutorials for learning AI-native development by doing. Hands-on guides for Claude Code, Cloudflare Workers, SvelteKit, and modern web development.',
      color: '#000000',
    },
    agency: {
      domain: 'https://createsomething.agency',
      name: 'CREATE SOMETHING Agency',
      tagline: 'Agentic Systems Engineering - AI automation workflows and autonomous systems that run businesses',
      description: 'Agentic systems engineering consultancy building AI automation workflows and autonomous systems for businesses. Expert integration of Claude, Cloudflare, and modern web technologies.',
      color: '#000000',
    },
    ltd: {
      domain: 'https://createsomething.ltd',
      name: 'CREATE SOMETHING',
      tagline: 'Weniger, aber besser',
      description: 'The philosophical foundation for the Create Something ecosystem. Curated wisdom from masters who embody "less, but better."',
      color: '#000000',
    }
  };

  const config = propertyConfig[property];

  // Schema.org Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CREATE SOMETHING',
    alternateName: 'Create Something Agency',
    url: config.domain,
    logo: `${config.domain}/favicon.png`,
    sameAs: [
      'https://www.linkedin.com/in/micahryanjohnson/',
      'https://github.com/createsomethingtoday'
    ],
    description: config.description,
    founder: {
      '@type': 'Person',
      name: 'Micah Johnson',
      jobTitle: 'Systems Architect',
      sameAs: 'https://www.linkedin.com/in/micahryanjohnson/'
    },
    knowsAbout: [
      'Agentic Systems Engineering',
      'AI-Native Development',
      'Claude Code',
      'Cloudflare Workers',
      'Automation Systems',
      'Autonomous AI Agents',
      'Systems Thinking'
    ],
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide'
    }
  };

  // Schema.org WebSite
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    url: config.domain,
    description: config.tagline,
    publisher: organizationSchema,
    inLanguage: 'en-US'
  };

  // Pre-stringify for {@html} rendering
  const orgSchemaJson = JSON.stringify(organizationSchema);
  const webSchemaJson = JSON.stringify(websiteSchema);
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>{config.name}</title>
  <meta name="title" content={config.name} />
  <meta name="description" content={config.description} />
  <meta name="robots" content="index, follow" />
  <meta name="author" content="Create Something" />
  <meta name="theme-color" content={config.color} />

  <!-- Canonical URL -->
  <link rel="canonical" href={config.domain} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content={config.domain} />
  <meta property="og:title" content={config.name} />
  <meta property="og:description" content={config.description} />
  <meta property="og:image" content={`${config.domain}/og-image.svg`} />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content={config.name} />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={config.domain} />
  <meta name="twitter:title" content={config.name} />
  <meta name="twitter:description" content={config.description} />
  <meta name="twitter:image" content={`${config.domain}/og-image.svg`} />
  <meta name="twitter:creator" content="@micahryanjohnson" />

  <!-- Schema.org JSON-LD -->
  {@html '<script type="application/ld+json">' + orgSchemaJson + '</script>'}
  {@html '<script type="application/ld+json">' + webSchemaJson + '</script>'}

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
