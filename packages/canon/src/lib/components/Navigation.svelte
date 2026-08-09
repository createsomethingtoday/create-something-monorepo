<script lang="ts">
  import { CubeMark } from '../brand/marks/index.js';
  import { UserMenu } from '../auth/components/index.js';
  import type { User } from '../auth/types.js';

  interface NavLink {
    label: string;
    href: string;
    children?: Array<{
      label: string;
      href: string;
      description?: string;
    }>;
  }

  type NavigationVisualStyle = 'classic' | 'performance' | 'clear' | 'editorial';

  interface Props {
    logo: string;
    logoSuffix?: string;
    /** Keep the company name visible beside the mark on narrow performance shells. */
    showMobileLogoText?: boolean;
    /** Show the full performance wordmark at desktop and tablet widths. */
    showDesktopLogoText?: boolean;
    logoHref?: string;
    links: NavLink[];
    currentPath?: string;
    fixed?: boolean;
    ctaLabel?: string;
    ctaHref?: string;
    /** Current authenticated user (shows UserMenu when present) */
    user?: User | null;
    /** Called when user clicks logout in UserMenu */
    onLogout?: () => void;
    /** Login page URL (shown when no user) */
    loginHref?: string;
    /** Show login link when not authenticated */
    showLogin?: boolean;
    /** Account settings URL for UserMenu */
    accountHref?: string;
    /** Visual treatment. Defaults preserve the existing floating dark shell. */
    visualStyle?: NavigationVisualStyle;
    /** Reports mobile-menu state so sibling fixed UI can yield while navigation owns the viewport. */
    onMobileMenuChange?: (open: boolean) => void;
  }

  let {
    logo,
    logoSuffix,
    showMobileLogoText = false,
    showDesktopLogoText = false,
    logoHref = '/',
    links,
    currentPath = $bindable('/'),
    fixed = false,
    ctaLabel,
    ctaHref,
    user = null,
    onLogout,
    loginHref = '/login',
    showLogin = false,
    accountHref = '/account',
    visualStyle = 'classic',
    onMobileMenuChange
  }: Props = $props();

  let mobileMenuOpen = $state(false);
  let mobileMenuButton = $state<HTMLButtonElement>();
  let openDesktopMenu = $state<string | null>(null);
  const usesPerformanceStyle = $derived(
    visualStyle === 'performance' || visualStyle === 'clear' || visualStyle === 'editorial'
  );
  const usesEditorialStyle = $derived(visualStyle === 'editorial');

  function isActive(link: NavLink): boolean {
    if (link.href === '/') {
      return currentPath === '/';
    }
    return (
      currentPath.startsWith(link.href) ||
      link.children?.some((child) => currentPath.startsWith(child.href)) === true
    );
  }

  function setMobileMenuOpen(open: boolean) {
    mobileMenuOpen = open;
    onMobileMenuChange?.(mobileMenuOpen);
  }

  function toggleMobileMenu() {
    setMobileMenuOpen(!mobileMenuOpen);
  }

  function closeMobileMenu(restoreFocus = false) {
    setMobileMenuOpen(false);
    if (restoreFocus) queueMicrotask(() => mobileMenuButton?.focus());
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (openDesktopMenu) {
      openDesktopMenu = null;
      return;
    }
    if (!mobileMenuOpen) return;
    event.preventDefault();
    closeMobileMenu(true);
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<nav
  class="nav-container"
  class:nav-fixed={fixed}
  class:nav-clear={usesPerformanceStyle}
  class:nav-performance={usesPerformanceStyle}
  class:nav-editorial={usesEditorialStyle}
  class:nav-show-mobile-logo-text={showMobileLogoText}
  class:nav-show-desktop-logo-text={showDesktopLogoText}
  aria-label="Primary"
>
  <div class="nav-inner shell-inner">
    <div class="flex items-center justify-between">
      <!-- Logo / Home -->
      <a href={logoHref} class="nav-logo">
        {#if usesPerformanceStyle || usesEditorialStyle}
          <span class="nav-logo-mark" aria-hidden="true">
            <CubeMark size={28} variant="mono" />
          </span>
        {/if}
        <span class="nav-logo-text">{logo}</span>
        {#if logoSuffix}
          <span class="nav-logo-suffix">{logoSuffix}</span>
        {/if}
      </a>

      <!-- Desktop Navigation Links -->
      <div class="nav-desktop hidden xl:flex items-center gap-2 ml-8">
        {#if usesPerformanceStyle || usesEditorialStyle}
          <div class="nav-link-list">
            {#each links as link}
              {#if link.children?.length}
                <div class="nav-dropdown">
                  <button
                    type="button"
                    class="nav-link nav-dropdown__trigger"
                    class:active={isActive(link)}
                    aria-expanded={openDesktopMenu === link.href}
                    aria-controls={`nav-submenu-${link.href.replaceAll('/', '') || 'root'}`}
                    onclick={() =>
                      (openDesktopMenu = openDesktopMenu === link.href ? null : link.href)}
                  >
                    {link.label}<span aria-hidden="true">⌄</span>
                  </button>
                  {#if openDesktopMenu === link.href}
                    <div
                      id={`nav-submenu-${link.href.replaceAll('/', '') || 'root'}`}
                      class="nav-dropdown__menu"
                    >
                      {#each link.children as child}
                        <a
                          href={child.href}
                          class="nav-dropdown__item"
                          onclick={() => (openDesktopMenu = null)}
                        >
                          <span>{child.label}</span>
                          {#if child.description}<small>{child.description}</small>{/if}
                        </a>
                      {/each}
                    </div>
                  {/if}
                </div>
              {:else}
                <a href={link.href} class="nav-link" class:active={isActive(link)}>
                  {link.label}
                </a>
              {/if}
            {/each}
          </div>
          <div class="nav-actions">
            {#if user}
              <UserMenu {user} onLogout={onLogout ?? (() => {})} settingsHref={accountHref} />
            {:else if showLogin}
              <a href={loginHref} class="nav-link">Sign in</a>
            {/if}
            {#if ctaLabel && ctaHref}
              <a href={ctaHref} class="nav-cta">
                {ctaLabel}
              </a>
            {/if}
          </div>
        {:else}
          {#each links as link}
            <a href={link.href} class="nav-link" class:active={isActive(link)}>
              {link.label}
            </a>
          {/each}
          {#if ctaLabel && ctaHref}
            <a href={ctaHref} class="nav-cta">
              {ctaLabel}
            </a>
          {/if}
          {#if user}
            <UserMenu {user} onLogout={onLogout ?? (() => {})} settingsHref={accountHref} />
          {:else if showLogin}
            <a href={loginHref} class="nav-link"> Sign in </a>
          {/if}
        {/if}
      </div>

      <!-- Mobile Menu Button (44px minimum touch target) -->
      <button
        bind:this={mobileMenuButton}
        onclick={toggleMobileMenu}
        class="nav-menu-button xl:hidden w-11 h-11 flex items-center justify-center"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        {#if mobileMenuOpen}
          <!-- Close Icon (X) -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        {:else}
          <!-- Hamburger Icon -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        {/if}
      </button>
    </div>

    <!-- Mobile Menu -->
    {#if mobileMenuOpen}
      {#if usesPerformanceStyle || usesEditorialStyle}
        <span class="nav-mobile-backdrop" aria-hidden="true"></span>
      {/if}
      <div class="nav-mobile-menu animate-slide-down xl:hidden pt-4 pb-2 flex flex-col gap-4 mt-4">
        {#each links as link}
          <a
            href={link.href}
            onclick={() => closeMobileMenu()}
            class="nav-link py-2"
            class:active={isActive(link)}
          >
            {link.label}
          </a>
          {#if link.children?.length}
            <div class="nav-mobile-submenu">
              {#each link.children as child}
                <a href={child.href} onclick={() => closeMobileMenu()} class="nav-link py-2">
                  {child.label}
                </a>
              {/each}
            </div>
          {/if}
        {/each}
        {#if ctaLabel && ctaHref}
          <a href={ctaHref} onclick={() => closeMobileMenu()} class="nav-cta text-center">
            {ctaLabel}
          </a>
        {/if}
        {#if user}
          <div class="nav-mobile-user">
            <span class="nav-mobile-user-email">{user.email}</span>
            <a href={accountHref} onclick={() => closeMobileMenu()} class="nav-link py-2">
              Account
            </a>
            <button
              type="button"
              class="nav-mobile-logout"
              onclick={() => {
                closeMobileMenu();
                onLogout?.();
              }}
            >
              Sign out
            </button>
          </div>
        {:else if showLogin}
          <a href={loginHref} onclick={() => closeMobileMenu()} class="nav-link py-2"> Sign in </a>
        {/if}
      </div>
    {/if}
  </div>
</nav>

<style>
  /* Navigation Container */
  .nav-container {
    background: transparent;
  }

  .nav-inner {
    padding: 0.75rem 0.875rem;
    display: flex;
    flex-direction: column;
  }

  .nav-fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    z-index: var(--z-performance-fixed);
    background: color-mix(in srgb, var(--color-performance-shell-surface) 84%, transparent);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border-bottom: 1px solid var(--color-performance-shell-border-default);
  }

  /* Logo */
  .nav-logo {
    display: inline-flex;
    min-width: var(--height-performance-control-min, 2.75rem);
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: baseline;
    justify-content: center;
    gap: 0.12rem;
    font-size: 1.08rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: -0.03em;
    color: var(--color-performance-fg-primary);
    text-decoration: none;
  }

  .nav-logo-suffix {
    font-family: var(--font-performance-mono);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-performance-fg-muted);
  }

  /* Navigation Links */
  .nav-link {
    font-family: var(--font-performance-mono);
    font-size: 0.74rem;
    font-weight: var(--font-performance-medium);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-performance-fg-secondary);
    text-decoration: none;
    border-radius: var(--radius-performance-scale-full);
    padding: 0.55rem 0.82rem;
    white-space: nowrap;
    line-height: 1;
    transition:
      color var(--duration-performance-micro) var(--ease-performance-standard),
      background-color var(--duration-performance-micro) var(--ease-performance-standard),
      border-color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .nav-link:hover {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-shell-surface-hover);
  }

  .nav-link.active {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-shell-surface-tertiary);
  }

  .nav-dropdown {
    position: relative;
  }

  .nav-dropdown__trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .nav-dropdown__trigger > span {
    font-size: 0.9em;
    line-height: 0.8;
  }

  .nav-dropdown__menu {
    position: absolute;
    z-index: 5;
    top: calc(100% + 0.55rem);
    left: 0;
    display: grid;
    width: min(20rem, 38vw);
    padding: 0.45rem;
    border: 1px solid var(--color-performance-shell-border-default);
    border-radius: var(--radius-performance-scale-md);
    background: var(--color-performance-shell-surface-secondary);
    box-shadow: var(--color-performance-shell-shadow);
  }

  .nav-dropdown__item {
    display: grid;
    gap: 0.18rem;
    padding: 0.72rem 0.78rem;
    border-radius: calc(var(--radius-performance-scale-md) - 0.2rem);
    color: var(--color-performance-fg-primary);
    text-decoration: none;
  }

  .nav-dropdown__item:hover {
    background: var(--color-performance-shell-surface-hover);
  }

  .nav-dropdown__item span {
    font-size: 0.88rem;
    font-weight: var(--font-performance-semibold);
  }

  .nav-dropdown__item small {
    color: var(--color-performance-fg-muted);
    font-size: 0.74rem;
    line-height: 1.35;
  }

  .nav-dropdown__item:focus-visible,
  .nav-dropdown__trigger:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  .nav-link:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  /* CTA Button */
  .nav-cta {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    justify-content: center;
    padding: 0.68rem 1rem;
    background: linear-gradient(180deg, #ffffff, #eceef7);
    color: #090909;
    font-family: var(--font-performance-mono);
    font-size: 0.74rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius-performance-scale-full);
    border: 1px solid rgba(255, 255, 255, 0.3);
    text-decoration: none;
    white-space: nowrap;
    line-height: 1;
    transition:
      transform var(--duration-performance-micro) var(--ease-performance-standard),
      box-shadow var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .nav-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
  }

  .nav-cta:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  .nav-desktop {
    background: color-mix(
      in srgb,
      var(--color-performance-shell-surface-secondary) 86%,
      transparent
    );
    border: 1px solid var(--color-performance-shell-border-subtle);
    border-radius: var(--radius-performance-scale-full);
    padding: 0.25rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  /* Mobile Menu Button */
  .nav-menu-button {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-shell-surface-tertiary);
    border: 1px solid var(--color-performance-shell-border-subtle);
    border-radius: var(--radius-performance-scale-md);
    transition:
      color var(--duration-performance-micro) var(--ease-performance-standard),
      background var(--duration-performance-micro) var(--ease-performance-standard),
      border-color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .nav-menu-button:hover {
    background: var(--color-performance-shell-surface-hover);
    border-color: var(--color-performance-shell-border-strong);
  }

  .nav-menu-button:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  /* Mobile Menu */
  .nav-mobile-backdrop {
    display: none;
  }

  .nav-mobile-menu {
    background: var(--color-performance-shell-surface-secondary);
    border: 1px solid var(--color-performance-shell-border-default);
    border-radius: var(--radius-performance-scale-lg);
    padding-left: var(--space-performance-sm);
    padding-right: var(--space-performance-sm);
    box-shadow: var(--color-performance-shell-shadow);
  }

  .nav-mobile-submenu {
    display: grid;
    gap: 0.1rem;
    margin: -0.5rem 0 0.15rem 0.75rem;
    padding-left: 0.75rem;
    border-left: 1px solid var(--color-performance-shell-border-subtle);
  }

  /* Slide down animation for mobile menu */
  .animate-slide-down {
    animation: slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-slide-down {
      animation: none;
    }
  }

  /* Mobile User Section */
  .nav-mobile-user {
    padding-top: var(--space-performance-sm);
    margin-top: var(--space-performance-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-xs);
  }

  .nav-mobile-user-email {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-muted);
    padding: var(--space-performance-xs) 0;
  }

  .nav-mobile-logout {
    background: none;
    border: none;
    color: var(--color-performance-error);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    padding: var(--space-performance-sm) 0;
    text-align: left;
    cursor: pointer;
    transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .nav-mobile-logout:hover {
    opacity: 0.8;
  }

  @media (min-width: 768px) {
    .nav-inner {
      padding: 0.65rem 0.95rem;
    }

    .nav-fixed {
      top: 1rem;
      left: 50%;
      right: auto;
      width: min(1240px, calc(100% - 2rem));
      transform: translateX(-50%);
      border: 1px solid var(--color-performance-shell-border-default);
      border-radius: 1.25rem;
      box-shadow: var(--color-performance-shell-shadow);
    }
  }

  .nav-clear {
    /*
     * Campaign openings use isolation for their media and copy layers. Give
     * the navigation its own, higher stacking context so an open mobile
     * drawer remains above those openings instead of being painted behind them.
     */
    position: relative;
    z-index: var(--z-performance-fixed, 40);
    background-blend-mode: plus-darker, normal;
    background: linear-gradient(#9c9c964d 0% 100%), #ffffffd9;
    color: var(--color-performance-ink, #090909);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .nav-clear.nav-fixed {
    /*
     * `.nav-clear` establishes a stacking context for campaign openings.
     * Reassert the requested fixed positioning here so that context does not
     * put a fixed Performance header back into document flow.
     */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    transform: none;
    border: 0;
    border-bottom: 0.5px solid #9c9c9638;
    border-radius: 0;
    background-blend-mode: plus-darker, normal;
    background: linear-gradient(#9c9c964d 0% 100%), #ffffffd9;
    box-shadow: none;
  }

  .nav-clear .nav-inner {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    max-width: none;
    padding: 0.78rem 0;
  }

  .nav-clear .nav-logo {
    align-items: center;
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-sans);
    font-weight: var(--font-performance-bold);
    letter-spacing: 0;
    min-width: var(--height-performance-control-min, 2.75rem);
    gap: 0;
  }

  .nav-clear .nav-logo-mark {
    --color-performance-fg-primary: var(--color-performance-ink, #090909);
    display: grid;
    place-items: center;
    width: 2.35rem;
    height: 2.35rem;
    color: var(--color-performance-ink, #090909);
    flex: 0 0 auto;
  }

  .nav-clear .nav-logo-text,
  .nav-clear .nav-logo-suffix {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (min-width: 641px) {
    .nav-clear.nav-show-desktop-logo-text .nav-logo {
      min-width: 0;
      gap: 0.25rem;
    }

    .nav-clear.nav-show-desktop-logo-text .nav-logo-text,
    .nav-clear.nav-show-desktop-logo-text .nav-logo-suffix {
      position: static;
      width: auto;
      height: auto;
      margin: 0;
      overflow: visible;
      clip: auto;
      white-space: nowrap;
    }

    .nav-clear.nav-show-desktop-logo-text .nav-logo-text {
      font-size: 0.72rem;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .nav-clear.nav-show-desktop-logo-text .nav-logo-suffix {
      color: var(--color-performance-muted, #5e6268);
      font-family: var(--font-performance-mono);
      font-size: 0.68rem;
    }
  }

  .nav-clear .nav-desktop {
    flex: 1 1 auto;
    justify-content: space-between;
    gap: 1rem;
    margin-left: clamp(1rem, 2vw, 1.75rem);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .nav-clear .nav-link-list,
  .nav-clear .nav-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.18rem;
  }

  .nav-clear .nav-link-list {
    padding: 0.22rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-court, #e6e6e0);
  }

  .nav-clear .nav-actions {
    gap: 0.35rem;
  }

  .nav-clear .nav-link {
    border-radius: var(--radius-performance-sm, 4px);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-sans);
    font-size: 0.95rem;
    font-weight: var(--font-performance-regular);
    letter-spacing: 0;
    line-height: 1.15;
    padding: 0.55rem 0.72rem;
    text-transform: none;
  }

  .nav-clear .nav-link:hover {
    color: var(--color-performance-ink, #090909);
    background: var(--color-performance-court, #e6e6e0);
    opacity: 1;
  }

  .nav-clear .nav-link.active {
    color: var(--color-performance-ink, #090909);
    background: var(--color-performance-panel, #ffffff);
  }

  .nav-clear .nav-cta {
    padding: 0.58rem 0.86rem;
    border-color: var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-ink, #090909);
    color: #ffffff;
    font-family: var(--font-performance-sans);
    font-size: 0.9rem;
    font-weight: var(--font-performance-bold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: none;
    box-shadow: none;
  }

  .nav-clear .nav-cta:hover {
    background: #1a2030;
    border-color: #1a2030;
    box-shadow: none;
    opacity: 1;
    transform: none;
  }

  .nav-clear .nav-menu-button {
    border-color: var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .nav-clear .nav-menu-button:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-court, #e6e6e0);
  }

  .nav-clear .nav-mobile-menu {
    position: fixed;
    z-index: 3;
    top: 4.8rem;
    left: max(0.75rem, calc((100vw - var(--content-width-performance, 85rem)) / 2));
    right: max(0.75rem, calc((100vw - var(--content-width-performance, 85rem)) / 2));
    max-height: calc(100vh - 5.55rem);
    margin-top: 0;
    overflow-y: auto;
    padding: 1rem;
    border-color: #9c9c9638;
    border-radius: var(--radius-performance-md, 4px);
    background: var(--color-performance-panel, #ffffff);
    box-shadow: var(--shadow-performance-panel, 0 4px 48px rgba(0, 0, 0, 0.1));
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .nav-clear .nav-mobile-backdrop {
    display: block;
    position: fixed;
    z-index: 2;
    top: 4.35rem;
    right: 0;
    bottom: 0;
    left: 0;
    min-height: calc(100vh - 4.35rem);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .nav-clear .nav-mobile-menu.animate-slide-down {
    animation: none;
  }

  .nav-clear .nav-mobile-menu .nav-link {
    display: flex;
    align-items: center;
    min-height: 2.75rem;
    color: var(--color-performance-ink, #090909);
  }

  .nav-clear .nav-mobile-menu .nav-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    width: 100%;
  }

  .nav-clear .nav-mobile-user {
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  @media (max-width: 640px) {
    .nav-clear .nav-inner {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .nav-clear.nav-show-mobile-logo-text .nav-logo {
      gap: 0.4rem;
    }

    .nav-clear.nav-show-mobile-logo-text .nav-logo-text {
      position: static;
      width: auto;
      height: auto;
      margin: 0;
      overflow: visible;
      clip: auto;
      white-space: nowrap;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
  }

  /* Owned editorial shell: one institutional navigation across licensed properties. */
  .nav-editorial,
  .nav-editorial.nav-fixed {
    color: var(--color-performance-editorial-dark, #181312);
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark) 18%, transparent);
    background: color-mix(
      in srgb,
      var(--color-performance-editorial-light, #f3ebe4) 94%,
      transparent
    );
    box-shadow: none;
  }

  .nav-editorial .nav-inner {
    width: min(var(--content-width-performance-editorial, 90rem), calc(100% - 2rem));
    padding-block: 0.65rem;
  }

  .nav-editorial .nav-logo-mark {
    --color-performance-fg-primary: var(--color-performance-editorial-dark, #181312);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .nav-editorial .nav-link-list {
    border-color: color-mix(in srgb, var(--color-performance-editorial-dark) 16%, transparent);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: color-mix(
      in srgb,
      var(--color-performance-editorial-light-secondary, #d8cdbc) 45%,
      transparent
    );
  }

  .nav-editorial .nav-link,
  .nav-editorial .nav-mobile-menu .nav-link {
    color: color-mix(in srgb, var(--color-performance-editorial-dark) 72%, transparent);
    border-radius: calc(var(--radius-performance-editorial, 0.375rem) - 0.125rem);
  }

  .nav-editorial .nav-link:hover,
  .nav-editorial .nav-link.active {
    color: var(--color-performance-editorial-dark, #181312);
    background: var(--color-performance-editorial-light, #f3ebe4);
  }

  .nav-editorial .nav-dropdown__menu {
    border-color: color-mix(in srgb, var(--color-performance-editorial-dark) 22%, transparent);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-editorial-light, #f3ebe4);
    box-shadow: 0 1.1rem 2.5rem
      color-mix(in srgb, var(--color-performance-editorial-dark) 18%, transparent);
  }

  .nav-editorial .nav-dropdown__item {
    border-radius: calc(var(--radius-performance-editorial, 0.375rem) - 0.1rem);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .nav-editorial .nav-dropdown__item:hover {
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
  }

  .nav-editorial .nav-dropdown__item small {
    color: color-mix(in srgb, var(--color-performance-editorial-dark) 66%, transparent);
  }

  .nav-editorial .nav-mobile-submenu {
    border-left-color: color-mix(in srgb, var(--color-performance-editorial-dark) 22%, transparent);
  }

  .nav-editorial .nav-cta {
    border-color: var(--color-performance-editorial-brand, #fcaa2d);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: var(--color-performance-editorial-brand, #fcaa2d);
    color: var(--color-performance-editorial-dark, #181312);
    box-shadow: none;
  }

  .nav-editorial .nav-cta:hover {
    background: color-mix(in srgb, var(--color-performance-editorial-brand) 88%, white);
    box-shadow: none;
  }

  .nav-editorial .nav-menu-button {
    border-color: color-mix(in srgb, var(--color-performance-editorial-dark) 22%, transparent);
    border-radius: var(--radius-performance-editorial, 0.375rem);
    background: transparent;
    color: var(--color-performance-editorial-dark, #181312);
  }

  .nav-editorial .nav-mobile-menu,
  .nav-editorial .nav-mobile-backdrop {
    background: var(--color-performance-editorial-light, #f3ebe4);
  }
</style>
