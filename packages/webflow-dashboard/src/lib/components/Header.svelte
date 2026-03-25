<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from './ui';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { UserCircle } from 'lucide-svelte';

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
    box-shadow: none;
    backdrop-filter: blur(10px);
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    overflow-x: auto;
    scrollbar-width: none;
    box-shadow: none;
    min-width: 0;
  }

  .nav-links::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    flex: 0 0 auto;
    padding: 0.65rem 0.5rem;
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
    background: var(--color-bg-subtle);
  }

  .nav-link.active {
    color: var(--color-info);
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
      padding: 0;
      border-radius: 0;
    }

    .brand-lockup,
    .header-right {
      justify-content: space-between;
    }

    .profile-text {
      display: none;
    }

    .header-right :global(.header-action) {
      padding-inline: 0.75rem;
    }
  }
</style>
