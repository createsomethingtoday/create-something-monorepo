<script lang="ts">
  import '../app.css';
  import { Navigation, Footer, ModeIndicator } from '@create-something/canon';
  import { UnifiedSearch } from '@create-something/canon/navigation';
  import PrivacyAnalytics from '$lib/components/PrivacyAnalytics.svelte';
  import AgencyPerformanceHandoff from '$lib/components/AgencyPerformanceHandoff.svelte';
  import { getAgencyContentAssetAnalyticsMetadata } from '$lib/analytics/content-assets';
  import { getAgencyMarketingExperimentMetadata } from '$lib/analytics/marketing-experiment';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { PUBLIC_PRODUCT_SEQUENCE, getPublicProduct } from '$lib/data/productFamily';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate, disableScrollHandling, goto, onNavigate } from '$app/navigation';
  import {
    isAgencyDifyArticlePath,
    usesRouteOwnedAgencyPerformanceEnding,
    usesCompactAgencyPrivacyPrompt
  } from '$lib/atlas/surface-policy';
  import { marketingPagePortfolio } from '$lib/data/marketingPages';

  let { children, data } = $props();
  let mobileNavigationOpen = $state(false);

  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  // View Transitions API - Hermeneutic Navigation
  // .agency: Efficient (200ms)
  onNavigate((navigation) => {
    // Keep back/forward restoration, but force top-scroll on normal page links
    if (navigation.type !== 'popstate' && !navigation.to?.url.hash) {
      disableScrollHandling();
    }

    if (!document.startViewTransition) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // Primary nav intentionally uses plain meaning, not owned product names: a
  // first-time visitor does not yet know what Map or Control are. The spine is
  // named in the footer and on /products. See the plain-meaning assertion in
  // test/public-marketing-copy.test.ts.
  const navLinks = [
    { label: 'How It Works', href: '/services' },
    { label: 'Practice', href: '/practice' },
    { label: 'What You Keep', href: '/stack' },
    { label: 'Products', href: '/products' },
    { label: 'Field Reports', href: '/field-reports' }
  ];
  // Derived from the product family so the footer cannot drift from the source of truth.
  const spineLinks = PUBLIC_PRODUCT_SEQUENCE.map((id) => {
    const product = getPublicProduct(id);
    return { label: product.shortName, href: product.route };
  });
  const primaryCtaHref = agencyCoreMessaging.startWithWorkflowHref;
  const globalAnalyticsMetadata = $derived(getAgencyGlobalAnalyticsMetadata($page.url.pathname));
  const isDifyArticleRoute = $derived(isAgencyDifyArticlePath($page.url.pathname));
  const routeOwnsPerformanceEnding = $derived(
    usesRouteOwnedAgencyPerformanceEnding($page.url.pathname)
  );
  const useCompactPrivacyPrompt = $derived(usesCompactAgencyPrivacyPrompt($page.url.pathname));
  const isPublicMarketingRoute = $derived(
    marketingPagePortfolio.some(
      (entry) => entry.path === $page.url.pathname && entry.decision !== 'archive'
    )
  );
  const footerQuickLinkGroups = [
    {
      title: 'Commercial',
      ariaLabel: 'Commercial paths',
      links: [
        { label: 'How It Works', href: '/services' },
        { label: 'What You Keep', href: '/stack' },
        { label: 'Products', href: '/products' },
        { label: 'Field Reports', href: '/field-reports' },
        { label: 'Use With Clients', href: '/for-service-providers' },
        { label: 'About', href: '/about' }
      ]
    },
    {
      title: 'Products',
      ariaLabel: 'Product spine',
      links: spineLinks
    },
    {
      title: 'Tool Stack',
      ariaLabel: 'Workflow tool stack',
      links: [
        { label: 'Workflow Tool Stack', href: '/partners' },
        { label: 'Cloudflare', href: '/cloudflare' }
      ]
    },
    {
      title: 'Guide',
      ariaLabel: 'Guides and articles',
      links: [
        { label: 'Workflow Guides', href: '/workflows' },
        {
          label: agencyCoreMessaging.governanceChecklistLabel,
          href: agencyCoreMessaging.governanceChecklistHref
        }
      ]
    },
    {
      title: 'Trust',
      ariaLabel: 'Trust and policy',
      links: [
        { label: 'Security', href: '/security' },
        { label: 'Bearer Token Policy', href: '/bearer-token-policy' }
      ]
    }
  ];

  function getAgencyGlobalAnalyticsMetadata(pathname: string): Record<string, unknown> | undefined {
    const experimentMetadata = getAgencyMarketingExperimentMetadata(pathname);
    const contentMetadata = getAgencyContentAssetAnalyticsMetadata(pathname);

    if (!experimentMetadata && !contentMetadata) {
      return undefined;
    }

    return {
      ...(experimentMetadata ?? {}),
      ...(contentMetadata ?? {})
    };
  }

  // Quick access items for unified search
  const quickAccessItems = [
    {
      id: 'nav-services',
      label: 'How It Works',
      description: 'Workflow maps, controlled pilots, and operating evidence',
      href: '/services',
      icon: '🔨',
      keywords: [
        'workflow system',
        'calm',
        'transparent',
        'reliable',
        'controlled delegation',
        'automation',
        'pricing',
        'services'
      ]
    },
    {
      id: 'nav-stack',
      label: 'What You Keep',
      description: 'Your accounts, data, approval rights, and operating record',
      href: '/stack',
      icon: '🧭',
      keywords: [
        'stack',
        'vendors',
        'boundaries',
        'composio',
        'cloudflare',
        'webflow',
        'openai',
        'control layer'
      ]
    },
    {
      id: 'nav-partners',
      label: 'Workflow Tool Stack',
      description:
        'Map one workflow across the app surface, runtime, workspace, reasoning layer, approvals, and evidence',
      href: '/partners',
      icon: 'P',
      keywords: [
        'workflow tool stack',
        'tool stack',
        'substrate',
        'cloudflare',
        'openai',
        'workflow systems',
        'tool boundary',
        'approval path'
      ]
    },
    {
      id: 'nav-cloudflare',
      label: 'Cloudflare',
      description:
        'Cloudflare runtime substrate, Workers, Pages, D1, and controlled workflow routes',
      href: '/cloudflare',
      icon: 'CF',
      keywords: [
        'cloudflare',
        'runtime',
        'workers',
        'pages',
        'd1',
        'durable objects',
        'remote mcp',
        'workflow routes'
      ]
    },
    {
      id: 'nav-products',
      label: 'Products',
      description: 'Map and Control products for defining and operating delegated workflows',
      href: '/products',
      icon: '📦',
      keywords: ['portfolio', 'map', 'control', 'workflow products', 'proof surfaces']
    },
    {
      id: 'nav-workflow-guides',
      label: 'Workflow Guides',
      description: 'Practical answers for mapping, building, securing, and operating AI workflows',
      href: '/workflows',
      icon: 'WG',
      keywords: ['workflow guides', 'MCP', 'AI automation', 'governance', 'evaluation']
    },
    {
      id: 'nav-field-reports',
      label: 'Field Reports',
      description:
        'Measured workflow results, failed gates, evidence, and human decision boundaries',
      href: '/field-reports',
      icon: 'FR',
      keywords: ['field reports', 'case studies', 'evidence', 'results', 'proof']
    },
    {
      id: 'nav-service-providers',
      label: 'Use With Clients',
      description: 'Map, build, and hand over one governed client workflow',
      href: '/for-service-providers',
      icon: 'SP',
      keywords: ['service provider', 'consultant', 'clients', 'delivery', 'workflow handoff']
    },
    {
      id: 'nav-self-map',
      label: agencyCoreMessaging.startWithWorkflowLabel,
      description: 'Start a lightweight workflow map before booking',
      href: agencyCoreMessaging.startWithWorkflowHref,
      icon: 'WF',
      keywords: ['contact', 'hire', 'start', 'workflow', 'self map', 'workflow map', 'mapping']
    },
    {
      id: 'nav-mcp-access',
      label: 'MCP Access',
      description: 'Reveal, copy, rotate, and revoke your personal bearer token',
      href: '/mcp-access',
      icon: '🗝️',
      keywords: [
        'mcp access',
        'bearer token',
        'copy token',
        'host setup',
        'codex',
        'claude',
        'cursor'
      ]
    },
    {
      id: 'nav-security',
      label: 'Security',
      description: 'Identity boundaries, bearer-token governance, and operational controls',
      href: '/security',
      icon: '🛡️',
      keywords: ['security', 'trust', 'risk', 'controls', 'auth']
    },
    {
      id: 'nav-bearer-token-policy',
      label: 'Bearer Token Policy',
      description: 'One long-lived token per user with live entitlement checks and revocation',
      href: '/bearer-token-policy',
      icon: '🔑',
      keywords: ['bearer token', 'token policy', 'mcp access', 'agent access', 'auth']
    },
    {
      id: 'nav-space',
      label: 'Go to .space',
      description: 'MCP experiments',
      href: 'https://createsomething.space',
      icon: '🧪',
      keywords: ['explore', 'try', 'interactive']
    },
    {
      id: 'nav-io',
      label: 'Go to .io',
      description: 'MCP patterns for builders',
      href: 'https://createsomething.io',
      icon: '📖',
      keywords: ['papers', 'research', 'learn']
    },
    {
      id: 'nav-ltd',
      label: 'Go to .ltd',
      description: 'Philosophy of automation',
      href: 'https://createsomething.ltd',
      icon: '📜',
      keywords: ['canon', 'principles', 'foundation']
    }
  ];

  // Handle hash scrolling
  function scrollToHash(hash: string) {
    if (!hash) return;

    const element = document.querySelector(hash);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Scroll to hash on mount (for direct links) + cross-property entry
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
      return;
    }

    // Handle full-document navigations that hydrate as type='enter'
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const isBackForward = navEntry?.type === 'back_forward';
    if (!isBackForward) {
      requestAnimationFrame(scrollToTop);
      setTimeout(scrollToTop, 50);
    }
  });

  // Scroll handling after navigation:
  // - Preserve browser restore for popstate/back-forward
  // - Hash links scroll to section
  // - Other internal links scroll to top
  afterNavigate(({ to, type }) => {
    if (to?.url.hash) {
      setTimeout(() => scrollToHash(to.url.hash), 100);
      return;
    }

    if (type === 'popstate') return;

    requestAnimationFrame(scrollToTop);
    setTimeout(scrollToTop, 50);
  });

  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { logoutUrl?: string } | null;
      window.location.assign(payload?.logoutUrl || '/login');
    } catch {
      goto('/login');
    }
  }
