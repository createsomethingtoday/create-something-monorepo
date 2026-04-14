<script lang="ts">
	import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from './ui';
	import type { AssetDraftRecord } from '$lib/drafts';

	interface Props {
		drafts: AssetDraftRecord[];
		busyDraftId?: string | null;
		onOpen: (id: string) => void;
		onPromote: (id: string) => Promise<void>;
		onDelete: (id: string) => Promise<void>;
	}

	let { drafts, busyDraftId = null, onOpen, onPromote, onDelete }: Props = $props();

	function buildSecondaryMeta(draft: AssetDraftRecord): string | null {
		if (draft.assetType === 'Template' && draft.data.assetType === 'Template') {
			return draft.data.category || null;
		}

		if (draft.data.assetType === 'App') {
			return draft.data.appCapabilities || null;
		}

		return null;
	}
</script>

{#if drafts.length > 0}
	<Card class="drafts-panel">
		<CardHeader class="drafts-header">
			<div class="drafts-heading">
				<span class="drafts-kicker">Cloudflare storage</span>
				<CardTitle>Saved Drafts</CardTitle>
				<p class="drafts-description">
					These drafts stay in Cloudflare until you are ready to create the Airtable asset.
				</p>
			</div>
			<div class="drafts-summary">
				<Badge variant="outline">{drafts.length} saved</Badge>
			</div>
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
								<div class="draft-meta">
									<Badge variant="info">{draft.assetType}</Badge>
									{#if buildSecondaryMeta(draft)}
										<Badge variant="outline">{buildSecondaryMeta(draft)}</Badge>
									{/if}
								</div>
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
{/if}

<style>
	:global(.drafts-panel) {
		background: var(--color-shell-surface);
		box-shadow: var(--color-shell-shadow);
	}

	:global(.drafts-header) {
		flex-direction: row;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-shell-border-default);
	}

	.drafts-heading {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		min-width: 0;
	}

	.drafts-kicker {
		display: inline-flex;
		align-items: center;
		font-size: 0.72rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.drafts-summary {
		display: flex;
		align-items: center;
	}

	.drafts-description {
		margin: 0;
		font-size: var(--text-body-sm);
		line-height: 1.6;
		color: var(--color-fg-tertiary);
	}

	.draft-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		gap: var(--space-lg);
	}

	.draft-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-shell-surface-tertiary) 70%, var(--color-bg-surface));
		box-shadow: inset 0 1px 0 var(--glass-border-light);
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard),
			transform var(--duration-micro) var(--ease-standard);
	}

	.draft-card:hover {
		border-color: var(--color-shell-border-strong);
		background: var(--color-bg-surface);
		transform: translateY(-1px);
	}

	.draft-top {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.draft-image {
		width: 5.25rem;
		height: 5.25rem;
		border-radius: var(--radius-md);
		object-fit: cover;
		border: 1px solid var(--color-shell-border-default);
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

	.draft-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: 0.2rem;
	}

	.draft-copy h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: clamp(1.05rem, 0.35vw + 1rem, 1.2rem);
		line-height: 1.15;
		color: var(--color-fg-primary);
	}

	.draft-copy p:last-child {
		margin: 0;
		font-size: var(--text-body-sm);
		line-height: 1.5;
		color: var(--color-fg-tertiary);
	}

	.draft-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.draft-actions :global(.btn) {
		flex: 1 1 10rem;
	}

	@media (max-width: 720px) {
		:global(.drafts-header) {
			flex-direction: column;
		}

		.drafts-summary {
			width: 100%;
		}

		.draft-actions {
			flex-direction: column;
		}
	}
</style>
