<!--
  PreviewToggle

  Toggle between edit and preview modes.
  Preview shows live site in iframe with current config.
  Heideggerian: See changes as you make them - no delay between intent and result.
-->
<script lang="ts">
  interface Props {
    siteUrl: string;
    config: Record<string, unknown>;
    mode?: 'edit' | 'preview' | 'split';
    onModeChange?: (mode: 'edit' | 'preview' | 'split') => void;
  }

  let {
    siteUrl,
    config,
    mode = 'edit',
    onModeChange
  }: Props = $props();

  let iframeKey = $state(0);

  // Refresh preview when config changes
  $effect(() => {
    // Access config to track it
    JSON.stringify(config);
    // Debounce iframe refresh
    const timer = setTimeout(() => {
      iframeKey++;
    }, 1000);
    return () => clearTimeout(timer);
  });

  function setMode(newMode: 'edit' | 'preview' | 'split') {
    onModeChange?.(newMode);
  }
</script>

<div class="preview-toggle">
  <div class="toggle-buttons">
    <button
      class="toggle-btn"
      class:active={mode === 'edit'}
      onclick={() => setMode('edit')}
      title="Edit mode"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      Edit
    </button>

    <button
      class="toggle-btn"
      class:active={mode === 'split'}
      onclick={() => setMode('split')}
      title="Split view"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="12" y1="3" x2="12" y2="21"/>
      </svg>
      Split
    </button>

    <button
      class="toggle-btn"
      class:active={mode === 'preview'}
      onclick={() => setMode('preview')}
      title="Preview mode"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      Preview
    </button>
  </div>

  {#if mode === 'preview' || mode === 'split'}
    <div class="preview-frame" class:split={mode === 'split'}>
      <div class="frame-header">
        <span class="frame-url">{siteUrl}</span>
        <a href={siteUrl} target="_blank" rel="noopener" class="frame-external">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      </div>
      <iframe
        {key}
        src="{siteUrl}?preview=true&_t={iframeKey}"
        title="Site Preview"
        class="preview-iframe"
      ></iframe>
    </div>
  {/if}
</div>

<style>
  .preview-toggle {
    display: flex;
    flex-direction: column;
  }

  .toggle-buttons {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    width: fit-content;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .toggle-btn:hover {
    color: var(--color-fg-secondary);
    background: var(--color-hover);
  }

  .toggle-btn.active {
    color: var(--color-fg-primary);
    background: var(--color-bg-elevated);
  }

  .preview-frame {
    margin-top: var(--space-md);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: var(--color-bg-surface);
  }

  .preview-frame.split {
    position: fixed;
    right: 0;
    top: 60px;
    bottom: 0;
    width: 50%;
    margin: 0;
    border-radius: 0;
    border-left: 1px solid var(--color-border-default);
    z-index: 50;
  }

  .frame-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border-default);
  }

  .frame-url {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-family: monospace;
  }

  .frame-external {
    color: var(--color-fg-muted);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .frame-external:hover {
    color: var(--color-fg-primary);
  }

  .preview-iframe {
    width: 100%;
    height: 600px;
    border: none;
    background: white;
  }

  .preview-frame.split .preview-iframe {
    height: calc(100% - 36px);
  }
</style>
