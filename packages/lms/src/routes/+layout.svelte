<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate, onNavigate, goto, invalidateAll } from '$app/navigation';
  import { Navigation, Footer, ModeIndicator, SkipToContent, Analytics, LayoutSEO } from '@create-something/canon';
  import { UnifiedSearch } from '@create-something/canon/navigation';
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
    { label: 'Seeing', href: '/seeing' },
    { label: 'Paths', href: '/paths' },
    { label: 'Praxis', href: '/praxis' },
    { label: 'Progress', href: '/progress' }
  ];

  // Quick access items for unified search
  const quickAccessItems = [
    { id: 'nav-seeing', label: 'Seeing', description: 'Free entry-level course', href: '/seeing', icon: '👁️', keywords: ['free', 'start', 'learn', 'triad'] },
    { id: 'nav-paths', label: 'Learning Paths', description: 'Structured curriculum', href: '/paths', icon: '🛤️', keywords: ['courses', 'curriculum', 'structured'] },
    { id: 'nav-praxis', label: 'Praxis', description: 'Hands-on exercises', href: '/praxis', icon: '⚡', keywords: ['practice', 'exercises', 'apply'] },
    { id: 'nav-progress', label: 'Progress', description: 'Track your learning', href: '/progress', icon: '📊', keywords: ['track', 'status', 'completion'] },
    { id: 'nav-space', label: 'Go to .space', description: 'Interactive experiments', href: 'https://createsomething.space', icon: '🧪', keywords: ['explore', 'try', 'interactive'] },
    { id: 'nav-io', label: 'Go to .io', description: 'Research papers', href: 'https://createsomething.io', icon: '📖', keywords: ['papers', 'research'] },
    { id: 'nav-agency', label: 'Go to .agency', description: 'Professional services', href: 'https://createsomething.agency', icon: '🔨', keywords: ['services', 'hire'] },
  ];

  // DRY: Centralized copy for meta tags and components
  const SITE_COPY = {
    tagline: 'Learn the Ethos',
    descriptionFull: 'Learn the CREATE SOMETHING ethos through practice. Eight learning paths teaching the Subtractive Triad, Canon design system, and AI-native development patterns.',
    descriptionShort: 'Learn the CREATE SOMETHING ethos through practice. Eight paths, one philosophy.',
    descriptionFooter: 'Learn the CREATE SOMETHING ethos through practice. Eight paths, one philosophy. Understanding through disciplined removal.'
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

<Analytics property="lms" userId={data.user?.id} userOptedOut={false} />

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
    ctaHref="/seeing"
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
      { label: 'Seeing', href: '/seeing' },
      { label: 'Paths', href: '/paths' },
      { label: 'Praxis', href: '/praxis' },
      { label: 'Progress', href: '/progress' }
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
