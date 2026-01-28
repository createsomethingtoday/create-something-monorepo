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

  // Additional AEO schemas
  export let services: any[] = []; // Service schema for .agency
  export let faqItems: any[] = []; // FAQ schema for AEO
  export let breadcrumbs: any[] = []; // Breadcrumb schema
  export let reviews: any[] = []; // Review schema with ratings
  export let video: any = null; // VideoObject schema for video content
  export let course: any = null; // Course schema for educational content

  // Property-specific config
  export let propertyName: 'io' | 'space' | 'agency' | 'ltd' = 'space';

  const propertyConfig = {
    io: {
      domain: 'https://createsomething.io',
      name: 'CREATE SOMETHING',
      tagline: 'Systems Thinking for AI-Native Development - Research papers with tracked experiments and rigorous methodology',
      color: '#000000',
    },
    space: {
      domain: 'https://createsomething.space',
      name: 'CREATE SOMETHING SPACE',
      tagline: 'Interactive Tutorials for AI-Native Development - Learn by doing with runnable code examples',
      color: '#000000',
    },
    agency: {
      domain: 'https://createsomething.agency',
      name: 'CREATE SOMETHING Agency',
      tagline: 'Agentic Systems Engineering - AI automation workflows and autonomous systems that run businesses',
      color: '#000000',
    },
    ltd: {
      domain: 'https://createsomething.ltd',
      name: 'CREATE SOMETHING',
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
    name: 'CREATE SOMETHING',
    alternateName: 'Create Something Agency',
    url: config.domain,
    logo: `${config.domain}/favicon.png`,
    sameAs: [
      'https://www.linkedin.com/in/micahryanjohnson/',
      'https://github.com/createsomethingtoday'
    ],
    description: propertyName === 'agency'
      ? 'Agentic systems engineering consultancy building AI automation workflows and autonomous systems for businesses'
      : propertyName === 'io'
      ? 'Research papers on AI-native development with tracked experiments and rigorous methodology'
      : propertyName === 'space'
      ? 'Interactive tutorials for learning AI-native development by doing'
      : 'Design and technology practice',
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

  // Service schema (for .agency services page)
  const serviceSchemas = services.length > 0 ? services.map(service => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    provider: organizationSchema,
    serviceType: service.type || 'Professional Service',
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide'
    },
    ...(service.price && {
      offers: {
        '@type': 'Offer',
        price: service.price,
        priceCurrency: 'USD',
        description: service.priceDescription
      }
    })
  })) : [];

  // FAQ schema (for AEO)
  const faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  } : null;

  // Breadcrumb schema
  const breadcrumbSchema = breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  } : null;

  // AggregateRating schema (from reviews)
  const aggregateRatingSchema = reviews.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': ogType === 'article' ? 'Article' : 'Product',
    name: title,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1
    },
    review: reviews.map(review => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author
      },
      datePublished: review.date,
      reviewBody: review.content,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1
      }
    }))
  } : null;

  // VideoObject schema
  const videoSchema = video ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name || title,
    description: video.description || description,
    thumbnailUrl: video.thumbnail || fullOgImage,
    uploadDate: video.uploadDate,
    duration: video.duration, // ISO 8601 format (e.g., "PT1M30S")
    contentUrl: video.contentUrl,
    embedUrl: video.embedUrl,
    ...(video.transcript && { transcript: video.transcript })
  } : null;

  // Course schema
  const courseSchema = course ? {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name || title,
    description: course.description || description,
    provider: {
      '@type': 'Organization',
      name: config.name,
      url: config.domain
    },
    ...(course.instructor && {
      instructor: {
        '@type': 'Person',
        name: course.instructor
      }
    }),
    ...(course.datePublished && { datePublished: course.datePublished }),
    ...(course.hasCourseInstance && {
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: course.hasCourseInstance.courseMode || 'online',
        ...(course.hasCourseInstance.startDate && { startDate: course.hasCourseInstance.startDate }),
        ...(course.hasCourseInstance.endDate && { endDate: course.hasCourseInstance.endDate })
      }
    })
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

  <!-- Service Schemas -->
  {#each serviceSchemas as serviceSchema}
    <script type="application/ld+json">
      {JSON.stringify(serviceSchema)}
    </script>
  {/each}

  <!-- FAQ Schema -->
  {#if faqSchema}
    <script type="application/ld+json">
      {JSON.stringify(faqSchema)}
    </script>
  {/if}

  <!-- Breadcrumb Schema -->
  {#if breadcrumbSchema}
    <script type="application/ld+json">
      {JSON.stringify(breadcrumbSchema)}
    </script>
  {/if}

  <!-- AggregateRating Schema -->
  {#if aggregateRatingSchema}
    <script type="application/ld+json">
      {JSON.stringify(aggregateRatingSchema)}
    </script>
  {/if}

  <!-- VideoObject Schema -->
  {#if videoSchema}
    <script type="application/ld+json">
      {JSON.stringify(videoSchema)}
    </script>
  {/if}

  <!-- Course Schema -->
  {#if courseSchema}
    <script type="application/ld+json">
      {JSON.stringify(courseSchema)}
    </script>
  {/if}

  <!-- Additional SEO -->
  <link rel="icon" href="/favicon.png" type="image/png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <meta http-equiv="x-ua-compatible" content="IE=edge" />
</svelte:head>
