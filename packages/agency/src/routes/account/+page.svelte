<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	let isLoggingOut = $state(false);

	async function handleLogout() {
		isLoggingOut = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			goto('/');
		} catch {
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>Account | CREATE SOMETHING AGENCY</title>
</svelte:head>

<div class="account-container">
	<div class="account-card">
		<div class="account-header">
			<div class="avatar">
				{data.user?.name?.[0]?.toUpperCase() || data.user?.email?.[0]?.toUpperCase() || '?'}
			</div>
			<div class="account-info">
				<h1>{data.user?.name || 'Anonymous'}</h1>
				<p class="email">{data.user?.email}</p>
			</div>
		</div>

		<div class="account-sections">
			<section class="account-section">
				<h2>Account Details</h2>
				<div class="detail-row">
					<span class="detail-label">Email</span>
					<span class="detail-value">{data.user?.email}</span>
				</div>
				{#if data.user?.name}
					<div class="detail-row">
						<span class="detail-label">Name</span>
						<span class="detail-value">{data.user.name}</span>
					</div>
				{/if}
				{#if data.user?.tier}
					<div class="detail-row">
						<span class="detail-label">Tier</span>
						<span class="detail-value tier">{data.user.tier}</span>
					</div>
				{/if}
			</section>

			<section class="account-section">
				<h2>Connected Properties</h2>
				<p class="section-description">
					Your account works across all CREATE SOMETHING properties.
				</p>
				<div class="properties-grid">
					<a href="https://createsomething.ltd" class="property-link">
						<span class="property-name">.ltd</span>
						<span class="property-label">Philosophy</span>
					</a>
					<a href="https://createsomething.io" class="property-link">
						<span class="property-name">.io</span>
						<span class="property-label">Research</span>
					</a>
					<a href="https://createsomething.space" class="property-link">
						<span class="property-name">.space</span>
						<span class="property-label">Practice</span>
					</a>
					<a href="https://createsomething.agency" class="property-link current">
						<span class="property-name">.agency</span>
						<span class="property-label">Services</span>
					</a>
				</div>
			</section>

			<section class="account-section">
				<h2>Session</h2>
				<button class="logout-button" onclick={handleLogout} disabled={isLoggingOut}>
					{#if isLoggingOut}
						Signing out...
					{:else}
						Sign out
					{/if}
				</button>
			</section>
		</div>
	</div>
</div>

<style>
	.account-container {
		min-height: calc(100vh - 72px);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--space-xl) var(--space-lg);
	}

	.account-card {
		width: 100%;
		max-width: 600px;
	}

	.account-header {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: var(--radius-full);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.account-info h1 {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.email {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.account-sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.account-section {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.account-section h2 {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md) 0;
	}

	.section-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md) 0;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.detail-value {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
	}

	.detail-value.tier {
		text-transform: capitalize;
		background: var(--color-bg-elevated);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.properties-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
	}

	.property-link {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.property-link:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
	}

	.property-link.current {
		border-color: var(--color-fg-muted);
	}

	.property-name {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.property-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.logout-button {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.logout-button:hover:not(:disabled) {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.logout-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
