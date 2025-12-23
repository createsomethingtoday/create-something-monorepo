<script lang="ts">
	import { SEO } from '@create-something/components';

	interface Props {
		data: {
			success: boolean;
			error: string | null;
			email: string | null;
		};
	}

	let { data }: Props = $props();
</script>

<SEO
	title="Unsubscribe | CREATE SOMETHING"
	description="Unsubscribe from CREATE SOMETHING newsletter"
	propertyName="space"
/>

<div class="page-container min-h-screen flex items-center justify-center">
	<div class="max-w-md mx-auto px-6 py-16 text-center">
		<div class="logo mb-8">CREATE SOMETHING</div>

		{#if data.success}
			<div class="success-section">
				<h1 class="page-title mb-4">Unsubscribed</h1>
				<p class="body-text mb-6">
					{data.email ? `${data.email} has been` : 'You have been'} removed from our mailing list.
				</p>
				<p class="caption-text">
					We respect your inbox. No hard feelings.
				</p>
			</div>
		{:else}
			<div class="error-section">
				<h1 class="page-title mb-4">Unable to Unsubscribe</h1>
				<p class="body-text mb-6">
					{data.error || 'Something went wrong processing your request.'}
				</p>
				<p class="caption-text">
					If you continue to receive emails, contact <a href="mailto:micah@createsomething.io" class="link">micah@createsomething.io</a>
				</p>
			</div>
		{/if}

		<div class="footer-link mt-12">
			<a href="https://createsomething.space" class="link">Back to CREATE SOMETHING</a>
		</div>
	</div>
</div>

<style>
	.page-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.logo {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.page-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.body-text {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	.caption-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.link {
		color: var(--color-fg-tertiary);
		text-decoration: underline;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.link:hover {
		color: var(--color-fg-primary);
	}

	.footer-link {
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}
</style>
