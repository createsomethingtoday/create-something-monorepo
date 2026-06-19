<script lang="ts">
	import { Button, Badge, Dialog } from './ui';
	import { env } from '$env/dynamic/public';
	import { Check, Info, ExternalLink, Copy } from 'lucide-svelte';

	interface Props {
		userEmail?: string;
		featured?: boolean;
	}

	let { userEmail, featured = false }: Props = $props();

	let showInstallModal = $state(false);
	let installUrlCopied = $state(false);

	const installUrl =
		env.PUBLIC_WEBFLOW_WAY_INSTALL_URL ||
		'https://webflow.com/oauth/authorize?response_type=code&client_id=28685cff5fef23c426a670bb57bf383b25cd16125bc5bba2103d899b3f4a7092&workspace=createsomethingagency';
	const installUrlDisplay = formatInstallUrl(installUrl);

	const externalUrl = env.PUBLIC_WEBFLOW_WAY_VALIDATOR_URL || 'https://webflow-way-validator.vercel.app';

	function formatInstallUrl(url: string): string {
		try {
			const parsed = new URL(url);
			const workspace = parsed.searchParams.get('workspace');
			return workspace ? `${parsed.host}${parsed.pathname} / ${workspace}` : `${parsed.host}${parsed.pathname}`;
		} catch {
			return url.length > 72 ? `${url.slice(0, 50)}...${url.slice(-18)}` : url;
		}
	}

	function handleLearnMore() {
		showInstallModal = true;
	}

	function handleInstall() {
		window.open(installUrl, '_blank', 'noopener,noreferrer');
	}

	async function handleCopyInstallUrl() {
		try {
			await navigator.clipboard.writeText(installUrl);
			installUrlCopied = true;
			setTimeout(() => {
				installUrlCopied = false;
			}, 2000);
		} catch {
			installUrlCopied = false;
		}
	}
</script>

