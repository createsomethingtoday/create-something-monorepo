<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate, onNavigate, goto, invalidateAll } from '$app/navigation';
  import { Navigation, Footer, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
  import { UnifiedSearch } from '@create-something/canon/navigation';
  import { getIoFooterHandoff } from '$lib/config/footerHandoff';
  import { page } from '$app/stores';

  // View Transitions API - Hermeneutic Navigation
  // "Navigation should feel like dwelling, not jumping"
  onNavigate((navigation) => {
    // Progressive enhancement: skip if API not available
    if (!document.startViewTransition) return;

    // Respect reduced motion preference
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
    }

    // Set mode-specific duration (300ms for .io - analytical)
    document.documentElement.style.setProperty('--duration-performance-view-transition', '300ms');

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // Handle cross-property entry animations
  onMount(() => {
    // Check if arriving from another CREATE Something property
    const transitionFrom = sessionStorage.getItem('cs-transition-from');
    if (transitionFrom) {
      sessionStorage.removeItem('cs-transition-from');
      sessionStorage.removeItem('cs-transition-to');
      sessionStorage.removeItem('cs-transition-time');

      // Play entry animation
      document.body.classList.add('transitioning-in');
      setTimeout(() => {
        document.body.classList.remove('transitioning-in');
      }, 500);
    }
  });

  let { children, data } = $props();
  let mobileNavigationOpen = $state(false);
  const footerHandoff = $derived(getIoFooterHandoff($page.url.pathname));

  // Handle logout
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await invalidateAll();
    goto('/');
  }

  const navLinks = [
    { label: 'Experiments', href: '/experiments' },
    { label: 'Papers', href: '/papers' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'About', href: '/about' }
  ];

  // Quick access items for unified search
  const quickAccessItems = [
    {
      id: 'nav-papers',
      label: 'Papers',
      description: 'Research papers and analysis',
      href: '/papers',
      icon: '📖',
      keywords: ['read', 'research', 'learn']
    },
    {
      id: 'nav-experiments',
      label: 'Experiments',
      description: 'Tracked experiment results',
      href: '/experiments',
      icon: '🧪',
      keywords: ['try', 'data', 'results']
    },
    {
      id: 'nav-methodology',
      label: 'Methodology',
      description: 'Research methodology',
      href: '/methodology',
      icon: '📐',
      keywords: ['process', 'approach']
    },
    {
      id: 'nav-categories',
      label: 'Categories',
      description: 'Browse by topic',
      href: '/categories',
      icon: '🏷️',
      keywords: ['topics', 'browse']
    },
    {
      id: 'nav-space',
      label: 'Go to .space',
      description: 'Interactive experiments',
      href: 'https://createsomething.space',
      icon: '🧪',
      keywords: ['explore', 'try', 'interactive']
    },
    {
      id: 'nav-agency',
      label: 'Go to .agency',
      description: 'Professional services',
      href: 'https://createsomething.agency',
      icon: '🔨',
      keywords: ['services', 'hire', 'work']
    },
    {
      id: 'nav-ltd',
      label: 'Go to .ltd',
      description: 'Canon principles and patterns',
      href: 'https://createsomething.ltd',
      icon: '📜',
      keywords: ['canon', 'principles', 'foundation']
    }
  ];

  // Handle hash scrolling
  function scrollToHash(hash: string) {
    if (!hash) return;

    // Try multiple times with increasing delays to ensure component is rendered
    const attemptScroll = (attempts = 0, maxAttempts = 5) => {
      const element = document.querySelector(hash);
      if (element) {
        // Account for fixed navigation height (approximately 72px)
        const navHeight = 72;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } else if (attempts < maxAttempts) {
        setTimeout(() => attemptScroll(attempts + 1, maxAttempts), 100 * (attempts + 1));
      }
    };

    attemptScroll();
  }

  // Scroll to hash on mount (for direct links)
  onMount(() => {
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
</script>

<LayoutSEO property="io" />

<Analytics
  property="io"
  userId={data.user?.id}
  userOptedOut={data.user?.analytics_opt_out ?? false}
/>

{#if $page.url.pathname.startsWith('/admin')}
  {@render children()}
{:else}
  <!-- Unified Search - Cmd/Ctrl+K to open -->
  <UnifiedSearch
    currentProperty="io"
    localItems={quickAccessItems}
    showMobileButton={!$page.url.pathname.startsWith('/papers') &&
      !$page.url.pathname.startsWith('/experiments') &&
      !mobileNavigationOpen}
    deferMobileButtonUntilCampaignExit={$page.url.pathname === '/'}
  />

  <div class="layout-root property-performance">
    <Navigation
      logo="CREATE SOMETHING"
      links={navLinks}
      currentPath={$page.url.pathname}
      fixed={true}
      ctaLabel="Contact"
      ctaHref="/contact"
      user={data.user}
      onLogout={handleLogout}
      showLogin={true}
      loginHref="/login"
      accountHref="/account"
      visualStyle="editorial"
      showMobileLogoText={true}
      showDesktopLogoText={true}
      onMobileMenuChange={(open) => (mobileNavigationOpen = open)}
    />

    <!-- Add top padding to account for fixed navigation -->
    <main id="main-content" class="main-content">
      {@render children()}
    </main>

    <div data-footer-handoff={footerHandoff.kind}>
      <Footer
        mode="io"
        showNewsletter={footerHandoff.showNewsletter}
        turnstileSiteKey={data.turnstileSiteKey}
        newsletterTitle="Get the monthly research digest"
        newsletterDescription="Papers, experiments, and patterns—delivered."
        aboutText="Systematic evaluation of AI-native development through tracked experiments. Real data from building with Claude Code and Cloudflare."
        quickLinks={[
          { label: 'Experiments', href: '/experiments' },
          { label: 'Methodology', href: '/methodology' },
          { label: 'Categories', href: '/categories' },
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' }
        ]}
        footerCta={footerHandoff.showCommercialCta
          ? {
              title: 'Ready to turn evidence into an operating decision?',
              label: 'Bring the workflow to .agency',
              href: 'https://createsomething.agency/practice?source=io&intent=research-to-practice',
              description: 'Carry the paper, method, and open question into a bounded workflow map.'
            }
          : undefined}
        showSocial={true}
        isAuthenticated={!!data.user}
        visualStyle="editorial"
      />
    </div>

    <!-- Mode of Being Indicator - Hermeneutic Circle Position -->
    <ModeIndicator current="io" />
  </div>
{/if}

<style>
  .layout-root {
    min-height: 100vh;
    background: var(--color-performance-paper, #f3f3f0);
  }

  .main-content {
    /* Navigation bar height offset: header (72px) + breathing room */
    padding-top: calc(var(--height-performance-header) + var(--space-performance-md));
  }
</style>
