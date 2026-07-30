<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	interface Props {
		user: {
			id?: string;
			email?: string;
			name?: string;
			tier?: string;
			analytics_opt_out?: boolean;
		} | null;
		pageTitle?: string;
		currentProperty: 'space' | 'io' | 'agency' | 'ltd' | 'lms';
		logoutEndpoint?: string;
		visualStyle?: 'default' | 'performance';
		/** Optional analytics slot for Tufte visualizations */
		analytics?: Snippet;
	}

	let {
		user,
		pageTitle,
		currentProperty,
		logoutEndpoint = '/api/auth/logout',
		visualStyle = 'default',
		analytics
	}: Props = $props();
	let isLoggingOut = $state(false);

	const propertyLabels: Record<string, string> = {
		ltd: 'Philosophy',
		io: 'Research',
		space: 'Practice',
		agency: 'Services',
		lms: 'Learning'
	};

	const propertyUrls: Record<string, string> = {
		ltd: 'https://createsomething.ltd/login?redirect=/account',
		io: 'https://createsomething.io/login?redirect=/account',
		space: 'https://createsomething.space/login?redirect=/account',
		agency: 'https://createsomething.agency/login?redirect=/account',
		lms: 'https://learn.createsomething.space/login?redirect=/account'
	};

	async function handleLogout() {
		isLoggingOut = true;
		try {
			const response = await fetch(logoutEndpoint, { method: 'POST' });
			const payload = (await response.json().catch(() => null)) as { logoutUrl?: string } | null;
			window.location.assign(payload?.logoutUrl || '/login');
		} catch {
			goto('/login');
		}
	}
</script>

<svelte:head>
	<title>{pageTitle || 'Account'}</title>
</svelte:head>

