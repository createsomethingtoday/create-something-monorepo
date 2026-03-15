<script lang="ts">
	/**
	 * Pagination Component
	 *
	 * Page navigation with smart page number display.
	 * Shows ellipsis for large page counts, always shows first/last pages.
	 *
	 * Canon: The pagination navigates; pages await.
	 */

	interface Props {
		/** Current page (1-indexed) */
		page?: number;
		/** Total number of pages */
		totalPages: number;
		/** Number of sibling pages to show on each side of current */
		siblingCount?: number;
		/** Whether to show first/last page buttons */
		showFirstLast?: boolean;
		/** Whether to show previous/next buttons */
		showPrevNext?: boolean;
		/** Called when page changes */
		onchange?: (page: number) => void;
		/** Size variant */
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		page = $bindable(1),
		totalPages,
		siblingCount = 1,
		showFirstLast = true,
		showPrevNext = true,
		onchange,
		size = 'md'
	}: Props = $props();

	// Generate page numbers to display
	const pages = $derived.by(() => {
		const result: (number | 'ellipsis')[] = [];

		// Always show first page
		result.push(1);

		// Calculate range around current page
		const leftSibling = Math.max(2, page - siblingCount);
		const rightSibling = Math.min(totalPages - 1, page + siblingCount);

		// Add left ellipsis if needed
		if (leftSibling > 2) {
			result.push('ellipsis');
		}

		// Add pages in range
		for (let i = leftSibling; i <= rightSibling; i++) {
			if (i !== 1 && i !== totalPages) {
				result.push(i);
			}
		}

		// Add right ellipsis if needed
		if (rightSibling < totalPages - 1) {
			result.push('ellipsis');
		}

		// Always show last page (if more than 1 page)
		if (totalPages > 1) {
			result.push(totalPages);
		}

		return result;
	});

	function goToPage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
			page = newPage;
			onchange?.(newPage);
		}
	}
</script>

<nav class="pagination pagination-{size}" aria-label="Pagination">
	{#if showFirstLast}
		<button
			type="button"
			class="pagination-button pagination-first"
			onclick={() => goToPage(1)}
			disabled={page === 1}
			aria-label="First page"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polyline points="11 17 6 12 11 7" />
				<polyline points="18 17 13 12 18 7" />
			</svg>
		</button>
	{/if}

	{#if showPrevNext}
		<button
			type="button"
			class="pagination-button pagination-prev"
			onclick={() => goToPage(page - 1)}
			disabled={page === 1}
			aria-label="Previous page"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polyline points="15 18 9 12 15 6" />
			</svg>
		</button>
	{/if}

	<div class="pagination-pages">
		{#each pages as pageItem, index}
			{#if pageItem === 'ellipsis'}
				<span class="pagination-ellipsis" aria-hidden="true">...</span>
			{:else}
				<button
					type="button"
					class="pagination-page"
					class:active={pageItem === page}
					onclick={() => goToPage(pageItem)}
					aria-current={pageItem === page ? 'page' : undefined}
					aria-label="Page {pageItem}"
				>
					{pageItem}
				</button>
			{/if}
		{/each}
	</div>

	{#if showPrevNext}
		<button
			type="button"
			class="pagination-button pagination-next"
			onclick={() => goToPage(page + 1)}
			disabled={page === totalPages}
			aria-label="Next page"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polyline points="9 18 15 12 9 6" />
			</svg>
		</button>
	{/if}

	{#if showFirstLast}
		<button
			type="button"
			class="pagination-button pagination-last"
			onclick={() => goToPage(totalPages)}
			disabled={page === totalPages}
			aria-label="Last page"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polyline points="13 17 18 12 13 7" />
				<polyline points="6 17 11 12 6 7" />
			</svg>
		</button>
	{/if}
</nav>

<style>
	.pagination {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.pagination-pages {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	/* Base button styles */
	.pagination-button,
	.pagination-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		height: 36px;
		padding: 0 var(--space-xs);
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		color: var(--color-fg-muted);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.pagination-button:hover:not(:disabled),
	.pagination-page:hover:not(:disabled) {
		background: var(--color-hover);
		color: var(--color-fg-primary);
	}

	.pagination-button:focus-visible,
	.pagination-page:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	.pagination-button:disabled,
	.pagination-page:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Active page */
	.pagination-page.active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.pagination-page.active:hover {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	/* Arrow buttons */
	.pagination-button svg {
		width: 16px;
		height: 16px;
	}

	/* Ellipsis */
	.pagination-ellipsis {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		height: 36px;
		color: var(--color-fg-muted);
		font-size: var(--text-body);
		user-select: none;
	}

	/* Size variants */
	.pagination-sm .pagination-button,
	.pagination-sm .pagination-page {
		min-width: 28px;
		height: 28px;
		font-size: var(--text-body-sm);
	}

	.pagination-sm .pagination-button svg {
		width: 14px;
		height: 14px;
	}

	.pagination-sm .pagination-ellipsis {
		min-width: 28px;
		height: 28px;
		font-size: var(--text-body-sm);
	}

	.pagination-lg .pagination-button,
	.pagination-lg .pagination-page {
		min-width: 44px;
		height: 44px;
		font-size: var(--text-body-lg);
	}

	.pagination-lg .pagination-button svg {
		width: 20px;
		height: 20px;
	}

	.pagination-lg .pagination-ellipsis {
		min-width: 44px;
		height: 44px;
		font-size: var(--text-body-lg);
	}
</style>
