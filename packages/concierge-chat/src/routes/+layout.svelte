<script lang="ts">
  import {
    getAgencyAccessControlPlaneSurface,
    getAgencyAccessMeta,
    getAgencyAccessStatusLabel,
    getAgencyAccessTone
  } from '$lib/agency-access';
  import { buildControlPlaneBridgeHref } from '$lib/control-plane';
  import AbundanceFooter from '$lib/site/AbundanceFooter.svelte';
  import { applicationProgress } from '$lib/site/abundance';
  import type { LayoutData } from './$types';
  import '../app.css';

  export let data: LayoutData;
  let publicNavOpen = false;
  let publicNavToggle: HTMLButtonElement | null = null;

  function closePublicNavigation() {
    publicNavOpen = false;
  }

  function handlePublicNavKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && publicNavOpen) {
      closePublicNavigation();
      publicNavToggle?.focus();
    }
  }

  function isCurrentApplicationStage(index: number) {
    return (
      (index === 0 && data.currentPath === candidateThreadHref) ||
      (index === 1 && data.currentPath === candidateProfileHref)
    );
  }

  $: controlPlaneTone = getAgencyAccessTone(data.agencyAccess);
  $: controlPlaneHref = buildControlPlaneBridgeHref(
    getAgencyAccessControlPlaneSurface(data.agencyAccess)
  );
  $: controlPlaneLabel = getAgencyAccessStatusLabel(data.agencyAccess);
  $: controlPlaneMeta = getAgencyAccessMeta(data.agencyAccess, data.user);
  $: showInternalNavigation = data.agencyAccess.status === 'allowed';
  $: candidateThreadMatch = data.currentPath.match(/^\/chat\/([^/]+)(?:\/(profile))?$/);
  $: isCandidateApplicationRoute = Boolean(candidateThreadMatch) && !showInternalNavigation;
  $: candidateThreadHref = candidateThreadMatch ? `/chat/${candidateThreadMatch[1]}` : '/apply';
  $: candidateProfileHref = candidateThreadMatch
    ? `/chat/${candidateThreadMatch[1]}/profile`
    : '/apply';
  $: isNpgClientServiceRoute = data.currentPath === '/client-service';
  $: browserIdentity = isNpgClientServiceRoute
    ? {
        favicon: '/npg-client-service/favicon-32.png',
        webclip: '/npg-client-service/apple-touch-icon.png',
        manifest: '/npg-client-service/site.webmanifest'
      }
    : {
        favicon: '/abundance/favicon-32.png',
        webclip: '/abundance/apple-touch-icon.png',
        manifest: '/abundance/site.webmanifest'
      };
  $: usesWebflowShell =
    data.currentPath === '/' ||
    data.currentPath === '/nurses' ||
    data.currentPath === '/jobs' ||
    data.currentPath === '/facilities' ||
    data.currentPath === '/agents' ||
    data.currentPath === '/voice' ||
    data.currentPath === '/client-service' ||
    data.currentPath === '/apply' ||
    data.currentPath.startsWith('/apply/') ||
    data.currentPath === '/style-guide' ||
    isCandidateApplicationRoute;
  $: isPublicIntakeRoute =
    data.currentPath === '/' ||
    data.currentPath === '/nurses' ||
    data.currentPath === '/jobs' ||
    data.currentPath === '/facilities' ||
    data.currentPath === '/agents' ||
    data.currentPath === '/voice' ||
    data.currentPath === '/client-service' ||
    data.currentPath === '/apply' ||
    data.currentPath.startsWith('/apply/');
  $: isApplyRoute = data.currentPath === '/apply' || data.currentPath.startsWith('/apply/');
  $: showCompactStaffAccess = isPublicIntakeRoute || !showInternalNavigation;
  $: navItems = isCandidateApplicationRoute
    ? [
        { href: candidateThreadHref, label: 'Conversation' },
        { href: candidateProfileHref, label: 'Details' }
      ]
    : isPublicIntakeRoute || !showInternalNavigation
      ? [
          { href: '/', label: 'Home' },
          { href: '/nurses', label: 'For nurses' },
          { href: '/jobs', label: 'Open roles' },
          { href: '/facilities', label: 'For facilities' },
          { href: '/agents', label: 'How it works' }
        ]
      : [
          { href: '/', label: 'Home' },
          { href: '/nurses', label: 'Nurses' },
          { href: '/voice', label: 'Voice' },
          { href: '/client-service', label: 'NPG service' },
          { href: '/jobs', label: 'Jobs' },
          { href: '/facilities', label: 'Facilities' },
          { href: '/apply', label: 'Apply' },
          { href: '/agents', label: 'Agents' },
          { href: '/style-guide', label: 'Style' },
          { href: '/chat', label: 'Workspace' },
          { href: '/settings', label: 'Settings' }
        ];
