<script lang="ts">
	import { getTemplate } from '$lib/services/template-registry';
	import type { Template, ConfigField } from '$lib/types';
	import { crossfade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	interface Props {
		data: {
			slug: string;
		};
	}

	let { data }: Props = $props();

	const template = getTemplate(data.slug);

	// Crossfade transitions for step changes
	const [send, receive] = crossfade({
		duration: 300,
		easing: cubicOut
	});

	// UI state
	let showPanel = $state(true);
	let currentStep = $state(1);
	let config = $state<Record<string, unknown>>({});
	let subdomain = $state('');
	let isDeploying = $state(false);
	let deployError = $state<string | null>(null);
	let deploySuccess = $state(false);
	let deployedSubdomain = $state('');
	let iframeLoaded = $state(false);

	// Validate subdomain
	const subdomainPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
	let subdomainValid = $derived(subdomain.length >= 3 && subdomainPattern.test(subdomain));

	// Check if reduced motion is preferred
	let prefersReducedMotion = $state(false);
	$effect(() => {
		if (typeof window !== 'undefined') {
			const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
			prefersReducedMotion = mediaQuery.matches;

			const handleChange = (e: MediaQueryListEvent) => {
				prefersReducedMotion = e.matches;
			};

			mediaQuery.addEventListener('change', handleChange);
			return () => mediaQuery.removeEventListener('change', handleChange);
		}
	});

	// Check if required fields are filled
	let requiredFieldsFilled = $derived(() => {
		if (!template) return false;
		return template.configSchema.required.every((field) => {
			const value = config[field.key];
			return value !== undefined && value !== null && value !== '';
		});
	});

	function updateConfig(key: string, value: unknown) {
		config = { ...config, [key]: value };
	}

	async function handleDeploy() {
		if (!template || !subdomainValid || !requiredFieldsFilled) return;

		isDeploying = true;
		deployError = null;

		try {
			const response = await fetch('/api/sites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					templateId: template.id,
					subdomain,
					config
				})
			});

			const result = await response.json();

			if (result.success) {
				// Show success celebration
				deployedSubdomain = subdomain;
				deploySuccess = true;

				// Auto-redirect after 3 seconds
				setTimeout(() => {
					window.location.href = `/dashboard?deployed=${subdomain}`;
				}, 3000);
			} else {
				deployError = result.error || 'Deployment failed';
			}
		} catch (error) {
			deployError = 'Something went wrong. Please try again.';
		} finally {
			isDeploying = false;
		}
	}

	function handleIframeLoad() {
		iframeLoaded = true;
	}

	function goToDashboard() {
		window.location.href = `/dashboard?deployed=${deployedSubdomain}`;
	}
</script>

