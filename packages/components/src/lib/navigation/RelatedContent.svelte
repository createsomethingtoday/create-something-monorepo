<script lang="ts">
	/**
	 * RelatedContent Component
	 *
	 * Displays related content across CREATE SOMETHING properties.
	 * Uses the unified search API to find conceptually related items.
	 *
	 * Canon principle: Every piece of content connects to the whole.
	 *
	 * @example
	 * <RelatedContent
	 *   contentId="io:paper:hermeneutic-spiral"
	 *   searchApiUrl="https://unified-search.createsomething.workers.dev"
	 * />
	 */

	import { onMount } from 'svelte';

	// =============================================================================
	// TYPES
	// =============================================================================

	type Property = 'space' | 'io' | 'agency' | 'ltd' | 'lms';
	type ContentType = 'paper' | 'experiment' | 'lesson' | 'principle' | 'pattern' | 'master' | 'service' | 'case-study';
	type RelationshipType = 'concept' | 'cross-reference' | 'semantic' | 'explicit';

	interface RelatedItem {
		id: string;
		title: string;
		property: Property;
		type: ContentType;
		url: string;
		relationshipType: RelationshipType;
	}

	interface RelatedResponse {
		id: string;
		title: string;
		related: RelatedItem[];
		total: number;
	}

	// =============================================================================
	// PROPERTY DISPLAY INFO
	// =============================================================================

	const PROPERTY_INFO: Record<Property, { name: string; verb: string; icon: string }> = {
		space: { name: '.space', verb: 'Explore', icon: '🧪' },
		io: { name: '.io', verb: 'Learn', icon: '📖' },
		agency: { name: '.agency', verb: 'Build', icon: '🔨' },
		ltd: { name: '.ltd', verb: 'Canon', icon: '📜' },
		lms: { name: 'LMS', verb: 'Study', icon: '📚' },
	};

	const TYPE_LABELS: Record<ContentType, string> = {
		paper: 'Paper',
		experiment: 'Experiment',
		lesson: 'Lesson',
		principle: 'Principle',
		pattern: 'Pattern',
		master: 'Master',
		service: 'Service',
		'case-study': 'Case Study',
	};

	const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
		concept: 'Shares concepts',
		'cross-reference': 'References',
		semantic: 'Related topic',
		explicit: 'Direct link',
	};

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props {
		/** ID of the current content item */
		contentId: string;
		/** URL of the unified search API */
		searchApiUrl?: string;
		/** Title for the section */
		title?: string;
		/** Maximum items to show */
		maxItems?: number;
		/** Show relationship type labels */
		showRelationshipType?: boolean;
		/** Exclude current property from results */
		excludeCurrentProperty?: boolean;
		/** Current property (used for exclusion) */
		currentProperty?: Property;
		/** Custom class name */
		class?: string;
	}

	let {
		contentId,
		searchApiUrl = 'https://unified-search.createsomething.workers.dev',
		title = 'Related Across Properties',
		maxItems = 6,
		showRelationshipType = false,
		excludeCurrentProperty = false,
		currentProperty,
		class: className = ''
	}: Props = $props();

	// =============================================================================
	// STATE
	// =============================================================================

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let relatedItems = $state<RelatedItem[]>([]);

	// =============================================================================
	// DERIVED
	// =============================================================================

	// Group by property
	let groupedItems = $derived(() => {
		const groups: Partial<Record<Property, RelatedItem[]>> = {};
		
		let items = relatedItems;
		
		// Filter out current property if requested
		if (excludeCurrentProperty && currentProperty) {
			items = items.filter(item => item.property !== currentProperty);
		}

		// Limit items
		items = items.slice(0, maxItems);

		for (const item of items) {
			if (!groups[item.property]) {
				groups[item.property] = [];
			}
			groups[item.property]!.push(item);
		}

		return groups;
	});

	// Check if we have any items to show
	let hasItems = $derived(() => relatedItems.length > 0);

	// =============================================================================
	// FETCH RELATED CONTENT
	// =============================================================================

	async function fetchRelated() {
		if (!contentId) {
			isLoading = false;
			return;
		}

		isLoading = true;
		error = null;

		try {
			const response = await fetch(
				`${searchApiUrl}/related/${encodeURIComponent(contentId)}`
			);

			if (!response.ok) {
				if (response.status === 404) {
					// Content not indexed yet, not an error
					relatedItems = [];
				} else {
					throw new Error(`Failed to fetch: ${response.status}`);
				}
			} else {
				const data: RelatedResponse = await response.json();
				relatedItems = data.related || [];
			}
		} catch (e) {
			console.error('Failed to fetch related content:', e);
			error = 'Could not load related content';
			relatedItems = [];
		} finally {
			isLoading = false;
		}
	}

	// Fetch on mount and when contentId changes
	onMount(() => {
		fetchRelated();
	});

	$effect(() => {
		contentId; // Track contentId
		fetchRelated();
	});
