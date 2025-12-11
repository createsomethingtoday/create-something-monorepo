<!--
  SiteCard

  Dashboard preview card for a site.
  Shows live iframe preview, status, and quick actions.

  Heideggerian: The preview shows the actual site, not an abstraction.
  The tool (dashboard) reveals rather than obscures.
-->
<script lang="ts">
  import type { Tenant } from '$lib/types';

  interface Props {
    site: Tenant;
  }

  let { site }: Props = $props();

  let iframeLoaded = $state(false);
  let iframeError = $state(false);

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

  // Only show live preview for active sites
  const canShowPreview = site.status === 'active';

  function handleIframeLoad() {
    iframeLoaded = true;
  }

  function handleIframeError() {
    iframeError = true;
  }
</script>

<a href="/dashboard/{site.id}" class="site-card">
  <!-- Live Preview -->
  <div class="site-preview">
    {#if canShowPreview && !iframeError}
      <div class="iframe-wrapper">
        <iframe
          src={siteUrl}
          title="{siteName} preview"
          loading="lazy"
          onload={handleIframeLoad}
          onerror={handleIframeError}
        ></iframe>
        {#if !iframeLoaded}
          <div class="iframe-loading">
            <div class="loading-spinner"></div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Fallback for non-active sites or failed loads -->
      <div class="preview-placeholder">
        {#if site.status === 'configuring'}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span class="placeholder-text">Draft</span>
        {:else if site.status === 'building' || site.status === 'queued' || site.status === 'deploying'}
          <div class="loading-spinner"></div>
          <span class="placeholder-text">Building...</span>
        {:else if site.status === 'error' || iframeError}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span class="placeholder-text">Error</span>
        {:else}
          <span class="preview-letter">{siteName.charAt(0).toUpperCase()}</span>
        {/if}
      </div>
    {/if}
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
    border-color: var(--color-border-emphasis);
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .site-card:active {
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    .site-card {
      transition: border-color var(--duration-standard) var(--ease-standard),
                  box-shadow var(--duration-standard) var(--ease-standard);
    }

    .site-card:hover,
    .site-card:active {
      transform: none;
    }
  }

  .site-preview {
    aspect-ratio: 16/9;
    background: var(--color-bg-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  .iframe-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .iframe-wrapper iframe {
    width: 200%;
    height: 200%;
    transform: scale(0.5);
    transform-origin: top left;
    border: none;
    pointer-events: none;
  }

  .iframe-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-subtle);
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border-default);
    border-top-color: var(--color-fg-primary);
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .preview-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    color: var(--color-fg-muted);
  }

  .placeholder-text {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .preview-letter {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-h2);
    font-weight: 600;
    color: var(--color-fg-muted);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-full);
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
    color: var(--color-fg-primary);
    background: var(--color-hover);
  }
</style>