<svelte:head>
	{#if template}
		<title>{template.name} | CREATE SOMETHING Templates</title>
		<meta name="description" content={template.description} />
	{/if}
</svelte:head>

{#if template}
	<div class="template-detail" class:panel-open={showPanel}>
		<!-- Full-width iframe: the primary experience -->
		<div class="iframe-container">
			<!-- Skeleton loader -->
			{#if !iframeLoaded}
				<div class="skeleton-loader">
					<div class="skeleton-header"></div>
					<div class="skeleton-hero"></div>
					<div class="skeleton-content">
						<div class="skeleton-line"></div>
						<div class="skeleton-line"></div>
						<div class="skeleton-line short"></div>
					</div>
				</div>
			{/if}

			<!-- Iframe -->
			<iframe
				src={template.previewUrl}
				title="{template.name} Preview"
				class="template-iframe"
				class:loaded={iframeLoaded}
				onload={handleIframeLoad}
			></iframe>

			<!-- Floating controls -->
			<div class="iframe-controls">
				<div class="url-bar">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
					</svg>
					<span>{template.slug}.createsomething.space</span>
				</div>
				<button
					class="toggle-panel"
					onclick={() => showPanel = !showPanel}
					aria-label={showPanel ? 'Collapse panel' : 'Expand panel'}
				>
					{#if showPanel}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="15 18 9 12 15 6"/>
						</svg>
					{:else}
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Side panel: configuration & actions -->
		<aside class="side-panel">
			<div class="panel-content">
				<!-- Header with back -->
				<div class="panel-header">
					<a href="/#templates" class="back-link">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="15 18 9 12 15 6"/>
						</svg>
						Templates
					</a>
				</div>

				<!-- Progress indicator -->
				<div class="progress-indicator">
					{#each [1, 2, 3] as step}
						<button
							class="progress-dot"
							class:active={currentStep === step}
							class:completed={currentStep > step}
							disabled={currentStep < step}
							onclick={() => {
								if (currentStep > step) {
									currentStep = step;
								}
							}}
							aria-label="Step {step}"
						>
							<span class="sr-only">
								{#if currentStep === step}
									Current step: {step}
								{:else if currentStep > step}
									Completed step: {step}
								{:else}
									Upcoming step: {step}
								{/if}
							</span>
						</button>
					{/each}
				</div>

				<!-- Step 1: Info -->
				{#if currentStep === 1}
					<div class="step-content"
						in:receive|global={{ key: 1 }}
						out:send|global={{ key: 1 }}>
					<div class="panel-section">
						<h1 class="template-name">{template.name}</h1>
						<p class="template-desc">{template.description}</p>
					</div>

					<div class="panel-section features">
						<h3 class="section-label">Includes</h3>
						<ul class="features-list">
							{#each template.features as feature}
								<li>{feature}</li>
							{/each}
						</ul>
					</div>

					<div class="panel-section pricing">
						<div class="price-option">
							<span class="price-tier">Free</span>
							<span class="price-amount">$0</span>
						</div>
						{#if template.pricing.proPrice}
							<div class="price-option pro">
								<span class="price-tier">Pro</span>
								<span class="price-amount">${template.pricing.proPrice}/mo</span>
							</div>
						{/if}
					</div>

					<button class="btn btn-primary full-width" onclick={() => currentStep = 2}>
						Use This Template
					</button>
					</div>
				{/if}

				<!-- Step 2: Configure -->
				{#if currentStep === 2}
					<div class="step-content"
						in:receive|global={{ key: 2 }}
						out:send|global={{ key: 2 }}>
					<div class="panel-section">
						<h2 class="step-title">Configure</h2>
						<p class="step-desc">Add your details</p>
					</div>

					<form class="config-form" onsubmit={(e) => { e.preventDefault(); currentStep = 3; }}>
						{#each template.configSchema.required as field}
							<div class="field">
								<label for={field.key}>{field.label}</label>
								{#if field.type === 'textarea'}
									<textarea
										id={field.key}
										placeholder={field.placeholder}
										value={config[field.key] || ''}
										oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
									></textarea>
								{:else}
									<input
										id={field.key}
										type={field.type}
										placeholder={field.placeholder}
										value={config[field.key] || ''}
										oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
									/>
								{/if}
							</div>
						{/each}

						<details class="optional-toggle">
							<summary>More options</summary>
							{#each template.configSchema.optional as field}
								{#if field.type !== 'array'}
									<div class="field">
										<label for={field.key}>{field.label}</label>
										{#if field.type === 'textarea'}
											<textarea
												id={field.key}
												placeholder={field.placeholder}
												value={config[field.key] || ''}
												oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
											></textarea>
										{:else}
											<input
												id={field.key}
												type={field.type}
												placeholder={field.placeholder}
												value={config[field.key] || ''}
												oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
											/>
										{/if}
									</div>
								{/if}
							{/each}
						</details>

						<div class="step-actions">
							<button type="button" class="btn btn-ghost" onclick={() => currentStep = 1}>Back</button>
							<button type="submit" class="btn btn-primary" disabled={!requiredFieldsFilled}>
								Continue
							</button>
						</div>
					</form>
					</div>
				{/if}

				<!-- Step 3: Deploy -->
				{#if currentStep === 3}
					<div class="step-content"
						in:receive|global={{ key: 3 }}
						out:send|global={{ key: 3 }}>
					<div class="panel-section">
						<h2 class="step-title">Launch</h2>
						<p class="step-desc">Choose your URL</p>
					</div>

					<div class="subdomain-picker">
						<input
							type="text"
							placeholder="yoursite"
							bind:value={subdomain}
							oninput={(e) => {
								subdomain = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
							}}
						/>
						<span class="domain-suffix">.createsomething.space</span>
					</div>
					{#if subdomain && !subdomainValid}
						<p class="field-error">3+ characters, letters, numbers, hyphens</p>
					{/if}

					{#if deployError}
						<div class="deploy-error">{deployError}</div>
					{/if}

					<div class="launch-summary">
						<div class="summary-row">
							<span>Site name</span>
							<span>{config.name || '—'}</span>
						</div>
						<div class="summary-row">
							<span>URL</span>
							<span class="mono">{subdomain || 'yoursite'}.createsomething.space</span>
						</div>
						<div class="summary-row">
							<span>SSL</span>
							<span class="check">Included</span>
						</div>
						<div class="summary-row">
							<span>CDN</span>
							<span class="check">Global</span>
						</div>
					</div>

					<div class="step-actions">
						<button class="btn btn-ghost" onclick={() => currentStep = 2}>Back</button>
						<button
							class="btn btn-primary"
							disabled={!subdomainValid || isDeploying}
							onclick={handleDeploy}
						>
							{isDeploying ? 'Deploying...' : 'Deploy Now'}
						</button>
					</div>
					</div>
				{/if}
			</div>
		</aside>
	</div>

	<!-- Deploy Success Celebration -->
	{#if deploySuccess}
		<div class="success-overlay" transition:scale={{ duration: 500, easing: cubicOut }}>
			<div class="success-content">
				<!-- Checkmark icon with animation -->
				<div class="success-icon">
					<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-width="1.5"/>
						<path d="M8 12l3 3 5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>

				<!-- Success message -->
				<h2 class="success-heading">Live!</h2>
				<p class="success-text">Your site is ready at:</p>
				<a
					href="https://{deployedSubdomain}.createsomething.space"
					target="_blank"
					rel="noopener noreferrer"
					class="success-link"
				>
					https://{deployedSubdomain}.createsomething.space
				</a>

				<!-- Dashboard button -->
				<button class="btn btn-primary" onclick={goToDashboard}>
					Go to Dashboard
				</button>
			</div>
		</div>
	{/if}
{:else}
	<div class="not-found">
		<h1>Template Not Found</h1>
		<p>The template you're looking for doesn't exist.</p>
		<a href="/#templates" class="btn btn-primary">Browse Templates</a>
	</div>
{/if}

<style>
	/* Full-bleed layout: iframe is the experience */
	.template-detail {
		display: grid;
		grid-template-columns: 1fr 0;
		height: calc(100vh - 60px);
		overflow: hidden;
		transition: grid-template-columns var(--duration-standard) var(--ease-standard);
	}

	.template-detail.panel-open {
		grid-template-columns: 1fr 380px;
	}

	/* Iframe container: full width/height */
	.iframe-container {
		position: relative;
		background: var(--color-bg-subtle);
		overflow: hidden;
	}

	/* Skeleton loader */
	.skeleton-loader {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--color-bg-elevated);
		padding: var(--space-lg);
		z-index: 1;
	}

	.skeleton-header {
		height: 60px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
		animation: skeleton-pulse 2s ease-in-out infinite;
	}

	.skeleton-hero {
		height: 300px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-xl);
		animation: skeleton-pulse 2s ease-in-out infinite;
		animation-delay: 0.1s;
	}

	.skeleton-content {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.skeleton-line {
		height: 20px;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
		animation: skeleton-pulse 2s ease-in-out infinite;
		animation-delay: 0.2s;
	}

	.skeleton-line.short {
		width: 60%;
	}

	@keyframes skeleton-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.template-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: white;
		opacity: 0;
		transition: opacity var(--duration-standard) var(--ease-standard);
	}

	.template-iframe.loaded {
		opacity: 1;
	}

	/* Floating controls over iframe */
	.iframe-controls {
		position: absolute;
		top: var(--space-sm);
		left: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		align-items: center;
		justify-content: space-between;
		pointer-events: none;
		z-index: 2;
	}

	.url-bar {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		backdrop-filter: blur(8px);
		pointer-events: auto;
	}

	.toggle-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		cursor: pointer;
		pointer-events: auto;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-panel:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	/* Side panel */
	.side-panel {
		background: var(--color-bg-elevated);
		border-left: 1px solid var(--color-border-default);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.panel-content {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		min-height: 100%;
	}

	.panel-header {
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--color-border-default);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	/* Progress indicator */
	.progress-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: var(--space-sm) 0;
	}

	.progress-dot {
		position: relative;
		width: 10px;
		height: 10px;
		background: var(--color-fg-muted);
		border: none;
		border-radius: var(--radius-full);
		cursor: not-allowed;
		padding: 0;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.progress-dot:not(:disabled) {
		cursor: pointer;
	}

	.progress-dot:not(:disabled):hover {
		transform: scale(1.2);
	}

	.progress-dot.active {
		background: var(--color-fg-primary);
		transform: scale(1.3);
	}

	.progress-dot.completed {
		background: var(--color-success);
		cursor: pointer;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* Step content wrapper for transitions */
	.step-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		flex: 1;
	}

	/* Panel sections */
	.panel-section {
		padding-bottom: var(--space-md);
	}

	.template-name {
		font-size: var(--text-h2);
		margin-bottom: var(--space-xs);
	}

	.template-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.section-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-sm);
	}

	.features-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.features-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-left: 1.25em;
		position: relative;
	}

	.features-list li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
	}

	/* Pricing */
	.pricing {
		display: flex;
		gap: var(--space-sm);
	}

	.price-option {
		flex: 1;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.price-option.pro {
		border-color: var(--color-fg-muted);
	}

	.price-tier {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
	}

	.price-amount {
		display: block;
		font-size: var(--text-h3);
		font-weight: 600;
		margin-top: 2px;
	}

	/* Step titles */
	.step-title {
		font-size: var(--text-h3);
		margin-bottom: 2px;
	}

	.step-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Form fields */
	.config-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex: 1;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field label {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.field input,
	.field textarea {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.field input:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.field textarea {
		min-height: 80px;
		resize: vertical;
	}

	.optional-toggle {
		margin-top: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.optional-toggle summary {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		cursor: pointer;
	}

	.optional-toggle[open] summary {
		margin-bottom: var(--space-sm);
	}

	.step-actions {
		display: flex;
		justify-content: space-between;
		margin-top: auto;
		padding-top: var(--space-md);
	}

	/* Subdomain picker */
	.subdomain-picker {
		display: flex;
		align-items: center;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.subdomain-picker input {
		flex: 1;
		padding: var(--space-sm);
		background: transparent;
		border: none;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		text-align: right;
	}

	.subdomain-picker input:focus {
		outline: none;
	}

	.domain-suffix {
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.field-error {
		font-size: var(--text-caption);
		color: var(--color-error);
		margin-top: 4px;
	}

	.deploy-error {
		padding: var(--space-sm);
		background: rgba(204, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-error);
	}

	/* Launch summary */
	.launch-summary {
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
		margin: var(--space-md) 0;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-xs) 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.summary-row:not(:last-child) {
		border-bottom: 1px solid var(--color-border-default);
	}

	.summary-row .mono {
		font-family: monospace;
		font-size: var(--text-caption);
	}

	.summary-row .check {
		color: var(--color-success);
	}

	/* Buttons */
	.full-width {
		width: 100%;
	}

	.btn-ghost {
		background: transparent;
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-secondary);
	}

	.btn-ghost:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
	}

	/* Success overlay */
	.success-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: var(--space-lg);
	}

	.success-content {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		max-width: 500px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.success-icon {
		width: 80px;
		height: 80px;
		color: var(--color-success);
		animation: success-scale var(--duration-complex) var(--ease-standard);
	}

	@keyframes success-scale {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.success-heading {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.success-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.success-link {
		font-size: var(--text-body-sm);
		color: var(--color-success);
		text-decoration: none;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
		font-family: monospace;
	}

	.success-link:hover {
		background: var(--color-bg-subtle);
		border-color: var(--color-success);
	}

	/* Not found */
	.not-found {
		text-align: center;
		padding: var(--space-2xl) var(--gutter);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.progress-dot,
		.progress-dot:not(:disabled):hover,
		.progress-dot.active {
			transition: none;
			transform: none;
		}

		.progress-dot.active {
			outline: 2px solid var(--color-fg-primary);
			outline-offset: 2px;
		}

		.skeleton-header,
		.skeleton-hero,
		.skeleton-line {
			animation: none;
			opacity: 0.7;
		}

		.success-icon {
			animation: none;
		}
	}

	/* Mobile */
	@media (max-width: 768px) {
		.template-detail {
			grid-template-columns: 1fr;
			grid-template-rows: 50vh 1fr;
			height: auto;
		}

		.template-detail.panel-open {
			grid-template-columns: 1fr;
		}

		.side-panel {
			border-left: none;
			border-top: 1px solid var(--color-border-default);
		}

		.toggle-panel {
			display: none;
		}

		.success-content {
			padding: var(--space-lg);
		}

		.success-icon {
			width: 60px;
			height: 60px;
		}
	}
</style>
