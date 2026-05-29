<script lang="ts">
  import { UserMenu } from '../auth/components/index.js';
  import type { User } from '../auth/types.js';

  interface NavLink {
    label: string;
    href: string;
  }

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
    accountHref = '/account'
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

<nav class="nav-container" class:nav-fixed={fixed} aria-label="Primary">
  <div class="nav-inner shell-inner">
    <div class="flex items-center justify-between">
      <!-- Logo / Home -->
      <a href={logoHref} class="nav-logo">
        {logo}
        {#if logoSuffix}
          <span class="nav-logo-suffix">{logoSuffix}</span>
        {/if}
      </a>

      <!-- Desktop Navigation Links -->
      <div class="nav-desktop hidden xl:flex items-center gap-2 ml-8">
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
</style>
