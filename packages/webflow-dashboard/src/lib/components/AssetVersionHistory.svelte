<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from './ui';
	import { Button } from './ui';
	import { Badge } from './ui';

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

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function toggleVersionSelection(versionId: string) {
		if (selectedVersions.includes(versionId)) {
			selectedVersions = selectedVersions.filter((id) => id !== versionId);
		} else if (selectedVersions.length < 2) {
			selectedVersions = [...selectedVersions, versionId];
		}
	}

	async function handleRollback(versionId: string) {
		if (!confirm('Are you sure you want to rollback to this version? This will create a new version entry.')) {
			return;
		}

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
			alert('Failed to rollback to version');
			console.error(err);
		} finally {
			isLoading = false;
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
			<Button onclick={handleCompare} size="sm">
				Compare Selected Versions
			</Button>
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
					>
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<Badge variant="outline">v{version.versionNumber}</Badge>
									<span class="version-date">{formatDate(version.createdAt)}</span>
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
											handleRollback(version.id);
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
</style>
