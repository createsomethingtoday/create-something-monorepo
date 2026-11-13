<script lang="ts">
	/**
	 * ReviewThreadCard - review progress and the review conversation, by version.
	 *
	 * Replaces the Zendesk email thread. Each submitted version is one review
	 * round with a creator-safe status. Only released reviewer feedback reaches
	 * this card (the Worker filters by role). The creator replies on the newest
	 * round the review team has commented on; the review team opens each thread.
	 * Bodies render as plain text, never HTML.
	 */
	import { onMount } from 'svelte';
	import type { ReviewComment } from '$lib/server/review-comments';
	import { formatLongDate } from '$lib/utils/format';
	import { toast } from '$lib/stores/toast';
	import { Card, CardHeader, CardTitle, CardContent, Button, Textarea } from './ui';
	import { MessageSquare } from 'lucide-svelte';

	interface Props {
		assetId: string;
	}

	interface ReviewRound {
		id: string;
		versionNumber: number;
		reviewType: string | null;
		submittedAt: string | null;
		status: string;
	}

	let { assetId }: Props = $props();

	let comments = $state<ReviewComment[]>([]);
	let rounds = $state<ReviewRound[]>([]);
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let draft = $state('');
	let sending = $state(false);

	// Newest round first, each with its comments in the order they were sent.
	const groups = $derived(
		rounds.map((round) => ({
			round,
			comments: comments.filter((comment) => comment.versionRef === round.id)
		}))
	);

	// The review team opens a thread; until then there is nothing to reply to.
	const replyRound = $derived(groups.find((group) => group.comments.length > 0)?.round ?? null);

	const STATUS_TONES: Record<string, string> = {
		'Changes Requested': 'attention',
		Rejected: 'negative',
		Approved: 'positive'
	};

	async function load() {
		status = 'loading';
		try {
			const response = await fetch(`/api/assets/${assetId}/comments`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = (await response.json()) as { comments: ReviewComment[]; versions: ReviewRound[] };
			comments = data.comments;
			rounds = data.versions;
			status = 'ready';
		} catch {
			status = 'error';
		}
	}

	async function sendReply() {
		const body = draft.trim();
		if (!body || !replyRound || sending) return;

		sending = true;
		try {
			const response = await fetch(`/api/assets/${assetId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ versionId: replyRound.id, body })
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = (await response.json()) as { comment: ReviewComment; version: ReviewRound };
			comments = [...comments, data.comment];
			rounds = rounds.map((round) => (round.id === data.version.id ? data.version : round));
			draft = '';
			toast.success('Reply sent to the review team');
		} catch {
			toast.error('Could not send your reply. Please try again.');
		} finally {
			sending = false;
		}
	}

	onMount(load);
</script>

<Card>
	<CardHeader>
		<div class="thread-header">
			<MessageSquare size={18} />
			<CardTitle>Review progress</CardTitle>
		</div>
	</CardHeader>
	<CardContent>
		{#if status === 'loading'}
			<p class="thread-note">Loading review progress…</p>
		{:else if status === 'error'}
			<p class="thread-note">
				Review progress could not be loaded.
				<button type="button" class="thread-retry" onclick={load}>Retry</button>
			</p>
		{:else}
			{#if groups.length === 0}
				<p class="thread-note">
					No version is in review yet. Each version you submit appears here with its review status.
				</p>
			{/if}

			{#each groups as group, index (group.round.id)}
				<section class="thread-version" aria-label="Version {group.round.versionNumber}">
					<div class="thread-version-head">
						<h3 class="thread-version-label">
							Version {group.round.versionNumber}{group.round.reviewType
								? ` · ${group.round.reviewType}`
								: ''}
						</h3>
						<span class="thread-status" data-tone={STATUS_TONES[group.round.status] ?? 'neutral'}>
							{group.round.status}
						</span>
					</div>
					{#if group.round.submittedAt}
						<p class="thread-submitted">Submitted {formatLongDate(group.round.submittedAt)}</p>
					{/if}

					{#if group.comments.length === 0 && index === 0}
						<p class="thread-note">
							No feedback on this version yet. The review team's feedback appears here when they send it.
						</p>
					{/if}

					{#if group.comments.length > 0}
						<ol class="thread-list">
							{#each group.comments as comment (comment.id)}
								<li class="thread-item" class:thread-item-creator={comment.authorRole === 'creator'}>
									<div class="thread-meta">
										<span class="thread-author">
											{comment.authorRole === 'creator' ? 'You' : 'Webflow review team'}
										</span>
										<span class="thread-date">{formatLongDate(comment.releasedAt ?? comment.createdAt)}</span>
										{#if comment.resolution === 'resolved'}
											<span class="thread-badge">Resolved</span>
										{/if}
									</div>
									<p class="thread-body">{comment.body}</p>
								</li>
							{/each}
						</ol>
					{/if}

					{#if replyRound?.id === group.round.id}
						<form
							class="thread-reply"
							onsubmit={(event) => {
								event.preventDefault();
								sendReply();
							}}
						>
							<label class="thread-reply-label" for="review-reply">
								Reply to the review team on version {group.round.versionNumber}
							</label>
							<Textarea
								id="review-reply"
								bind:value={draft}
								maxlength={20000}
								placeholder="Describe what you changed or ask the review team a question"
								disabled={sending}
							/>
							<div class="thread-reply-actions">
								<Button type="submit" size="sm" disabled={sending || !draft.trim()}>
									{sending ? 'Sending…' : 'Send reply'}
								</Button>
							</div>
						</form>
					{/if}
				</section>
			{/each}
		{/if}
	</CardContent>
</Card>

<style>
	.thread-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.thread-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.thread-retry {
		background: none;
		border: none;
		padding: 0;
		color: var(--color-fg-primary);
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}

	.thread-version + .thread-version {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.thread-version-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.thread-version-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.thread-status {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: 1px var(--space-xs);
	}

	.thread-status[data-tone='attention'] {
		color: var(--color-warning-ink);
	}

	.thread-status[data-tone='negative'] {
		color: var(--color-error-ink);
	}

	.thread-status[data-tone='positive'] {
		color: var(--color-success-ink);
	}

	.thread-submitted {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	.thread-list {
		list-style: none;
		margin: var(--space-xs) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.thread-item {
		padding: var(--space-sm) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.thread-item-creator {
		padding-left: var(--space-md);
		border-left: 2px solid var(--color-border-default);
	}

	.thread-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.thread-author {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.thread-date {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.thread-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: 1px var(--space-xs);
	}

	.thread-body {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		line-height: 1.6;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.thread-reply {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.thread-reply-label {
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.thread-reply-actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