</script>

<svelte:head>
  <meta name="theme-color" content="#171512" />
  <link rel="icon" href={browserIdentity.favicon} sizes="32x32" type="image/png" />
  <link rel="apple-touch-icon" href={browserIdentity.webclip} sizes="180x180" />
  <link rel="manifest" href={browserIdentity.manifest} />
</svelte:head>

<svelte:window on:keydown={handlePublicNavKeydown} />

<a class="skip-link" href="#main-content">Skip to main content</a>

{#if usesWebflowShell}
  <div class:application-workspace={isCandidateApplicationRoute} class="abundance-webflow-page">
    <header class:application-nav={isCandidateApplicationRoute} class="webflow-nav">
      <a
        class:npg-service-logo={isNpgClientServiceRoute}
        class="webflow-logo"
        href={isNpgClientServiceRoute ? '/client-service' : '/'}
        aria-label={isNpgClientServiceRoute ? 'NPG Client Service home' : 'Abundance Staffing home'}
      >
        <span class="webflow-logo-mark">
          <img
            src={isNpgClientServiceRoute
              ? '/npg-client-service/logo-mark.png'
              : '/abundance/logo-mark.png'}
            alt=""
            class="webflow-logo-image"
            aria-hidden="true"
          />
        </span>
        <span class="webflow-logo-copy">
          <strong>{isNpgClientServiceRoute ? 'NPG' : 'Abundance'}</strong>
          <small>{isNpgClientServiceRoute ? 'Client Service' : 'Staffing'}</small>
        </span>
      </a>
      <button
        class="webflow-nav-toggle"
        class:open={publicNavOpen}
        type="button"
        aria-label={publicNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={publicNavOpen}
        aria-controls="primary-navigation"
        bind:this={publicNavToggle}
        on:click={() => (publicNavOpen = !publicNavOpen)}
      >
        <span></span>
        <span></span>
      </button>
      <nav
        class:open={publicNavOpen}
        class="webflow-nav-links"
        id="primary-navigation"
        aria-label={isCandidateApplicationRoute ? 'Application navigation' : 'Public navigation'}
      >
        {#each navItems as item}
          <a
            href={item.href}
            aria-current={data.currentPath === item.href ? 'page' : undefined}
            on:click={closePublicNavigation}>{item.label}</a
          >
        {/each}
        {#if !isCandidateApplicationRoute}
          <div class="webflow-mobile-menu-actions">
            <a
              class="webflow-mobile-primary-action"
              href="/apply"
              aria-current={isApplyRoute ? 'page' : undefined}
              on:click={closePublicNavigation}
            >Start application <span aria-hidden="true">↗</span></a>
            <a
              class="webflow-mobile-menu-action"
              href={controlPlaneHref}
              target="_blank"
              rel="noreferrer"
              on:click={closePublicNavigation}
            >Staff access <span aria-hidden="true">↗</span></a>
          </div>
        {:else}
          <a
            class="webflow-mobile-menu-action"
            href="/"
            on:click={closePublicNavigation}
          >Exit application <span aria-hidden="true">↗</span></a>
        {/if}
      </nav>
      {#if isCandidateApplicationRoute}
        <a class="webflow-staff-link application-exit" href="/" aria-label="Exit application">
          <span>Exit application</span>
          <span aria-hidden="true">↗</span>
        </a>
      {:else}
        <div class="webflow-nav-actions">
          <a
            class="webflow-staff-link"
            href={controlPlaneHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Open staff access"
          >
            <span>Staff access</span>
            <span aria-hidden="true">↗</span>
          </a>
          <a
            class="webflow-primary-action"
            href="/apply"
            aria-current={isApplyRoute ? 'page' : undefined}
          >Start application <span aria-hidden="true">↗</span></a>
        </div>
      {/if}
    </header>

    {#if isCandidateApplicationRoute}
      <div class="application-route-rail" aria-label="Application progress">
        <div>
          <span class="application-route-kicker">Guided nurse application</span>
          <strong>One conversation, kept in context.</strong>
        </div>
        <ol>
          {#each applicationProgress as step, index}
            <li class:active={isCurrentApplicationStage(index)}>
              <span>0{index + 1}</span> {step.label}
            </li>
          {/each}
        </ol>
      </div>
    {/if}

    <main
      id="main-content"
      class:public-main={isPublicIntakeRoute}
      class:application-main={isCandidateApplicationRoute}
    >
      <slot />
    </main>
  </div>
{:else}
  <div class="app-shell">
    <header class="app-nav glass">
      <a class="brand-lockup" href="/">
        <span class="brand-mark" aria-hidden="true">
          <img src="/abundance/logo-mark.png" alt="" class="brand-mark-image" aria-hidden="true" />
        </span>
        <span>
          <span class="brand">Abundance Staffing</span>
          <span class="brand-note">Nurse staffing</span>
        </span>
      </a>

      <div class="nav-cluster">
        <nav>
          {#each navItems as item}
            <a href={item.href} aria-current={data.currentPath === item.href ? 'page' : undefined}
              >{item.label}</a
            >
          {/each}
        </nav>

        <a
          class={`session-link ${data.agencyAccess.status} ${showCompactStaffAccess ? 'public' : ''}`}
          href={controlPlaneHref}
          target="_blank"
          rel="noreferrer"
        >
          {#if showCompactStaffAccess}
            <span class="session-public-label">Staff sign-in</span>
          {:else}
            <span class={`status-pill ${controlPlaneTone}`}>{controlPlaneLabel}</span>
            <span class="session-meta">{controlPlaneMeta}</span>
          {/if}
        </a>
      </div>
    </header>

    <main id="main-content" class:public-main={isPublicIntakeRoute}>
      <slot />
    </main>
  </div>
{/if}

{#if isPublicIntakeRoute}
  <AbundanceFooter />
{/if}

<style>
  .skip-link {
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 100;
    padding: 10px 14px;
    border-radius: 999px;
    background: #171512;
    color: #ffffff;
    font-weight: 650;
    text-decoration: none;
    transform: translateY(-160%);
    transition: transform 140ms ease;
  }

  .skip-link:focus {
    transform: translateY(0);
  }

  .app-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 0.8rem 0.9rem;
    margin-bottom: clamp(1.4rem, 3vw, 2.4rem);
    position: sticky;
    top: 1rem;
    z-index: 10;
    border-radius: var(--radius);
  }

  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    min-width: max-content;
    text-decoration: none;
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 999px;
    background: #fffaf4;
    border: 1px solid rgba(175, 124, 84, 0.18);
    overflow: hidden;
  }

  .brand-mark-image {
    width: 1.62rem;
    height: 1.62rem;
    object-fit: contain;
    display: block;
  }

  .brand {
    display: block;
    font-family: var(--font-display);
    font-size: var(--text-body-lg, 1.05rem);
    font-weight: var(--font-medium, 500);
    line-height: 1.05;
    letter-spacing: 0;
  }

  .brand-note {
    display: block;
    margin-top: 0.15rem;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .app-nav nav {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .nav-cluster {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .app-nav nav a {
    padding: 0.52rem 0.78rem;
    border-radius: 999px;
    text-decoration: none;
    background: transparent;
    border: 1px solid var(--line);
    color: var(--ink-soft);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition:
      background 140ms ease,
      border-color 140ms ease,
      transform 140ms ease;
  }

  .app-nav nav a:hover {
    background: var(--surface-overlay-strong);
    border-color: var(--line-strong);
    transform: translateY(-1px);
  }

  .session-link {
    display: grid;
    gap: 0.35rem;
    justify-items: end;
    text-decoration: none;
  }

  .session-link.public {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.52rem 0.86rem;
    border-radius: 999px;
    background: var(--surface-soft);
    border: 1px solid var(--line);
  }

  .session-public-label {
    color: var(--accent-warm);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    line-height: 1;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .session-meta {
    color: var(--muted);
    font-size: 0.82rem;
  }

  main {
    padding-bottom: 3rem;
  }

  main.public-main {
    padding-bottom: 0;
  }

  .abundance-webflow-page :global(.container-full) {
    width: 100%;
  }

  .webflow-nav {
    position: sticky;
    top: 16px;
    z-index: 30;
    display: grid;
    grid-template-columns: minmax(170px, 1fr) auto minmax(150px, 1fr);
    align-items: center;
    gap: 18px;
    width: min(calc(100% - 48px), 1380px);
    margin: 24px auto 0;
    padding: 8px 9px 8px 12px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 84%, transparent);
    box-shadow: var(--shadow-soft);
    backdrop-filter: blur(24px) saturate(1.2);
  }

  .webflow-logo,
  .webflow-nav-links,
  .webflow-nav-actions,
  .webflow-staff-link,
  .webflow-primary-action {
    position: relative;
    z-index: 1;
  }

  .webflow-logo {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: #171512;
    line-height: 1;
    text-decoration: none;
  }

  .webflow-logo-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: #ffffff;
    border: 1px solid rgba(23, 21, 18, 0.1);
    overflow: hidden;
  }

  .webflow-logo-image {
    display: block;
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  .webflow-logo.npg-service-logo .webflow-logo-image {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
  }

  .webflow-logo-copy {
    display: grid;
    gap: 2px;
  }

  .webflow-logo-copy strong {
    font-size: 14px;
    font-weight: 620;
    letter-spacing: -0.015em;
  }

  .webflow-logo-copy small {
    color: rgba(23, 21, 18, 0.52);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .webflow-nav-links {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .webflow-nav-links a {
    padding: 12px 14px;
    border: 0;
    border-radius: 10px;
    color: var(--muted-strong);
    font-size: 13px;
    line-height: 1;
    font-weight: 510;
    letter-spacing: -0.01em;
    text-decoration: none;
    transition:
      color 160ms ease,
      background 160ms ease;
  }

  .webflow-nav-links a:hover,
  .webflow-nav-links a[aria-current='page'] {
    background: var(--accent-secondary-soft);
    color: var(--button-bg);
  }

  .webflow-nav-actions {
    display: flex;
    align-items: center;
    justify-self: end;
    gap: 6px;
  }

  .webflow-staff-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    padding: 0 10px;
    border-radius: var(--radius-tight);
    background: transparent;
    color: var(--muted-strong);
    font-size: 12px;
    font-weight: 520;
    text-decoration: none;
  }

  .webflow-staff-link span:last-child {
    color: var(--button-bg);
  }

  .webflow-staff-link:hover {
    color: var(--button-bg);
  }

  .webflow-primary-action {
    display: inline-flex;
    min-height: 46px;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0 14px 0 17px;
    border-radius: var(--radius-tight);
    background: var(--button-bg);
    color: var(--button-ink);
    font-size: 13px;
    font-weight: 620;
    text-decoration: none;
  }

  .webflow-primary-action span:last-child {
    font-size: 16px;
    line-height: 1;
  }

  .application-workspace {
    min-height: 100vh;
    background:
      radial-gradient(circle at 88% 8%, rgba(29, 111, 138, 0.1), transparent 24rem),
      radial-gradient(circle at 8% 34%, rgba(175, 124, 84, 0.12), transparent 28rem), #faf5ef;
  }

  .webflow-nav.application-nav {
    grid-template-columns: minmax(170px, 1fr) auto minmax(170px, 1fr);
  }

  .application-nav .webflow-nav-links {
    padding: 3px;
    border: 1px solid rgba(23, 21, 18, 0.1);
    border-radius: 999px;
    background: rgba(23, 21, 18, 0.035);
  }

  .application-nav .webflow-nav-links a {
    min-width: 112px;
    text-align: center;
  }

  .application-exit {
    background: transparent;
    color: var(--button-bg);
    box-shadow: inset 0 0 0 1px var(--line-strong);
  }

  .application-exit span:last-child {
    color: var(--button-bg);
  }

  .application-route-rail {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 28px;
    width: min(calc(100% - 48px), 1380px);
    margin: clamp(56px, 7vw, 92px) auto 0;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(23, 21, 18, 0.12);
  }

  .application-route-rail > div {
    display: grid;
    gap: 8px;
  }

  .application-route-kicker,
  .application-route-rail li span {
    color: #af7c54;
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 1;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .application-route-rail strong {
    font-size: clamp(19px, 2vw, 26px);
    font-weight: 540;
    letter-spacing: -0.035em;
  }

  .application-route-rail ol {
    display: flex;
    gap: 22px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .application-route-rail li {
    display: grid;
    gap: 7px;
    min-width: 92px;
    color: rgba(23, 21, 18, 0.42);
    font-size: 12px;
    font-weight: 560;
  }

  .application-route-rail li.active {
    color: #171512;
  }

  .application-main {
    width: min(calc(100% - 48px), 1380px);
    margin: 0 auto;
    padding: clamp(26px, 4vw, 52px) 0 96px;
  }

  .webflow-nav-toggle {
    display: none;
  }

  .webflow-mobile-menu-action {
    display: none;
  }

  .webflow-mobile-menu-actions,
  .webflow-mobile-primary-action {
    display: none;
  }

  @media (max-width: 1080px) {
    .webflow-nav {
      top: 10px;
      grid-template-columns: 1fr auto;
      width: calc(100% - 24px);
      margin-top: 12px;
      padding-left: 10px;
    }

    .webflow-nav-links {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      left: 0;
      display: none;
      align-items: stretch;
      justify-content: stretch;
      gap: 2px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface) 98%, transparent);
      box-shadow: var(--shadow);
      backdrop-filter: blur(24px);
    }

    .webflow-nav-links.open {
      display: grid;
    }

    .application-nav .webflow-nav-links {
      border-radius: var(--radius);
    }

    .application-nav .webflow-nav-links a {
      min-width: 0;
      text-align: left;
    }

    .webflow-mobile-menu-actions {
      display: grid;
      gap: 6px;
      margin-top: 6px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
    }

    .webflow-mobile-primary-action,
    .webflow-mobile-menu-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .webflow-mobile-primary-action {
      background: var(--button-bg) !important;
      color: var(--button-ink) !important;
    }

    .webflow-mobile-menu-action {
      color: var(--muted-strong) !important;
    }

    .webflow-nav-actions {
      display: none;
    }

    .application-nav > .application-exit {
      display: none;
    }

    .application-nav .webflow-logo-copy {
      display: none;
    }

    .application-nav .webflow-logo {
      min-width: 44px;
    }

    .application-route-rail {
      align-items: start;
      width: calc(100% - 28px);
      margin-top: 42px;
    }

    .application-route-rail ol {
      gap: 12px;
    }

    .application-route-rail li {
      min-width: 0;
    }

    .application-main {
      width: calc(100% - 28px);
      padding-top: 24px;
    }

    .webflow-nav-links a {
      min-height: 48px;
      align-items: center;
      padding: 0 14px;
      border-radius: var(--radius-tight);
      font-size: 15px;
      text-align: left;
    }

    .webflow-nav-links > a[aria-current='page'] {
      box-shadow: inset 3px 0 0 var(--accent-secondary);
    }

    .webflow-nav-toggle {
      display: grid;
      place-content: center;
      gap: 5px;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid rgba(23, 21, 18, 0.12);
      border-radius: 999px;
      background: transparent;
      box-shadow: none;
    }

    .webflow-nav-toggle span {
      display: block;
      width: 17px;
      height: 1px;
      background: var(--button-bg);
      transition: transform 140ms ease;
    }

    .webflow-nav-toggle.open span:first-child {
      transform: translateY(3px) rotate(45deg);
    }

    .webflow-nav-toggle.open span:last-child {
      transform: translateY(-3px) rotate(-45deg);
    }

    .webflow-staff-link {
      min-height: 44px;
      padding-left: 14px;
    }

    .webflow-staff-link span:first-child {
      display: none;
    }

    .app-nav {
      flex-direction: column;
      align-items: stretch;
    }

    .nav-cluster,
    .app-nav nav {
      justify-content: space-between;
      justify-items: stretch;
    }

    .session-link {
      justify-items: start;
    }

    .session-link.public {
      justify-content: flex-start;
    }
  }

  @media (max-width: 640px) {
    .application-route-rail {
      display: grid;
      gap: 20px;
    }

    .application-route-rail ol {
      width: 100%;
      justify-content: space-between;
    }

    .application-route-rail li {
      font-size: 11px;
    }

    .application-route-rail li:last-child {
      text-align: right;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .webflow-nav-links a,
    .webflow-nav-toggle span {
      transition: none;
    }
  }
</style>
