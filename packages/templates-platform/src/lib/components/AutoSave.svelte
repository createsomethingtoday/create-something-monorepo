<!--
  AutoSave

  Debounced auto-save with subtle status indicator.
  Heideggerian: Invisible when working, present only when relevant.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';

  interface Props {
    siteId: string;
    config: Record<string, unknown>;
    hasChanges: boolean;
    onSaveStart?: () => void;
    onSaveComplete?: (success: boolean) => void;
    debounceMs?: number;
  }

  let {
    siteId,
    config,
    hasChanges,
    onSaveStart,
    onSaveComplete,
    debounceMs = 1500
  }: Props = $props();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let isSaving = $state(false);

  // Watch for changes and trigger debounced save
  $effect(() => {
    if (hasChanges && !isSaving) {
      // Clear existing timer
      if (saveTimer) {
        clearTimeout(saveTimer);
      }

      // Set new debounced save
      saveTimer = setTimeout(() => {
        performSave();
      }, debounceMs);
    }
  });

  async function performSave() {
    if (isSaving) return;

    isSaving = true;
    onSaveStart?.();

    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      const success = response.ok;
      onSaveComplete?.(success);
    } catch (e) {
      onSaveComplete?.(false);
    } finally {
      isSaving = false;
    }
  }

  onDestroy(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
  });
</script>

<!-- AutoSave is invisible - it only triggers callbacks -->
