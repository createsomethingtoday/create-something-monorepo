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
/>

<section class="access-section">
	<div class="access-card">
		<div>
			<h2>MCP Access</h2>
			<p>
				Your personal bearer token, host setup snippets, and managed access scope now live on a dedicated
				page designed for safe reveal-and-copy workflows.
			</p>
		</div>
		<a href="/mcp-access" class="access-link">Open MCP Access</a>
	</div>
</section>

<style>
	.access-section {
		max-width: 960px;
		margin: 0 auto 4rem;
		padding: 0 1.5rem;
	}

	.access-card {
		border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12));
		border-radius: 20px;
		padding: 1.5rem;
		background: var(--color-surface-raised, rgba(255, 255, 255, 0.03));
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.access-card h2 {
		margin: 0 0 0.5rem;
	}

	.access-card p {
		margin: 0;
		color: var(--color-performance-fg-tertiary, rgba(255, 255, 255, 0.72));
		line-height: 1.7;
	}

	.access-link {
		border-radius: 999px;
		padding: 0.85rem 1.25rem;
		background: var(--color-performance-fg-primary, #fff);
		color: var(--color-performance-bg-pure, #000);
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	@media (max-width: 720px) {
		.access-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
