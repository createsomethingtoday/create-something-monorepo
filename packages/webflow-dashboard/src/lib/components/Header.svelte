<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Button } from './ui';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { LogOut, UserCircle } from 'lucide-svelte';
  import { DUR, EASE, ScrollTrigger, gsap, motionOK } from '$lib/motion/core';

  interface Props {
    onLogout?: () => void;
    onProfileClick?: () => void;
    showMarketplace?: boolean;
  }

  let { onLogout, onProfileClick, showMarketplace = true }: Props = $props();

  const navItems = $derived.by(() =>
    [
      { href: '/dashboard', label: 'Dashboard' },
      showMarketplace ? { href: '/marketplace', label: 'Marketplace' } : null,
      { href: '/validation', label: 'Validation' }
    ].filter((item): item is { href: string; label: string } => item !== null)
  );

  // An asset detail page belongs to the dashboard, so Dashboard stays current there.
  function isCurrent(href: string, pathname: string): boolean {
    if (pathname === href || pathname.startsWith(href + '/')) return true;
    return href === '/dashboard' && pathname.startsWith('/assets/');
  }

  let headerEl = $state<HTMLElement | null>(null);
  let navEl = $state<HTMLElement | null>(null);
  let pillEl = $state<HTMLElement | null>(null);
  let barEl = $state<HTMLElement | null>(null);
  let pillVisible = false;

  function measure(link: HTMLElement) {
    return { x: link.offsetLeft, width: link.offsetWidth };
  }

  // Hover: one pill slides between links instead of each link lighting up alone.
  function movePill(link: HTMLElement) {
    if (!pillEl) return;
    const target = measure(link);
    if (!motionOK() || !pillVisible) {
      gsap.set(pillEl, target);
      gsap.to(pillEl, { autoAlpha: 1, duration: motionOK() ? DUR.micro : 0 });
    } else {
      gsap.to(pillEl, { ...target, duration: 0.32, ease: EASE.out, overwrite: 'auto' });
      gsap.to(pillEl, { autoAlpha: 1, duration: DUR.micro });
    }
    pillVisible = true;
  }

  function hidePill() {
    if (!pillEl) return;
    pillVisible = false;
    gsap.to(pillEl, { autoAlpha: 0, duration: motionOK() ? DUR.fast : 0, overwrite: 'auto' });
  }

  // Current page: a bar on the header edge that travels to the new link.
  function placeBar(animate: boolean) {
    if (!barEl || !navEl) return;
    const current = navEl.querySelector<HTMLElement>('.nav-link.active');
    if (!current) {
      gsap.to(barEl, { autoAlpha: 0, duration: 0.15 });
      return;
    }
    const target = { ...measure(current), autoAlpha: 1 };
    const wasVisible = gsap.getProperty(barEl, 'opacity') !== 0;
    if (animate && wasVisible && motionOK()) {
      gsap.to(barEl, { ...target, duration: 0.5, ease: 'power3.inOut', overwrite: 'auto' });
    } else {
      gsap.set(barEl, { x: target.x, width: target.width });
      gsap.to(barEl, { autoAlpha: 1, duration: motionOK() ? DUR.fast : 0 });
    }
  }

  let mounted = false;
  $effect(() => {
    void $page.url.pathname;
    void navItems;
    if (!mounted) return;
    // Wait for the `active` class to land on the new link.
    requestAnimationFrame(() => placeBar(true));
  });

  onMount(() => {
    mounted = true;
    placeBar(false);

    const onResize = () => placeBar(false);
    window.addEventListener('resize', onResize);
    void document.fonts?.ready.then(() => placeBar(false));

    // `--header-offset` tells pinned content below (the asset list toolbar and
    // column header) where the header ends, including while it is tucked away.
    const header = headerEl;
    const root = document.documentElement;
    const offset = { value: header?.offsetHeight ?? 0 };
    const applyOffset = () => root.style.setProperty('--header-offset', `${offset.value}px`);
    applyOffset();

    let hidden = false;
    const setHidden = (next: boolean) => {
      if (!header || next === hidden) return;
      hidden = next;
      const duration = motionOK() ? 0.34 : 0;
      // A little past its own height, so the current-page bar on its edge leaves too.
      gsap.to(header, { yPercent: next ? -108 : 0, duration, ease: EASE.inOut, overwrite: 'auto' });
      gsap.to(offset, {
        value: next ? 0 : header.offsetHeight,
        duration,
        ease: EASE.inOut,
        overwrite: 'auto',
        onUpdate: applyOffset
      });
    };

    const observer = new ResizeObserver(() => {
      if (hidden || !header) return;
      offset.value = header.offsetHeight;
      applyOffset();
    });
    if (header) observer.observe(header);

    // Scroll: the header lifts off the page once content moves under it, tucks
    // away while reading down a long page, and returns on the way back up.
    let turnedAt = 0;
    let direction = 1;
    const trigger = ScrollTrigger.create({
      start: 8,
      end: 'max',
      onToggle: (self) => header?.classList.toggle('is-scrolled', self.isActive),
      onUpdate: (self) => {
        const y = self.scroll();
        if (self.direction !== direction) {
          direction = self.direction;
          turnedAt = y;
        }
        if (y < 320) setHidden(false);
        else if (direction === 1 && y - turnedAt > 48) setHidden(true);
        else if (direction === -1 && turnedAt - y > 24) setHidden(false);
      },
      onLeaveBack: () => setHidden(false)
    });

    // Keyboard focus moving into a tucked-away header brings it back.
    const onFocusIn = () => setHidden(false);
    header?.addEventListener('focusin', onFocusIn);

    return () => {
      window.removeEventListener('resize', onResize);
      header?.removeEventListener('focusin', onFocusIn);
      observer.disconnect();
      trigger.kill();
      root.style.removeProperty('--header-offset');
    };
  });
