<script lang="ts">
	/**
	 * Breadcrumbs Component
	 *
	 * Hierarchical navigation showing the current location within a site.
	 * Uses proper semantic markup with nav and structured data support.
	 *
	 * Canon: The breadcrumbs guide; orientation follows.
	 */

	interface BreadcrumbItem {
		/** Display label */
		label: string;
		/** Link href (omit for current page) */
		href?: string;
	}

	interface Props {
		/** Breadcrumb items in order */
		items: BreadcrumbItem[];
		/** Separator character or element */
		separator?: string;
		/** Accessible label for navigation */
		ariaLabel?: string;
		/** Whether to show home icon for first item */
		showHomeIcon?: boolean;
	}

	let {
		items,
		separator = '/',
		ariaLabel = 'Breadcrumb',
		showHomeIcon = false
	}: Props = $props();
</script>

<nav class="breadcrumbs" aria-label={ariaLabel}>
	<ol class="breadcrumbs-list">
		{#each items as item, index}
			<li class="breadcrumbs-item">
				{#if item.href}
					<a href={item.href} class="breadcrumbs-link">
						{#if showHomeIcon && index === 0}
							<svg class="breadcrumbs-home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
							<span class="sr-only">{item.label}</span>
						{:else}
							{item.label}
						{/if}
					</a>
				{:else}
					<span class="breadcrumbs-current" aria-current="page">
						{item.label}
					</span>
				{/if}

				{#if index < items.length - 1}
					<span class="breadcrumbs-separator" aria-hidden="true">
						{separator}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.breadcrumbs {
		font-size: var(--text-body-sm);
	}

	.breadcrumbs-list {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.breadcrumbs-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.breadcrumbs-link {
		color: var(--color-fg-muted);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.breadcrumbs-link:hover {
		color: var(--color-fg-primary);
	}

	.breadcrumbs-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.breadcrumbs-home-icon {
		width: 16px;
		height: 16px;
	}

	.breadcrumbs-current {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.breadcrumbs-separator {
		color: var(--color-fg-subtle);
		user-select: none;
	}

	/* Screen reader only */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
