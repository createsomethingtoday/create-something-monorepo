<!--
  FeedbackWidget

  Collapsible widget for collecting user feedback.
  Embeddable in templates to gather SDK feature requests.

  Heideggerian: Unobtrusive until needed, then present-at-hand.
-->
<script lang="ts">
	interface Props {
		source?: string;
		tenantId?: string;
	}

	let { source = 'template', tenantId }: Props = $props();

	let isOpen = $state(false);
	let feedbackType = $state<'feature_request' | 'bug_report' | 'sdk_feedback' | 'general'>('general');
	let title = $state('');
	let description = $state('');
	let isSubmitting = $state(false);
	let submitted = $state(false);
	let error = $state('');

	async function handleSubmit() {
		if (!description.trim()) {
			error = 'Please enter your feedback';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const response = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: feedbackType,
					title: title.trim() || undefined,
					description: description.trim(),
					source,
					tenantId
				})
			});

			if (response.ok) {
				submitted = true;
				// Reset after showing success
				setTimeout(() => {
					isOpen = false;
					submitted = false;
					title = '';
					description = '';
				}, 2000);
			} else {
				throw new Error('Failed to submit');
			}
		} catch (e) {
			error = 'Failed to submit feedback. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="feedback-widget" class:open={isOpen}>
	{#if !isOpen}
		<button class="feedback-trigger" type="button" onclick={() => (isOpen = true)}>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
			<span>Feedback</span>
		</button>
	{:else}
		<div class="feedback-panel">
			<div class="feedback-header">
				<h3>Send Feedback</h3>
				<button class="close-btn" type="button" onclick={() => (isOpen = false)}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			{#if submitted}
				<div class="success-message">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<p>Thanks for your feedback!</p>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<div class="field">
						<label for="feedback-type">Type</label>
						<select id="feedback-type" bind:value={feedbackType}>
							<option value="general">General Feedback</option>
							<option value="feature_request">Feature Request</option>
							<option value="sdk_feedback">SDK/Workflow Feedback</option>
							<option value="bug_report">Bug Report</option>
						</select>
					</div>

					<div class="field">
						<label for="feedback-title">Title (optional)</label>
						<input
							id="feedback-title"
							type="text"
							bind:value={title}
							placeholder="Brief summary"
						/>
					</div>

					<div class="field">
						<label for="feedback-description">Description</label>
						<textarea
							id="feedback-description"
							bind:value={description}
							placeholder="What's on your mind?"
							rows="4"
						></textarea>
					</div>

					{#if error}
						<p class="error-message">{error}</p>
					{/if}

					<button class="submit-btn" type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Sending...' : 'Send Feedback'}
					</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.feedback-widget {
		position: fixed;
		bottom: var(--space-lg);
		right: var(--space-lg);
		z-index: 1000;
	}

	.feedback-trigger {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
		box-shadow: var(--shadow-md);
	}

	.feedback-trigger:hover {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.feedback-panel {
		width: 320px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	.feedback-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
	}

	.feedback-header h3 {
		margin: 0;
		font-size: var(--text-body);
		font-weight: 600;
	}

	.close-btn {
		padding: 4px;
		background: none;
		border: none;
		color: var(--color-fg-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.close-btn:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	form {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
	}

	input,
	select,
	textarea {
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-family: inherit;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-fg-primary);
	}

	textarea {
		resize: vertical;
		min-height: 80px;
	}

	.error-message {
		color: var(--color-error);
		font-size: var(--text-body-sm);
		margin: 0;
	}

	.submit-btn {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: 500;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.submit-btn:hover:not(:disabled) {
		background: var(--color-fg-secondary);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.success-message {
		padding: var(--space-xl);
		text-align: center;
		color: var(--color-success);
	}

	.success-message svg {
		margin-bottom: var(--space-sm);
	}

	.success-message p {
		margin: 0;
		font-size: var(--text-body);
	}
</style>
