<script lang="ts">
  import { Dialog } from './ui';
  import { Badge } from './ui';
  import { Button } from './ui';
  import { formatDateTime } from '$lib/utils/format';

  interface VersionDiff {
    field: string;
    oldValue: string | string[] | undefined;
    newValue: string | string[] | undefined;
    changed: boolean;
  }

  interface AssetVersion {
    id: string;
    versionNumber: number;
    createdAt: string;
    createdBy: string;
    changes: string;
  }

  interface Props {
    assetId: string;
    fromVersionId: string;
    toVersionId: string;
    open: boolean;
    onClose: () => void;
  }

  let { assetId, fromVersionId, toVersionId, open, onClose }: Props = $props();

  let isLoading = $state(true);
  let fromVersion = $state<AssetVersion | null>(null);
  let toVersion = $state<AssetVersion | null>(null);
  let differences = $state<VersionDiff[]>([]);
  let loadError = $state<string | null>(null);

  interface ComparisonResponse {
    fromVersion: AssetVersion;
    toVersion: AssetVersion;
    differences: VersionDiff[];
  }

  async function loadComparison() {
    if (!open) return;

    isLoading = true;
    loadError = null;
    try {
      const response = await fetch(
        `/api/assets/${assetId}/versions/compare?from=${fromVersionId}&to=${toVersionId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load comparison');
      }

      const data = (await response.json()) as ComparisonResponse;
      fromVersion = data.fromVersion;
      toVersion = data.toVersion;
      differences = data.differences;
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Failed to load version comparison';
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (open && fromVersionId && toVersionId) {
      loadComparison();
    }
  });

  function formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  function formatValue(value: string | string[] | undefined): string {
    if (value === undefined) return 'Not set';
    if (Array.isArray(value)) return `${value.length} items`;
    return value || 'Empty';
  }

</script>

<Dialog isOpen={open} {onClose} title="Version Comparison" size="xl">
  {#if isLoading}
    <div class="p-6">
      <p class="loading-text">Loading comparison...</p>
    </div>
  {:else if loadError}
    <div class="error-state">
      <p>{loadError}</p>
      <Button variant="secondary" onclick={loadComparison}>Try again</Button>
    </div>
  {:else if fromVersion && toVersion}
    <div class="comparison-header">
      <div class="version-info">
        <Badge>v{fromVersion.versionNumber}</Badge>
        <span class="version-date">{formatDateTime(fromVersion.createdAt)}</span>
        <p class="version-author">By {fromVersion.createdBy}</p>
      </div>
      <span class="arrow">→</span>
      <div class="version-info">
        <Badge>v{toVersion.versionNumber}</Badge>
        <span class="version-date">{formatDateTime(toVersion.createdAt)}</span>
        <p class="version-author">By {toVersion.createdBy}</p>
      </div>
    </div>

    <div class="differences">
      {#if differences.length === 0}
        <p class="no-changes">No changes detected between these versions.</p>
      {:else}
        {#each differences as diff}
          <div class="diff-item">
            <div class="diff-field">{formatFieldName(diff.field)}</div>
            <div class="diff-values">
              <div class="diff-old">
                <span class="diff-label">Old:</span>
                <span class="diff-value">{formatValue(diff.oldValue)}</span>
              </div>
              <div class="diff-new">
                <span class="diff-label">New:</span>
                <span class="diff-value">{formatValue(diff.newValue)}</span>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</Dialog>

<style>
  .loading-text {
    color: var(--color-fg-secondary);
  }

  .comparison-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    gap: var(--space-md);
    background: var(--color-bg-subtle);
  }

  .version-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    flex: 1;
  }

  .version-date {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .version-author {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0;
  }

  .arrow {
    font-size: var(--text-h2);
    color: var(--color-fg-muted);
  }

  .differences {
    padding: var(--space-md);
  }

  .no-changes {
    color: var(--color-fg-muted);
    text-align: center;
    padding: var(--space-lg);
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .error-state p {
    margin: 0;
    color: var(--color-error);
    font-size: var(--text-body-sm);
  }

  .diff-item {
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    margin-bottom: var(--space-sm);
  }

  .diff-field {
    font-size: var(--text-body);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .diff-values {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .diff-old,
  .diff-new {
    display: flex;
    gap: var(--space-xs);
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
  }

  .diff-old {
    background: var(--color-error-muted);
    border-left: 3px solid var(--color-error);
  }

  .diff-new {
    background: var(--color-success-muted);
    border-left: 3px solid var(--color-success);
  }

  .diff-label {
    font-size: var(--text-body-sm);
    font-weight: 600;
    color: var(--color-fg-secondary);
    min-width: 40px;
  }

  .diff-value {
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
  }
</style>
