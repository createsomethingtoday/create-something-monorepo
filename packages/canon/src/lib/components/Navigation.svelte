<script lang="ts">
  import { CubeMark } from '../brand/marks/index.js';
  import { UserMenu } from '../auth/components/index.js';
  import type { User } from '../auth/types.js';

  interface NavLink {
    label: string;
    href: string;
  }

  type NavigationVisualStyle = 'classic' | 'clear';

  interface Props {
    logo: string;
    logoSuffix?: string;
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
  }

  let {
    logo,
    logoSuffix,
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
    visualStyle = 'classic'
  }: Props = $props();

  let mobileMenuOpen = $state(false);

  function isActive(link: NavLink): boolean {
    if (link.href === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(link.href);
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>

<nav
  class="nav-container"
  class:nav-fixed={fixed}
  class:nav-clear={visualStyle === 'clear'}
  aria-label="Primary"
>
  <div class="nav-inner shell-inner">
    <div class="flex items-center justify-between">
      <!-- Logo / Home -->
      <a href={logoHref} class="nav-logo">
        {#if visualStyle === 'clear'}
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
        {#if visualStyle === 'clear'}
          <div class="nav-link-list">
            {#each links as link}
              <a href={link.href} class="nav-link" class:active={isActive(link)}>
                {link.label}
              </a>
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
      {#if visualStyle === 'clear'}
        <span class="nav-mobile-backdrop" aria-hidden="true"></span>
      {/if}
      <div class="nav-mobile-menu animate-slide-down xl:hidden pt-4 pb-2 flex flex-col gap-4 mt-4">
        {#each links as link}
          <a
            href={link.href}
            onclick={closeMobileMenu}
            class="nav-link py-2"
            class:active={isActive(link)}
          >
            {link.label}
          </a>
        {/each}
        {#if ctaLabel && ctaHref}
          <a href={ctaHref} onclick={closeMobileMenu} class="nav-cta text-center">
            {ctaLabel}
          </a>
        {/if}
        {#if user}
          <div class="nav-mobile-user">
            <span class="nav-mobile-user-email">{user.email}</span>
            <a href={accountHref} onclick={closeMobileMenu} class="nav-link py-2"> Account </a>
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
          <a href={loginHref} onclick={closeMobileMenu} class="nav-link py-2"> Sign in </a>
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
    z-index: var(--z-fixed);
    background: color-mix(in srgb, var(--color-shell-surface) 84%, transparent);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border-bottom: 1px solid var(--color-shell-border-default);
  }

  /* Logo */
  .nav-logo {
    display: inline-flex;
    align-items: baseline;
    gap: 0.12rem;
    font-size: 1.08rem;
    font-weight: var(--font-semibold);
    letter-spacing: -0.03em;
    color: var(--color-fg-primary);
    text-decoration: none;
  }

  .nav-logo-suffix {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  /* Navigation Links */
  .nav-link {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    font-weight: var(--font-medium);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-fg-secondary);
    text-decoration: none;
    border-radius: var(--radius-full);
    padding: 0.55rem 0.82rem;
    white-space: nowrap;
    line-height: 1;
    transition:
      color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
  }

  .nav-link:hover {
    color: var(--color-fg-primary);
    background: var(--color-shell-surface-hover);
  }

  .nav-link.active {
    color: var(--color-fg-primary);
    background: var(--color-shell-surface-tertiary);
  }

  .nav-link:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  /* CTA Button */
  .nav-cta {
    padding: 0.68rem 1rem;
    background: linear-gradient(180deg, #ffffff, #eceef7);
    color: #090909;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-radius: var(--radius-full);
    border: 1px solid rgba(255, 255, 255, 0.3);
    text-decoration: none;
    white-space: nowrap;
    line-height: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .nav-cta:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
  }

  .nav-cta:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  .nav-desktop {
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 86%, transparent);
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-full);
    padding: 0.25rem;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  /* Mobile Menu Button */
  .nav-menu-button {
    color: var(--color-fg-primary);
    background: var(--color-shell-surface-tertiary);
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-md);
    transition:
      color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
  }

  .nav-menu-button:hover {
    background: var(--color-shell-surface-hover);
    border-color: var(--color-shell-border-strong);
  }

  .nav-menu-button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }

  /* Mobile Menu */
  .nav-mobile-backdrop {
    display: none;
  }

  .nav-mobile-menu {
    background: var(--color-shell-surface-secondary);
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-lg);
    padding-left: var(--space-sm);
    padding-right: var(--space-sm);
    box-shadow: var(--color-shell-shadow);
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
    padding-top: var(--space-sm);
    margin-top: var(--space-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .nav-mobile-user-email {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    padding: var(--space-xs) 0;
  }

  .nav-mobile-logout {
    background: none;
    border: none;
    color: var(--color-error);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    padding: var(--space-sm) 0;
    text-align: left;
    cursor: pointer;
    transition: opacity var(--duration-micro) var(--ease-standard);
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
      border: 1px solid var(--color-shell-border-default);
      border-radius: 1.25rem;
      box-shadow: var(--color-shell-shadow);
    }
  }

  .nav-clear {
    background-blend-mode: plus-darker, normal;
    background:
      linear-gradient(#cecece4d 0% 100%),
      #ffffffd9;
    color: var(--color-clear-onyx, #0a0e19);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .nav-clear.nav-fixed {
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    transform: none;
    border: 0;
    border-bottom: 0.5px solid #cecece38;
    border-radius: 0;
    background-blend-mode: plus-darker, normal;
    background:
      linear-gradient(#cecece4d 0% 100%),
      #ffffffd9;
    box-shadow: none;
  }

  .nav-clear .nav-inner {
    width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
    max-width: none;
    padding: 0.78rem 0;
  }

  .nav-clear .nav-logo {
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-sans);
    font-weight: var(--font-bold);
    letter-spacing: 0;
    min-width: 0;
    gap: 0;
  }

  .nav-clear .nav-logo-mark {
    --color-fg-primary: var(--color-clear-onyx, #0a0e19);
    display: grid;
    place-items: center;
    width: 2.35rem;
    height: 2.35rem;
    color: var(--color-clear-onyx, #0a0e19);
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
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
  }

  .nav-clear .nav-actions {
    gap: 0.35rem;
  }

  .nav-clear .nav-link {
    border-radius: var(--radius-clear-sm, 4px);
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-sans);
    font-size: 0.95rem;
    font-weight: var(--font-regular);
    letter-spacing: 0;
    line-height: 1.15;
    padding: 0.55rem 0.72rem;
    text-transform: none;
  }

  .nav-clear .nav-link:hover {
    color: var(--color-clear-onyx, #0a0e19);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
    opacity: 1;
  }

  .nav-clear .nav-link.active {
    color: var(--color-clear-onyx, #0a0e19);
    background: var(--color-clear-panel, #ffffff);
  }

  .nav-clear .nav-cta {
    padding: 0.58rem 0.86rem;
    border-color: var(--color-clear-onyx, #0a0e19);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-onyx, #0a0e19);
    color: #ffffff;
    font-family: var(--font-sans);
    font-size: 0.9rem;
    font-weight: var(--font-bold);
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
    border-color: var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .nav-clear .nav-menu-button:hover {
    border-color: var(--color-clear-border-strong, #cecece);
    background: var(--color-clear-porcelain-soft, #f2f2f2);
  }

  .nav-clear .nav-mobile-menu {
    position: fixed;
    z-index: 3;
    top: 4.8rem;
    left: max(0.75rem, calc((100vw - var(--content-width-clear, 85rem)) / 2));
    right: max(0.75rem, calc((100vw - var(--content-width-clear, 85rem)) / 2));
    max-height: calc(100vh - 5.55rem);
    margin-top: 0;
    overflow-y: auto;
    padding: 1rem;
    border-color: #cecece38;
    border-radius: var(--radius-clear-md, 8px);
    background: var(--color-clear-panel, #ffffff);
    box-shadow: var(--shadow-clear-restraint, 0 4px 48px rgba(0, 0, 0, 0.1));
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
    background: var(--color-clear-porcelain, #f9f9f9);
  }

  .nav-clear .nav-mobile-menu.animate-slide-down {
    animation: none;
  }

  .nav-clear .nav-mobile-menu .nav-link {
    display: flex;
    align-items: center;
    min-height: 2.75rem;
    color: var(--color-clear-onyx, #0a0e19);
  }

  .nav-clear .nav-mobile-menu .nav-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    width: 100%;
  }

  .nav-clear .nav-mobile-user {
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
  }

  @media (max-width: 640px) {
    .nav-clear .nav-inner {
      width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
    }
  }
</style>
