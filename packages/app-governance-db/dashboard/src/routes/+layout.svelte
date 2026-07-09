<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/', label: 'Overview' },
    { href: '/atlas', label: 'Atlas' },
    { href: '/sources', label: 'Sources' },
    { href: '/findings', label: 'Findings' },
    { href: '/triage', label: 'Triage' },
    { href: '/apps', label: 'Apps' },
    { href: '/events', label: 'Events' }
  ];

  function isActive(href: string, pathname: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }
</script>

{#if $page.url.pathname !== '/unlock'}
  <header class="shell-header">
    <div class="mx-auto flex max-w-7xl items-baseline gap-8 px-6 py-3">
      <span class="wordmark">app-governance</span>
      <nav class="flex items-baseline gap-5" aria-label="Primary">
        {#each nav as item (item.href)}
          <a
            href={item.href}
            class="nav-link"
            class:active={isActive(item.href, $page.url.pathname)}
            aria-current={isActive(item.href, $page.url.pathname) ? 'page' : undefined}
          >
            {item.label}
          </a>
        {/each}
      </nav>
    </div>
  </header>
{/if}

<main class="mx-auto max-w-7xl px-6 py-8">
  {@render children()}
</main>

<style>
  .shell-header {
    background: var(--color-shell-surface);
    border-bottom: 1px solid var(--color-border-default);
  }

  .wordmark {
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
  }

  .nav-link {
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
    text-decoration: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .nav-link:hover {
    color: var(--color-fg-secondary);
  }

  .nav-link.active {
    color: var(--color-fg-primary);
  }
</style>
