<script lang="ts">
  import '../app.css';
  import CanonBrandSignature from '$lib/components/CanonBrandSignature.svelte';
  import '$lib/styles/operator-palette.css';
  import { initializeFilmMotion, filmNavigationOpen } from '$lib/motion/filmPlayback';
  import { filmStories } from '$lib/data/filmStories';
  import { Navigation, Footer, LayoutSEO, ModeIndicator } from '@create-something/canon';
  import PageAnnotations from '$lib/annotations/PageAnnotations.svelte';
  import AgencySearch from '$lib/site-search/AgencySearch.svelte';
  import { isPublicSearchPage } from '$lib/site-search/catalog';
  import { quickAccessItems } from '$lib/data/quickAccessItems';
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

  import { usesAgencyOperatorPalette } from '$lib/data/publicSurfacePolicy';

  let { children, data } = $props();
  const usesOperatorPalette = $derived(
    usesAgencyOperatorPalette($page.url.pathname)
  );
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

  // Primary nav tells a first-time visitor what each destination contains.
  // Owned product names remain available in the footer and on the system page.
  const navLinks = [
    { label: 'Technical Support', href: '/services' },
    {
      label: 'Try a Workflow',
      href: '/practice',
      children: [
        {
          label: 'Try the method',
          href: '/practice',
          description: 'Try planning and reviewing an AI task.'
        },
        {
          label: 'Map a workflow',
          href: agencyCoreMessaging.selfMapHref,
          description: 'Plan the steps, tools, and people involved.'
        },
        {
          label: 'How it works',
          href: '/services',
          description: 'See how we diagnose problems, engineer improvements, and help your team use them.'
        },
        {
          label: 'Marketplace field report',
          href: '/field-reports/template-review',
          description: 'Read what was tested and what stayed with human reviewers.'
        }
      ]
    },
    { label: 'What You Keep', href: '/stack' },
    { label: 'Services & Tools', href: '/products' },
    { label: 'Proof', href: '/field-reports' }
  ];
  // Derived from the product family so the footer cannot drift from the source of truth.
  const spineLinks = PUBLIC_PRODUCT_SEQUENCE.map((id) => {
    const product = getPublicProduct(id);
    return { label: product.shortName, href: product.route };
  });
  // Public pages share one navigation; workspace and identity routes retain their existing shell.
  const usesPublicNavigation = $derived(!/^\/(account|admin|dashboard|login|logout|auth|mcp-access|delivery)(?:\/|$)/.test($page.url.pathname) && !/^\/map\/(workspace|subscribe|share)(?:\/|$)/.test($page.url.pathname));
  const filmNavLinks = [
    { label: 'The work', href: '/#work' },
    { label: 'Technical support', href: '/services' },
    { label: 'From $900/mo', href: agencyCoreMessaging.membershipHref },
    { label: 'Explore', href: '/products', children: [
      { label: 'Services & tools', href: '/products', description: 'Explore the full catalog.' },
      { label: 'Proof', href: '/field-reports', description: 'Inspect results and their limits.' },
      { label: 'Try a workflow', href: '/practice', description: 'Try the method yourself.' },
      { label: 'What you keep', href: '/stack', description: 'Code, instructions and ownership.' }
    ] }
  ];
  const primaryCtaHref = agencyCoreMessaging.membershipHref;
  const agencyFooterMacroMedia = {
    src: '/images/performance-lab/playbook-footer-decision-gate-macro.webp',
    alt: 'Macro-real Playbook decision gate: an ivory AI-agent marker held inside a black steel ring as amber and proof-green routes cross a physical court surface.'
  };
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
      title: 'Services',
      ariaLabel: 'Commercial paths',
      links: [
        { label: 'Technical Support', href: '/services' },
        { label: 'Agent Foundation', href: agencyCoreMessaging.agentFoundationHref },
        { label: 'Technical Review', href: '/technical-review' },
        { label: 'AI Buyer Readiness Audit', href: '/agent-readiness' },
        { label: 'What You Keep', href: '/stack' },
        { label: 'Products', href: '/products' },
        { label: 'Field Reports', href: '/field-reports' },
        { label: 'Dispatch', href: '/dispatch' },
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
        { label: 'Connected tools', href: '/partners' },
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

  const filmFooterGroups = [
    { title: 'Work', ariaLabel: 'Explore capabilities', links: filmStories.map(story => ({label:story.name,href:`/?film=${story.id}#work`})) },
    { title: 'Working together', ariaLabel: 'Working together', links: [
      {label:'Support membership',href:agencyCoreMessaging.membershipHref},
      {label:agencyCoreMessaging.bookMappingSessionLabel,href:agencyCoreMessaging.workflowMappingSessionHref},
      {label:'Contact',href:'/contact'},
      ...footerQuickLinkGroups[0].links.filter(link => !['Products','Field Reports','Dispatch','About'].includes(link.label))
    ] },
    { title: 'Resources', ariaLabel: 'Resources', links: [
      ...footerQuickLinkGroups[0].links.filter(link => ['Products','Field Reports','Dispatch','About'].includes(link.label)),
      ...spineLinks, ...footerQuickLinkGroups[2].links, ...footerQuickLinkGroups[3].links
    ] },
    { title: 'Trust & access', ariaLabel: 'Trust and access', links: [
      ...footerQuickLinkGroups[4].links,
      {label:'Privacy',href:'/privacy'}, {label:'Terms',href:'/terms'}, {label:'Sign in',href:'/login'}
    ] }
  ];
  onMount(initializeFilmMotion);
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

  // Handle hash scrolling
  function scrollToHash(hash: string) {
    if (!hash) return;

    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const element = document.getElementById(id);
    if (element) {
      const nav = document.querySelector('.nav-fixed');
      const clearance = (nav?.getBoundingClientRect().bottom ?? 72) + 24;
      window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - clearance), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
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

{#snippet canonFooterBrand()}<CanonBrandSignature />{/snippet}

<LayoutSEO property="agency" />
<PageAnnotations pathname={$page.url.pathname} />

<div class="agency-surface" data-canon-palette={usesOperatorPalette ? "operator" : undefined}>
<PrivacyAnalytics
  property="agency"
  userId={data.user?.id}
  userOptedOut={data.user?.analytics_opt_out ?? false}
  globalMetadata={globalAnalyticsMetadata}
  compactPrompt={useCompactPrivacyPrompt}
  obscured={mobileNavigationOpen}
  mobilePlacement={["/", "/services", "/contact", "/book"].includes($page.url.pathname) ? "safe-corner" : "header-edge"}
/>

<!-- Unified Search - Cmd/Ctrl+K to open -->
{#if isPublicSearchPage($page.url.pathname)}
  <AgencySearch />
{:else}
  <UnifiedSearch currentProperty="agency" localItems={quickAccessItems} showMobileButton={false} />
{/if}

<div class="layout-root min-h-screen property-performance" class:film-shell={usesPublicNavigation} class:film-home={isPublicMarketingRoute && $page.url.pathname === "/"}>
  <Navigation
    logo="CREATE SOMETHING"
    logoSuffix=".agency"
    logoAsset={{
      src: '/brand/create-something-horizontal-black.svg',
      mobileSrc: '/brand/create-something-mark-black.svg',
      label: 'CREATE SOMETHING .agency'
    }}
    enableRouteLogoMotion={true}
    links={usesPublicNavigation ? filmNavLinks : navLinks}
    currentPath={$page.url.pathname}
    fixed={true}
    ctaLabel={usesPublicNavigation ? agencyCoreMessaging.bookMappingSessionLabel : agencyCoreMessaging.membershipLabel}
    ctaHref={usesPublicNavigation ? agencyCoreMessaging.workflowMappingSessionHref : primaryCtaHref}
    user={data.user}
    onLogout={handleLogout}
    accountHref="/account"
    visualStyle="editorial"
    onMobileMenuChange={(open) => { mobileNavigationOpen = open; filmNavigationOpen.set(open); }}
  />

  <main id="main-content" class="pt-[72px]">
    {@render children()}
  </main>

  {#if isPublicMarketingRoute && !routeOwnsPerformanceEnding}
    <AgencyPerformanceHandoff />
  {/if}

  <Footer
    mode="agency"
    brandContent={usesPublicNavigation ? canonFooterBrand : undefined}
    showNewsletter={false}
    aboutText="AI-native technical support for your tools and workflows. We diagnose problems, engineer improvements, and help your team use what we deliver."
    quickLinkGroups={usesPublicNavigation ? filmFooterGroups : footerQuickLinkGroups}
    footerCta={routeOwnsPerformanceEnding
      ? undefined
      : {
          title: 'Ready to put AI to work on a useful task?',
          label: agencyCoreMessaging.membershipLabel,
          href: primaryCtaHref,
          description: 'Bring an idea or a project and one task you want help with.',
          media: agencyFooterMacroMedia
        }}
    showSocial={true}
    isAuthenticated={!!data.user}
    visualStyle="editorial"
    brandAsset={{
      src: '/brand/create-something-agency-white.svg',
      label: 'CREATE SOMETHING .agency'
    }}
  />

  {#if !routeOwnsPerformanceEnding && $page.url.pathname !== '/basketball-systems-lab' && !isDifyArticleRoute}
    <ModeIndicator current="agency" />
  {/if}
</div>

</div>

<style>
  .film-shell :global(main#main-content) { padding-top: 112px; }
  .film-home :global(main#main-content),
  .film-shell :global(main#main-content:has(.performance-campaign-opening)),
  .film-shell :global(main#main-content:has(.hero-track)) { padding-top: 0; }
  .film-shell :global(.performance-campaign-opening__content) { padding-top: max(128px, 10svh); padding-inline: 7vw; }
  .film-shell :global(main [id]) { scroll-margin-top: 112px; }
  .film-shell :global(.nav-editorial.nav-fixed) { top: 18px; left: 3vw; right: 3vw; width: auto; border: 1px solid var(--color-performance-line); border-radius: 10px; background: var(--color-performance-paper); }
  .film-shell :global(.nav-editorial .nav-inner) { width: 100%; padding-inline: 20px; }
  .film-shell :global(.nav-editorial .nav-link-list) { border: 0; background: transparent; }
  .film-shell :global(.footer-link-groups) { gap: 40px; }
  .film-shell :global(.footer-editorial-identity) { padding-block: 50px; }
  @media(max-width:700px) { .film-shell :global(.nav-editorial.nav-fixed) { top: 10px; left: 4vw; right: 4vw; } .film-shell :global(.nav-editorial .nav-inner) { padding-inline: 12px; } }

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
