<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button, Card } from '$lib/components';

	function handleGoHome() {
		goto('/dashboard');
	}

	function handleGoBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>Error | Webflow Asset Dashboard</title>
</svelte:head>

<div class="error-page">
	<div class="error-container">
		<Card class="error-card">
			<div class="error-content">
				<div class="error-icon">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4" />
						<path d="M12 16h.01" />
					</svg>
				</div>

				<h1 class="error-code">{$page.status}</h1>

				<h2 class="error-title">
					{#if $page.status === 404}
						Page Not Found
					{:else if $page.status === 401}
						Unauthorized
					{:else if $page.status === 403}
						Access Denied
					{:else if $page.status === 500}
						Server Error
					{:else}
						Something Went Wrong
					{/if}
				</h2>

				<p class="error-message">
					{#if $page.error?.message}
						{$page.error.message}
					{:else if $page.status === 404}
						The page you're looking for doesn't exist or has been moved.
					{:else if $page.status === 401}
						You need to be logged in to access this page.
					{:else if $page.status === 403}
						You don't have permission to access this resource.
					{:else if $page.status === 500}
						An unexpected error occurred. Please try again later.
					{:else}
						An error occurred while processing your request.
					{/if}
				</p>

				<div class="error-actions">
					<Button variant="webflow" onclick={handleGoHome}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
						Go to Dashboard
					</Button>
					<Button variant="secondary" onclick={handleGoBack}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M15 19l-7-7 7-7" />
						</svg>
						Go Back
					</Button>
				</div>
			</div>
		</Card>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		background: var(--color-bg-pure);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
	}

	.error-container {
		width: 100%;
		max-width: 32rem;
	}

	:global(.error-card) {
		padding: var(--space-xl);
	}

	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-md);
	}

	.error-icon {
		color: var(--color-error);
		opacity: 0.8;
	}

	.error-code {
		font-size: var(--text-display-xl);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
		line-height: 1;
	}

	.error-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0;
	}

	.error-message {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		max-width: 24rem;
	}

	.error-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		justify-content: center;
		margin-top: var(--space-sm);
	}

	.error-actions :global(button) {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}
</style>
