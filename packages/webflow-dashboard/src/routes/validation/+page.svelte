<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Button, Card, WebflowWayCard, BackNavigation } from '$lib/components';
	import { trackEvent } from '$lib/utils/analytics';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isGsapModalOpen = $state(false);
	
	// Lazy-loaded modal component
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let GsapValidationModal = $state<any>(null);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	async function handleOpenGsapValidator() {
		// Lazy load the GsapValidationModal component
		if (!GsapValidationModal) {
			const module = await import('$lib/components/GsapValidationModal.svelte');
			GsapValidationModal = module.default;
		}
		isGsapModalOpen = true;

		trackEvent('validation_gsap_quick_opened');
	}

	onMount(() => {
		trackEvent('validation_tools_opened');
	});
</script>

<svelte:head>
	<title>Validation Tools | Webflow Asset Dashboard</title>
</svelte:head>

<div class="validation-page">
	<Header userEmail={data.user?.email} onLogout={handleLogout} />

	<main class="main-content">
		<div class="content-wrapper">
		<BackNavigation />

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
						<h3 class="tool-title">GSAP Validator</h3>
						<span class="tool-kicker">Local check</span>
					</div>
					<p class="tool-description">
						Test your templates for GSAP compliance before submission. Crawls up to 50 pages and checks for custom code patterns.
					</p>
					<ul class="tool-features">
						<li>Crawls up to 50 pages automatically</li>
						<li>Detects flagged code and security risks</li>
						<li>Provides smart recommendations</li>
					</ul>
					<div class="tool-actions">
						<Button variant="secondary" onclick={handleOpenGsapValidator} class="tool-button">Quick Validate</Button>
						<a href="/validation/playground" class="playground-link">
							Open Full Playground
						</a>
					</div>
				</Card>

			<!-- Webflow Way Validator Card -->
			<WebflowWayCard userEmail={data.user?.email} />
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
					<p class="tip-title">Best Practice</p>
					<p class="tip-text">
						Run all available validation tools before submitting your template to the marketplace.
						This keeps review cycles shorter and reduces avoidable rejections.
					</p>
				</div>
				</div>
			</Card>
		</div>
	</main>
</div>

<!-- GSAP Validation Modal -->
{#if isGsapModalOpen && GsapValidationModal}
	<GsapValidationModal
		isOpen={isGsapModalOpen}
		onClose={() => isGsapModalOpen = false}
		userEmail={data.user?.email}
	/>
{/if}

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
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
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

	.tool-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xs);
	}

	.tool-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.tool-kicker {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.02em;
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
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-left: var(--space-sm);
		position: relative;
	}

	.tool-features li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
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
		border-bottom: 1px solid transparent;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.playground-link:hover {
		color: var(--color-fg-primary);
		border-bottom-color: var(--color-border-default);
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
		display: grid;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-border-default);
		border-left: 3px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
	}

	.tip-title {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0;
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
