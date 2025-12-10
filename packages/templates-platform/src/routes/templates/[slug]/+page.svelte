<script lang="ts">
	import { getTemplate } from '$lib/services/template-registry';
	import type { Template, ConfigField } from '$lib/types';

	interface Props {
		data: {
			slug: string;
		};
	}

	let { data }: Props = $props();

	const template = getTemplate(data.slug);

	// Wizard state
	let currentStep = $state(1);
	let config = $state<Record<string, unknown>>({});
	let subdomain = $state('');
	let isDeploying = $state(false);
	let deployError = $state<string | null>(null);

	// Validate subdomain
	const subdomainPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
	let subdomainValid = $derived(subdomain.length >= 3 && subdomainPattern.test(subdomain));

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
				// Redirect to dashboard or live site
				window.location.href = `/dashboard?deployed=${subdomain}`;
			} else {
				deployError = result.error || 'Deployment failed';
			}
		} catch (error) {
			deployError = 'Something went wrong. Please try again.';
		} finally {
			isDeploying = false;
		}
	}
</script>

<svelte:head>
	{#if template}
		<title>{template.name} | CREATE SOMETHING Templates</title>
		<meta name="description" content={template.description} />
	{/if}
</svelte:head>

{#if template}
	<div class="template-page">
		<!-- Wizard Steps -->
		<div class="wizard-header">
			<div class="wizard-steps">
				<button
					class="wizard-step"
					class:active={currentStep === 1}
					class:completed={currentStep > 1}
					onclick={() => (currentStep = 1)}
				>
					<span class="wizard-step-number">1</span>
					<span class="wizard-step-label">Preview</span>
				</button>
				<div class="wizard-step-connector" class:completed={currentStep > 1}></div>
				<button
					class="wizard-step"
					class:active={currentStep === 2}
					class:completed={currentStep > 2}
					onclick={() => currentStep > 1 && (currentStep = 2)}
				>
					<span class="wizard-step-number">2</span>
					<span class="wizard-step-label">Configure</span>
				</button>
				<div class="wizard-step-connector" class:completed={currentStep > 2}></div>
				<button
					class="wizard-step"
					class:active={currentStep === 3}
					onclick={() => currentStep > 2 && (currentStep = 3)}
				>
					<span class="wizard-step-number">3</span>
					<span class="wizard-step-label">Deploy</span>
				</button>
			</div>
		</div>

		<!-- Step 1: Preview -->
		{#if currentStep === 1}
			<div class="step-content">
				<div class="preview-layout">
					<div class="preview-main">
						<div class="preview-frame">
							<div class="preview-browser">
								<div class="browser-dots">
									<span></span><span></span><span></span>
								</div>
								<div class="browser-url">{template.slug}.createsomething.space</div>
							</div>
							<iframe
								src={template.previewUrl}
								title="{template.name} Preview"
								class="preview-iframe"
							></iframe>
						</div>
					</div>

					<div class="preview-sidebar">
						<h1 class="template-title">{template.name}</h1>
						<p class="template-description">{template.description}</p>

						<div class="template-features">
							<h3 class="features-label">Includes</h3>
							<ul class="features-list">
								{#each template.features as feature}
									<li>{feature}</li>
								{/each}
							</ul>
						</div>

						<div class="template-pricing">
							<div class="price-tier">
								<span class="price-label">Free</span>
								<span class="price-value">$0</span>
								<span class="price-note">Basic features</span>
							</div>
							{#if template.pricing.proPrice}
								<div class="price-tier pro">
									<span class="price-label">Pro</span>
									<span class="price-value">${template.pricing.proPrice}</span>
									<span class="price-note">All features</span>
								</div>
							{/if}
						</div>

						<button class="btn btn-primary btn-lg full-width" onclick={() => (currentStep = 2)}>
							Use This Template
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 2: Configure -->
		{#if currentStep === 2}
			<div class="step-content">
				<div class="config-layout">
					<div class="config-form">
						<h2 class="config-title">Configure Your Site</h2>
						<p class="config-subtitle">Fill in your details. You can always edit these later.</p>

						<form class="form">
							{#each template.configSchema.required as field}
								<div class="form-group">
									<label class="label" for={field.key}>{field.label} *</label>
									{#if field.type === 'textarea'}
										<textarea
											id={field.key}
											class="input"
											placeholder={field.placeholder}
											rows="3"
											value={config[field.key] || ''}
											oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
										></textarea>
									{:else}
										<input
											id={field.key}
											type={field.type}
											class="input"
											placeholder={field.placeholder}
											value={config[field.key] || ''}
											oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
										/>
									{/if}
									{#if field.description}
										<p class="field-hint">{field.description}</p>
									{/if}
								</div>
							{/each}

							<details class="optional-fields">
								<summary>Optional Fields</summary>
								{#each template.configSchema.optional as field}
									{#if field.type !== 'array'}
										<div class="form-group">
											<label class="label" for={field.key}>{field.label}</label>
											{#if field.type === 'textarea'}
												<textarea
													id={field.key}
													class="input"
													placeholder={field.placeholder}
													rows="3"
													value={config[field.key] || ''}
													oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
												></textarea>
											{:else}
												<input
													id={field.key}
													type={field.type}
													class="input"
													placeholder={field.placeholder}
													value={config[field.key] || ''}
													oninput={(e) => updateConfig(field.key, e.currentTarget.value)}
												/>
											{/if}
										</div>
									{/if}
								{/each}
							</details>
						</form>

						<div class="form-actions">
							<button class="btn btn-secondary" onclick={() => (currentStep = 1)}>Back</button>
							<button
								class="btn btn-primary"
								disabled={!requiredFieldsFilled}
								onclick={() => (currentStep = 3)}
							>
								Continue to Deploy
							</button>
						</div>
					</div>

					<div class="config-preview">
						<div class="preview-card">
							<h3 class="preview-label">Preview</h3>
							<div class="preview-site-name">{config.name || 'Your Site'}</div>
							<div class="preview-site-tagline">{config.tagline || config.role || 'Your tagline'}</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 3: Deploy -->
		{#if currentStep === 3}
			<div class="step-content">
				<div class="deploy-layout">
					<div class="deploy-form">
						<h2 class="deploy-title">Launch Your Site</h2>
						<p class="deploy-subtitle">Choose your subdomain and go live.</p>

						<div class="form-group">
							<label class="label" for="subdomain">Your URL</label>
							<div class="subdomain-input">
								<input
									id="subdomain"
									type="text"
									class="input"
									placeholder="yourname"
									bind:value={subdomain}
									oninput={(e) => {
										subdomain = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
									}}
								/>
								<span class="subdomain-suffix">.createsomething.space</span>
							</div>
							{#if subdomain && !subdomainValid}
								<p class="field-error">At least 3 characters, letters, numbers, and hyphens only</p>
							{/if}
						</div>

						{#if deployError}
							<div class="deploy-error">
								{deployError}
							</div>
						{/if}

						<div class="form-actions">
							<button class="btn btn-secondary" onclick={() => (currentStep = 2)}>Back</button>
							<button
								class="btn btn-primary btn-lg"
								disabled={!subdomainValid || isDeploying}
								onclick={handleDeploy}
							>
								{#if isDeploying}
									Deploying...
								{:else}
									Deploy Now
								{/if}
							</button>
						</div>
					</div>

					<div class="deploy-preview">
						<div class="launch-card">
							<div class="launch-icon">
								<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M12 2L2 7l10 5 10-5-10-5z"/>
									<path d="M2 17l10 5 10-5"/>
									<path d="M2 12l10 5 10-5"/>
								</svg>
							</div>
							<h3 class="launch-title">Ready to Launch</h3>
							<p class="launch-url">
								{subdomain || 'yoursite'}.createsomething.space
							</p>
							<ul class="launch-checklist">
								<li class:done={config.name}>Site name configured</li>
								<li class:done={subdomainValid}>URL selected</li>
								<li>SSL certificate (automatic)</li>
								<li>Global CDN (automatic)</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="not-found">
		<h1>Template Not Found</h1>
		<p>The template you're looking for doesn't exist.</p>
		<a href="/templates" class="btn btn-primary">Browse Templates</a>
	</div>
{/if}

<style>
	.template-page {
		min-height: calc(100vh - 200px);
	}

	/* Wizard Header */
	.wizard-header {
		padding: var(--space-md) var(--gutter);
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
	}

	.wizard-steps {
		display: flex;
		align-items: center;
		max-width: 500px;
		margin: 0 auto;
	}

	.wizard-step {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.wizard-step.active {
		color: var(--color-fg-primary);
	}

	.wizard-step.completed {
		color: var(--color-success);
	}

	.wizard-step-number {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-body-sm);
		font-weight: 600;
		border-radius: var(--radius-full);
		background: var(--color-bg-subtle);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.wizard-step.active .wizard-step-number {
		background: var(--color-accent);
		color: white;
	}

	.wizard-step.completed .wizard-step-number {
		background: var(--color-success);
		color: white;
	}

	.wizard-step-label {
		font-size: var(--text-body-sm);
	}

	.wizard-step-connector {
		flex: 1;
		height: 2px;
		margin: 0 var(--space-sm);
		background: var(--color-border-default);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.wizard-step-connector.completed {
		background: var(--color-success);
	}

	/* Step Content */
	.step-content {
		padding: var(--space-xl) var(--gutter);
	}

	/* Preview Layout (Step 1) */
	.preview-layout {
		display: grid;
		grid-template-columns: 1fr 350px;
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.preview-frame {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		border: 1px solid var(--color-border-default);
	}

	.preview-browser {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border-bottom: 1px solid var(--color-border-default);
	}

	.browser-dots {
		display: flex;
		gap: 6px;
	}

	.browser-dots span {
		width: 10px;
		height: 10px;
		border-radius: var(--radius-full);
		background: var(--color-fg-subtle);
	}

	.browser-url {
		flex: 1;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		padding: 4px var(--space-sm);
		border-radius: var(--radius-sm);
	}

	.preview-iframe {
		width: 100%;
		height: 500px;
		border: none;
		background: white;
	}

	.preview-sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.template-title {
		font-size: var(--text-h1);
	}

	.template-features {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.features-label {
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
		gap: var(--space-xs);
	}

	.features-list li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding-left: 1.5em;
		position: relative;
	}

	.features-list li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success);
	}

	.template-pricing {
		display: flex;
		gap: var(--space-sm);
	}

	.price-tier {
		flex: 1;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		text-align: center;
		border: 1px solid var(--color-border-default);
	}

	.price-tier.pro {
		border-color: var(--color-accent);
	}

	.price-label {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
	}

	.price-value {
		display: block;
		font-size: var(--text-h2);
		font-weight: 700;
		margin: var(--space-xs) 0;
	}

	.price-note {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.full-width {
		width: 100%;
	}

	/* Config Layout (Step 2) */
	.config-layout {
		display: grid;
		grid-template-columns: 1fr 300px;
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.config-form {
		max-width: 600px;
	}

	.config-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-xs);
	}

	.config-subtitle {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-hint {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.field-error {
		font-size: var(--text-caption);
		color: var(--color-error);
	}

	.optional-fields {
		margin-top: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.optional-fields summary {
		font-weight: 500;
		cursor: pointer;
		margin-bottom: var(--space-md);
	}

	.form-actions {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-lg);
	}

	.config-preview {
		position: sticky;
		top: 100px;
	}

	.preview-card {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
	}

	.preview-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		margin-bottom: var(--space-sm);
	}

	.preview-site-name {
		font-size: var(--text-h2);
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.preview-site-tagline {
		color: var(--color-fg-secondary);
	}

	/* Deploy Layout (Step 3) */
	.deploy-layout {
		display: grid;
		grid-template-columns: 1fr 350px;
		gap: var(--space-xl);
		max-width: var(--content-width);
		margin: 0 auto;
	}

	.deploy-form {
		max-width: 500px;
	}

	.deploy-title {
		font-size: var(--text-h1);
		margin-bottom: var(--space-xs);
	}

	.deploy-subtitle {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
	}

	.subdomain-input {
		display: flex;
		align-items: center;
	}

	.subdomain-input .input {
		border-radius: var(--radius-md) 0 0 var(--radius-md);
		text-align: right;
	}

	.subdomain-suffix {
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-left: none;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.deploy-error {
		padding: var(--space-sm);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		margin: var(--space-md) 0;
	}

	.launch-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		text-align: center;
	}

	.launch-icon {
		color: var(--color-accent);
		margin-bottom: var(--space-md);
	}

	.launch-title {
		font-size: var(--text-h3);
		margin-bottom: var(--space-xs);
	}

	.launch-url {
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-md);
	}

	.launch-checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		text-align: left;
	}

	.launch-checklist li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		padding: var(--space-xs) 0;
		padding-left: 1.5em;
		position: relative;
	}

	.launch-checklist li::before {
		content: '○';
		position: absolute;
		left: 0;
	}

	.launch-checklist li.done {
		color: var(--color-fg-secondary);
	}

	.launch-checklist li.done::before {
		content: '●';
		color: var(--color-success);
	}

	/* Not Found */
	.not-found {
		text-align: center;
		padding: var(--space-2xl) var(--gutter);
	}

	@media (max-width: 768px) {
		.preview-layout,
		.config-layout,
		.deploy-layout {
			grid-template-columns: 1fr;
		}

		.wizard-step-label {
			display: none;
		}
	}
</style>
