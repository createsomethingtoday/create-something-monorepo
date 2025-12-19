<script lang="ts">
	import { Button, Dialog, Input, Label } from './ui';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		userEmail?: string;
	}

	interface ValidationResult {
		url: string;
		status: 'pass' | 'warning' | 'fail';
		summary: {
			totalPages: number;
			pagesWithGsap: number;
			hasGsapClub: boolean;
			hasCustomCode: boolean;
		};
		findings: Array<{
			type: 'gsap' | 'custom_code' | 'warning';
			severity: 'info' | 'warning' | 'error';
			message: string;
			page?: string;
			details?: string;
		}>;
		recommendations: string[];
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

	function getStatusColor(status: 'pass' | 'warning' | 'fail'): string {
		switch (status) {
			case 'pass':
				return 'var(--color-success)';
			case 'warning':
				return 'var(--color-warning)';
			case 'fail':
				return 'var(--color-error)';
		}
	}

	function getSeverityClass(severity: 'info' | 'warning' | 'error'): string {
		switch (severity) {
			case 'info':
				return 'finding-info';
			case 'warning':
				return 'finding-warning';
			case 'error':
				return 'finding-error';
		}
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
				<div class="results-header">
					<div class="results-title">
						<h3>Validation Results</h3>
						<p class="results-url">{validationResults.url}</p>
					</div>
					<div
						class="status-badge"
						style="--status-color: {getStatusColor(validationResults.status)}"
					>
						{validationResults.status.toUpperCase()}
					</div>
				</div>

				<!-- Stats Grid -->
				<div class="stats-grid">
					<div class="stat">
						<div class="stat-value">{validationResults.summary.totalPages}</div>
						<div class="stat-label">Pages Scanned</div>
					</div>
					<div class="stat">
						<div class="stat-value">{validationResults.summary.pagesWithGsap}</div>
						<div class="stat-label">Pages with GSAP</div>
					</div>
					<div class="stat">
						<div class="stat-value">{validationResults.summary.hasGsapClub ? 'Yes' : 'No'}</div>
						<div class="stat-label">GSAP Club</div>
					</div>
					<div class="stat">
						<div class="stat-value">{validationResults.summary.hasCustomCode ? 'Yes' : 'No'}</div>
						<div class="stat-label">Custom Code</div>
					</div>
				</div>

				<!-- Findings -->
				{#if validationResults.findings.length > 0}
					<div class="findings-section">
						<h4>Findings</h4>
						<div class="findings-list">
							{#each validationResults.findings as finding}
								<div class="finding {getSeverityClass(finding.severity)}">
									<div class="finding-header">
										<span class="finding-type">{finding.type.replace('_', ' ')}</span>
										<span class="finding-severity">{finding.severity}</span>
									</div>
									<p class="finding-message">{finding.message}</p>
									{#if finding.details}
										<p class="finding-details">{finding.details}</p>
									{/if}
									{#if finding.page}
										<p class="finding-page">Page: {finding.page}</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Recommendations -->
				{#if validationResults.recommendations.length > 0}
					<div class="recommendations-section">
						<h4>Recommendations</h4>
						<ul class="recommendations-list">
							{#each validationResults.recommendations as recommendation}
								<li>{recommendation}</li>
							{/each}
						</ul>
					</div>
				{/if}
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
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
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
		background: color-mix(in srgb, var(--status-color) 20%, transparent);
		color: var(--status-color);
		border: 1px solid color-mix(in srgb, var(--status-color) 40%, transparent);
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

	.stat-value {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.stat-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.findings-section,
	.recommendations-section {
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.findings-section h4,
	.recommendations-section h4 {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm) 0;
	}

	.findings-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.finding {
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		border-left: 3px solid;
	}

	.finding-info {
		background: var(--color-info-muted);
		border-color: var(--color-info);
	}

	.finding-warning {
		background: var(--color-warning-muted);
		border-color: var(--color-warning);
	}

	.finding-error {
		background: var(--color-error-muted);
		border-color: var(--color-error);
	}

	.finding-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--space-xs);
	}

	.finding-type {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		text-transform: capitalize;
	}

	.finding-severity {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
	}

	.finding-message {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.finding-details {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin: var(--space-xs) 0 0 0;
	}

	.finding-page {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin: var(--space-xs) 0 0 0;
	}

	.recommendations-list {
		margin: 0;
		padding-left: var(--space-md);
	}

	.recommendations-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.recommendations-list li:last-child {
		margin-bottom: 0;
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
