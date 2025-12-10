<!--
  SiteEditor

  Main container for site content editing.
  Organizes fields into logical sections based on template schema.
  Heideggerian: Structure emerges from content, not imposed categories.
-->
<script lang="ts">
  import type { Template, ConfigField } from '$lib/types';
  import FieldEditor from './FieldEditor.svelte';

  interface Props {
    siteId: string;
    config: Record<string, unknown>;
    template: Template;
    onchange: (config: Record<string, unknown>) => void;
  }

  let { siteId, config, template, onchange }: Props = $props();

  let isPublishing = $state(false);
  let publishStatus = $state<'idle' | 'publishing' | 'success' | 'error'>('idle');
  let publishMessage = $state('');

  async function handlePublish() {
    if (isPublishing) return;

    isPublishing = true;
    publishStatus = 'publishing';
    publishMessage = 'Publishing your changes...';

    try {
      const response = await fetch(`/api/sites/${siteId}/redeploy`, {
        method: 'POST'
      });

      if (response.ok) {
        publishStatus = 'success';
        publishMessage = 'Your site is now live!';
        // Reset after showing success
        setTimeout(() => {
          if (publishStatus === 'success') {
            publishStatus = 'idle';
            publishMessage = '';
          }
        }, 3000);
      } else {
        throw new Error('Publish failed');
      }
    } catch (e) {
      publishStatus = 'error';
      publishMessage = 'Failed to publish. Please try again.';
    } finally {
      isPublishing = false;
    }
  }

  // Get value from potentially nested path (e.g., "address.city")
  function getValue(path: string): unknown {
    return path.split('.').reduce((obj, key) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, config as unknown);
  }

  // Set value at potentially nested path
  function setValue(path: string, value: unknown) {
    const newConfig = structuredClone(config);
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    let current: Record<string, unknown> = newConfig;
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[lastKey] = value;
    onchange(newConfig);
  }

  // Group optional fields by category
  function categorizeFields(fields: ConfigField[]): Map<string, ConfigField[]> {
    const categories = new Map<string, ConfigField[]>();

    for (const field of fields) {
      // Infer category from field key prefix
      const category = inferCategory(field.key);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(field);
    }

    return categories;
  }

  function inferCategory(key: string): string {
    if (key.startsWith('social.')) return 'Social Links';
    if (key.startsWith('address.')) return 'Location';
    if (key === 'email' || key === 'phone') return 'Contact';
    if (key === 'projects' || key === 'work') return 'Portfolio';
    if (key === 'services') return 'Services';
    if (key === 'team') return 'Team';
    if (key === 'stats') return 'Statistics';
    if (key === 'philosophy') return 'About';
    return 'Details';
  }

  const optionalCategories = $derived(categorizeFields(template.configSchema.optional));
</script>

<div class="site-editor">
  <!-- Primary Fields (Required) -->
  <section class="editor-section primary">
    <h2 class="section-title">Basic Information</h2>
    <p class="section-description">The essential details for your site.</p>

    <div class="fields-grid">
      {#each template.configSchema.required as field}
        <FieldEditor
          {field}
          value={getValue(field.key)}
          onchange={(value) => setValue(field.key, value)}
        />
      {/each}
    </div>
  </section>

  <!-- Optional Fields (Grouped by Category) -->
  {#each Array.from(optionalCategories.entries()) as [category, fields]}
    <section class="editor-section">
      <h2 class="section-title">{category}</h2>

      <div class="fields-grid">
        {#each fields as field}
          <FieldEditor
            {field}
            value={getValue(field.key)}
            onchange={(value) => setValue(field.key, value)}
          />
        {/each}
      </div>
    </section>
  {/each}

  <!-- Publish Section -->
  <section class="editor-section publish" class:success={publishStatus === 'success'} class:error={publishStatus === 'error'}>
    <div class="publish-info">
      <h2 class="section-title">
        {#if publishStatus === 'success'}
          Published!
        {:else if publishStatus === 'error'}
          Publish Failed
        {:else}
          Ready to Publish?
        {/if}
      </h2>
      <p class="section-description">
        {#if publishMessage}
          {publishMessage}
        {:else}
          Your changes are saved automatically. Click publish to make them live.
        {/if}
      </p>
    </div>
    <button
      class="btn btn-primary btn-lg"
      type="button"
      onclick={handlePublish}
      disabled={isPublishing}
    >
      {#if isPublishing}
        <span class="spinner"></span>
        Publishing...
      {:else if publishStatus === 'success'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Live
      {:else}
        Publish Changes
      {/if}
    </button>
  </section>
</div>

<style>
  .site-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }

  .editor-section {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .editor-section.primary {
    background: var(--color-bg-elevated);
    border-color: var(--color-border-emphasis);
  }

  .section-title {
    font-size: var(--text-h3);
    font-weight: 600;
    margin: 0 0 var(--space-xs);
  }

  .section-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin: 0 0 var(--space-md);
  }

  .fields-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .publish {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-lg);
    background: var(--color-bg-elevated);
    border-color: var(--color-accent);
  }

  .publish-info {
    flex: 1;
  }

  .publish .section-title {
    margin-bottom: 4px;
  }

  .publish .section-description {
    margin: 0;
  }

  .publish.success {
    border-color: var(--color-success);
  }

  .publish.success .section-title {
    color: var(--color-success);
  }

  .publish.error {
    border-color: var(--color-error);
  }

  .publish.error .section-title {
    color: var(--color-error);
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: var(--radius-full);
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
</style>
