<script lang="ts">
	/**
	 * CommentSection Component
	 *
	 * Displays comments for a video with nested replies.
	 * Members can post comments; non-members see read-only view with CTA.
	 */
	import { MessageCircle, Send, Reply, Trash2, Edit2, X, Lock } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface Props {
		videoId: string;
		isMember?: boolean;
		user?: { id: string; name: string; email: string } | null;
	}

	interface Comment {
		id: string;
		video_id: string;
		user_id: string;
		parent_id: string | null;
		content: string;
		created_at: number;
		updated_at: number;
		user_name: string;
		user_email: string;
		replies?: Comment[];
	}

	let { videoId, isMember = false, user = null }: Props = $props();

	let comments = $state<Comment[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Form state
	let newComment = $state('');
	let isSubmitting = $state(false);
	let replyingTo = $state<string | null>(null);
	let replyContent = $state('');
	let editingId = $state<string | null>(null);
	let editContent = $state('');

	async function fetchComments() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/videos/${videoId}/comments`);
			const result = await response.json();

			if (result.success) {
				comments = result.data.comments;
				total = result.data.total;
			} else {
				error = result.error || 'Failed to load comments';
			}
		} catch (err) {
			error = 'Failed to load comments';
		} finally {
			isLoading = false;
		}
	}

	async function submitComment() {
		if (!newComment.trim() || isSubmitting || !isMember) return;

		isSubmitting = true;
		error = null;

		try {
			const response = await fetch(`/api/videos/${videoId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: newComment.trim() })
			});

			const result = await response.json();

			if (result.success) {
				comments = [{ ...result.data, replies: [] }, ...comments];
				total += 1;
				newComment = '';
			} else {
				error = result.error || 'Failed to post comment';
			}
		} catch (err) {
			error = 'Failed to post comment';
		} finally {
			isSubmitting = false;
		}
	}

	async function submitReply(parentId: string) {
		if (!replyContent.trim() || isSubmitting || !isMember) return;

		isSubmitting = true;
		error = null;

		try {
			const response = await fetch(`/api/videos/${videoId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: replyContent.trim(), parentId })
			});

			const result = await response.json();

			if (result.success) {
				// Add reply to parent comment
				comments = comments.map(c => {
					if (c.id === parentId) {
						return { ...c, replies: [...(c.replies || []), result.data] };
					}
					return c;
				});
				replyingTo = null;
				replyContent = '';
			} else {
				error = result.error || 'Failed to post reply';
			}
		} catch (err) {
			error = 'Failed to post reply';
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteComment(commentId: string) {
		if (!confirm('Delete this comment?')) return;

		try {
			const response = await fetch(`/api/videos/${videoId}/comments`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ commentId })
			});

			const result = await response.json();

			if (result.success) {
				// Remove from list (check both top-level and replies)
				comments = comments
					.filter(c => c.id !== commentId)
					.map(c => ({
						...c,
						replies: c.replies?.filter(r => r.id !== commentId) || []
					}));
				total -= 1;
			}
		} catch (err) {
			error = 'Failed to delete comment';
		}
	}

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp * 1000);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	onMount(() => {
		fetchComments();
	});
</script>

<section class="comment-section">
	<div class="section-header">
		<h3 class="section-title">
			<MessageCircle size={20} />
			<span>Comments</span>
			{#if total > 0}
				<span class="comment-count">{total}</span>
			{/if}
		</h3>
	</div>

	<!-- Comment Form -->
	{#if isMember && user}
		<form class="comment-form" onsubmit={(e) => { e.preventDefault(); submitComment(); }}>
			<div class="form-avatar">
				<span class="avatar">{getInitials(user.name)}</span>
			</div>
			<div class="form-input-wrapper">
				<textarea
					bind:value={newComment}
					placeholder="Add a comment..."
					rows={2}
					maxlength={2000}
					disabled={isSubmitting}
				></textarea>
				<div class="form-actions">
					<span class="char-count">{newComment.length}/2000</span>
					<button
						type="submit"
						class="submit-btn"
						disabled={!newComment.trim() || isSubmitting}
					>
						<Send size={16} />
						<span>Post</span>
					</button>
				</div>
			</div>
		</form>
	{:else}
		<div class="member-cta">
			<Lock size={20} />
			<p>Join as a member to participate in discussions</p>
			<a href="/#pricing" class="cta-link">Become a Founding Member - $99</a>
		</div>
	{/if}

	<!-- Error Message -->
	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<!-- Comments List -->
	<div class="comments-list">
		{#if isLoading}
			<div class="loading-state">Loading comments...</div>
		{:else if comments.length === 0}
			<div class="empty-state">
				<MessageCircle size={32} />
				<p>No comments yet. Be the first to share your thoughts!</p>
			</div>
		{:else}
			{#each comments as comment (comment.id)}
				<article class="comment">
					<div class="comment-avatar">
						<span class="avatar">{getInitials(comment.user_name || 'U')}</span>
					</div>
					<div class="comment-content">
						<div class="comment-header">
							<span class="comment-author">{comment.user_name || 'Anonymous'}</span>
							<span class="comment-date">{formatDate(comment.created_at)}</span>
							{#if comment.created_at !== comment.updated_at}
								<span class="edited-badge">edited</span>
							{/if}
						</div>
						<p class="comment-text">{comment.content}</p>
						<div class="comment-actions">
							{#if isMember}
								<button
									class="action-btn"
									onclick={() => {
										replyingTo = replyingTo === comment.id ? null : comment.id;
										replyContent = '';
									}}
								>
									<Reply size={14} />
									<span>Reply</span>
								</button>
							{/if}
							{#if user && user.id === comment.user_id}
								<button class="action-btn delete" onclick={() => deleteComment(comment.id)}>
									<Trash2 size={14} />
									<span>Delete</span>
								</button>
							{/if}
						</div>

						<!-- Reply Form -->
						{#if replyingTo === comment.id && isMember}
							<form class="reply-form" onsubmit={(e) => { e.preventDefault(); submitReply(comment.id); }}>
								<textarea
									bind:value={replyContent}
									placeholder="Write a reply..."
									rows={2}
									maxlength={2000}
									disabled={isSubmitting}
								></textarea>
								<div class="reply-actions">
									<button type="button" class="cancel-btn" onclick={() => replyingTo = null}>
										Cancel
									</button>
									<button
										type="submit"
										class="submit-btn small"
										disabled={!replyContent.trim() || isSubmitting}
									>
										Reply
									</button>
								</div>
							</form>
						{/if}

						<!-- Replies -->
						{#if comment.replies && comment.replies.length > 0}
							<div class="replies">
								{#each comment.replies as reply (reply.id)}
									<article class="comment reply">
										<div class="comment-avatar small">
											<span class="avatar small">{getInitials(reply.user_name || 'U')}</span>
										</div>
										<div class="comment-content">
											<div class="comment-header">
												<span class="comment-author">{reply.user_name || 'Anonymous'}</span>
												<span class="comment-date">{formatDate(reply.created_at)}</span>
											</div>
											<p class="comment-text">{reply.content}</p>
											{#if user && user.id === reply.user_id}
												<div class="comment-actions">
													<button class="action-btn delete" onclick={() => deleteComment(reply.id)}>
														<Trash2 size={14} />
														<span>Delete</span>
													</button>
												</div>
											{/if}
										</div>
									</article>
								{/each}
							</div>
						{/if}
					</div>
				</article>
			{/each}
		{/if}
	</div>
</section>

<style>
	.comment-section {
		padding: 1.5rem 0;
		border-top: 1px solid var(--color-border-default);
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.comment-count {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
	}

	/* Comment Form */
	.comment-form {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.form-avatar {
		flex-shrink: 0;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--color-fg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.avatar.small {
		width: 32px;
		height: 32px;
		font-size: 0.75rem;
	}

	.form-input-wrapper {
		flex: 1;
	}

	.form-input-wrapper textarea,
	.reply-form textarea {
		width: 100%;
		padding: 0.75rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.5rem;
		color: var(--color-fg-primary);
		font-size: 0.875rem;
		resize: vertical;
		min-height: 80px;
	}

	.form-input-wrapper textarea:focus,
	.reply-form textarea:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.form-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.5rem;
	}

	.char-count {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.submit-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn.small {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
	}

	/* Member CTA */
	.member-cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: 0.75rem;
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.member-cta :global(svg) {
		color: var(--color-fg-muted);
	}

	.member-cta p {
		margin: 0;
		color: var(--color-fg-muted);
		font-size: 0.875rem;
	}

	.cta-link {
		padding: 0.5rem 1rem;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: 0.375rem;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* Error Message */
	.error-message {
		padding: 0.75rem;
		background: var(--color-error-muted);
		color: var(--color-error);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	/* Comments List */
	.comments-list {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.loading-state,
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--color-fg-muted);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
	}

	/* Comment */
	.comment {
		display: flex;
		gap: 0.75rem;
	}

	.comment.reply {
		margin-top: 0.75rem;
	}

	.comment-avatar {
		flex-shrink: 0;
	}

	.comment-content {
		flex: 1;
		min-width: 0;
	}

	.comment-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}

	.comment-author {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.comment-date {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.edited-badge {
		font-size: 0.6875rem;
		color: var(--color-fg-subtle);
		font-style: italic;
	}

	.comment-text {
		font-size: 0.875rem;
		color: var(--color-fg-secondary);
		line-height: 1.5;
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.comment-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.action-btn:hover {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}

	.action-btn.delete:hover {
		color: var(--color-error);
	}

	/* Reply Form */
	.reply-form {
		margin-top: 0.75rem;
	}

	.reply-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.cancel-btn {
		padding: 0.375rem 0.75rem;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: 0.375rem;
		color: var(--color-fg-secondary);
		font-size: 0.8125rem;
		cursor: pointer;
	}

	/* Replies */
	.replies {
		padding-left: 1rem;
		border-left: 2px solid var(--color-border-default);
		margin-top: 0.75rem;
	}

	@media (max-width: 640px) {
		.comment-form {
			flex-direction: column;
		}

		.form-avatar {
			display: none;
		}
	}
</style>
