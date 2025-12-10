<!--
  Dashboard Home

  Shows user's sites. If no sites, prompts to create.
  Heideggerian: Minimal chrome, content-focused.
-->
<script lang="ts">
  import SiteCard from '$lib/components/SiteCard.svelte';
  import type { Tenant } from '$lib/types';

  interface Props {
    data: {
      sites: Tenant[];
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Dashboard | Templates</title>
</svelte:head>

<div class="dashboard">
  {#if data.sites.length === 0}
    <!-- Empty state: guide to creation -->
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </div>
      <h1>Create Your First Site</h1>
      <p>Choose a template and launch in minutes.</p>
      <a href="/templates" class="btn btn-primary btn-lg">
        Browse Templates
      </a>
    </div>
  {:else}
    <!-- Sites grid -->
    <header class="dashboard-header">
      <h1>Your Sites</h1>
      <a href="/templates" class="btn btn-secondary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Site
      </a>
    </header>

    <div class="sites-grid">
      {#each data.sites as site}
        <SiteCard {site} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: var(--content-width);
    margin: 0 auto;
    padding: var(--space-xl) var(--gutter);
    min-height: 80vh;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--space-md);
    padding: var(--space-2xl) var(--space-lg);
  }

  .empty-icon {
    color: var(--color-fg-muted);
  }

  .empty-state h1 {
    font-size: var(--text-h1);
    margin: 0;
  }

  .empty-state p {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    margin: 0;
    max-width: 400px;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-lg);
  }

  .dashboard-header h1 {
    font-size: var(--text-h2);
    margin: 0;
  }

  .sites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-lg);
  }
</style>
