<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AccountPage } from '@create-something/canon/auth/components';

	let { data } = $props();
	type AccountUser = { email?: string; name?: string; tier?: string } | null;
	const accountUser = $derived(data.user as AccountUser);
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING AGENCY account"
	propertyName="agency"
	noindex={true}
/>

<AccountPage
	user={accountUser}
	pageTitle="Account | CREATE SOMETHING AGENCY"
	currentProperty="agency"
	visualStyle="performance"
/>

<section class="access-section">
	<div class="access-card">
		<div class="access-copy">
			<p class="access-eyebrow">Managed credential</p>
			<h2>MCP Access</h2>
			<p>
				Review your personal bearer token, host setup snippets, and managed access scope in a safe
				reveal-and-copy workspace.
			</p>
		</div>
		<div class="access-action">
			<span>Scope / Personal</span>
			<a href="/mcp-access" class="access-link">Open MCP Access</a>
		</div>
	</div>
</section>

<style>
	.access-section {
		width: min(var(--content-width-performance), calc(100% - 2rem));
		margin: var(--space-performance-md) auto clamp(3rem, 7vw, 6rem);
	}

	.access-card {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: clamp(2rem, 5vw, 5rem);
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--color-performance-line);
		border-inline-start: 4px solid var(--color-performance-controlled);
		border-radius: var(--radius-performance-md);
		background: var(--color-performance-panel);
		box-shadow: var(--shadow-performance-panel);
	}

	.access-eyebrow,
	.access-action span {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.access-eyebrow {
		margin: 0 0 var(--space-performance-sm);
		color: var(--color-performance-controlled);
	}

	.access-card h2 {
		margin: 0 0 var(--space-performance-sm);
		color: var(--color-performance-ink);
		font-family: var(--font-performance-display);
		font-size: var(--text-performance-h3);
		font-weight: 700;
	}

	.access-copy > p:last-child {
		max-width: 52rem;
		margin: 0;
		color: var(--color-performance-muted);
		font-size: var(--text-performance-body-sm);
		line-height: 1.6;
	}

	.access-action {
		display: grid;
		justify-items: end;
		gap: var(--space-performance-sm);
	}

	.access-action span {
		color: var(--color-performance-muted);
	}

	.access-link {
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 1.25rem;
		border: 1px solid var(--color-performance-ink);
		border-radius: var(--radius-performance-sm);
		background: var(--color-performance-ink);
		color: var(--color-performance-panel);
		text-decoration: none;
		font-size: var(--text-performance-body-sm);
		font-weight: 700;
		white-space: nowrap;
	}

	.access-link:hover {
		opacity: 1;
		border-color: var(--color-performance-ink-soft);
		background: var(--color-performance-ink-soft);
	}

	@media (max-width: 760px) {
		.access-section {
			width: min(100% - 1.375rem, var(--content-width-performance));
		}

		.access-card {
			grid-template-columns: 1fr;
			align-items: flex-start;
		}

		.access-action {
			justify-items: start;
		}
	}
</style>