<div class="webflow-way-card {featured ? 'webflow-way-card--featured' : ''}">
	<div class="tool-header">
		<div class="tool-title-group">
			<h3 class="tool-title">Webflow Way Validator</h3>
			<div class="badge-row">
				<Badge variant="secondary">Designer App</Badge>
				<Badge variant="outline">Requires Install</Badge>
			</div>
		</div>
	</div>

	<p class="tool-description">
		Designer app for the required Webflow Way pass before marketplace submission. Install it,
		open it from Designer, and run validation against the published site.
	</p>

	{#if featured}
		<div class="install-access" aria-label="Validator install URL">
			<div>
				<p class="install-access-title">Webflow install URL</p>
				<p class="install-access-copy">Open the Webflow install link or copy it for a teammate.</p>
			</div>
			<div class="install-access-actions">
				<code title={installUrl}>{installUrlDisplay}</code>
				<Button
					variant="outline"
					size="sm"
					onclick={handleCopyInstallUrl}
					class="copy-url-button"
					aria-label="Copy Webflow Way Validator install URL"
				>
					{#if installUrlCopied}
						<Check size={14} />
						Copied
					{:else}
						<Copy size={14} />
						Copy URL
					{/if}
				</Button>
			</div>
		</div>
	{/if}

	{#if !featured}
		<div class="how-it-works">
			<div class="how-it-works-icon">
				<Info size={16} />
			</div>
			<div class="how-it-works-content">
				<p class="how-it-works-title">How it works:</p>
				<ul class="how-it-works-list">
					<li>Install the app from Webflow</li>
					<li>Open the app from the Designer Apps panel</li>
					<li>Add the Validator script, publish, and re-check</li>
					<li>Run Validator &mdash; completes in 30&ndash;60 seconds</li>
					<li>Get step-by-step fix instructions for each issue</li>
				</ul>
			</div>
		</div>
	{/if}

	<ul class="tool-features">
		<li>
			<Check size={16} />
			Design system &amp; naming conventions
		</li>
		<li>
			<Check size={16} />
			Page structure, SEO &amp; metadata
		</li>
		<li>
			<Check size={16} />
			Required 100% Validator pass before submission
		</li>
	</ul>

	<div class="tool-actions">
		<Button variant="secondary" onclick={handleLearnMore} class="tool-button">
			<Info size={16} />
			Learn More
		</Button>
		<Button onclick={handleInstall} class="tool-button">
			Install App
			<ExternalLink size={16} />
		</Button>
	</div>
</div>

<!-- Installation Guide Modal -->
<Dialog isOpen={showInstallModal} onClose={() => (showInstallModal = false)} title="Webflow Way Validator Guide" size="lg">
	<div class="modal-content">
		<p class="modal-subtitle">Learn how to validate your templates and fix common issues.</p>

		<!-- Getting Started -->
		<section class="guide-section">
			<h3 class="guide-heading">Getting Started</h3>
			<p class="guide-text">First, install and open the app.</p>

			<div class="guide-block">
				<h4 class="guide-subheading">Install the App</h4>
				<ol class="guide-steps">
					<li>Click Install App and approve the Webflow app install</li>
					<li>Open your project in Webflow Designer</li>
					<li>Find the Apps panel on the left sidebar</li>
					<li>Click the Webflow Way Validator to open it</li>
				</ol>
			</div>

			<div class="guide-block">
				<h4 class="guide-subheading">Run Your First Validation</h4>
				<ol class="guide-steps">
					<li>Click Add Validator script if the app asks for it</li>
					<li>Publish the site and click Re-check script</li>
					<li>Click the blue "Run Validator" button</li>
					<li>Wait 30&ndash;60 seconds while the tool analyzes your project</li>
					<li>Review your compliance score and fix required items until it reaches 100%</li>
				</ol>
			</div>

			<div class="guide-callout info">
				<strong>Important:</strong> Publish after adding the Validator script. The submission form
				checks the published site for the confirmed Validator pass.
			</div>
		</section>

		<!-- Understanding Results -->
		<section class="guide-section">
			<h3 class="guide-heading">Understanding Your Results</h3>
			<p class="guide-text">
				Validation opens to the Overview Tab. This shows your project's overall health.
			</p>

			<div class="guide-block">
				<h4 class="guide-subheading">Project Summary</h4>
				<p class="guide-text">The top section shows key metrics:</p>
				<ul class="guide-list">
					<li>Overall compliance score as a percentage</li>
					<li>Failed categories that prevent the required 100% pass</li>
					<li>Critical errors that block template submission</li>
					<li>Warnings for recommended improvements</li>
					<li>Number of categories that pass validation</li>
				</ul>
			</div>

			<div class="guide-block">
				<h4 class="guide-subheading">Priority Order</h4>
				<ol class="guide-steps">
					<li>Categories with errors (fix first)</li>
					<li>Categories with warnings (fix second)</li>
					<li>Passed categories (no action needed)</li>
				</ol>
			</div>
		</section>

		<!-- Fix List -->
		<section class="guide-section">
			<h3 class="guide-heading">Using the Fix List</h3>
			<p class="guide-text">
				Switch to the Fix List tab to track failed categories and blocking issues systematically.
			</p>

			<div class="guide-block">
				<h4 class="guide-subheading">Work Through Issues</h4>
				<div class="code-preview">
					<div>Component Architecture</div>
					<div class="code-indent">&#9744; Missing required Navigation component</div>
					<div class="code-indent-deep">Fix: Create a Navigation component with Title Case naming</div>
					<div class="code-indent">&#9744; Missing required Footer component</div>
					<div class="code-indent-deep">Fix: Create a Footer component with Title Case naming</div>
				</div>
			</div>

			<div class="guide-callout warning">
				<strong>Note:</strong> Clicking Refresh Validation unchecks all boxes. This lets you verify
				fixes are complete. Items that persist after refresh need more work.
			</div>
		</section>

		<!-- Recommended Workflow -->
		<section class="guide-section">
			<h3 class="guide-heading">Recommended Workflow</h3>

			<div class="guide-block">
				<h4 class="guide-subheading">1. Plan Your Work</h4>
				<p class="guide-text">
					Review the Overview tab to understand all issues. Switch to Fix List for tracking.
				</p>
			</div>

			<div class="guide-block">
				<h4 class="guide-subheading">2. Fix in Batches</h4>
				<p class="guide-text">
					Group similar issues together. Fix all missing meta descriptions at once. Work through one
					category before moving to the next.
				</p>
			</div>

			<div class="guide-block">
				<h4 class="guide-subheading">3. Verify Your Fixes</h4>
				<p class="guide-text">
					Click Refresh Validation. Errors should disappear if your fixes worked.
				</p>
			</div>
		</section>

		<!-- Success Metrics -->
		<section class="guide-section">
			<h3 class="guide-heading">Target Scores</h3>
			<ul class="guide-list">
				<li>Overall score at 100%</li>
				<li>Zero failed categories</li>
				<li>Zero critical errors</li>
				<li>Variable usage above 80%</li>
				<li>Complete SEO on all pages</li>
			</ul>
		</section>

		<!-- Requirements -->
		<section class="guide-section">
			<h3 class="guide-heading">Requirements Checklist</h3>
			<p class="guide-text">Your template needs these elements:</p>
			<ul class="guide-list">
				<li>Required pages: Style Guide and License</li>
				<li>Complete variable system for colors, fonts, and spacing</li>
				<li>Required components: Navigation, Footer, and CTA</li>
				<li>HTML tag styles using variables</li>
				<li>SEO metadata on every page</li>
				<li>Title Case naming throughout project</li>
			</ul>
		</section>

		<div class="guide-callout success">
			You're ready to validate your template. Follow this guide to fix issues and meet marketplace
			standards.
		</div>

		<div class="modal-actions">
			<Button variant="secondary" onclick={() => (showInstallModal = false)}>Close</Button>
			<Button onclick={handleInstall}>
				Install App
				<ExternalLink size={16} />
			</Button>
		</div>
	</div>
</Dialog>

<style>
	.webflow-way-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.webflow-way-card--featured {
		gap: var(--space-md);
		padding: var(--space-md);
		border-radius: var(--radius-sm);
		border-color: var(--color-shell-border-default);
		box-shadow: none;
	}

	.tool-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
	}

	.tool-title-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.tool-title {
		font-family: var(--font-heading);
		font-size: 1.6rem;
		font-weight: var(--font-semibold);
		letter-spacing: 0;
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1.08;
	}

	.badge-row {
		display: flex;
		gap: var(--space-xs);
	}

	.tool-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.install-access {
		display: grid;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-sm);
	}

	.install-access-title {
		margin: 0;
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
	}

	.install-access-copy {
		margin: 0.15rem 0 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		line-height: 1.4;
	}

	.install-access-actions {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-sm);
		align-items: center;
	}

	.install-access code {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-bg-pure) 72%, transparent);
		color: var(--color-fg-primary);
		font-size: var(--text-caption);
	}

	.how-it-works {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-md);
	}

	.how-it-works-icon {
		color: var(--color-fg-muted);
		flex-shrink: 0;
		margin-top: 2px;
	}

	.how-it-works-content {
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
	}

	.how-it-works-title {
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
		font-size: var(--text-body-sm);
	}

	.how-it-works-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.how-it-works-list li::before {
		content: '• ';
	}

	.tool-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-xs);
	}

	.tool-features li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-xs);
		min-width: 0;
		padding: var(--space-xs);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.35;
	}

	.tool-features :global(svg) {
		color: var(--color-success);
		flex-shrink: 0;
	}

	.tool-actions {
		display: flex;
		gap: var(--space-sm);
		margin-top: auto;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-shell-border-default);
	}

	:global(.tool-button) {
		flex: 1;
		justify-content: center;
		gap: var(--space-xs);
	}

	:global(.copy-url-button) {
		justify-content: center;
		gap: var(--space-xs);
	}

	/* Modal styles */
	.modal-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.modal-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.guide-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.guide-heading {
		font-family: var(--font-heading);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		letter-spacing: 0.01em;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.guide-subheading {
		font-family: var(--font-heading);
		font-size: var(--text-body-lg);
		font-weight: var(--font-medium);
		letter-spacing: 0.01em;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.guide-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.guide-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.guide-steps,
	.guide-list {
		margin: 0;
		padding-left: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.7;
	}

	.guide-callout {
		padding: var(--space-sm);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.guide-callout.info {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-shell-border-default);
		color: var(--color-fg-secondary);
	}

	.guide-callout.warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		color: var(--color-warning);
	}

	.guide-callout.success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		color: var(--color-success);
	}

	.code-preview {
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-md);
		font-family: monospace;
		font-size: var(--text-caption);
		color: var(--color-fg-secondary);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.code-indent {
		padding-left: var(--space-md);
	}

	.code-indent-deep {
		padding-left: var(--space-xl);
		color: var(--color-fg-muted);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-shell-border-default);
	}

	@media (max-width: 640px) {
		.webflow-way-card--featured {
			padding: var(--space-md);
		}

		.install-access-actions,
		.tool-actions,
		.tool-features {
			grid-template-columns: 1fr;
			display: grid;
		}

		.install-access code {
			white-space: normal;
			overflow-wrap: anywhere;
			line-height: 1.35;
		}
	}
</style>
