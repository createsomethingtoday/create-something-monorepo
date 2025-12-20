<script lang="ts">
	import { Button, Dialog, Input, Label } from './ui';
	import type { ValidationResult } from '$lib/types/validation';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		userEmail?: string;
	}

	let { isOpen, onClose, userEmail }: Props = $props();

	let url = $state('');
	let isValidating = $state(false);
	let validationResults = $state<ValidationResult | null>(null);
	let error = $state<string | null>(null);

	async function handleValidation(e: Event) {
		e.preventDefault();

		if (!url.trim()) return;

		isValidating = true;
		error = null;

		try {
			const response = await fetch('/api/validation/gsap', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: url.trim() })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Validation failed');
			}

			validationResults = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Validation failed';
		} finally {
			isValidating = false;
		}
	}

	function handleClear() {
		url = '';
		validationResults = null;
		error = null;
	}

	function handleClose() {
		onClose();
	}

	function handleViewDetails() {
		// Navigate to playground with results
		window.location.href = '/validation/playground';
	}
</script>

<Dialog {isOpen} onClose={handleClose} title="GSAP Validation" size="lg">
	<div class="modal-content">
		<p class="subtitle">Test your Webflow templates for GSAP compliance before submission</p>

		<!-- URL Input Form -->
		<form onsubmit={handleValidation} class="url-form">
			<div class="form-field">
				<Label for="url">Webflow Site URL</Label>
				<div class="input-row">
					<Input
						id="url"
						type="url"
						bind:value={url}
						placeholder="https://your-site.webflow.io"
						disabled={isValidating}
					/>
					<Button type="submit" disabled={isValidating || !url.trim()} size="sm">
						{#if isValidating}
							<svg class="spinner" viewBox="0 0 24 24" fill="none">
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
									opacity="0.25"
								></circle>
								<path
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Validating...
						{:else}
							Validate
						{/if}
					</Button>
					{#if validationResults}
						<Button type="button" onclick={handleClear} variant="secondary" size="sm">
							Clear
						</Button>
					{/if}
				</div>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</form>

		<!-- Validation Progress -->
		{#if isValidating}
			<div class="progress-card">
				<svg class="spinner large" viewBox="0 0 24 24" fill="none">
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
						opacity="0.25"
					></circle>
					<path
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<div>
					<p class="progress-title">Analyzing template...</p>
					<p class="progress-subtitle">Checking for GSAP compliance</p>
				</div>
			</div>
		{/if}

		<!-- Validation Results -->
		{#if validationResults}
			<div class="results">
				<!-- Overall Status Header -->
				<div class="results-header" class:passed={validationResults.passed} class:failed={!validationResults.passed}>
					<div class="results-title">
						<h3>Validation {validationResults.passed ? 'Passed' : 'Failed'}</h3>
						<p class="results-url">{validationResults.url}</p>
					</div>
					<div class="status-badge" class:passed={validationResults.passed}>
						{validationResults.passed ? 'PASSED' : 'FAILED'}
					</div>
				</div>

				<!-- Stats Grid -->
				<div class="stats-grid">
					<div class="stat">
						<div class="stat-value">{validationResults.summary.passRate}%</div>
						<div class="stat-label">Pass Rate</div>
					</div>
					<div class="stat">
						<div class="stat-value">{validationResults.summary.totalPages}</div>
						<div class="stat-label">Pages</div>
					</div>
					<div class="stat passed">
						<div class="stat-value">{validationResults.summary.passedPages}</div>
						<div class="stat-label">Passed</div>
					</div>
					<div class="stat failed">
						<div class="stat-value">{validationResults.summary.failedPages}</div>
						<div class="stat-label">Failed</div>
					</div>
				</div>

				<!-- Issue Summary -->
				{#if validationResults.issues.totalFlaggedCode > 0 || validationResults.issues.totalSecurityRisks > 0}
					<div class="issues-summary">
						<h4>Issues Found</h4>
						<div class="issues-grid">
							<div class="issue-stat">
								<span class="issue-value">{validationResults.issues.totalFlaggedCode}</span>
								<span class="issue-label">Flagged Code</span>
							</div>
							<div class="issue-stat">
								<span class="issue-value">{validationResults.issues.totalSecurityRisks}</span>
								<span class="issue-label">Security Risks</span>
							</div>
							<div class="issue-stat success">
								<span class="issue-value">{validationResults.issues.totalValidGsap}</span>
								<span class="issue-label">Valid GSAP</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Top Recommendations -->
				{#if validationResults.recommendations.length > 0}
					<div class="recommendations-section">
						<h4>Top Recommendations</h4>
						<div class="recommendations-list">
							{#each validationResults.recommendations.slice(0, 3) as rec}
								<div class="recommendation {rec.type}">
									<span class="rec-title">{rec.title}</span>
									{#if rec.required}
										<span class="required-badge">Required</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- View Details Link -->
				<div class="results-footer">
					<Button variant="secondary" size="sm" onclick={handleViewDetails}>
						View Full Details
					</Button>
					<a href="/validation/playground" class="playground-link">
						Open in Playground →
					</a>
				</div>
			</div>
		{/if}
	</div>
</Dialog>

<style>
	.modal-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.url-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.input-row {
		display: flex;
		gap: var(--space-sm);
	}

	.input-row :global(input) {
		flex: 1;
	}

	.error-message {
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.progress-card {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
	}

	.progress-title {
		font-weight: var(--font-medium);
		color: var(--color-info);
		margin: 0;
		font-size: var(--text-body-sm);
	}

	.progress-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		margin: 0;
	}

	.spinner {
		width: 16px;
		height: 16px;
		animation: spin 1s linear infinite;
	}

	.spinner.large {
		width: 24px;
		height: 24px;
		color: var(--color-info);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		border: 1px solid;
	}

	.results-header.passed {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	.results-header.failed {
		background: var(--color-error-muted);
		border-color: var(--color-error-border);
	}

	.results-title h3 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.results-url {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0 0;
		word-break: break-all;
	}

	.status-badge {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		background: var(--color-error);
		color: var(--color-bg-pure);
	}

	.status-badge.passed {
		background: var(--color-success);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-sm);
	}

	.stat {
		text-align: center;
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.stat.passed {
		border-color: var(--color-success-border);
	}

	.stat.passed .stat-value {
		color: var(--color-success);
	}

	.stat.failed {
		border-color: var(--color-error-border);
	}

	.stat.failed .stat-value {
		color: var(--color-error);
	}

	.stat-value {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.issues-summary,
	.recommendations-section {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.issues-summary h4,
	.recommendations-section h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.issues-grid {
		display: flex;
		gap: var(--space-md);
	}

	.issue-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.issue-value {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-error);
	}

	.issue-stat.success .issue-value {
		color: var(--color-success);
	}

	.issue-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.recommendations-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.recommendation {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		border-left: 3px solid;
	}

	.recommendation.critical {
		background: var(--color-error-muted);
		border-color: var(--color-error);
	}

	.recommendation.warning {
		background: var(--color-warning-muted);
		border-color: var(--color-warning);
	}

	.recommendation.success {
		background: var(--color-success-muted);
		border-color: var(--color-success);
	}

	.rec-title {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.required-badge {
		padding: 0.125rem 0.375rem;
		background: var(--color-error);
		color: var(--color-bg-pure);
		border-radius: var(--radius-sm);
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
	}

	.results-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	.playground-link {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.playground-link:hover {
		color: var(--color-fg-primary);
	}

	@media (max-width: 640px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.input-row {
			flex-direction: column;
		}
	}
</style>
