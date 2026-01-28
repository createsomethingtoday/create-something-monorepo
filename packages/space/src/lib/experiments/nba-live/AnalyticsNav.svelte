<script lang="ts">
	/**
	 * Analytics Navigation Menu
	 * 
	 * Tab-based navigation for NBA analytics features.
	 * Preserves game selector state across views.
	 */
	
	import { page } from '$app/stores';
	import { TrendingUp, Zap, Clock, Activity } from 'lucide-svelte';
	
	interface NavItem {
		href: string;
		label: string;
		icon: any;
		description: string;
	}
	
	const navItems: NavItem[] = [
		{
			href: '/experiments/nba-live',
			label: 'Overview',
			icon: Activity,
			description: 'Game selector and analysis'
		},
		{
			href: '/experiments/nba-live/clutch',
			label: 'Clutch',
			icon: Zap,
			description: 'Pressure performers'
		},
		{
			href: '/experiments/nba-live/pace',
			label: 'Pace',
			icon: TrendingUp,
			description: 'Tempo analysis'
		},
		{
			href: '/experiments/nba-live/overtime',
			label: 'Overtime',
			icon: Clock,
			description: 'Fatigue patterns'
		}
	];
	
	// Determine active tab
	const isActive = (href: string) => {
		return $page.url.pathname === href;
	};
</script>

<nav class="analytics-nav" aria-label="Analytics navigation">
	<div class="nav-container">
		{#each navItems as item}
			<a
				href={item.href}
				class="nav-item"
				class:active={isActive(item.href)}
				aria-current={isActive(item.href) ? 'page' : undefined}
			>
				<svelte:component this={item.icon} size={18} />
				<span class="label">{item.label}</span>
				<span class="description">{item.description}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	.analytics-nav {
		width: 100%;
		border-bottom: 1px solid var(--color-border-default);
		background: var(--color-bg-surface);
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
	}

	.nav-container {
		display: flex;
		gap: var(--space-xs);
		padding: var(--space-md) var(--space-xl);
		max-width: 1400px;
		margin: 0 auto;
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md) var(--space-xl);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--color-fg-secondary);
		transition: all var(--duration-micro) var(--ease-standard);
		min-width: 120px;
		position: relative;
	}

	.nav-item:hover {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.nav-item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.nav-item.active {
		color: var(--color-data-1);
		background: var(--color-bg-elevated);
	}

	.nav-item.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: var(--space-md);
		right: var(--space-md);
		height: 2px;
		background: var(--color-data-1);
		border-radius: var(--radius-full);
	}

	.label {
		font-size: var(--text-body-sm);
		font-weight: 600;
		white-space: nowrap;
	}

	.description {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		white-space: nowrap;
	}

	.nav-item.active .description {
		color: var(--color-fg-secondary);
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.nav-container {
			padding: var(--space-md);
			gap: 0;
		}

		.nav-item {
			min-width: 80px;
			padding: var(--space-sm) var(--space-md);
		}

		.description {
			display: none;
		}
	}

	/* Scrollbar styling */
	.nav-container::-webkit-scrollbar {
		height: 4px;
	}

	.nav-container::-webkit-scrollbar-track {
		background: var(--color-bg-surface);
	}

	.nav-container::-webkit-scrollbar-thumb {
		background: var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.nav-container::-webkit-scrollbar-thumb:hover {
		background: var(--color-fg-tertiary);
	}
</style>
