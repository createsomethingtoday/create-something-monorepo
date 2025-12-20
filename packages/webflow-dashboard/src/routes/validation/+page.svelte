<script lang="ts">
	import { goto } from '$app/navigation';
	import { Header, Button, Card } from '$lib/components';
	import GsapValidationModal from '$lib/components/GsapValidationModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isGsapModalOpen = $state(false);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	function handleBackToDashboard() {
		goto('/dashboard');
	}

	function handleOpenGsapValidator() {
		isGsapModalOpen = true;
	}
</script>

<svelte:head>
	<title>Validation Tools | Webflow Asset Dashboard</title>
</svelte:head>

<div class="validation-page">
	<Header userEmail={data.user?.email} onLogout={handleLogout} />

	<main class="main-content">
		<div class="content-wrapper">
			<!-- Back Navigation -->
			<Button variant="link" onclick={handleBackToDashboard} class="back-link">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 19l-7-7 7-7" />
				</svg>
				Back to Dashboard
			</Button>

			<!-- Header -->
			<div class="page-header">
				<div class="header-content">
					<h1 class="page-title">Validation Tools</h1>
					<p class="page-subtitle">
						Test and validate your templates before submission to ensure marketplace compliance
					</p>
				</div>
			</div>

			<!-- Validation Tools Grid -->
			<div class="tools-section">
				<h2 class="section-title">Available Validation Tools</h2>
				<div class="tools-grid">
					<!-- GSAP Validator Card -->
					<Card class="tool-card">
						<div class="tool-header">
							<div class="tool-icon gsap">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h3 class="tool-title">GSAP Validator</h3>
						</div>
						<p class="tool-description">
							Test your templates for GSAP compliance before submission. Crawls up to 50 pages and checks for custom code patterns.
						</p>
						<ul class="tool-features">
							<li>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M5 13l4 4L19 7" />
								</svg>
								Crawls up to 50 pages automatically
							</li>
							<li>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M5 13l4 4L19 7" />
								</svg>
								Detects flagged code and security risks
							</li>
							<li>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M5 13l4 4L19 7" />
								</svg>
								Provides smart recommendations
							</li>
						</ul>
						<div class="tool-actions">
							<Button variant="secondary" onclick={handleOpenGsapValidator} class="tool-button">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Quick Validate
							</Button>
							<a href="/validation/playground" class="playground-link">
								Open Full Playground →
							</a>
						</div>
					</Card>

					<!-- Coming Soon Card -->
					<Card class="tool-card coming-soon">
						<div class="tool-header">
							<div class="tool-icon placeholder">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10" />
									<path d="M12 6v6l4 2" />
								</svg>
							</div>
							<h3 class="tool-title">More Tools Coming</h3>
						</div>
						<p class="tool-description">
							Additional validation tools are in development to help ensure your templates meet all marketplace requirements.
						</p>
						<div class="coming-soon-badge">Coming Soon</div>
					</Card>
				</div>
			</div>

			<!-- Info Section -->
			<Card class="info-card">
				<h3 class="info-title">Why Validate?</h3>
				<div class="info-content">
					<p>
						Validation tools help ensure your templates meet Webflow marketplace standards before submission.
						Running these checks can:
					</p>
					<ul>
						<li>Catch potential issues early in development</li>
						<li>Reduce submission review time</li>
						<li>Ensure compliance with marketplace guidelines</li>
						<li>Improve template quality and user experience</li>
					</ul>
					<div class="tip-box">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div>
							<p class="tip-title">Best Practice</p>
							<p class="tip-text">
								We recommend running all available validation tools before submitting your template
								to the marketplace. This helps ensure a smooth review process.
							</p>
						</div>
					</div>
				</div>
			</Card>
		</div>
	</main>
</div>

<!-- GSAP Validation Modal -->
<GsapValidationModal
	isOpen={isGsapModalOpen}
	onClose={() => isGsapModalOpen = false}
	userEmail={data.user?.email}
/>

<style>
	.validation-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
	}

	.main-content {
		padding: var(--space-lg) var(--space-md);
	}

	.content-wrapper {
		max-width: 80rem;
		margin: 0 auto;
	}

	:global(.back-link) {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
		color: var(--webflow-blue);
	}

	.page-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.page-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.tools-section {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
	}

	.tools-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-md);
	}

	:global(.tool-card) {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
	}

	:global(.tool-card.coming-soon) {
		opacity: 0.7;
	}

	.tool-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.tool-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
	}

	.tool-icon.gsap {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.tool-icon.placeholder {
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
	}

	.tool-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.tool-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.tool-features {
		list-style: none;
		padding: 0;
		margin: var(--space-xs) 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.tool-features li {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.tool-features svg {
		color: var(--color-success);
		flex-shrink: 0;
	}

	.tool-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: auto;
	}

	:global(.tool-button) {
		justify-content: center;
		gap: var(--space-xs);
	}

	.playground-link {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.playground-link:hover {
		color: var(--color-fg-primary);
	}

	.coming-soon-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: auto;
	}

	:global(.info-card) {
		padding: var(--space-md);
	}

	.info-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.info-content {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.info-content p {
		margin: 0 0 var(--space-sm);
	}

	.info-content ul {
		margin: 0 0 var(--space-md);
		padding-left: var(--space-md);
	}

	.info-content li {
		margin-bottom: var(--space-xs);
	}

	.tip-box {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
	}

	.tip-box svg {
		color: var(--color-info);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.tip-title {
		font-weight: var(--font-medium);
		color: var(--color-info);
		margin: 0 0 var(--space-xs);
		font-size: var(--text-body-sm);
	}

	.tip-text {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	@media (max-width: 640px) {
		.tools-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
