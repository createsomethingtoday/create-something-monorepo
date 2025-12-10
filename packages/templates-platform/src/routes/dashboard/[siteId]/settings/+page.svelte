<!--
  Site Settings

  Domain management, plan info, danger zone.
  Heideggerian: Settings that matter, not settings for settings' sake.
-->
<script lang="ts">
  import type { Tenant, Template } from '$lib/types';

  interface Props {
    data: {
      site: Tenant;
      template: Template | undefined;
    };
  }

  let { data }: Props = $props();

  let customDomain = $state(data.site.customDomain || '');
  let isVerifying = $state(false);
  let verificationStatus = $state<'idle' | 'verifying' | 'success' | 'error'>('idle');

  const siteUrl = `https://${data.site.subdomain}.createsomething.space`;
  const siteName = (data.site.config.name as string) || data.site.subdomain;

  async function verifyDomain() {
    if (!customDomain.trim()) return;

    isVerifying = true;
    verificationStatus = 'verifying';

    try {
      // In production, this would call an API to verify DNS
      await new Promise((resolve) => setTimeout(resolve, 2000));
      verificationStatus = 'success';
    } catch {
      verificationStatus = 'error';
    } finally {
      isVerifying = false;
    }
  }

  async function deleteSite() {
    if (!confirm('Are you sure you want to delete this site? This cannot be undone.')) {
      return;
    }

    try {
      await fetch(`/api/sites/${data.site.id}`, { method: 'DELETE' });
      window.location.href = '/dashboard';
    } catch {
      alert('Failed to delete site');
    }
  }
</script>

<svelte:head>
  <title>Settings | {siteName}</title>
</svelte:head>

