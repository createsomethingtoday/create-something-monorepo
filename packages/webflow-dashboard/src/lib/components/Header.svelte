<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from './ui';
  import Search from './Search.svelte';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { UserCircle } from 'lucide-svelte';

  interface Props {
    userEmail?: string;
    onLogout?: () => void;
    onProfileClick?: () => void;
    onSearch?: (term: string) => void;
    showSearch?: boolean;
    searchValue?: string;
    searchPlaceholder?: string;
    searchAriaLabel?: string;
    searchScopeLabel?: string;
  }

  let {
    userEmail,
    onLogout,
    onProfileClick,
    onSearch,
    showSearch = true,
    searchValue = '',
    searchPlaceholder = 'Search templates...',
    searchAriaLabel = 'Search templates',
    searchScopeLabel
  }: Props = $props();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/validation', label: 'Validation' }
  ];
</script>

<header class="header">
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
          {#if userEmail}
            <span class="user-chip">{userEmail}</span>
          {/if}
        </div>

        <nav class="nav-links" aria-label="Primary navigation">
          {#each navItems as item}
            <a
              href={item.href}
              class="nav-link"
              class:active={$page.url.pathname === item.href ||
                $page.url.pathname.startsWith(item.href + '/')}
              aria-current={$page.url.pathname === item.href ||
              $page.url.pathname.startsWith(item.href + '/')
                ? 'page'
                : undefined}
            >
              {item.label}
            </a>
          {/each}
        </nav>

        {#if showSearch && onSearch}
          <div class="search-slot">
            {#if searchScopeLabel}
              <span class="search-scope">{searchScopeLabel}</span>
            {/if}
            <Search
              {onSearch}
              value={searchValue}
              placeholder={searchPlaceholder}
              ariaLabel={searchAriaLabel}
            />
          </div>
        {/if}
      </div>

      <div class="header-right">
        <DarkModeToggle />
        {#if onProfileClick}
          <Button variant="ghost" class="header-action" onclick={onProfileClick}>
            <UserCircle size={18} />
            <span class="profile-text">Profile</span>
          </Button>
        {/if}
        {#if onLogout}
          <Button variant="ghost" class="header-action" onclick={onLogout}>Logout</Button>
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
    box-shadow: var(--color-shell-shadow);
    backdrop-filter: blur(18px);
  }

  .header-content {
    max-width: 82rem;
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
    grid-template-columns: auto auto minmax(15rem, 20rem);
    align-items: center;
    justify-content: start;
    column-gap: 0.625rem;
    row-gap: 0.5rem;
    min-width: 0;
    padding: 0.375rem;
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: 1.5rem;
    background: linear-gradient(180deg, var(--glass-bg-medium) 0%, var(--glass-bg-subtle) 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      var(--shadow-sm);
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.125rem;
    min-width: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
    background: var(--glass-bg-strong);
    border: 1px solid var(--color-shell-border-default);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.2),
      0 4px 14px rgba(8, 8, 8, 0.05);
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

  .user-chip {
    display: none;
    max-width: 14rem;
    overflow: hidden;
    padding: 0.35rem 0.7rem;
    text-overflow: ellipsis;
    border-radius: 999px;
    border: 1px solid var(--color-shell-border-subtle);
    background: transparent;
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    white-space: nowrap;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem;
    border: 1px solid rgba(0, 0, 0, 0.04);
    border-radius: 999px;
    background: rgba(8, 8, 8, 0.03);
    overflow-x: auto;
    scrollbar-width: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
    min-width: 0;
  }

  .search-slot {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
    justify-self: end;
  }

  .search-scope {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    padding: 0.38rem 0.65rem;
    border-radius: 999px;
    background: rgba(20, 110, 245, 0.08);
    border: 1px solid rgba(20, 110, 245, 0.14);
    color: var(--color-info);
    font-size: 0.68rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .nav-links::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    flex: 0 0 auto;
    padding: 0.65rem 1rem;
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    color: var(--color-fg-muted);
    text-decoration: none;
    white-space: nowrap;
    border: 1px solid transparent;
    border-radius: 999px;
    transition:
      color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      box-shadow var(--duration-micro) var(--ease-standard);
  }

  .nav-link:hover {
    color: var(--color-fg-primary);
    background: var(--color-bg-subtle);
  }

  .nav-link.active {
    color: #ffffff;
    background: var(--color-info);
    border-color: var(--color-info);
    box-shadow: 0 8px 18px rgba(20, 110, 245, 0.22);
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
    background: var(--glass-bg-medium);
    border: 1px solid var(--color-shell-border-default);
    box-shadow: none;
  }

  .header-right :global(.header-action:hover:not(:disabled)) {
    background: var(--glass-bg-strong);
    border-color: var(--color-shell-border-strong);
    transform: none;
  }

  .profile-text {
    display: inline;
  }

  @media (min-width: 1080px) {
    .user-chip {
      display: inline-flex;
    }
  }

  @media (max-width: 1240px) {
    .nav-cluster {
      grid-template-columns: auto auto;
    }

    .search-slot {
      grid-column: 1 / -1;
      justify-self: stretch;
    }
  }

  @media (max-width: 767px) {
    .header-content {
      padding-block: var(--space-sm);
    }

    .header-main {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      align-items: stretch;
    }

    .nav-cluster {
      grid-template-columns: 1fr;
      align-items: stretch;
      padding: 0.5rem;
      border-radius: 1.25rem;
    }

    .brand-lockup,
    .header-right {
      justify-content: space-between;
    }

    .profile-text {
      display: none;
    }

    .search-slot {
      min-width: 0;
      grid-column: auto;
    }

    .header-right :global(.header-action) {
      padding-inline: 0.75rem;
    }
  }

  @media (max-width: 1100px) {
    .search-scope {
      display: none;
    }
  }
</style>
