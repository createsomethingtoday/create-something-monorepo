<script lang="ts">
	import { SEO } from '@create-something/canon';
	import Terminal from '$lib/components/Terminal.svelte';
</script>

<SEO
	title="Terminal"
	description="Browse and explore CREATE SOMETHING content via a simulated terminal interface. Command parsing, search, and navigation."
	keywords="terminal, CLI, command line, browse, explore, interactive"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Terminal', url: 'https://createsomething.space/terminal' }
	]}
/>

<section class="page">
	<div class="container">
		<div class="header">
			<h1 class="title">Terminal</h1>
			<p class="subtitle">
				Browse and explore via command line. Type <code>help</code> for available commands.
			</p>
		</div>

		<div class="terminal-wrapper">
			<Terminal
				welcomeMessage="CREATE SOMETHING .space — The Workbench"
			/>
		</div>
	</div>
</section>

<style>
	.page {
		padding: 6rem 1.5rem 4rem;
	}

	.container {
		max-width: 64rem;
		margin: 0 auto;
	}

	.header {
		margin-bottom: var(--space-lg);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
	}

	.subtitle code {
		font-size: var(--text-body);
		background: var(--color-bg-elevated);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
	}

	.terminal-wrapper {
		min-height: 500px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
</style>
