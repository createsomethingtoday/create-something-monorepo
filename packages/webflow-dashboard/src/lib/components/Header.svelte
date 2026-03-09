<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from './ui';
  import DarkModeToggle from './DarkModeToggle.svelte';
  import { UserCircle } from 'lucide-svelte';

  interface Props {
    onLogout?: () => void;
    onProfileClick?: () => void;
  }

  let { onLogout, onProfileClick }: Props = $props();

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
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: start;
    column-gap: 0.625rem;
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
    padding-left: 0.125rem;
    min-width: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 0.5rem 0.9rem;
    border-radius: 999px;
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
    gap: 0.25rem;
    padding: 0.2rem;
    border: none;
    border-radius: 999px;
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

    .header-right :global(.header-action) {
      padding-inline: 0.75rem;
    }
  }
</style>
