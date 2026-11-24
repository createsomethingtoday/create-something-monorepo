<script lang="ts">
	/**
	 * ReviewThreadCard - review progress and the review conversation, by version.
	 *
	 * Replaces the Zendesk email thread. Each submitted version is one review
	 * round with a creator-safe status. Only released reviewer feedback reaches
	 * this card (the Worker filters by role). The creator replies on the newest
	 * round the review team has commented on; the review team opens each thread.
	 * A round also shows when its review started, the same fact the creator
	 * gets by email.
	 * Bodies and decision summaries never render as HTML. A body shows its
	 * formatting through ReviewCommentBody, which builds elements from a parsed
	 * tree; link phrases in a summary become anchors by splitting the text.
	 */
	import { onMount } from 'svelte';
	import type { DecisionSummary, ReviewComment, ReviewEvent } from '$lib/server/review-comments';
	import { formatLongDate } from '$lib/utils/format';
	import { ratingLabel, splitAtFirstReply, splitLinks } from '$lib/utils/review-decision-summary';
	import { toast } from '$lib/stores/toast';
	import { Card, CardHeader, CardTitle, CardContent, Button, Textarea } from './ui';
	import ReviewCommentBody from './ReviewCommentBody.svelte';
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
	let summaries = $state<DecisionSummary[]>([]);
	let events = $state<ReviewEvent[]>([]);
	let rounds = $state<ReviewRound[]>([]);
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let draft = $state('');
	let sending = $state(false);

	// Newest round first, each with its comments in the order they were sent.
	const groups = $derived(
		rounds.map((round) => {
			const roundComments = comments.filter((comment) => comment.versionRef === round.id);
			return {
				round,
				comments: roundComments,
				// The next steps sit after the opening run of review-team comments.
				...splitAtFirstReply(roundComments),
				summary: summaries.find((summary) => summary.versionRef === round.id) ?? null,
				// When the review team started the review of this round, if they told the creator.
				startedAt:
					events.find((event) => event.versionRef === round.id && event.kind === 'review_started')
						?.occurredAt ?? null
			};
		})
	);

	// The review team opens a thread; until then there is nothing to reply to.
	const replyRound = $derived(groups.find((group) => group.comments.length > 0)?.round ?? null);

	// Whether the summary shows anything above the comments.
	function hasSummaryHead(summary: DecisionSummary | null): boolean {
		if (!summary) return false;
		return (
			ratingLabel(summary.qualityRating) !== null ||
			summary.text.before.length > 0 ||
			summary.text.areas.length > 0
		);
	}

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
			const data = (await response.json()) as {
				comments: ReviewComment[];
				summaries?: DecisionSummary[];
				events?: ReviewEvent[];
				versions: ReviewRound[];
			};
			comments = data.comments;
			summaries = data.summaries ?? [];
			events = data.events ?? [];
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

{#snippet paragraph(text: string, links: Array<{ phrase: string; url: string }>)}
	<p class="thread-summary-text">
		{#each splitLinks(text, links) as part, i (i)}
			{#if part.url}<a class="thread-link" href={part.url} target="_blank" rel="noopener noreferrer"
					>{part.text}</a
				>{:else}{part.text}{/if}
		{/each}
	</p>
{/snippet}

{#snippet commentList(list: ReviewComment[], joined = false)}
	{#if list.length > 0}
		<ol class="thread-list" class:thread-list-joined={joined}>
			{#each list as comment (comment.id)}
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
					<ReviewCommentBody body={comment.body} />
				</li>
			{/each}
		</ol>
	{/if}
{/snippet}

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
					{#if group.round.submittedAt || group.startedAt}
						<p class="thread-submitted">
							{#if group.round.submittedAt}Submitted {formatLongDate(group.round.submittedAt)}{/if}{#if group.round.submittedAt && group.startedAt}<span class="thread-dot" aria-hidden="true"> · </span>{/if}{#if group.startedAt}Review started {formatLongDate(group.startedAt)}{/if}
						</p>
					{/if}

					{#if group.summary}
						{@const text = group.summary.text}
						{#if hasSummaryHead(group.summary)}
							<div class="thread-summary">
								{#if ratingLabel(group.summary.qualityRating)}
									<p class="thread-rating">
										<span class="thread-rating-label">Quality rating</span>
										<span class="thread-rating-value">{ratingLabel(group.summary.qualityRating)}</span>
									</p>
								{/if}
								{#each text.before as line, i (i)}
									{@render paragraph(line, text.links)}
								{/each}
								{#if text.areasLabel && text.areas.length > 0}
									{@render paragraph(text.areasLabel, text.links)}
									<ul class="thread-areas">
										{#each text.areas as area, i (i)}
											<li>{area}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					{/if}

					{#if group.comments.length === 0 && index === 0}
						<p class="thread-note">
							{#if group.startedAt}
								The review team is working on this version. No action required at the moment. When
								the feedback is ready, we will email you and show it here.
							{:else}
								No feedback on this version yet. The review team's feedback appears here when they
								send it.
							{/if}
						</p>
					{/if}

					{@render commentList(group.opening, hasSummaryHead(group.summary))}

					{#if group.summary && group.summary.text.after.length > 0}
						<div class="thread-summary thread-summary-after">
							{#each group.summary.text.after as line, i (i)}
								{@render paragraph(line, group.summary.text.links)}
							{/each}
						</div>
					{/if}

					{@render commentList(group.rest)}

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
								aria-describedby="review-reply-format"
								disabled={sending}
							/>
							<p class="thread-reply-hint" id="review-reply-format">
								Formatting: **bold**, *italic*, `code`, [link text](https://example.com), and lists
								on lines that start with - or 1.
							</p>
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
		/* The line holds two dates now; it needs room before the rating or the note. */
		margin-bottom: var(--space-sm);
	}

	.thread-summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin: var(--space-xs) 0 var(--space-sm);
	}

	.thread-summary-after {
		margin: var(--space-sm) 0 0;
	}

	.thread-summary-text,
	.thread-areas {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.thread-rating {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin: 0;
		font-size: var(--text-body-sm);
	}

	.thread-rating-label {
		color: var(--color-fg-secondary);
	}

	.thread-rating-value {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.thread-areas {
		padding-left: var(--space-md);
		list-style: disc;
	}

	.thread-link {
		color: var(--color-fg-primary);
		text-decoration: underline;
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

	/* The opening comments continue the review team's message that starts with
	   the summary, so no divider separates them from it. */
	.thread-list-joined {
		margin-top: 0;
	}

	.thread-list-joined > .thread-item:first-child {
		border-top: none;
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

	.thread-reply-hint {
		margin: 0;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		line-height: 1.5;
	}

	.thread-reply-actions {
		display: flex;
		justify-content: flex-end;
	}
</style>
