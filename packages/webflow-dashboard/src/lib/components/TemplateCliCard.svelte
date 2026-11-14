<script lang="ts">
	import { Button, Badge } from './ui';
	import { env } from '$env/dynamic/public';
	import { Check, Copy } from 'lucide-svelte';
	import { trackEvent } from '$lib/utils/analytics';

	const packageUrl =
		env.PUBLIC_TEMPLATE_CLI_PACKAGE_URL ||
		'https://validation-worker.createsomething.workers.dev/cli/wf-template-validate.tgz';
	const installCommand = `npm install -g ${packageUrl}`;

	const steps = [
		{
			command: 'wf-template-validate login',
			note: 'Sign in to Webflow. Select only the template site you will submit.'
		},
		{
			command: 'wf-template-validate sites',
			note: 'Find the site ID of the template.'
		},
		{
			command: 'wf-template-validate validate https://your-template.webflow.io --site <site ID>',
			note: 'Run all checks on the published site and record the result.'
		}
	];

	let installCopied = $state(false);

	async function handleCopyInstall() {
		try {
			await navigator.clipboard.writeText(installCommand);
			installCopied = true;
			trackEvent('validation_cli_install_copied');
			setTimeout(() => {
				installCopied = false;
			}, 2000);
		} catch {
			installCopied = false;
		}
	}
</script>

<div class="template-cli-card">
	<div class="tool-title-group">
		<h3 class="tool-title">Template CLI</h3>
		<div class="badge-row">
			<Badge variant="secondary">Command line</Badge>
			<Badge variant="outline">Node 20 or later</Badge>
		</div>
	</div>

	<p class="tool-description">
		Runs the Webflow Way Validator checks from your terminal. You do not need the Designer open or
		the Validator script on the site. A complete run with a 100% pass counts for the submission
		form.
	</p>

	<div class="install-access" aria-label="Template CLI install command">
		<div>
			<p class="install-access-title">Install command</p>
			<p class="install-access-copy">Run it again to update to the newest version.</p>
		</div>
		<div class="install-access-actions">
			<code title={installCommand}>{installCommand}</code>
			<Button
				variant="outline"
				size="sm"
				onclick={handleCopyInstall}
				class="copy-url-button"
				aria-label="Copy Template CLI install command"
			>
				{#if installCopied}
					<Check size={14} />
					Copied
				{:else}
					<Copy size={14} />
					Copy
				{/if}
			</Button>
		</div>
	</div>

	<ol class="cli-steps" aria-label="Template CLI steps">
		{#each steps as step (step.command)}
			<li>
				<code>{step.command}</code>
				<p>{step.note}</p>
			</li>
		{/each}
	</ol>

	<p class="cli-note">
		The sign-in page asks you to authorize Webflow's MCP app. The CLI reads the site and does not
		change it. Publish the site before each run.
	</p>
</div>

<style>
	.template-cli-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-sm);
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
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tool-description,
	.cli-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.cli-note {
		font-size: var(--text-caption);
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

	code {
		font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
		font-size: var(--text-caption);
		color: var(--color-fg-primary);
	}

	.install-access code {
		min-width: 0;
		overflow-wrap: anywhere;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-bg-pure) 72%, transparent);
	}

	.cli-steps {
		display: grid;
		gap: var(--space-sm);
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: cli-step;
	}

	.cli-steps li {
		counter-increment: cli-step;
		position: relative;
		min-width: 0;
		padding: var(--space-sm);
		padding-left: 3rem;
		border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
		border-radius: var(--radius-sm);
	}

	.cli-steps li::before {
		content: counter(cli-step);
		position: absolute;
		top: 0.8rem;
		left: var(--space-sm);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 999px;
		border: 1px solid var(--color-shell-border-default);
		background: var(--color-bg-subtle);
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
	}

	.cli-steps code {
		display: block;
		overflow-wrap: anywhere;
	}

	.cli-steps p {
		margin: var(--space-xs) 0 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-caption);
		line-height: 1.45;
	}

	:global(.copy-url-button) {
		justify-content: center;
		gap: var(--space-xs);
	}

	@media (max-width: 640px) {
		.install-access-actions {
			grid-template-columns: 1fr;
		}
	}
</style>