</script>

<header class="header" bind:this={headerEl}>
  <div class="header-content">
    <div class="header-main">
      <div class="nav-cluster">
        <div class="brand-lockup">
          <a href="/dashboard" class="logo">
            <svg
              class="webflow-logo"
              width="38"
              height="24"
              viewBox="0 0 1080 674"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M1080 0L735.386 673.684H411.696L555.916 394.481H549.445C430.464 548.934 252.942 650.61 0 673.684V398.344C0 398.344 161.813 388.787 256.939 288.776H0V0.0053214H288.771V237.515L295.253 237.489L413.255 0.0053214H631.645V236.009L638.126 235.999L760.556 0H1080Z"
                fill="currentColor"
              />
            </svg>
            <span class="logo-text">Asset Dashboard</span>
          </a>
        </div>

        <nav
          class="nav-links"
          aria-label="Primary navigation"
          bind:this={navEl}
          onpointerleave={hidePill}
          onfocusout={hidePill}
        >
          <span class="nav-pill" bind:this={pillEl} aria-hidden="true"></span>
          {#each navItems as item}
            {@const current = isCurrent(item.href, $page.url.pathname)}
            <a
              href={item.href}
              class="nav-link"
              class:active={current}
              aria-current={current ? 'page' : undefined}
              onpointerenter={(event) => movePill(event.currentTarget)}
              onfocus={(event) => movePill(event.currentTarget)}
            >
              {item.label}
            </a>
          {/each}
          <span class="nav-bar" bind:this={barEl} aria-hidden="true"></span>
        </nav>
      </div>

      <div class="header-right">
        <DarkModeToggle />
        {#if onProfileClick}
          <Button variant="ghost" class="header-action" aria-label="Profile" onclick={onProfileClick}>
            <UserCircle size={18} />
            <span class="profile-text">Profile</span>
          </Button>
        {/if}
        {#if onLogout}
          <Button variant="ghost" class="header-action" aria-label="Logout" onclick={onLogout}>
            <span class="logout-icon"><LogOut size={18} /></span>
            <span class="logout-text">Logout</span>
          </Button>
        {/if}
      </div>
    </div>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    border-bottom: 1px solid var(--color-shell-border-default);
    background: var(--color-shell-surface);
    box-shadow: none;
    backdrop-filter: blur(10px);
    transition:
      box-shadow var(--duration-standard) var(--ease-standard),
      background-color var(--duration-standard) var(--ease-standard);
  }

  /* Set by ScrollTrigger once content scrolls under the header. */
  .header:global(.is-scrolled) {
    background: color-mix(in srgb, var(--color-bg-pure) 86%, transparent);
    box-shadow: var(--color-shell-shadow-strong);
  }

  .header-content {
    max-width: var(--layout-header-max-width);
    margin: 0 auto;
    padding: 0.75rem var(--space-md);
  }

  .header-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-md);
    min-width: 0;
  }

  .nav-cluster {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: start;
    column-gap: 1rem;
    min-width: 0;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    padding-left: 0.125rem;
    min-width: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 0.5rem 0.4rem 0.5rem 0;
    border-radius: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    text-decoration: none;
    color: var(--color-info);
    flex-shrink: 0;
  }

  .webflow-logo {
    flex-shrink: 0;
  }

  .logo-text {
    font-family: var(--font-heading);
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    letter-spacing: 0.01em;
    color: var(--color-fg-primary);
  }

  .nav-links {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    min-width: 0;
  }

  /* Both are placed by GSAP from the link they belong to. */
  .nav-pill,
  .nav-bar {
    position: absolute;
    left: 0;
    width: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .nav-pill {
    top: 50%;
    height: 2.25rem;
    margin-top: -1.125rem;
    border-radius: 0.625rem;
    background: var(--color-bg-subtle);
  }

  .nav-bar {
    /* Sits on the header's bottom border. */
    bottom: calc(-0.75rem - 1px);
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: var(--color-info);
  }

  .nav-links::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    position: relative;
    flex: 0 0 auto;
    padding: 0.65rem 0.75rem;
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    text-decoration: none;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: 0.625rem;
    transition:
      color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .nav-link:hover {
    color: var(--color-fg-primary);
  }

  /* Without the moving pill (no JS), each link still shows its own hover. */
  :global(html:not(.js-motion)) .nav-link:hover {
    background: var(--color-bg-subtle);
  }

  .nav-link.active {
    color: var(--color-info-ink);
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  .nav-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px var(--color-info-muted);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
    flex-shrink: 0;
    padding-left: 0.25rem;
  }

  .header-right :global(.header-action) {
    height: 2.5rem;
    padding-inline: 0.9rem;
    color: var(--color-fg-secondary);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-shell-border-default);
    box-shadow: none;
  }

  .header-right :global(.header-action:hover:not(:disabled)) {
    background: var(--color-bg-subtle);
    border-color: var(--color-shell-border-strong);
    transform: none;
  }

  .profile-text {
    display: inline;
  }

  .logout-icon {
    display: none;
  }

  /* Small screens: brand and account actions share the first row, the
     section links take the second. Two rows, not three. */
  @media (max-width: 767px) {
    .header-content {
      padding-block: 0.5rem 0;
    }

    .header-main {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'brand actions'
        'nav nav';
      gap: 0.25rem var(--space-sm);
    }

    .nav-cluster {
      display: contents;
    }

    .brand-lockup {
      grid-area: brand;
    }

    .nav-links {
      grid-area: nav;
      margin-inline: -0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .nav-link {
      padding-block: 0.7rem;
    }

    .nav-bar {
      bottom: 0;
    }

    .header-right {
      grid-area: actions;
      gap: 0.35rem;
    }

    .profile-text,
    .logout-text {
      display: none;
    }

    .logout-icon {
      display: inline-flex;
    }

    .header-right :global(.header-action) {
      width: 2.75rem;
      height: 2.75rem;
    }

    /* The icon keeps its size and centers in the square button. */
    .header-right :global(.header-action svg) {
      flex-shrink: 0;
    }
  }
</style>
