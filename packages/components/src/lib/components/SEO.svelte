<script lang="ts">
  /**
   * SEO & AEO Component
   *
   * Comprehensive SEO (Search Engine Optimization) and AEO (Answer Engine Optimization)
   * for Create Something properties. Implements:
   * - Meta tags (title, description, keywords)
   * - Open Graph (Facebook, LinkedIn)
   * - Twitter Cards
   * - Schema.org JSON-LD (Organization, WebSite, BreadcrumbList)
   * - Canonical URLs
   * - Robots directives
   */

  export let title: string;
  export let description: string;
  export let keywords: string = '';
  export let canonical: string = '';
  export let ogImage: string = '/og-image.png';
  export let ogType: 'website' | 'article' | 'profile' = 'website';
  export let twitterCard: 'summary' | 'summary_large_image' = 'summary_large_image';
  export let author: string = 'Create Something';
  export let publishedTime: string = '';
  export let modifiedTime: string = '';
  export let articleSection: string = '';
  export let articleTags: string[] = [];
  export let noindex: boolean = false;
  export let nofollow: boolean = false;

  // Property-specific config
  export let propertyName: 'io' | 'space' | 'agency' | 'ltd' = 'space';

  const propertyConfig = {
    io: {
      domain: 'https://createsomething.io',
      name: 'Create Something Research',
      tagline: 'Interactive papers on design, technology, and creativity',
      color: '#000000',
    },
    space: {
      domain: 'https://createsomething.space',
      name: 'Create Something Practice',
      tagline: 'Live experiments in design and development',
      color: '#000000',
    },
    agency: {
      domain: 'https://createsomething.agency',
      name: 'Create Something Agency',
      tagline: 'Design services for the digital age',
      color: '#000000',
    },
    ltd: {
      domain: 'https://createsomething.ltd',
      name: 'Create Something',
      tagline: 'Weniger, aber besser',
      color: '#000000',
    }
  };

  const config = propertyConfig[propertyName];
  const fullTitle = title ? `${title} | ${config.name}` : config.name;
  const fullDescription = description || config.tagline;
  const canonicalUrl = canonical || `${config.domain}${typeof window !== 'undefined' ? window.location.pathname : ''}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${config.domain}${ogImage}`;

  // Schema.org Organization
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Create Something',
    url: 'https://createsomething.ltd',
    logo: 'https://createsomething.ltd/favicon.png',
    sameAs: [
      // Add social media profiles here
    ],
    description: 'Design practice following Dieter Rams principles',
    founder: {
      '@type': 'Person',
      name: 'Micah Johnson'
    },
    knowsAbout: [
      'Design Systems',
      'Interactive Media',
      'Computational Design',
      'Minimalism',
      'Dieter Rams'
    ]
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

  // Article schema (if applicable)
  const articleSchema = ogType === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: fullOgImage,
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    author: {
      '@type': 'Organization',
      name: author
    },
    publisher: organizationSchema,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    },
    articleSection: articleSection,
    keywords: articleTags.join(', ')
  } : null;

  // Robots directive
  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow ? 'nofollow' : 'follow'
  ].join(', ');
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>{fullTitle}</title>
  <meta name="title" content={fullTitle} />
  <meta name="description" content={fullDescription} />
  {#if keywords}
    <meta name="keywords" content={keywords} />
  {/if}
  <meta name="robots" content={robotsContent} />
  <meta name="author" content={author} />
  <meta name="theme-color" content={config.color} />

  <!-- Canonical URL -->
  <link rel="canonical" href={canonicalUrl} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content={ogType} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={fullDescription} />
  <meta property="og:image" content={fullOgImage} />
  <meta property="og:site_name" content={config.name} />
  {#if ogType === 'article'}
    {#if publishedTime}
      <meta property="article:published_time" content={publishedTime} />
    {/if}
    {#if modifiedTime}
      <meta property="article:modified_time" content={modifiedTime} />
    {/if}
    {#if articleSection}
      <meta property="article:section" content={articleSection} />
    {/if}
    {#each articleTags as tag}
      <meta property="article:tag" content={tag} />
    {/each}
  {/if}

  <!-- Twitter -->
  <meta property="twitter:card" content={twitterCard} />
  <meta property="twitter:url" content={canonicalUrl} />
  <meta property="twitter:title" content={fullTitle} />
  <meta property="twitter:description" content={fullDescription} />
  <meta property="twitter:image" content={fullOgImage} />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
    {JSON.stringify(organizationSchema)}
  </script>
  <script type="application/ld+json">
    {JSON.stringify(websiteSchema)}
  </script>
  {#if articleSchema}
    <script type="application/ld+json">
      {JSON.stringify(articleSchema)}
    </script>
  {/if}

  <!-- Additional SEO -->
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
</svelte:head>
