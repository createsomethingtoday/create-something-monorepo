<script lang="ts">
	import { Button, Card, CardContent, CardHeader, CardTitle } from './ui';
	import type { AssetDraftRecord } from '$lib/drafts';

	interface Props {
		drafts: AssetDraftRecord[];
		busyDraftId?: string | null;
		onOpen: (id: string) => void;
		onPromote: (id: string) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
	}

	let { drafts, busyDraftId = null, onOpen, onPromote, onDelete }: Props = $props();

	function buildMeta(draft: AssetDraftRecord): string {
		if (draft.assetType === 'Template') {
			const category = draft.data.assetType === 'Template' ? draft.data.category : '';
			return category ? `${draft.assetType} · ${category}` : draft.assetType;
		}

		if (draft.data.assetType === 'App' && draft.data.appCapabilities) {
			return `${draft.assetType} · ${draft.data.appCapabilities}`;
		}

		return draft.assetType;
	}
</script>

{#if drafts.length > 0}
	<div class="drafts-panel">
		<Card>
			<CardHeader>
				<CardTitle>Saved Drafts</CardTitle>
				<p class="drafts-description">
					These drafts are stored in Cloudflare until you are ready to create the Airtable asset.
				</p>
			</CardHeader>
			<CardContent>
				<div class="draft-grid">
					{#each drafts as draft}
						<div class="draft-card">
							<div class="draft-top">
								{#if draft.thumbnailUrl}
									<img class="draft-image" src={draft.thumbnailUrl} alt="" />
								{:else}
									<div class="draft-image draft-image--placeholder">
										<span>{draft.assetType}</span>
									</div>
								{/if}
								<div class="draft-copy">
									<p class="draft-eyebrow">{buildMeta(draft)}</p>
									<h3>{draft.title}</h3>
									<p>Last saved {new Date(draft.updatedAt).toLocaleString()}</p>
								</div>
							</div>
							<div class="draft-actions">
								<Button variant="secondary" size="sm" onclick={() => onOpen(draft.id)}>
									Continue Editing
								</Button>
								<Button
									size="sm"
									onclick={() => onPromote(draft.id)}
									disabled={busyDraftId === draft.id}
								>
									{busyDraftId === draft.id ? 'Working...' : 'Create Airtable Asset'}
								</Button>
								<Button
									variant="outline"
									size="sm"
									onclick={() => onDelete(draft.id)}
									disabled={busyDraftId === draft.id}
								>
									Delete
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	</div>
{/if}

<style>
	.drafts-panel {
		border: 1px solid var(--color-border-default);
	}

	.drafts-description {
		margin: var(--space-xs) 0 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.draft-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		gap: var(--space-md);
	}

	.draft-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		background: var(--color-shell-surface-secondary);
	}

	.draft-top {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	.draft-image {
		width: 4.5rem;
		height: 4.5rem;
		border-radius: var(--radius-md);
		object-fit: cover;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-subtle);
	}

	.draft-image--placeholder {
		display: grid;
		place-items: center;
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.draft-copy {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.draft-eyebrow {
		margin: 0;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.draft-copy h3 {
		margin: 0;
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
	}

	.draft-copy p:last-child {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.draft-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}
</style>
