<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AccountPage } from '@create-something/canon/auth/components';
	import { UserInteractionsPanel } from '@create-something/canon/analytics';

	let { data } = $props();
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING account"
	propertyName="io"
	noindex={true}
/>

<section class="account-state" data-performance-chapter="task-state">
	<AccountPage
		user={data.user}
		pageTitle="Account | CREATE SOMETHING"
		currentProperty="io"
		logoutEndpoint="/api/public/auth/logout"
	>
		{#snippet analytics()}
			<div class="activity-state" data-performance-chapter="workspace">
				<UserInteractionsPanel
					analytics={data.analytics}
					optedOut={data.user?.analytics_opt_out ?? false}
				/>
			</div>
		{/snippet}
	</AccountPage>
</section>

<section class="research-handoff" data-performance-chapter="decision-receipt">
	<div>
		<h2>Return to research</h2>
		<p>Your account review is complete. Continue with the published research when you are done here.</p>
	</div>
	<a href="/papers">Browse papers</a>
</section>

<style>
	.research-handoff {
		max-width: 600px;
		margin: 0 auto 4rem;
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-lg);
		background: var(--color-performance-bg-surface);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-performance-lg);
	}

	.research-handoff h2,
	.research-handoff p {
		margin: 0;
	}

	.research-handoff h2 {
		font-size: var(--text-performance-body-lg);
	}

	.research-handoff p {
		margin-top: var(--space-performance-xs);
		color: var(--color-performance-fg-tertiary);
		line-height: 1.6;
	}

	.research-handoff a {
		flex: 0 0 auto;
		padding: var(--space-performance-sm) var(--space-performance-md);
		border-radius: var(--radius-performance-scale-full);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		font-weight: var(--font-performance-semibold);
		text-decoration: none;
	}

	@media (max-width: 720px) {
		.research-handoff {
			margin-right: var(--space-performance-lg);
			margin-left: var(--space-performance-lg);
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
