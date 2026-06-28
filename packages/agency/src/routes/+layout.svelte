<script lang="ts">
  import '../app.css';
  import { Navigation, Footer, ModeIndicator } from '@create-something/canon';
  import { UnifiedSearch } from '@create-something/canon/navigation';
  import PrivacyAnalytics from '$lib/components/PrivacyAnalytics.svelte';
  import { getAgencyContentAssetAnalyticsMetadata } from '$lib/analytics/content-assets';
  import { getAgencyMarketingExperimentMetadata } from '$lib/analytics/marketing-experiment';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate, disableScrollHandling, goto, onNavigate } from '$app/navigation';
  import {
    isAgencyDifyArticlePath,
    usesCompactAgencyPrivacyPrompt
  } from '$lib/atlas/surface-policy';

  let { children, data } = $props();

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

  const navLinks = [
    { label: 'How I Work', href: '/services' },
    { label: 'Stack Boundary', href: '/stack' },
    { label: 'Proof', href: '/products' }
  ];
  const primaryCtaHref = agencyCoreMessaging.startWithWorkflowHref;
  const globalAnalyticsMetadata = $derived(getAgencyGlobalAnalyticsMetadata($page.url.pathname));
  const isDifyArticleRoute = $derived(isAgencyDifyArticlePath($page.url.pathname));
  const useCompactPrivacyPrompt = $derived(usesCompactAgencyPrivacyPrompt($page.url.pathname));
  const footerQuickLinkGroups = [
    {
      title: 'Commercial',
      ariaLabel: 'Commercial paths',
      links: [
        { label: 'How I Work', href: '/services' },
        { label: 'Stack Boundary', href: '/stack' },
        { label: 'Proof', href: '/products' },
        { label: 'About', href: '/about' }
      ]
    },
    {
      title: 'Partner Lanes',
      ariaLabel: 'Partner lanes',
      links: [
        { label: 'Partners', href: '/partners' },
        { label: 'Cloudflare', href: '/cloudflare' },
        { label: 'Dify', href: '/dify' },
        { label: 'Notion', href: '/notion' }
      ]
    },
    {
      title: 'Guides',
      ariaLabel: 'Guides and articles',
      links: [
        { label: 'Dify MCP Control Plane', href: '/dify/mcp-control-plane' },
        { label: 'Dify Agent Eval Gates', href: '/dify/agent-eval-gates' },
        { label: 'Ship Dify With MCP', href: '/dify/ship-dify-app-with-mcp-tools' },
        { label: 'Dify Content Engine', href: '/dify/content-engine' },
        { label: 'Dify vs n8n', href: '/dify/n8n-vs-dify' },
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
      label: 'How I Work',
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
      label: 'Stack Boundary',
      description: 'Vendor boundaries, ownership, and the control layer around the workflow',
      href: '/stack',
      icon: '🧭',
      keywords: [
        'stack',
        'vendors',
        'boundaries',
        'composio',
        'cloudflare',
        'webflow',
        'dify',
        'openai',
        'trust layer'
      ]
    },
    {
      id: 'nav-partners',
      label: 'Partners',
      description: 'Unified Dify, Cloudflare, and Notion partner application stack',
      href: '/partners',
      icon: 'P',
      keywords: [
        'partners',
        'partner stack',
        'dify',
        'cloudflare',
        'notion',
        'affiliate',
        'marketplace',
        'solutions partner'
      ]
    },
    {
      id: 'nav-cloudflare',
      label: 'Cloudflare',
      description:
        'Cloudflare runtime substrate, PowerUP consult path, and agency account-management lane',
      href: '/cloudflare',
      icon: 'CF',
      keywords: [
        'cloudflare',
        'partner',
        'powerup',
        'workers',
        'pages',
        'd1',
        'durable objects',
        'remote mcp',
        'self-serve agency'
      ]
    },
    {
      id: 'nav-dify',
      label: 'Dify',
      description: 'Dify implementation lane, partner application proof, and affiliate funnel',
      href: '/dify',
      icon: 'D',
      keywords: [
        'dify',
        'partner',
        'affiliate',
        'marketplace',
        'service partner',
        'agent runtime',
        'trust layer'
      ]
    },
    {
      id: 'nav-dify-content',
      label: 'Dify Content Engine',
      description:
        'Custom-domain Dify content strategy with Substack distribution and affiliate conversion targets',
      href: '/dify/content-engine',
      icon: 'DC',
      keywords: [
        'dify',
        'affiliate',
        'content engine',
        'substack',
        'blog',
        'custom domain',
        'newsletter'
      ]
    },
    {
      id: 'nav-dify-eval-gates',
      label: 'Dify Agent Eval Gates',
      description:
        'Eval gates for API health, expected tool use, blocked actions, approvals, secret refusal, and cost limits',
      href: '/dify/agent-eval-gates',
      icon: 'DG',
      keywords: [
        'dify',
        'eval gates',
        'agent evals',
        'mcp testing',
        'approval gates',
        'secret refusal',
        'policy os'
      ]
    },
    {
      id: 'nav-dify-ship-mcp',
      label: 'Ship Dify With MCP',
      description:
        'Field guide for shipping one Dify app with scoped MCP tools, approvals, eval gates, and proof',
      href: '/dify/ship-dify-app-with-mcp-tools',
      icon: 'DS',
      keywords: [
        'dify',
        'mcp tools',
        'ship dify app',
        'implementation guide',
        'policy os',
        'agent governance',
        'approval gates'
      ]
    },
    {
      id: 'nav-dify-n8n',
      label: 'Dify vs n8n',
      description: 'How n8n workflows Cloudflare runtime and Dify agent apps fit together',
      href: '/dify/n8n-vs-dify',
      icon: 'DN',
      keywords: [
        'dify',
        'n8n',
        'workflow automation',
        'agent apps',
        'cloudflare',
        'mcp',
        'comparison'
      ]
    },
    {
      id: 'nav-notion',
      label: 'Notion',
      description:
        'Notion Solutions Partner lane, templates, builders, and operator workspace proof',
      href: '/notion',
      icon: 'N',
      keywords: [
        'notion',
        'solutions partner',
        'templates',
        'builders',
        'workers',
        'mcp',
        'operator workspace'
      ]
    },
    {
      id: 'nav-products',
      label: 'Proof',
      description: 'Delivery records, tools, and examples that show how the service works',
      href: '/products',
      icon: '📦',
      keywords: ['portfolio', 'tools', 'integrations', 'proof surfaces']
    },
    {
      id: 'nav-self-map',
      label: agencyCoreMessaging.startWithWorkflowLabel,
      description: 'Start a lightweight workflow map before booking',
      href: agencyCoreMessaging.startWithWorkflowHref,
      icon: 'WF',
      keywords: ['contact', 'hire', 'start', 'workflow', 'self map', 'trust map', 'mapping']
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
    visualStyle="clear"
  />

  <main id="main-content" class="pt-[72px]">
    {@render children()}
  </main>

  <Footer
    mode="agency"
    showNewsletter={false}
    aboutText="Calm, transparent, reliable workflow systems for operator-owned outcomes: clear operating boundaries, evidence-backed delivery, and escalation only when judgment is required."
    quickLinkGroups={footerQuickLinkGroups}
    footerCta={{
      label: agencyCoreMessaging.startWithWorkflowLabel,
      href: primaryCtaHref,
      description: 'Start a lightweight workflow map before booking.'
    }}
    showSocial={true}
    isAuthenticated={!!data.user}
    visualStyle="clear"
  />

  {#if $page.url.pathname !== '/' && $page.url.pathname !== '/basketball-systems-lab' && !isDifyArticleRoute}
    <ModeIndicator current="agency" />
  {/if}
</div>

<style>
  .layout-root {
    background: var(--color-clear-porcelain, #f9f9f9);
  }
</style>
