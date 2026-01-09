<script lang="ts">
	/**
	 * OUTERFIELDS Error Page
	 *
	 * Displays error messages with OUTERFIELDS branding
	 */

	import { page } from '$app/stores';

	const statusMessages: Record<number, { title: string; message: string }> = {
		404: {
			title: 'Page Not Found',
			message: 'The page you are looking for does not exist or has been moved.'
		},
		403: {
			title: 'Access Denied',
			message: 'You do not have permission to access this page.'
		},
		500: {
			title: 'Server Error',
			message: 'Something went wrong on our end. Please try again later.'
		}
	};

	$: status = $page.status;
	$: errorInfo = statusMessages[status] || {
		title: 'Error',
		message: $page.error?.message || 'An unexpected error occurred.'
	};
</script>

<svelte:head>
	<title>Error {status} | OUTERFIELDS</title>
</svelte:head>

<div class="error-page">
	<div class="error-container">
		<div class="error-content">
			<div class="error-icon">
				<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="40" cy="40" r="38" stroke="currentColor" stroke-width="2" opacity="0.2"/>
					<path d="M40 20v24M40 52v4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
				</svg>
			</div>

			<div class="error-text">
				<h1 class="error-status">{status}</h1>
				<h2 class="error-title">{errorInfo.title}</h2>
				<p class="error-message">{errorInfo.message}</p>
			</div>

			<div class="error-actions">
				<a href="/" class="action-button primary">
					Go Home
				</a>
				<button onclick={() => window.history.back()} class="action-button secondary">
					Go Back
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: var(--color-bg-pure);
	}

	.error-container {
		max-width: 32rem;
		width: 100%;
	}

	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 2rem;
	}

	.error-icon {
		color: var(--color-primary);
		opacity: 0.8;
	}

	.error-text {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error-status {
		font-size: 4rem;
		font-weight: 700;
		color: var(--color-fg-muted);
		margin: 0;
		line-height: 1;
	}

	.error-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.error-message {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0;
		line-height: 1.6;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.action-button {
		padding: 0.875rem 1.75rem;
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		font-weight: 600;
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
		cursor: pointer;
		border: none;
		font-family: inherit;
	}

	.action-button.primary {
		background: var(--color-primary);
		color: white;
	}

	.action-button.primary:hover {
		background: var(--color-primary-hover);
		transform: translateY(-1px);
	}

	.action-button.secondary {
		background: rgba(255, 255, 255, 0.05);
		color: var(--color-fg-primary);
		border: 1px solid var(--color-border-default);
	}

	.action-button.secondary:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--color-border-emphasis);
	}

	@media (max-width: 640px) {
		.error-actions {
			flex-direction: column;
			width: 100%;
		}

		.action-button {
			width: 100%;
		}
	}
</style>
