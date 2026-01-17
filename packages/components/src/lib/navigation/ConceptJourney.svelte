<script lang="ts">
	/**
	 * ConceptJourney Component
	 *
	 * Visualizes a concept's journey across all CREATE SOMETHING properties.
	 * Shows "the full story" from canon definition through learning, exploring,
	 * studying, and applying.
	 *
	 * Canon principle: Understanding emerges through the hermeneutic spiral.
	 *
	 * @example
	 * <ConceptJourney
	 *   concept="Hermeneutic Circle"
	 *   searchApiUrl="https://unified-search.createsomething.workers.dev"
	 * />
	 */

	import { onMount } from 'svelte';

	// =============================================================================
	// TYPES
	// =============================================================================

	type Property = 'space' | 'io' | 'agency' | 'ltd' | 'lms';
	type ContentType = 'paper' | 'experiment' | 'lesson' | 'principle' | 'pattern' | 'master' | 'service' | 'case-study';

	interface SearchResult {
		id: string;
		title: string;
		description: string;
		property: Property;
		type: ContentType;
		url: string;
		path: string;
		score: number;
		concepts?: string[];
	}

	interface ConceptStory {
		concept: string;
		description: string;
		journey: {
			canon?: SearchResult[];
			learn?: SearchResult[];
			explore?: SearchResult[];
			study?: SearchResult[];
			apply?: SearchResult[];
		};
		totalContent: number;
	}

	// =============================================================================
	// JOURNEY STAGES
	// =============================================================================

	interface JourneyStage {
		key: keyof ConceptStory['journey'];
		property: Property;
		name: string;
		verb: string;
		icon: string;
		description: string;
	}

	const JOURNEY_STAGES: JourneyStage[] = [
		{
			key: 'canon',
			property: 'ltd',
			name: '.ltd',
			verb: 'Understand',
			icon: '📜',
			description: 'The canonical definition and principles',
		},
		{
			key: 'learn',
			property: 'io',
			name: '.io',
			verb: 'Learn',
			icon: '📖',
			description: 'Research papers and documentation',
		},
		{
			key: 'explore',
			property: 'space',
			name: '.space',
			verb: 'Explore',
			icon: '🧪',
			description: 'Interactive experiments and demos',
		},
		{
			key: 'study',
			property: 'lms',
			name: 'LMS',
			verb: 'Study',
			icon: '📚',
			description: 'Structured lessons and exercises',
		},
		{
			key: 'apply',
			property: 'agency',
			name: '.agency',
			verb: 'Apply',
			icon: '🔨',
			description: 'Real-world applications and case studies',
		},
	];

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

	// =============================================================================
	// PROPS
	// =============================================================================

	interface Props {
		/** The concept to visualize */
		concept: string;
		/** URL of the unified search API */
		searchApiUrl?: string;
		/** Maximum items per stage */
		maxItemsPerStage?: number;
		/** Show empty stages */
		showEmptyStages?: boolean;
		/** Custom class name */
		class?: string;
	}

	let {
		concept,
		searchApiUrl = 'https://unified-search.createsomething.workers.dev',
		maxItemsPerStage = 3,
		showEmptyStages = false,
		class: className = ''
	}: Props = $props();

	// =============================================================================
	// STATE
	// =============================================================================

	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let story = $state<ConceptStory | null>(null);

	// =============================================================================
	// DERIVED
	// =============================================================================

	// Stages with content
	let activeStages = $derived(() => {
		if (!story) return [];
		
		return JOURNEY_STAGES.filter(stage => {
			const items = story.journey[stage.key];
			return showEmptyStages || (items && items.length > 0);
		});
	});

	// Total content count
	let totalContent = $derived(() => story?.totalContent || 0);

	// =============================================================================
	// FETCH STORY
	// =============================================================================

	async function fetchStory() {
		if (!concept) {
			isLoading = false;
			return;
		}

		isLoading = true;
		error = null;

		try {
			const response = await fetch(
				`${searchApiUrl}/story/${encodeURIComponent(concept)}`
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status}`);
			}

			story = await response.json();
		} catch (e) {
			console.error('Failed to fetch concept story:', e);
			error = 'Could not load concept journey';
			story = null;
		} finally {
			isLoading = false;
		}
	}

	// Fetch on mount and when concept changes
	onMount(() => {
		fetchStory();
	});

	$effect(() => {
		concept; // Track concept
		fetchStory();
	});
</script>

<div class="concept-journey {className}">
	<!-- Header -->
	<header class="journey-header">
		<h1 class="journey-title">
			<span class="title-label">Journey:</span>
			<span class="title-concept">{concept}</span>
		</h1>
		{#if story}
			<p class="journey-description">{story.description}</p>
			<p class="journey-stats">
				{totalContent()} pieces of content across {activeStages().length} properties
			</p>
		{/if}
	</header>

	<!-- Loading State -->
	{#if isLoading}
		<div class="journey-loading">
			<div class="loading-spinner"></div>
			<p>Tracing the journey...</p>
		</div>
	{:else if error}
		<div class="journey-error">
			<p>{error}</p>
			<button onclick={fetchStory}>Try again</button>
		</div>
	{:else if story}
		<!-- Journey Timeline -->
		<div class="journey-timeline">
			{#each activeStages() as stage, index}
				{@const items = story.journey[stage.key]?.slice(0, maxItemsPerStage) || []}
				{@const hasContent = items.length > 0}
				
				<section class="journey-stage" class:empty={!hasContent}>
					<!-- Stage Header -->
					<div class="stage-header">
						<div class="stage-marker">
							<span class="stage-number">{index + 1}</span>
							<span class="stage-icon">{stage.icon}</span>
						</div>
						<div class="stage-info">
							<h2 class="stage-name">
								<span class="stage-verb">{stage.verb}</span>
								<span class="stage-property">{stage.name}</span>
							</h2>
							<p class="stage-description">{stage.description}</p>
						</div>
					</div>

					<!-- Stage Content -->
					{#if hasContent}
						<ul class="stage-items">
							{#each items as item}
								<li class="stage-item">
									<a href={item.url} class="item-link">
										<span class="item-title">{item.title}</span>
										<span class="item-meta">
											<span class="item-type">{TYPE_LABELS[item.type]}</span>
											{#if item.description}
												<span class="item-description">{item.description}</span>
											{/if}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{:else if showEmptyStages}
						<div class="stage-empty">
							<p>No content yet for this stage</p>
						</div>
					{/if}

					<!-- Connection Line -->
					{#if index < activeStages().length - 1}
						<div class="stage-connector">
							<svg viewBox="0 0 24 48" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 0 L12 48" stroke-dasharray="4 4" />
								<path d="M12 44 L8 40 M12 44 L16 40" />
							</svg>
						</div>
					{/if}
				</section>
			{/each}
		</div>

		<!-- Journey Complete -->
		{#if activeStages().length > 0}
			<footer class="journey-footer">
				<div class="footer-circle">
					<span class="circle-icon">∞</span>
				</div>
				<p class="footer-text">
					The journey continues. Each understanding reveals new questions.
				</p>
			</footer>
		{/if}
	{:else}
		<div class="journey-empty">
			<p>No content found for "{concept}"</p>
		</div>
	{/if}
</div>

<style>
	.concept-journey {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-xl, 4.236rem) var(--space-md, 1.618rem);
	}

	/* Header */
	.journey-header {
		text-align: center;
		margin-bottom: var(--space-xl, 4.236rem);
	}

	.journey-title {
		font-size: var(--text-heading-lg, 2.618rem);
		font-weight: 700;
		color: var(--color-fg-primary, #fff);
		margin: 0 0 var(--space-sm, 1rem) 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
	}

	.title-label {
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 400;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.title-concept {
		background: linear-gradient(135deg, var(--color-accent, #3b82f6), var(--color-accent-secondary, #8b5cf6));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.journey-description {
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
		margin: 0 0 var(--space-sm, 1rem) 0;
	}

	.journey-stats {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: 0;
	}

	/* Loading */
	.journey-loading {
		text-align: center;
		padding: var(--space-xl, 4.236rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		border-top-color: var(--color-accent, #3b82f6);
		border-radius: 50%;
		margin: 0 auto var(--space-md, 1.618rem);
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Error */
	.journey-error {
		text-align: center;
		padding: var(--space-xl, 4.236rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	.journey-error button {
		margin-top: var(--space-md, 1.618rem);
		padding: var(--space-sm, 1rem) var(--space-md, 1.618rem);
		background: var(--color-accent, #3b82f6);
		color: #fff;
		border: none;
		border-radius: var(--radius-md, 8px);
		cursor: pointer;
	}

	/* Timeline */
	.journey-timeline {
		position: relative;
	}

	/* Stage */
	.journey-stage {
		position: relative;
		padding-left: var(--space-xl, 4.236rem);
		padding-bottom: var(--space-lg, 2.618rem);
	}

	.journey-stage.empty {
		opacity: 0.5;
	}

	.stage-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md, 1.618rem);
		margin-bottom: var(--space-md, 1.618rem);
	}

	.stage-marker {
		position: absolute;
		left: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
	}

	.stage-number {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent, #3b82f6);
		color: #fff;
		border-radius: 50%;
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 600;
	}

	.stage-icon {
		font-size: var(--text-body-lg, 1.125rem);
	}

	.stage-info {
		flex: 1;
	}

	.stage-name {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		margin: 0 0 var(--space-xs, 0.5rem) 0;
		display: flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
	}

	.stage-verb {
		color: var(--color-fg-secondary, rgba(255, 255, 255, 0.7));
	}

	.stage-property {
		color: var(--color-accent, #3b82f6);
	}

	.stage-description {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		margin: 0;
	}

	/* Stage Items */
	.stage-items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm, 1rem);
	}

	.stage-item {
		margin: 0;
	}

	.item-link {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs, 0.5rem);
		padding: var(--space-md, 1.618rem);
		background: var(--color-bg-surface, #111);
		border-radius: var(--radius-md, 8px);
		border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		text-decoration: none;
		transition: all var(--duration-micro, 200ms) var(--ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
	}

	.item-link:hover {
		background: var(--color-bg-surface-hover, #1a1a1a);
		border-color: var(--color-border-hover, rgba(255, 255, 255, 0.2));
		transform: translateX(4px);
	}

	.item-title {
		font-size: var(--text-body, 1rem);
		font-weight: 500;
		color: var(--color-fg-primary, #fff);
	}

	.item-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-sm, 1rem);
		font-size: var(--text-caption, 0.75rem);
	}

	.item-type {
		color: var(--color-accent, #3b82f6);
		background: var(--color-bg-elevated, #0a0a0a);
		padding: 2px 8px;
		border-radius: var(--radius-sm, 6px);
	}

	.item-description {
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stage-empty {
		padding: var(--space-md, 1.618rem);
		background: var(--color-bg-surface, #111);
		border-radius: var(--radius-md, 8px);
		border: 1px dashed var(--color-border-default, rgba(255, 255, 255, 0.1));
		text-align: center;
	}

	.stage-empty p {
		margin: 0;
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-size: var(--text-body-sm, 0.875rem);
	}

	/* Connector */
	.stage-connector {
		position: absolute;
		left: 15px;
		bottom: 0;
		width: 24px;
		height: 48px;
		color: var(--color-border-default, rgba(255, 255, 255, 0.1));
	}

	/* Footer */
	.journey-footer {
		text-align: center;
		padding-top: var(--space-xl, 4.236rem);
		border-top: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
		margin-top: var(--space-lg, 2.618rem);
	}

	.footer-circle {
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-md, 1.618rem);
		background: linear-gradient(135deg, var(--color-accent, #3b82f6), var(--color-accent-secondary, #8b5cf6));
		border-radius: 50%;
	}

	.circle-icon {
		font-size: var(--text-heading-md, 1.618rem);
		color: #fff;
	}

	.footer-text {
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
		font-style: italic;
		margin: 0;
	}

	/* Empty State */
	.journey-empty {
		text-align: center;
		padding: var(--space-xl, 4.236rem);
		color: var(--color-fg-muted, rgba(255, 255, 255, 0.46));
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.loading-spinner,
		.item-link {
			animation: none;
			transition: none;
		}
	}

	/* Responsive */
	@media (max-width: 640px) {
		.journey-title {
			font-size: var(--text-heading-md, 1.618rem);
		}

		.journey-stage {
			padding-left: var(--space-lg, 2.618rem);
		}

		.stage-marker {
			transform: scale(0.85);
		}
	}
</style>
