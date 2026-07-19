<script lang="ts">
  /**
   * Analytics Navigation Menu
   *
   * Tab-based navigation for NBA analytics features.
   * Preserves game selector state across views.
   */

  import { page } from '$app/stores';
  import { TrendingUp, Zap, Clock, Activity } from 'lucide-svelte';

  interface NavItem {
    href: string;
    label: string;
    icon: any;
    description: string;
  }

  const navItems: NavItem[] = [
    {
      href: '/data/nba',
      label: 'Overview',
      icon: Activity,
      description: 'Choose a game and question'
    },
    {
      href: '/data/nba/clutch',
      label: 'Clutch',
      icon: Zap,
      description: 'Close-game proxy'
    },
    {
      href: '/data/nba/pace',
      label: 'Pace',
      icon: TrendingUp,
      description: 'Pace and efficiency'
    },
    {
      href: '/data/nba/overtime',
      label: 'Overtime',
      icon: Clock,
      description: 'Whole-game proxy'
    }
  ];

  // Determine active tab
  const isActive = (href: string) => {
    return $page.url.pathname === href;
  };
</script>

<nav class="analytics-nav" aria-label="Analytics navigation">
  <div class="nav-container">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-item"
        class:active={isActive(item.href)}
        aria-current={isActive(item.href) ? 'page' : undefined}
      >
        <svelte:component this={item.icon} size={18} />
        <span class="label">{item.label}</span>
        <span class="description">{item.description}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .analytics-nav {
    width: 100%;
    background: var(--color-performance-bg-surface);
    position: sticky;
    top: 0;
    z-index: var(--z-performance-sticky);
  }

  .nav-container {
    display: flex;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-md) var(--space-performance-xl);
    max-width: 1400px;
    margin: 0 auto;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-md) var(--space-performance-xl);
    border-radius: var(--radius-performance-scale-md);
    text-decoration: none;
    color: var(--color-performance-fg-secondary);
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
    min-width: 120px;
    position: relative;
  }

  .nav-item:hover {
    background: var(--color-performance-hover);
    color: var(--color-performance-fg-primary);
  }

  .nav-item:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 2px;
  }

  .nav-item.active {
    color: var(--color-performance-data-1);
  }

  .nav-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: var(--space-performance-md);
    right: var(--space-performance-md);
    height: 2px;
    background: var(--color-performance-data-1);
    border-radius: var(--radius-performance-scale-full);
  }

  .label {
    font-size: var(--text-performance-body-sm);
    font-weight: 600;
    white-space: nowrap;
  }

  .description {
    font-size: var(--text-performance-caption);
    color: var(--color-performance-fg-tertiary);
    white-space: nowrap;
  }

  .nav-item.active .description {
    color: var(--color-performance-fg-secondary);
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .nav-container {
      padding: var(--space-performance-md);
      gap: 0;
    }

    .nav-item {
      min-width: 80px;
      padding: var(--space-performance-sm) var(--space-performance-md);
    }

    .description {
      display: none;
    }
  }

  /* Scrollbar styling */
  .nav-container::-webkit-scrollbar {
    height: 4px;
  }

  .nav-container::-webkit-scrollbar-track {
    background: var(--color-performance-bg-surface);
  }

  .nav-container::-webkit-scrollbar-thumb {
    background: var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-full);
  }

  .nav-container::-webkit-scrollbar-thumb:hover {
    background: var(--color-performance-fg-tertiary);
  }
</style>
