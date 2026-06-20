<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate, onNavigate, goto, invalidateAll } from '$app/navigation';
  import Navigation from '$canon/components/Navigation.svelte';
  import Footer from '$canon/components/Footer.svelte';
  import ModeIndicator from '$canon/components/ModeIndicator.svelte';
  import SkipToContent from '$canon/components/SkipToContent.svelte';
  import Analytics from '$canon/components/Analytics.svelte';
  import LayoutSEO from '$canon/components/LayoutSEO.svelte';
  import UnifiedSearch from '$canon/navigation/UnifiedSearch.svelte';
  import type { LayoutData } from './$types';

  interface Props {
    children: import('svelte').Snippet;
    data: LayoutData;
  }

  let { children, data }: Props = $props();

  // Handle logout
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await invalidateAll();
    goto('/');
  }

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

  // Handle hash scrolling
  function scrollToHash(hash: string) {
    if (!hash) return;
    const element = document.querySelector(hash);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Scroll to hash on mount + cross-property entry
  onMount(() => {
    // Cross-property entry animation
    const transitionFrom = sessionStorage.getItem('cs-transition-from');
    if (transitionFrom) {
      sessionStorage.removeItem('cs-transition-from');
      sessionStorage.removeItem('cs-transition-to');
      sessionStorage.removeItem('cs-transition-time');
      document.body.classList.add('transitioning-in');
      setTimeout(() => document.body.classList.remove('transitioning-in'), 500);
    }

    if (window.location.hash) {
      setTimeout(() => scrollToHash(window.location.hash), 100);
    }
  });

  // Scroll to hash after navigation
  afterNavigate(({ to }) => {
    if (to?.url.hash) {
      setTimeout(() => scrollToHash(to.url.hash), 100);
    }
  });

  const navLinks = [
    { label: 'Course', href: '/paths' },
    { label: 'Progress', href: '/progress' }
  ];

  // Quick access items for unified search
  const quickAccessItems = [
    {
      id: 'nav-course',
      label: 'Codex MCP Course',
      description: 'Learn Codex by building one MCP server',
      href: '/paths/codex-mcp',
      icon: '🧩',
      keywords: ['codex', 'mcp', 'course', 'server']
    },
    {
      id: 'nav-paths',
      label: 'Course Overview',
      description: 'See all lessons in order',
      href: '/paths',
      icon: '🛤️',
      keywords: ['lessons', 'curriculum', 'overview']
    },
    {
      id: 'nav-progress',
      label: 'Progress',
      description: 'Track completed lessons',
      href: '/progress',
      icon: '📊',
      keywords: ['track', 'completion', 'status']
    }
  ];

  // DRY: Centralized copy for meta tags and components
  const SITE_COPY = {
    tagline: 'Learn Codex Through MCP',
    descriptionFull: 'A straightforward course for learning Codex by building and shipping a real MCP server.',
    descriptionShort: 'Learn Codex by building a real MCP server.',
    descriptionFooter: 'A straightforward course for learning Codex by building and shipping a real MCP server.'
  } as const;
</script>

<svelte:head>
  <!-- Fonts - Must be in head for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@200..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<LayoutSEO property="lms" />

<Analytics property="lms" userId={data.user?.id} userOptedOut={data.user?.analytics_opt_out ?? false} />

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="lms" localItems={quickAccessItems} />

<SkipToContent />

<div class="layout">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".learn"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel="Get Started"
    ctaHref="/paths/codex-mcp/what-is-codex-and-mcp"
    user={data.user}
    onLogout={handleLogout}
    showLogin={true}
    loginHref="/login"
    accountHref="/account"
  />

  <main id="main-content" class="content">
    {@render children()}
  </main>

  <Footer
    mode="learn"
    showNewsletter={false}
    aboutText={SITE_COPY.descriptionFooter}
    quickLinks={[
      { label: 'Course', href: '/paths' },
      { label: 'Start', href: '/paths/codex-mcp/what-is-codex-and-mcp' },
      { label: 'Progress', href: '/progress' },
      { label: 'Privacy', href: '/privacy' }
    ]}
    showSocial={true}
    isAuthenticated={!!data.user}
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
