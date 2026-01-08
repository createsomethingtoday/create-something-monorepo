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
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	
	.nav-container {
		display: flex;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-4);
		max-width: 1400px;
		margin: 0 auto;
		overflow-x: auto;
		scrollbar-width: thin;
	}
	
	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-2);
		text-decoration: none;
		color: var(--color-text-secondary);
		transition: all 0.2s ease;
		min-width: 120px;
		position: relative;
	}
	
	.nav-item:hover {
		background: var(--color-surface-raised);
		color: var(--color-text-primary);
	}
	
	.nav-item:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.nav-item.active {
		color: var(--color-primary);
		background: var(--color-surface-raised);
	}
	
	.nav-item.active::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: var(--space-2);
		right: var(--space-2);
		height: 2px;
		background: var(--color-primary);
		border-radius: var(--radius-full);
	}
	
	.label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		white-space: nowrap;
	}
	
	.description {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}
	
	.nav-item.active .description {
		color: var(--color-text-secondary);
	}
	
	/* Mobile responsive */
	@media (max-width: 640px) {
		.nav-container {
			padding: var(--space-2);
			gap: 0;
		}
		
		.nav-item {
			min-width: 80px;
			padding: var(--space-2) var(--space-3);
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
		background: var(--color-surface);
	}
	
	.nav-container::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: var(--radius-full);
	}
	
	.nav-container::-webkit-scrollbar-thumb:hover {
		background: var(--color-text-tertiary);
	}
</style>
