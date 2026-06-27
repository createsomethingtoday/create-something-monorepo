<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent, Dialog } from './ui';
  import { Button } from './ui';
  import { Badge } from './ui';
  import { toast } from '$lib/stores/toast';
  import { formatDateTime } from '$lib/utils/format';

  interface AssetVersion {
    id: string;
    assetId: string;
    versionNumber: number;
    createdAt: string;
    createdBy: string;
    changes: string;
    snapshot: {
      name?: string;
      description?: string;
      descriptionShort?: string;
      websiteUrl?: string;
      previewUrl?: string;
      thumbnailUrl?: string;
      secondaryThumbnailUrl?: string;
      carouselImages?: string[];
    };
  }

  interface Props {
    assetId: string;
    versions: AssetVersion[];
    onRollback?: (versionId: string) => void;
    onCompare?: (fromId: string, toId: string) => void;
  }

  let { assetId, versions, onRollback, onCompare }: Props = $props();

  let selectedVersions: string[] = $state([]);
  let isLoading = $state(false);
  let rollbackVersion = $state<AssetVersion | null>(null);

  function toggleVersionSelection(versionId: string) {
    if (selectedVersions.includes(versionId)) {
      selectedVersions = selectedVersions.filter((id) => id !== versionId);
    } else if (selectedVersions.length < 2) {
      selectedVersions = [...selectedVersions, versionId];
    }
  }

  function handleVersionKeydown(event: KeyboardEvent, versionId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleVersionSelection(versionId);
    }
  }

  async function confirmRollback() {
    if (!rollbackVersion) return;
    const versionId = rollbackVersion.id;
    isLoading = true;
    try {
      const response = await fetch(`/api/assets/${assetId}/versions/${versionId}/rollback`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to rollback');
      }

      if (onRollback) {
        onRollback(versionId);
      }

      // Reload the page to show the updated asset
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rollback to version');
    } finally {
      isLoading = false;
      rollbackVersion = null;
    }
  }

  function handleCompare() {
    if (selectedVersions.length !== 2) return;
    if (onCompare) {
      onCompare(selectedVersions[0], selectedVersions[1]);
    }
  }
</script>

<Card>
  <CardHeader>
    <CardTitle>Version History</CardTitle>
    {#if selectedVersions.length === 2}
      <Button onclick={handleCompare} size="sm">Compare Selected Versions</Button>
    {/if}
  </CardHeader>
  <CardContent>
    {#if versions.length === 0}
      <p class="text-muted">No version history available.</p>
    {:else}
      <div class="space-y-4">
        {#each versions as version}
          <div
            class="version-item"
            class:selected={selectedVersions.includes(version.id)}
            onclick={() => toggleVersionSelection(version.id)}
            onkeydown={(event) => handleVersionKeydown(event, version.id)}
            role="button"
            tabindex="0"
            aria-pressed={selectedVersions.includes(version.id)}
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <Badge variant="outline">v{version.versionNumber}</Badge>
                  <span class="version-date">{formatDateTime(version.createdAt)}</span>
                </div>
                <p class="version-changes mb-1">{version.changes}</p>
                <p class="version-author">By {version.createdBy}</p>
              </div>
              <div class="flex gap-2">
                {#if version.versionNumber !== versions[0].versionNumber}
                  <Button
                    size="sm"
                    variant="outline"
                    onclick={(e) => {
                      e.stopPropagation();
                      rollbackVersion = version;
                    }}
                    disabled={isLoading}
                  >
                    Rollback
                  </Button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>

<Dialog
  isOpen={rollbackVersion !== null}
  onClose={() => (rollbackVersion = null)}
  title="Rollback to this version?"
  size="sm"
>
  <div class="confirm-dialog">
    <p>
      This will restore version {rollbackVersion?.versionNumber} and create a new version entry for the
      current asset.
    </p>
    <div class="confirm-actions">
      <Button variant="secondary" onclick={() => (rollbackVersion = null)} disabled={isLoading}>
        Cancel
      </Button>
      <Button variant="destructive" onclick={confirmRollback} disabled={isLoading}>
        {isLoading ? 'Rolling back...' : 'Rollback'}
      </Button>
    </div>
  </div>
</Dialog>

<style>
  .version-item {
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .version-item:hover {
    border-color: var(--color-border-emphasis);
    background: var(--color-hover);
  }

  .version-item.selected {
    border-color: var(--color-border-strong);
    background: var(--color-active);
  }

  .version-item:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .version-date {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .version-changes {
    font-size: var(--text-body-sm);
  }

  .version-author {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .text-muted {
    color: var(--color-fg-muted);
  }

  .space-y-4 > * + * {
    margin-top: var(--space-sm);
  }

  .confirm-dialog {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .confirm-dialog p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
</style>
