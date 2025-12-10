<!--
  SiteCard

  Dashboard preview card for a site.
  Shows status, name, and quick actions.
-->
<script lang="ts">
  import type { Tenant } from '$lib/types';

  interface Props {
    site: Tenant;
  }

  let { site }: Props = $props();

  const statusLabels: Record<Tenant['status'], string> = {
    configuring: 'Draft',
    queued: 'Building...',
    building: 'Building...',
    deploying: 'Deploying...',
    active: 'Live',
    suspended: 'Paused',
    error: 'Error'
  };

  const statusColors: Record<Tenant['status'], string> = {
    configuring: 'var(--color-fg-muted)',
    queued: 'var(--color-warning)',
    building: 'var(--color-warning)',
    deploying: 'var(--color-warning)',
    active: 'var(--color-success)',
    suspended: 'var(--color-fg-muted)',
    error: 'var(--color-error)'
  };

  // Extract display name from config or use subdomain
  const siteName = (site.config.name as string) || site.subdomain;
  const siteUrl = `https://${site.subdomain}.createsomething.space`;
</script>

<a href="/dashboard/{site.id}" class="site-card">
  <!-- Preview thumbnail area -->
  <div class="site-preview">
    <div class="preview-placeholder">
      <span class="preview-letter">{siteName.charAt(0).toUpperCase()}</span>
    </div>
  </div>

  <!-- Info section -->
  <div class="site-info">
    <div class="site-header">
      <h3 class="site-name">{siteName}</h3>
      <span class="site-status" style="color: {statusColors[site.status]}">
        {#if site.status === 'active'}
          <span class="status-dot"></span>
        {/if}
        {statusLabels[site.status]}
      </span>
    </div>

    <p class="site-url">{site.subdomain}.createsomething.space</p>

    <div class="site-meta">
      <span class="site-tier">{site.tier}</span>
      {#if site.deployedAt}
        <span class="site-updated">
          Updated {new Date(site.deployedAt).toLocaleDateString()}
        </span>
      {/if}
    </div>
  </div>

  <!-- Quick action hint -->
  <div class="site-action">
    <span>Edit</span>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </div>
</a>

<style>
  .site-card {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--duration-standard) var(--ease-standard);
    text-decoration: none;
    color: inherit;
  }

  .site-card:hover {
    border-color: var(--color-accent);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .site-preview {
    aspect-ratio: 16/9;
    background: var(--color-bg-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-placeholder {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-full);
    background: var(--color-bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-letter {
    font-size: var(--text-h2);
    font-weight: 600;
    color: var(--color-fg-muted);
  }

  .site-info {
    padding: var(--space-md);
    flex: 1;
  }

  .site-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-bottom: var(--space-xs);
  }

  .site-name {
    font-size: var(--text-h3);
    font-weight: 600;
    margin: 0;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .site-status {
    font-size: var(--text-caption);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--color-success);
  }

  .site-url {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin: 0;
  }

  .site-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .site-tier {
    text-transform: capitalize;
    padding: 2px 8px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
  }

  .site-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    border-top: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    font-weight: 500;
    color: var(--color-fg-secondary);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .site-card:hover .site-action {
    color: var(--color-accent);
    background: var(--color-hover);
  }
</style>