<div class="account-container" class:performance={visualStyle === 'performance'}>
	<div class="account-card">
		<div class="account-header">
			{#if visualStyle === 'performance'}
				<div class="account-meta" aria-label="Identity status">
					<span>Identity / Customer workspace</span>
					<span class="account-status"><i aria-hidden="true"></i>Controlled</span>
				</div>
			{/if}
			<div class="account-identity">
				<div class="avatar">
					{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
				</div>
				<div class="account-info">
					{#if visualStyle === 'performance'}
						<p class="account-eyebrow">Authenticated profile</p>
					{/if}
					<h1>{user?.name || (visualStyle === 'performance' ? 'Account profile' : 'Anonymous')}</h1>
					<p class="email">{user?.email}</p>
				</div>
			</div>
		</div>

		<div class="account-sections">
			<section class="account-section">
				<h2>
					{#if visualStyle === 'performance'}<span class="section-code">01</span>{/if}
					Account Details
				</h2>
				<div class="detail-row">
					<span class="detail-label">Email</span>
					<span class="detail-value">{user?.email}</span>
				</div>
				{#if user?.name}
					<div class="detail-row">
						<span class="detail-label">Name</span>
						<span class="detail-value">{user.name}</span>
					</div>
				{/if}
				{#if user?.tier}
					<div class="detail-row">
						<span class="detail-label">Tier</span>
						<span class="detail-value tier">{user.tier}</span>
					</div>
				{/if}
			</section>

			<section class="account-section">
				<h2>
					{#if visualStyle === 'performance'}<span class="section-code">02</span>{/if}
					Connected Properties
				</h2>
				<p class="section-description">
					Your account works across all CREATE SOMETHING properties.
				</p>
				<div class="properties-grid">
					{#each ['ltd', 'io', 'space', 'agency'] as prop}
						<a
							href={propertyUrls[prop]}
							class="property-link"
							class:current={currentProperty === prop}
						>
							<span class="property-name">.{prop}</span>
							<span class="property-label">{propertyLabels[prop]}</span>
							{#if visualStyle === 'performance'}
								<span class="property-state">
									{currentProperty === prop ? 'Current' : 'Connected'}
								</span>
							{/if}
						</a>
					{/each}
				</div>
			</section>

			{#if analytics}
				<section class="account-section account-section--wide">
					<h2>
						{#if visualStyle === 'performance'}<span class="section-code">03</span>{/if}
						Your Activity
					</h2>
					{@render analytics()}
				</section>
			{/if}

			<section class="account-section account-section--session">
				<h2>
					{#if visualStyle === 'performance'}<span class="section-code">{analytics ? '04' : '03'}</span>{/if}
					Session
				</h2>
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
		padding: var(--space-performance-xl) var(--space-performance-lg);
	}

	.account-card {
		width: 100%;
		max-width: 600px;
	}

	.account-header {
		margin-bottom: var(--space-performance-xl);
		padding-bottom: var(--space-performance-lg);
	}

	.account-identity {
		display: flex;
		align-items: center;
		gap: var(--space-performance-lg);
	}

	.avatar {
		width: 72px;
		height: 72px;
		border-radius: var(--radius-performance-scale-full);
		background: var(--color-performance-bg-surface);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-performance-h2);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
	}

	.account-info h1 {
		font-size: var(--text-performance-h2);
		font-weight: 700;
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.email {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-tertiary);
		margin: 0;
	}

	.account-sections {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xl);
	}

	.account-section {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-lg);
	}

	.account-section h2 {
		font-size: var(--text-performance-body-lg);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-md) 0;
	}

	.section-description {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin: 0 0 var(--space-performance-md) 0;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-performance-sm) 0;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
	}

	.detail-value {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-primary);
	}

	.detail-value.tier {
		text-transform: capitalize;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		font-size: var(--text-performance-body-sm);
	}

	.properties-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-performance-sm);
	}

	.property-link {
		display: flex;
		flex-direction: column;
		padding: var(--space-performance-md);
		border-radius: var(--radius-performance-scale-md);
		text-decoration: none;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.property-link:hover {
		border-color: var(--color-performance-border-emphasis);
		background: var(--color-performance-hover);
	}

	.property-link.current {
		border-color: var(--color-performance-fg-muted);
	}

	.property-name {
		font-size: var(--text-performance-body);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.property-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
	}

	.logout-button {
		width: 100%;
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: transparent;
		color: var(--color-performance-fg-secondary);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.logout-button:hover:not(:disabled) {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	.logout-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Agency opt-in: current Performance Lab proof/readiness contract. */
	.account-container.performance {
		width: min(var(--content-width-performance), calc(100% - 2rem));
		min-height: auto;
		margin: 0 auto;
		padding: clamp(2.5rem, 7vw, 6rem) 0 0;
		background: var(--color-performance-paper);
		color: var(--color-performance-ink);
		font-family: var(--font-performance-display);
	}

	.performance .account-card {
		max-width: none;
	}

	.performance .account-header {
		margin: 0 0 clamp(2rem, 5vw, 4.5rem);
		padding: var(--space-performance-md) 0 0;
		border-top: 1px solid var(--color-performance-line);
	}

	.performance .account-meta {
		display: flex;
		justify-content: space-between;
		gap: var(--space-performance-md);
		margin-bottom: clamp(2.5rem, 7vw, 6rem);
		color: var(--color-performance-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.performance .account-status {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-performance-ready);
	}

	.performance .account-status i {
		width: 0.5rem;
		height: 0.5rem;
		background: currentColor;
	}

	.performance .account-identity {
		align-items: flex-end;
		gap: clamp(1rem, 3vw, 2rem);
	}

	.performance .avatar {
		width: clamp(4.5rem, 8vw, 7rem);
		height: clamp(4.5rem, 8vw, 7rem);
		flex: 0 0 auto;
		border: 1px solid var(--color-performance-line-strong);
		border-radius: var(--radius-performance-md);
		background: var(--color-performance-ink);
		color: var(--color-performance-panel);
		font-family: var(--font-performance-mono);
		font-size: clamp(1.75rem, 4vw, 3rem);
		font-weight: 600;
	}

	.performance .account-eyebrow {
		margin: 0 0 var(--space-performance-sm);
		color: var(--color-performance-pressure);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.performance .account-info h1 {
		max-width: 14ch;
		margin: 0;
		color: var(--color-performance-ink);
		font-family: var(--font-performance-display);
		font-size: clamp(2.75rem, 6vw, 5.5rem);
		font-weight: var(--font-performance-bold);
		letter-spacing: -0.055em;
		line-height: 0.94;
	}

	.performance .email {
		margin-top: var(--space-performance-md);
		color: var(--color-performance-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
	}

	.performance .account-sections {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-performance-md);
	}

	.performance .account-section {
		min-width: 0;
		padding: clamp(1.25rem, 3vw, 2rem);
		border: 1px solid var(--color-performance-line);
		border-radius: var(--radius-performance-md);
		background: var(--color-performance-panel);
		box-shadow: var(--shadow-performance-panel);
	}

	.performance .account-section--wide,
	.performance .account-section--session {
		grid-column: 1 / -1;
	}

	.performance .account-section--session {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-performance-lg);
	}

	.performance .account-section h2 {
		display: flex;
		align-items: baseline;
		gap: var(--space-performance-sm);
		margin: 0 0 var(--space-performance-lg);
		color: var(--color-performance-ink);
		font-family: var(--font-performance-display);
		font-size: var(--text-performance-body-lg);
		font-weight: 700;
	}

	.performance .section-code {
		color: var(--color-performance-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		font-weight: 600;
	}

	.performance .section-description {
		margin: calc(-1 * var(--space-performance-sm)) 0 var(--space-performance-lg);
		color: var(--color-performance-muted);
		line-height: 1.6;
	}

	.performance .detail-row {
		gap: var(--space-performance-lg);
		padding: var(--space-performance-md) 0;
		border-top: 1px solid var(--color-performance-line);
	}

	.performance .detail-label,
	.performance .property-label,
	.performance .property-state {
		color: var(--color-performance-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.performance .detail-value,
	.performance .property-name {
		min-width: 0;
		color: var(--color-performance-ink);
		font-size: var(--text-performance-body);
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.performance .detail-value.tier {
		padding: 0;
		border-radius: 0;
	}

	.performance .properties-grid {
		gap: var(--space-performance-sm);
	}

	.performance .property-link {
		position: relative;
		min-height: 7.5rem;
		justify-content: flex-end;
		padding: var(--space-performance-md);
		border: 1px solid var(--color-performance-line);
		border-radius: var(--radius-performance-sm);
		background: var(--color-performance-paper);
	}

	.performance .property-link:hover {
		border-color: var(--color-performance-line-strong);
		background: var(--color-performance-panel);
		transform: translateY(-1px);
	}

	.performance .property-link.current {
		border-color: var(--color-performance-ready);
		box-shadow: inset 4px 0 0 var(--color-performance-ready);
	}

	.performance .property-name {
		font-size: var(--text-performance-body-lg);
	}

	.performance .property-state {
		position: absolute;
		top: var(--space-performance-sm);
		right: var(--space-performance-sm);
	}

	.performance .property-link.current .property-state {
		color: var(--color-performance-ready);
	}

	.performance .logout-button {
		width: auto;
		min-height: 44px;
		padding: 0 1.25rem;
		border: 1px solid var(--color-performance-ink);
		border-radius: var(--radius-performance-sm);
		background: var(--color-performance-ink);
		color: var(--color-performance-panel);
		font-size: var(--text-performance-body-sm);
		font-weight: 700;
	}

	.performance .logout-button:hover:not(:disabled) {
		border-color: var(--color-performance-ink-soft);
		background: var(--color-performance-ink-soft);
	}

	@media (max-width: 760px) {
		.account-container.performance {
			width: min(100% - 1.375rem, var(--content-width-performance));
			padding-top: var(--space-performance-xl);
		}

		.performance .account-meta {
			margin-bottom: var(--space-performance-xl);
		}

		.performance .account-identity {
			align-items: flex-start;
		}

		.performance .account-info h1 {
			font-size: clamp(2.5rem, 12vw, 4rem);
		}

		.performance .account-sections {
			grid-template-columns: 1fr;
		}

		.performance .account-section--wide,
		.performance .account-section--session {
			grid-column: auto;
		}

		.performance .properties-grid {
			grid-template-columns: 1fr;
		}

		.performance .account-section--session {
			align-items: flex-start;
			flex-direction: column;
		}
	}

	@media (max-width: 480px) {
		.performance .account-meta {
			align-items: flex-start;
			flex-direction: column;
		}

		.performance .account-identity {
			align-items: flex-start;
			flex-direction: column;
		}

		.performance .detail-row {
			align-items: flex-start;
			flex-direction: column;
			gap: var(--space-performance-xs);
		}
	}
</style>