</script>

<PrivacyAnalytics
  property="agency"
  userId={data.user?.id}
  userOptedOut={data.user?.analytics_opt_out ?? false}
  globalMetadata={globalAnalyticsMetadata}
  compactPrompt={useCompactPrivacyPrompt}
  obscured={mobileNavigationOpen}
  mobilePlacement="safe-corner"
/>

<!-- Unified Search - Cmd/Ctrl+K to open -->
<UnifiedSearch currentProperty="agency" localItems={quickAccessItems} showMobileButton={false} />

<div class="layout-root min-h-screen property-performance">
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".agency"
    links={navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel={agencyCoreMessaging.startWithWorkflowLabel}
    ctaHref={primaryCtaHref}
    user={data.user}
    onLogout={handleLogout}
    accountHref="/account"
    visualStyle="editorial"
    showMobileLogoText={true}
    showDesktopLogoText={true}
    onMobileMenuChange={(open) => (mobileNavigationOpen = open)}
  />

  <main id="main-content" class="pt-[72px]">
    {@render children()}
  </main>

  {#if isPublicMarketingRoute && !routeOwnsPerformanceEnding}
    <AgencyPerformanceHandoff />
  {/if}

  <Footer
    mode="agency"
    showNewsletter={false}
    aboutText="Calm, transparent, reliable workflow systems for operator-owned outcomes: clear operating boundaries, evidence-backed delivery, and escalation only when judgment is required."
    quickLinkGroups={footerQuickLinkGroups}
    footerCta={{
      title: 'Ready to make one workflow AI-native?',
      label: agencyCoreMessaging.startWithWorkflowLabel,
      href: primaryCtaHref,
      description: 'Start a lightweight workflow map before booking.'
    }}
    showSocial={true}
    isAuthenticated={!!data.user}
    visualStyle="editorial"
  />

  {#if !routeOwnsPerformanceEnding && $page.url.pathname !== '/basketball-systems-lab' && !isDifyArticleRoute}
    <ModeIndicator current="agency" />
  {/if}
</div>

<style>
  .layout-root {
    background: var(--color-performance-paper, #f3f3f0);
  }

  @media (max-height: 47.5rem) and (min-width: 48rem) {
    :global(.layout-root .mode-indicator) {
      top: calc(72px + var(--space-performance-md, 1rem));
      bottom: auto;
    }
  }
</style>
