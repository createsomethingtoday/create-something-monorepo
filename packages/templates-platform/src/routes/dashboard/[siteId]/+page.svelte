<!--
  Site Editor

  Single-page editor for all site content.
  Heideggerian: The interface recedes, content emerges.

  Design principles:
  - All content on one scrolling page
  - Inline editing (click to edit)
  - Auto-save with subtle indicator
  - No modals, no sidebars, no chrome
-->
<script lang="ts">
  import SiteEditor from '$lib/components/SiteEditor.svelte';
  import EditorNav from '$lib/components/EditorNav.svelte';
  import AutoSave from '$lib/components/AutoSave.svelte';
  import type { Tenant, Template } from '$lib/types';

  interface Props {
    data: {
      site: Tenant;
      template: Template;
    };
  }

  let { data }: Props = $props();

  let config = $state(structuredClone(data.site.config));
  let hasChanges = $state(false);
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function handleConfigChange(newConfig: Record<string, unknown>) {
    config = newConfig;
    hasChanges = true;
  }

  function handleSaveStart() {
    saveStatus = 'saving';
  }

  function handleSaveComplete(success: boolean) {
    saveStatus = success ? 'saved' : 'error';
    if (success) {
      hasChanges = false;
      // Reset to idle after showing "saved" briefly
      setTimeout(() => {
        if (saveStatus === 'saved') {
          saveStatus = 'idle';
        }
      }, 2000);
    }
  }
</script>

<svelte:head>
  <title>Edit {(config.name as string) || data.site.subdomain} | Dashboard</title>
</svelte:head>

<div class="editor-layout">
  <EditorNav
    siteName={(config.name as string) || data.site.subdomain}
    siteUrl="https://{data.site.subdomain}.createsomething.space"
    {saveStatus}
    {hasChanges}
  />

  <main class="editor-main">
    <SiteEditor
      siteId={data.site.id}
      {config}
      template={data.template}
      onchange={handleConfigChange}
    />
  </main>

  <AutoSave
    siteId={data.site.id}
    {config}
    {hasChanges}
    onSaveStart={handleSaveStart}
    onSaveComplete={handleSaveComplete}
  />
</div>

<style>
  .editor-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .editor-main {
    flex: 1;
    max-width: var(--content-narrow);
    margin: 0 auto;
    padding: var(--space-lg) var(--gutter);
    width: 100%;
  }
</style>
