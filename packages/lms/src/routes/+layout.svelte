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
      label: 'Build Your First Business MCP',
      description: 'Learn Codex by creating an MCP for business data',
      href: '/paths/codex-mcp',
      icon: '🧩',
      keywords: ['codex', 'mcp', 'course', 'server', 'business', 'operator', 'rapidapi']
    },
    {
      id: 'nav-canon-images',
      label: 'Make Your Workflow Visible',
      description: 'Learn Canon by turning workflows into proof images',
      href: '/paths/make-your-workflow-visible',
      icon: '🗺️',
      keywords: ['canon', 'images', 'workflow', 'policy', 'receipt', 'handoff']
    },
    {
      id: 'nav-paths',
      label: 'Path Overview',
      description: 'See all operator learning paths',
      href: '/paths',
      icon: '🛤️',
      keywords: ['lessons', 'curriculum', 'overview', 'paths']
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
    tagline: 'Operator Workflow Learning Paths',
    descriptionFull:
      'Practical paths for business owners learning Codex, MCP creation, and Canon workflow images.',
    descriptionShort: 'Learn Codex and Canon by creating operator workflows.',
    descriptionFooter:
      'Practical paths for business owners learning to build MCP workflows and make them visible with Canon.'
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
<UnifiedSearch currentProperty="lms" localItems={quickAccessItems} showMobileButton={false} />

<SkipToContent />

<div class="layout theme-light">
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
    visualStyle="clear"
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
    visualStyle="clear"
  />

  <ModeIndicator current="learn" />
</div>

<style>
  .layout {
    min-height: 100vh;
    background: var(--color-clear-porcelain, #f7f7f7);
  }

  .content {
    padding-top: 72px;
  }

  :global(.nav-clear .nav-logo) {
    max-width: calc(100% - 3.5rem);
    gap: 0.18rem;
  }

  :global(.nav-clear .nav-logo-mark) {
    width: 1.6rem;
    height: 1.6rem;
    margin-right: 0.45rem;
  }

  :global(.nav-clear .nav-logo-text),
  :global(.nav-clear .nav-logo-suffix) {
    position: static !important;
    width: auto !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    clip: auto !important;
    white-space: nowrap !important;
  }

  :global(.nav-clear .nav-logo .nav-logo-text) {
    color: var(--color-clear-onyx, #0a0e19) !important;
    font-size: 1rem !important;
    font-weight: var(--font-bold) !important;
    line-height: 1 !important;
  }

  :global(.nav-clear .nav-logo .nav-logo-suffix) {
    color: var(--color-clear-grey, #636363) !important;
    font-family: var(--font-mono) !important;
    font-size: 0.72rem !important;
    font-weight: var(--font-semibold) !important;
    letter-spacing: 0 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  @media (max-width: 480px) {
    :global(.nav-clear .nav-logo) {
      gap: 0.14rem;
    }

    :global(.nav-clear .nav-logo-mark) {
      width: 1.35rem;
      height: 1.35rem;
      margin-right: 0.32rem;
    }

    :global(.nav-clear .nav-logo .nav-logo-text) {
      font-size: 0.9rem !important;
    }

    :global(.nav-clear .nav-logo .nav-logo-suffix) {
      font-size: 0.68rem !important;
    }
  }
</style>
