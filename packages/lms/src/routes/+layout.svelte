<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onNavigate } from '$app/navigation';
  import { Navigation, Footer, ModeIndicator } from '@create-something/components';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // View Transitions API - Hermeneutic Navigation
  // .learn: Educational (300ms)
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  const navLinks = [
    { label: 'Paths', href: '/paths' },
    { label: 'Praxis', href: '/praxis' },
    { label: 'Progress', href: '/progress' }
  ];
</script>

<svelte:head>
  <title>CREATE SOMETHING LMS | Learn the Ethos</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Primary Meta Tags -->
  <meta name="description" content="Learn the CREATE SOMETHING ethos through practice. Six learning paths teaching the Subtractive Triad, Canon design system, and AI-native development patterns." />
  <meta name="keywords" content="AI development education, Claude Code learning, Subtractive Triad, Canon design system, AI-native patterns, development philosophy, learn by doing, hermeneutic learning" />
  <meta name="author" content="Micah Johnson" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="googlebot" content="index, follow" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://learn.createsomething.space" />
  <meta property="og:title" content="CREATE SOMETHING LMS | Learn the Ethos" />
  <meta property="og:description" content="Learn the CREATE SOMETHING ethos through practice. Six learning paths teaching the Subtractive Triad, Canon design system, and AI-native development patterns." />
  <meta property="og:image" content="https://learn.createsomething.space/og-image.svg" />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="CREATE SOMETHING LMS" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://learn.createsomething.space" />
  <meta name="twitter:title" content="CREATE SOMETHING LMS | Learn the Ethos" />
  <meta name="twitter:description" content="Learn the CREATE SOMETHING ethos through practice. Six paths, one philosophy." />
  <meta name="twitter:image" content="https://learn.createsomething.space/og-image.svg" />
  <meta name="twitter:creator" content="@micahryanjohnson" />

  <!-- Additional SEO -->
  <meta name="theme-color" content="#000000" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

  <!-- AEO (Answer Engine Optimization) for AI/LLM queries -->
  <meta name="article:section" content="AI Development Education, Philosophy-Driven Learning" />
  <meta name="article:tag" content="Subtractive Triad, Canon Design, Claude Code, AI-Native Development, Hermeneutic Learning" />
  <meta name="citation_title" content="CREATE SOMETHING LMS: Learning the Ethos Through Practice" />
  <meta name="citation_author" content="Micah Johnson" />
  <meta name="citation_publication_date" content="2025" />

  <!-- Links -->
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://learn.createsomething.space" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
  <link rel="manifest" href="/manifest.json" />

  <!-- Structured Data (JSON-LD) for AEO -->
  {@html `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "CREATE SOMETHING LMS",
      "alternateName": "Learn the Ethos",
      "description": "Learn the CREATE SOMETHING ethos through practice. Six learning paths teaching the Subtractive Triad, Canon design system, and AI-native development patterns.",
      "url": "https://learn.createsomething.space",
      "inLanguage": "en-US",
      "author": {
        "@type": "Person",
        "name": "Micah Johnson",
        "url": "https://www.linkedin.com/in/micahryanjohnson/",
        "jobTitle": "AI-Native Development Researcher"
      },
      "publisher": {
        "@type": "Organization",
        "name": "CREATE SOMETHING",
        "logo": {
          "@type": "ImageObject",
          "url": "https://learn.createsomething.space/favicon.svg"
        }
      },
      "educationalCredentialAwarded": "CREATE SOMETHING Practitioner",
      "hasCourse": [
        {
          "@type": "Course",
          "name": "Foundations",
          "description": "The Subtractive Triad - Core philosophy of subtractive creation",
          "provider": { "@type": "Organization", "name": "CREATE SOMETHING" }
        },
        {
          "@type": "Course",
          "name": "Craft",
          "description": "Canon CSS - The design system that recedes",
          "provider": { "@type": "Organization", "name": "CREATE SOMETHING" }
        },
        {
          "@type": "Course",
          "name": "Infrastructure",
          "description": "Cloudflare Mastery - Building on the edge",
          "provider": { "@type": "Organization", "name": "CREATE SOMETHING" }
        }
      ],
      "keywords": ["AI development education", "Claude Code learning", "Subtractive Triad", "Canon design system", "AI-native patterns"],
      "isPartOf": {
        "@type": "WebSite",
        "name": "CREATE SOMETHING",
        "url": "https://createsomething.io"
      }
    }
  </script>`}
</svelte:head>

<div class="layout">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".learn"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel="Login"
    ctaHref="/login"
  />

  <div class="content">
    {@render children()}
  </div>

  <Footer
    mode="learn"
    showNewsletter={false}
    aboutText="Learn the CREATE SOMETHING ethos through practice. Six paths, one philosophy. Understanding through disciplined removal."
    quickLinks={[
      { label: 'Paths', href: '/paths' },
      { label: 'Praxis', href: '/praxis' },
      { label: 'Progress', href: '/progress' }
    ]}
    showSocial={true}
  />

  <ModeIndicator current="learn" />
</div>

<style>
  .layout {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .content {
    padding-top: 72px;
  }
</style>