</script>

{#if hasItems() || isLoading}
	<aside class="related-content {className}" aria-labelledby="related-title">
		<h3 id="related-title" class="related-title">{title}</h3>

		{#if isLoading}
			<div class="related-loading">
				<span class="loading-dot"></span>
				<span class="loading-dot"></span>
				<span class="loading-dot"></span>
			</div>
		{:else if error}
			<p class="related-error">{error}</p>
		{:else}
			<div class="related-groups">
				{@const groups = groupedItems()}
				{@const propertyOrder = ['ltd', 'io', 'space', 'lms', 'agency'] as Property[]}
				
				{#each propertyOrder as property}
					{#if groups[property] && groups[property]!.length > 0}
						{@const propertyInfo = PROPERTY_INFO[property]}
						<div class="related-group">
							<div class="group-header">
								<span class="group-icon">{propertyInfo.icon}</span>
								<span class="group-name">{propertyInfo.name}</span>
							</div>
							<ul class="group-items">
								{#each groups[property]! as item}
									<li class="related-item">
										<a href={item.url} class="item-link">
											<span class="item-title">{item.title}</span>
											<span class="item-meta">
												<span class="item-type">{TYPE_LABELS[item.type]}</span>
												{#if showRelationshipType}
													<span class="item-relationship">{RELATIONSHIP_LABELS[item.relationshipType]}</span>
												{/if}
											</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</aside>
{/if}

<style>
	.related-content {
		padding: var(--space-lg, 2.618rem);
		background: var(--color-bg-surface, #111);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	.related-title {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		margin: 0 0 var(--space-md, 1.618rem) 0;
		display: flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
	}

	.related-title::before {
		content: '↔';
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.related-loading {
		display: flex;
		gap: var(--space-xs, 0.5rem);
		justify-content: center;
		padding: var(--space-md, 1.618rem);
	}

	.loading-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		animation: pulse 1.4s infinite ease-in-out;
	}

	.loading-dot:nth-child(1) { animation-delay: -0.32s; }
	.loading-dot:nth-child(2) { animation-delay: -0.16s; }

	@keyframes pulse {
		0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
		40% { opacity: 1; transform: scale(1); }
	}

	.related-error {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
		text-align: center;
		padding: var(--space-md, 1.618rem);
		margin: 0;
	}

	.related-groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1.618rem);
	}

	.related-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
	}

	.group-header {
		display: flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		font-size: var(--text-caption, 0.75rem);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.group-icon {
		font-size: var(--text-body-sm, 0.875rem);
	}

	.group-name {
		font-weight: 600;
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
	}

	.group-items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
	}

	.related-item {
		margin: 0;
	}

	.item-link {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: var(--space-sm, 1rem);
		background: var(--color-bg-elevated, #0a0a0a);
		border-radius: var(--radius-md, 8px);
		text-decoration: none;
		transition: background var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.item-link:hover {
		background: var(--color-bg-surface-hover, #1a1a1a);
	}

	.item-title {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-primary, #fff);
		line-height: 1.4;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		font-size: var(--text-caption, 0.75rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.item-type {
		background: var(--color-bg-surface, #111);
		padding: 2px 6px;
		border-radius: var(--radius-sm, 6px);
	}

	.item-relationship {
		opacity: 0.7;
	}

	.item-relationship::before {
		content: '•';
		margin-right: var(--space-xs, 0.5rem);
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.loading-dot,
		.item-link {
			animation: none;
			transition: none;
		}
	}
</style>
