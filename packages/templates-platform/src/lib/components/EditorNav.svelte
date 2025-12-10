<!--
  EditorNav

  Minimal navigation bar for the site editor.
  Heideggerian: Just enough UI to orient, then it recedes.
-->
<script lang="ts">
  interface Props {
    siteName: string;
    siteUrl: string;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    hasChanges: boolean;
  }

  let { siteName, siteUrl, saveStatus, hasChanges }: Props = $props();

  const statusText = {
    idle: '',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Save failed'
  };
</script>

<nav class="editor-nav">
  <div class="nav-left">
    <a href="/dashboard" class="back-link" title="Back to dashboard">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </a>
    <span class="site-name">{siteName}</span>
    {#if hasChanges && saveStatus === 'idle'}
      <span class="unsaved-dot" title="Unsaved changes"></span>
    {/if}
  </div>

  <div class="nav-center">
    {#if saveStatus !== 'idle'}
      <span class="save-status" class:error={saveStatus === 'error'} class:success={saveStatus === 'saved'}>
        {statusText[saveStatus]}
      </span>
    {/if}
  </div>

  <div class="nav-right">
    <a href={siteUrl} target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      View Site
    </a>
    <a href="/dashboard/{siteName}/settings" class="btn btn-secondary btn-sm">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
      Settings
    </a>
  </div>
</nav>

<style>
  .editor-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--gutter);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border-default);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .back-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--color-fg-secondary);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .back-link:hover {
    background: var(--color-hover);
    color: var(--color-fg-primary);
  }

  .site-name {
    font-weight: 600;
    font-size: var(--text-body);
  }

  .unsaved-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: var(--color-warning);
  }

  .nav-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .save-status {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .save-status.success {
    color: var(--color-success);
  }

  .save-status.error {
    color: var(--color-error);
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .btn-sm {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--text-caption);
  }
</style>
