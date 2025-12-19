<script lang="ts">
	import type { PageData } from './$types';
	import { Header } from '$lib/components/layout';
	import { Card, CardContent } from '$lib/components/ui';
	import {
		Search,
		CheckCircle,
		XCircle,
		AlertTriangle,
		Info,
		Loader2,
		ExternalLink
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	interface ValidationIssue {
		type: string;
		message: string;
		severity: 'error' | 'warning' | 'info';
	}

	interface ValidationResult {
		url: string;
		valid: boolean;
		issues: ValidationIssue[];
		warnings: ValidationIssue[];
		summary: {
			totalIssues: number;
			totalWarnings: number;
			gsapDetected: boolean;
			scrollTriggerDetected: boolean;
		};
	}

	let url = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let result = $state<ValidationResult | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		errorMessage = '';
		result = null;

		try {
			const response = await fetch('/api/validation/playground', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url })
			});

			const data = await response.json();

			if (!response.ok) {
				errorMessage = data.message || 'Validation failed';
				return;
			}

			result = data;
		} catch {
			errorMessage = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	function getSeverityIcon(severity: string) {
		switch (severity) {
			case 'error':
				return XCircle;
			case 'warning':
				return AlertTriangle;
			default:
				return Info;
		}
	}

	function getSeverityClass(severity: string) {
		switch (severity) {
			case 'error':
				return 'severity-error';
			case 'warning':
				return 'severity-warning';
			default:
				return 'severity-info';
		}
	}
</script>

<svelte:head>
	<title>Validation Playground | Webflow Asset Dashboard</title>
</svelte:head>

<Header userEmail={data.user?.email} />

<main class="main">
	<div class="content">
		<header class="page-header">
			<h1 class="page-title">Validation Playground</h1>
			<p class="page-subtitle">
				Check your template for GSAP and other prohibited libraries before submitting to the
				Marketplace
			</p>
		</header>

		<Card>
			<CardContent>
				<form onsubmit={handleSubmit} class="validation-form">
					<div class="input-row">
						<div class="input-wrapper">
							<Search size={20} class="input-icon" />
							<input
								type="url"
								bind:value={url}
								placeholder="Enter your template preview URL..."
								class="url-input"
								required
								disabled={loading}
							/>
						</div>
						<button type="submit" class="validate-btn" disabled={loading || !url}>
							{#if loading}
								<Loader2 size={18} class="spinner" />
								Validating...
							{:else}
								Validate
							{/if}
						</button>
					</div>

					{#if errorMessage}
						<div class="error-message">
							<XCircle size={16} />
							{errorMessage}
						</div>
					{/if}
				</form>
			</CardContent>
		</Card>

		{#if result}
			<div class="results-section">
				<!-- Summary Card -->
				<Card>
					<CardContent>
						<div class="result-header">
							{#if result.valid}
								<div class="result-status valid">
									<CheckCircle size={24} />
									<span>No Issues Found</span>
								</div>
							{:else}
								<div class="result-status invalid">
									<XCircle size={24} />
									<span>Issues Detected</span>
								</div>
							{/if}

							<a
								href={result.url}
								target="_blank"
								rel="noopener noreferrer"
								class="url-link"
							>
								{result.url}
								<ExternalLink size={14} />
							</a>
						</div>

						<div class="summary-stats">
							<div class="stat" class:has-issues={result.summary.totalIssues > 0}>
								<span class="stat-value">{result.summary.totalIssues}</span>
								<span class="stat-label">Issues</span>
							</div>
							<div class="stat" class:has-warnings={result.summary.totalWarnings > 0}>
								<span class="stat-value">{result.summary.totalWarnings}</span>
								<span class="stat-label">Warnings</span>
							</div>
							<div class="stat" class:detected={result.summary.gsapDetected}>
								<span class="stat-value">{result.summary.gsapDetected ? 'Yes' : 'No'}</span>
								<span class="stat-label">GSAP</span>
							</div>
							<div class="stat" class:detected={result.summary.scrollTriggerDetected}>
								<span class="stat-value">{result.summary.scrollTriggerDetected ? 'Yes' : 'No'}</span>
								<span class="stat-label">ScrollTrigger</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Issues List -->
				{#if result.issues.length > 0}
					<Card>
						<CardContent>
							<h2 class="section-title error-title">
								<XCircle size={20} />
								Issues ({result.issues.length})
							</h2>
							<div class="issues-list">
								{#each result.issues as issue}
									<div class="issue-item {getSeverityClass(issue.severity)}">
										<svelte:component this={getSeverityIcon(issue.severity)} size={18} />
										<div class="issue-content">
											<span class="issue-type">{issue.type}</span>
											<p class="issue-message">{issue.message}</p>
										</div>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}

				<!-- Warnings List -->
				{#if result.warnings.length > 0}
					<Card>
						<CardContent>
							<h2 class="section-title warning-title">
								<AlertTriangle size={20} />
								Warnings ({result.warnings.length})
							</h2>
							<div class="issues-list">
								{#each result.warnings as warning}
									<div class="issue-item {getSeverityClass(warning.severity)}">
										<svelte:component this={getSeverityIcon(warning.severity)} size={18} />
										<div class="issue-content">
											<span class="issue-type">{warning.type}</span>
											<p class="issue-message">{warning.message}</p>
										</div>
									</div>
								{/each}
							</div>
						</CardContent>
					</Card>
				{/if}

				<!-- All Clear -->
				{#if result.valid && result.warnings.length === 0}
					<Card>
						<CardContent>
							<div class="all-clear">
								<CheckCircle size={48} />
								<h3>All Clear!</h3>
								<p>No GSAP or other prohibited libraries were detected on this page.</p>
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
		{/if}
	</div>
</main>

<style>
	.main {
		min-height: calc(100vh - 60px);
	}

	.content {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--webflow-text-primary);
		margin: 0 0 0.5rem;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: var(--webflow-text-muted);
		margin: 0;
	}

	/* Form */
	.validation-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-row {
		display: flex;
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.input-row {
			flex-direction: column;
		}
	}

	.input-wrapper {
		flex: 1;
		position: relative;
	}

	.input-wrapper :global(.input-icon) {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--webflow-text-muted);
	}

	.url-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 3rem;
		font-size: 1rem;
		background: var(--webflow-bg-primary);
		border: 1px solid var(--webflow-border);
		border-radius: var(--webflow-radius-md);
		color: var(--webflow-text-primary);
		transition: border-color 0.15s ease;
	}

	.url-input:focus {
		outline: none;
		border-color: var(--webflow-blue);
	}

	.url-input:disabled {
		opacity: 0.6;
	}

	.url-input::placeholder {
		color: var(--webflow-text-muted);
	}

	.validate-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		color: #ffffff;
		background: var(--webflow-blue);
		border: none;
		border-radius: var(--webflow-radius-md);
		cursor: pointer;
		transition: background 0.15s ease;
		white-space: nowrap;
	}

	.validate-btn:hover:not(:disabled) {
		background: var(--webflow-blue-dark);
	}

	.validate-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.validate-btn :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--webflow-error);
		background: rgba(255, 82, 82, 0.1);
		border: 1px solid rgba(255, 82, 82, 0.2);
		border-radius: var(--webflow-radius-md);
	}

	/* Results */
	.results-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.result-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.result-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.result-status.valid {
		color: var(--webflow-success);
	}

	.result-status.invalid {
		color: var(--webflow-error);
	}

	.url-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--webflow-blue);
		text-decoration: none;
		word-break: break-all;
	}

	.url-link:hover {
		text-decoration: underline;
	}

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.summary-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: var(--webflow-bg-hover);
		border-radius: var(--webflow-radius-md);
	}

	.stat.has-issues {
		background: rgba(255, 82, 82, 0.1);
	}

	.stat.has-issues .stat-value {
		color: var(--webflow-error);
	}

	.stat.has-warnings {
		background: rgba(255, 193, 7, 0.1);
	}

	.stat.has-warnings .stat-value {
		color: #ffc107;
	}

	.stat.detected {
		background: rgba(255, 82, 82, 0.1);
	}

	.stat.detected .stat-value {
		color: var(--webflow-error);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--webflow-text-primary);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--webflow-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem;
	}

	.error-title {
		color: var(--webflow-error);
	}

	.warning-title {
		color: #ffc107;
	}

	.issues-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.issue-item {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--webflow-radius-md);
	}

	.issue-item.severity-error {
		background: rgba(255, 82, 82, 0.1);
		color: var(--webflow-error);
	}

	.issue-item.severity-warning {
		background: rgba(255, 193, 7, 0.1);
		color: #ffc107;
	}

	.issue-item.severity-info {
		background: var(--webflow-bg-hover);
		color: var(--webflow-blue);
	}

	.issue-content {
		flex: 1;
	}

	.issue-type {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}

	.issue-message {
		margin: 0;
		font-size: 0.875rem;
		color: var(--webflow-text-primary);
	}

	.all-clear {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 2rem;
		color: var(--webflow-success);
	}

	.all-clear h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1rem 0 0.5rem;
	}

	.all-clear p {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--webflow-text-muted);
	}
</style>
