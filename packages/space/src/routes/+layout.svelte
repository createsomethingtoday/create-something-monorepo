<script lang="ts">
  import { SkipToContent } from '@create-something/canon/components';
  import '../app.css';
  import { Navigation, Footer, Analytics, ModeIndicator, LayoutSEO } from '@create-something/canon';
  import { projects } from '$lib/workshop/catalog';
  import { UnifiedSearch } from '@create-something/canon/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate, onNavigate } from '$app/navigation';

  let { children } = $props();
  let mobileNavigationOpen = $state(false);
  import '$lib/workshop/workshop.css';
  const workshopShell = $derived(
    ['/', '/projects', '/about', '/workbench'].includes($page.url.pathname) ||
      $page.url.pathname.startsWith('/projects/')
  );
  const isWorkWayLocalPreview = $derived($page.url.pathname === '/workway/threshold-dwelling');

  // View Transitions API - Hermeneutic Navigation
  // .space: Experimental (300ms)
  onNavigate((navigation) => {
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
    { label: 'Projects', href: '/projects' },
    { label: 'Workbench', href: '/workbench' },
    { label: 'About', href: '/about' }
  ];

  // Quick access items for unified search
  const quickAccessItems = [
    {
      id: 'nav-projects',
      label: 'All projects',
      description: 'Tools, workflows, skills, plugins and building blocks',
      href: '/projects',
      icon: '>',
      keywords: ['catalog', 'skills', 'plugins', 'building blocks']
    },
    {
      id: 'nav-workbench',
      label: 'Workbench',
      description: 'The playground, labs and data tools',
      href: '/workbench',
      icon: '>',
      keywords: ['tools', 'practice']
    },
    ...projects.map((project) => ({
      id: `project-${project.slug}`,
      label: project.name,
      description: project.summary,
      href: `/projects/${project.slug}`,
      icon: '>',
      keywords: [project.kind, project.usage]
    })),
    {
      id: 'nav-playground',
      label: 'Code Playground',
      description: 'Execute JavaScript in Workers runtime',
      href: '/playground',
      icon: '>',
      keywords: ['code', 'run', 'execute', 'javascript']
    },
    {
      id: 'nav-praxis',
      label: 'Praxis',
      description: 'Learn integration patterns through code',
      href: '/praxis',
      icon: '>',
      keywords: ['practice', 'learn', 'patterns']
    },
    {
      id: 'nav-motion',
      label: 'Motion Lab',
      description: 'Analyze CSS animations from any URL',
      href: '/motion',
      icon: '>',
      keywords: ['animation', 'css', 'motion', 'analyze']
    },
    {
      id: 'nav-data',
      label: 'Data Studio',
      description: 'Live data dashboards and analysis',
      href: '/data',
      icon: '>',
      keywords: ['data', 'dashboard', 'nba', 'live']
    },
    {
      id: 'nav-discover',
      label: 'Discover Concepts',
      description: 'Explore concepts across CREATE SOMETHING properties',
      href: '/discover',
      icon: '>',
      keywords: ['discover', 'concepts', 'hermeneutic', 'map']
    },
    {
      id: 'nav-io',
      label: 'Go to .io',
      description: 'Research papers and documentation',
      href: 'https://createsomething.io',
      icon: '>',
      keywords: ['papers', 'research', 'read']
    },
    {
      id: 'nav-agency',
      label: 'Go to .agency',
      description: 'Custom MCP development',
      href: 'https://createsomething.agency',
      icon: '>',
      keywords: ['services', 'hire', 'build']
    }
  ];

  // Handle hash scrolling
  function scrollToHash(hash: string) {
    if (!hash) return;

    const element = document.querySelector(hash);
    if (element) {
      element.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
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
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('transitioning-in');
        setTimeout(() => document.body.classList.remove('transitioning-in'), 500);
      }
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
</script>

<LayoutSEO property="space" />

{#if isWorkWayLocalPreview}
  <main id="main-content" class="workway-local-shell">
    {@render children()}
  </main>
{:else}
  <Analytics property="space" />

  <!-- Unified Search - Cmd/Ctrl+K to open -->
  <UnifiedSearch
    currentProperty="space"
    searchApiUrl="/api/workshop"
    placeholder="Search workshop projects and tools..."
    localItems={quickAccessItems}
    showMobileButton={!mobileNavigationOpen}
    deferMobileButtonUntilCampaignExit={['/', '/workbench'].includes($page.url.pathname)}
  />

  <div
    class="layout property-performance"
    class:workshop-shell={workshopShell}
    data-canon-palette="operator"
  >
    <SkipToContent />
    <Navigation
      logo="CREATE SOMETHING"
      logoSuffix=".space"
      logoAsset={{
        src: '/brand/create-something-horizontal-black.svg',
        mobileSrc: '/brand/create-something-mark-black.svg',
        label: 'CREATE SOMETHING .space'
      }}
      links={navLinks}
      currentPath={$page.url.pathname}
      fixed={true}
      ctaLabel="GitHub"
      ctaHref="https://github.com/createsomethingtoday"
      showLogin={false}
      visualStyle="performance"
      onMobileMenuChange={(open) => (mobileNavigationOpen = open)}
    />

    <main id="main-content" class="content" tabindex="-1">
      {@render children()}
    </main>

    <Footer
      mode="space"
      showNewsletter={false}
      aboutText="The public workshop. Tools, workflows, skills, and building blocks from CREATE SOMETHING."
      quickLinks={[
        { label: 'Projects', href: '/projects' },
        { label: 'Skills', href: '/projects?type=Skill' },
        { label: 'Building blocks', href: '/projects?type=Building+block' },
        { label: 'Workbench', href: '/workbench' }
      ]}
      showSocial={true}
      visualStyle="performance"
      brandAsset={{
        src: '/brand/create-something-footer-white.svg',
        label: 'CREATE SOMETHING .space'
      }}
    />

    {#if !['/', '/projects', '/about'].includes($page.url.pathname) && !$page.url.pathname.startsWith('/projects/')}
      <ModeIndicator current="space" />
    {/if}
  </div>
{/if}

<style>
  .layout {
    min-height: 100vh;
    background: var(--color-operator-background);
  }

  .content {
    padding-top: var(--height-performance-header);
  }

  .workway-local-shell {
    min-height: 100vh;
  }
</style>