<div class="settings-layout">
  <nav class="settings-nav">
    <a href="/dashboard/{data.site.id}" class="back-link">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      Back to Editor
    </a>
  </nav>

  <main class="settings-main">
    <header class="settings-header">
      <h1>Settings</h1>
      <p>{siteName}</p>
    </header>

    <!-- Domain Section -->
    <section class="settings-section">
      <h2>Domain</h2>

      <div class="domain-item">
        <div class="domain-info">
          <span class="domain-label">Default URL</span>
          <a href={siteUrl} target="_blank" rel="noopener" class="domain-url">
            {data.site.subdomain}.createsomething.space
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
        <span class="domain-status active">Active</span>
      </div>

      <div class="custom-domain">
        <label class="field-label" for="customDomain">Custom Domain</label>
        <p class="field-hint">Connect your own domain (e.g., www.yourdomain.com)</p>

        <div class="domain-input-row">
          <input
            type="text"
            id="customDomain"
            class="input"
            placeholder="www.example.com"
            bind:value={customDomain}
          />
          <button
            class="btn btn-secondary"
            onclick={verifyDomain}
            disabled={isVerifying || !customDomain.trim()}
          >
            {#if isVerifying}
              Verifying...
            {:else}
              Verify DNS
            {/if}
          </button>
        </div>

        {#if verificationStatus === 'success'}
          <p class="domain-message success">Domain verified! It may take up to 24 hours to propagate.</p>
        {:else if verificationStatus === 'error'}
          <p class="domain-message error">DNS verification failed. Please check your records.</p>
        {/if}

        {#if customDomain.trim()}
          <div class="dns-instructions">
            <p class="dns-title">Add these DNS records:</p>
            <div class="dns-record">
              <span class="dns-type">CNAME</span>
              <span class="dns-name">{customDomain.startsWith('www.') ? 'www' : '@'}</span>
              <span class="dns-value">{data.site.subdomain}.createsomething.space</span>
            </div>
          </div>
        {/if}
      </div>
    </section>

    <!-- Plan Section -->
    <section class="settings-section">
      <h2>Plan</h2>

      <div class="plan-card">
        <div class="plan-info">
          <span class="plan-name">{data.site.tier}</span>
          <span class="plan-template">Using: {data.template?.name || 'Unknown template'}</span>
        </div>

        {#if data.site.tier === 'free'}
          <a href="/pricing" class="btn btn-primary">
            Upgrade to Pro
          </a>
        {/if}
      </div>

      <div class="plan-features">
        <p class="plan-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {data.site.tier === 'free' ? '1 site' : data.site.tier === 'pro' ? '10 sites' : 'Unlimited sites'}
        </p>
        <p class="plan-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {data.site.tier === 'free' ? 'Subdomain only' : 'Custom domain'}
        </p>
      </div>
    </section>

    <!-- Info Section -->
    <section class="settings-section">
      <h2>Site Info</h2>

      <dl class="info-list">
        <div class="info-item">
          <dt>Created</dt>
          <dd>{new Date(data.site.createdAt).toLocaleDateString()}</dd>
        </div>
        <div class="info-item">
          <dt>Last Updated</dt>
          <dd>{new Date(data.site.updatedAt).toLocaleDateString()}</dd>
        </div>
        {#if data.site.deployedAt}
          <div class="info-item">
            <dt>Last Published</dt>
            <dd>{new Date(data.site.deployedAt).toLocaleDateString()}</dd>
          </div>
        {/if}
        <div class="info-item">
          <dt>Status</dt>
          <dd class="status-badge" class:active={data.site.status === 'active'}>
            {data.site.status}
          </dd>
        </div>
      </dl>
    </section>

    <!-- Danger Zone -->
    <section class="settings-section danger">
      <h2>Danger Zone</h2>
      <p class="section-hint">Irreversible actions. Proceed with caution.</p>

      <button class="btn btn-danger" onclick={deleteSite}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        Delete Site
      </button>
    </section>
  </main>
</div>

<style>
  .settings-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .settings-nav {
    padding: var(--space-sm) var(--gutter);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border-default);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .back-link:hover {
    color: var(--color-fg-primary);
  }

  .settings-main {
    max-width: var(--content-narrow);
    margin: 0 auto;
    padding: var(--space-lg) var(--gutter);
    width: 100%;
  }

  .settings-header {
    margin-bottom: var(--space-xl);
  }

  .settings-header h1 {
    font-size: var(--text-h1);
    margin: 0 0 var(--space-xs);
  }

  .settings-header p {
    color: var(--color-fg-muted);
    margin: 0;
  }

  .settings-section {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-lg);
  }

  .settings-section h2 {
    font-size: var(--text-h3);
    margin: 0 0 var(--space-md);
  }

  .settings-section.danger {
    border-color: var(--color-error);
  }

  .settings-section.danger h2 {
    color: var(--color-error);
  }

  .section-hint {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin: 0 0 var(--space-md);
  }

  .domain-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }

  .domain-label {
    display: block;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin-bottom: 2px;
  }

  .domain-url {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
  }

  .domain-status {
    font-size: var(--text-caption);
    font-weight: 500;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-subtle);
    color: var(--color-fg-muted);
  }

  .domain-status.active {
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-success);
  }

  .custom-domain {
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border-default);
  }

  .field-label {
    display: block;
    font-size: var(--text-body-sm);
    font-weight: 500;
    margin-bottom: 2px;
  }

  .field-hint {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0 0 var(--space-sm);
  }

  .domain-input-row {
    display: flex;
    gap: var(--space-xs);
  }

  .domain-input-row .input {
    flex: 1;
  }

  .domain-message {
    font-size: var(--text-body-sm);
    margin: var(--space-sm) 0 0;
  }

  .domain-message.success {
    color: var(--color-success);
  }

  .domain-message.error {
    color: var(--color-error);
  }

  .dns-instructions {
    margin-top: var(--space-md);
    padding: var(--space-sm);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
  }

  .dns-title {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0 0 var(--space-xs);
  }

  .dns-record {
    display: flex;
    gap: var(--space-md);
    font-family: monospace;
    font-size: var(--text-body-sm);
  }

  .dns-type {
    color: var(--color-accent);
    font-weight: 600;
    min-width: 60px;
  }

  .dns-name {
    color: var(--color-fg-secondary);
    min-width: 60px;
  }

  .dns-value {
    color: var(--color-fg-primary);
  }

  .plan-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }

  .plan-name {
    display: block;
    font-size: var(--text-body);
    font-weight: 600;
    text-transform: capitalize;
  }

  .plan-template {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .plan-features {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .plan-feature {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin: 0;
  }

  .plan-feature svg {
    color: var(--color-success);
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin: 0;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-xs) 0;
    border-bottom: 1px solid var(--color-border-default);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-item dt {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .info-item dd {
    font-size: var(--text-body-sm);
    margin: 0;
  }

  .status-badge {
    text-transform: capitalize;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-subtle);
  }

  .status-badge.active {
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-success);
  }

  .btn-danger {
    background: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
  }

  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }
</style>
