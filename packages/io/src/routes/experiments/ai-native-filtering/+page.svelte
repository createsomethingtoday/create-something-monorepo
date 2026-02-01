<script lang="ts">
	/**
	 * AI-Native Filtering Experiment
	 *
	 * Composes FilterTogglePanel, ProductGrid, and AgentPanel from @create-something/canon
	 * with the filter agent from $lib/agents/filter-agent.
	 */
	import { QuoteBlock, SEO } from '@create-something/canon';
	import {
		FilterTogglePanel,
		ProductGrid,
		applyFilters,
		type FilterState,
		type AgentStep,
		type FilterableProduct
	} from '@create-something/canon/filtering';
	import type { PageData } from './$types';

	export let data: PageData;

	// Get experiment metadata
	const experiment = {
		title: 'AI-Native Filtering',
		description: 'Natural language product filtering powered by Workers AI',
		category: 'research',
		reading_time_minutes: 10,
		ascii_art: data.stats.total > 0 ? `
    ╭──────────────────────────────────────────────────────────────╮
    │                                                              │
    │    USER                    AGENT                   FILTERS   │
    │                                                              │
    │  "Show me chairs      ┌─────────────┐      ┌──────────────┐  │
    │   under $2000"   ───▶ │  Workers AI │ ───▶ │ category:    │  │
    │                       │             │      │   seating    │  │
    │                       │  Reasoning  │      │ price: <2000 │  │
    │                       │  Streaming  │      │ status: any  │  │
    │                       └─────────────┘      └──────────────┘  │
    │                             │                     │          │
    │                             ▼                     ▼          │
    │                       ╔═══════════════════════════════════╗  │
    │                       ║    ${data.stats.total} products in catalog            ║  │
    │                       ╚═══════════════════════════════════╝  │
    │                                                              │
    ╰──────────────────────────────────────────────────────────────╯
         Ask for what you want. Skip the filter taxonomy.
` : null
	};

	// State
	let isLoading = false;
	let displayedProducts: FilterableProduct[] = data.products as FilterableProduct[];
	let filterState: FilterState = {};
	let agentSteps: AgentStep[] = [];
	let explanation = '';
	let showDemo = true;
	let showFilters = false;
	let query = '';

	// Example queries
	const exampleQueries = [
		'Show me chairs under $1,800',
		'I need a table for my living room',
		'What wooden furniture do you have?',
		'Show me everything in stock',
		'Find me something with brass accents'
	];

	// Handle agent query submission
	async function handleAgentQuery(query: string) {
		isLoading = true;
		agentSteps = [];
		explanation = '';

		try {
			const eventSource = new EventSource(`/api/filter/stream?q=${encodeURIComponent(query)}`);

			eventSource.addEventListener('step', (event) => {
				const step = JSON.parse(event.data);
				agentSteps = [...agentSteps, step];
			});

			eventSource.addEventListener('complete', (event) => {
				const result = JSON.parse(event.data);
				displayedProducts = result.products;
				filterState = result.filterState;
				explanation = result.explanation;
				isLoading = false;
				eventSource.close();
			});

			eventSource.addEventListener('error', () => {
				isLoading = false;
				eventSource.close();
			});

			eventSource.onerror = () => {
				isLoading = false;
				eventSource.close();
			};
		} catch (error) {
			console.error('Filter error:', error);
			isLoading = false;
		}
	}

	// Handle manual filter changes
	function handleManualFilter(newState: FilterState) {
		filterState = newState;
		displayedProducts = applyFilters(data.products as FilterableProduct[], newState);
		agentSteps = [];
		explanation = Object.keys(newState).length > 0 
			? `Filtered manually: ${displayedProducts.length} products`
			: '';
	}

	// Clear all
	function clearAll() {
		filterState = {};
		displayedProducts = data.products as FilterableProduct[];
		agentSteps = [];
		explanation = '';
	}
</script>

<SEO
	title="{experiment.title} | CREATE SOMETHING"
	description={experiment.description}
	keywords="AI filtering, natural language, Workers AI, tool calling, product discovery"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'AI-Native Filtering', url: 'https://createsomething.io/experiments/ai-native-filtering' }
	]}
/>

<div class="page-container min-h-screen p-4">
	<div class="max-w-7xl mx-auto space-y-6">
		<!-- Header -->
		<div class="header-section pb-4">
			<div class="text-muted text-caption mb-1">
				<span class="uppercase">{experiment.category}</span>
				<span class="mx-1">/</span>
				<span>{experiment.reading_time_minutes} min</span>
			</div>
			<h1 class="page-title text-2xl mb-2">{experiment.title}</h1>
			<p class="text-secondary text-sm max-w-2xl">{experiment.description}</p>
		</div>

		<!-- ASCII Art -->
		{#if experiment.ascii_art}
			<pre class="ascii-art">{experiment.ascii_art}</pre>
		{/if}

		<!-- Abstract -->
		<section class="abstract-section pl-6 space-y-4">
			<h2 class="section-title">Abstract</h2>
			<p class="text-tertiary leading-relaxed">
				Filter UIs have a problem. They ask users to learn a taxonomy they don't care about.
				Categories, materials, price ranges—each toggle is a decision the user must make
				before they can find what they want.
			</p>
			<p class="text-tertiary leading-relaxed">
				What if users could just say what they're looking for?
			</p>
			<p class="text-tertiary leading-relaxed">
				This experiment tests whether an AI agent can interpret natural language queries
				and apply the right filters. The user describes their intent. The agent does the clicking.
			</p>
		</section>

		<!-- The Problem -->
		<section class="space-y-6">
			<h2 class="section-title">The Problem</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					Traditional filter UIs require users to think in the system's terms. "Seating" instead
					of "chairs." "In stock" instead of "available now." Each filter is a translation from
					what the user wants to what the system understands.
				</p>
				<p>
					This creates friction. Users must learn the vocabulary. They must understand what
					combinations are valid. They must click through options to see what exists.
				</p>
			</div>
			<QuoteBlock
				quote="The best interface is no interface. The next best is one that speaks your language."
				attribution="Golden Krishna, adapted"
			/>
		</section>

		<!-- The Hypothesis -->
		<section class="space-y-6">
			<h2 class="section-title">Hypothesis</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					An agent with access to filter tools can interpret natural language better than
					a human navigating checkboxes. Not because the agent is smarter—but because it
					removes the translation step.
				</p>
				<ul class="hypothesis-list">
					<li><strong>User says:</strong> "Something for my living room under $2,000"</li>
					<li><strong>Agent interprets:</strong> Categories: seating, tables. Max price: $2,000</li>
					<li><strong>User gets:</strong> Relevant results without learning the taxonomy</li>
				</ul>
			</div>
		</section>

		<!-- Live Demo -->
		<section class="demo-section">
			<div class="demo-header">
				<h2 class="section-title">Live Demo</h2>
				<button class="toggle-demo" on:click={() => showDemo = !showDemo}>
					{showDemo ? 'Hide' : 'Show'} Demo
				</button>
			</div>
			<p class="text-tertiary leading-relaxed">
				Try it yourself. Type a query in natural language, or use the traditional toggles.
				Watch how the agent reasons through your request in real-time.
			</p>
		</section>

	{#if showDemo}
		<!-- Interactive Demo - Tufte: Data first, controls recede -->
		<div class="demo-frame">
			<!-- Control Bar: Horizontal, minimal chrome -->
			<div class="control-bar">
				<form class="query-row" on:submit|preventDefault={() => handleAgentQuery(query)}>
					<input
						type="text"
						bind:value={query}
						placeholder="Describe what you're looking for..."
						class="query-input-inline"
						disabled={isLoading}
					/>
					<button type="submit" class="query-submit" disabled={isLoading || !query.trim()}>
						{isLoading ? '...' : 'Filter'}
					</button>
				</form>

				<!-- Active filters as tags (Tufte: show state, not options) -->
				{#if Object.keys(filterState).length > 0}
					<div class="active-tags">
						{#if filterState.categories}
							{#each filterState.categories as cat}
								<span class="filter-tag">{cat}</span>
							{/each}
						{/if}
						{#if filterState.materials}
							{#each filterState.materials.slice(0, 2) as mat}
								<span class="filter-tag">{mat}</span>
							{/each}
							{#if filterState.materials.length > 2}
								<span class="filter-tag">+{filterState.materials.length - 2}</span>
							{/if}
						{/if}
						{#if filterState.priceMax}
							<span class="filter-tag">≤${(filterState.priceMax / 100).toLocaleString()}</span>
						{/if}
						<button type="button" class="clear-link" on:click={clearAll}>clear</button>
					</div>
				{/if}

				<!-- Expand controls -->
				<button type="button" class="expand-toggle" on:click={() => showFilters = !showFilters}>
					{showFilters ? '− filters' : '+ filters'}
				</button>
			</div>

			<!-- Example queries (collapsed feel) -->
			{#if !query && exampleQueries.length > 0}
				<div class="example-row">
					<span class="example-label">try:</span>
					{#each exampleQueries.slice(0, 3) as example}
						<button type="button" class="example-link" on:click={() => { query = example; handleAgentQuery(example); }}>
							{example}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Expanded Manual Filters (hidden by default) -->
			{#if showFilters}
				<div class="filters-expanded">
					<FilterTogglePanel
						{filterState}
						onFilterChange={handleManualFilter}
						showTitle={false}
						collapsible={false}
					/>
				</div>
			{/if}

			<!-- Agent Reasoning (inline, minimal) -->
			{#if agentSteps.length > 0 || explanation}
				<div class="reasoning-inline">
					{#if explanation}
						<span class="reasoning-text">{explanation}</span>
					{:else}
						<span class="reasoning-text thinking">Thinking: {agentSteps[agentSteps.length - 1]?.content || '...'}</span>
					{/if}
				</div>
			{/if}

			<!-- Results: Data-first -->
			<div class="results-area">
				<header class="results-header-tufte">
					<span class="results-title">FNJI Collection</span>
					<span class="results-meta">
						{displayedProducts.length} of {data.stats.total} · ${data.stats.priceRange.min.toLocaleString()}–${data.stats.priceRange.max.toLocaleString()}
					</span>
				</header>

				{#if data.error}
					<div class="empty-notice">
						<p>{data.error}</p>
						<p class="hint">Run migration and seed script to populate.</p>
					</div>
				{:else}
					<ProductGrid
						products={displayedProducts}
						emptyMessage="No products match your criteria."
					>
						<button slot="empty-action" type="button" class="clear-link" on:click={clearAll}>
							Show all products
						</button>
					</ProductGrid>
				{/if}
			</div>
		</div>
	{/if}

		<!-- Implementation -->
		<section class="space-y-6">
			<h2 class="section-title">Implementation</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					The architecture separates concerns into composable packages:
				</p>
			</div>
			<div class="implementation-grid">
				<div class="impl-card">
					<h3>@create-something/canon/filtering</h3>
					<p>
						UI components: FilterTogglePanel, ProductGrid, AgentPanel.
						Headless—they render state but don't know how filtering happens.
					</p>
				</div>
				<div class="impl-card">
					<h3>Filter Agent</h3>
					<p>
						Workers AI with JSON Schema mode. Eight tools: filter_by_material,
						filter_by_category, filter_by_price_range, and more.
					</p>
				</div>
				<div class="impl-card">
					<h3>SSE Streaming</h3>
					<p>
						Agent reasoning streams to the frontend in real-time.
						Users see the agent think through their query.
					</p>
				</div>
			</div>
		</section>

		<!-- Bidirectional Sync -->
		<section class="space-y-6">
			<h2 class="section-title">Bidirectional Sync</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					The agent and manual toggles share a single source of truth. When the agent
					applies filters, the toggles update. When users toggle manually, the agent
					context clears. This creates a unified experience—two input methods, one outcome.
				</p>
			</div>
			<QuoteBlock
				quote="The interface recedes. The user describes intent. The system responds."
				attribution="Heideggerian Zuhandenheit"
			/>
		</section>

		<!-- What We Learned -->
		<section class="space-y-6">
			<h2 class="section-title">What We Learned</h2>
			<ul class="learnings-list">
				<li>
					<strong>Natural language works for structured domains.</strong>
					With only 16 products and 4 categories, the agent rarely misinterprets.
					The taxonomy is small enough to fit in context.
				</li>
				<li>
					<strong>Streaming builds trust.</strong>
					Showing the agent's reasoning helps users understand what's happening.
					Black-box results feel arbitrary; visible thinking feels collaborative.
				</li>
				<li>
					<strong>Manual filters remain useful.</strong>
					Some users want direct control. The bidirectional sync means they can
					start with natural language and refine with toggles.
				</li>
			</ul>
		</section>

		<!-- Limitations -->
		<section class="space-y-6">
			<h2 class="section-title">Limitations</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					This experiment has constraints worth noting:
				</p>
				<ul class="limitations-list">
					<li>Small catalog (16 products) — larger catalogs may need vector search</li>
					<li>Workers AI latency — streaming helps, but there's still a delay</li>
					<li>English only — natural language parsing assumes English input</li>
					<li>Structured attributes — "find something that matches my style" won't work yet</li>
				</ul>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="section-divider pt-8 space-y-6">
			<h2 class="section-title">Conclusion</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					AI-native filtering isn't about replacing UI controls. It's about giving users
					a choice: describe what you want, or click through options. Both paths lead
					to the same result. The system adapts to the user, not the other way around.
				</p>
				<p>
					For small, structured catalogs, natural language filtering works well. The
					agent translates intent into action. The toggles stay in sync. The user
					finds what they're looking for without learning a taxonomy.
				</p>
			</div>
		</section>
	</div>
</div>

<style>
	@import '$lib/styles/visualization-experiment.css';

	/* ASCII Art */
	.ascii-art {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-caption);
		line-height: 1.3;
		background: var(--color-bg-inverse);
		color: var(--color-fg-inverse);
		padding: var(--space-lg);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: var(--space-lg) 0;
	}

	/* Demo Section */
	.demo-section {
		margin-bottom: var(--space-xl);
	}

	.demo-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.demo-header h2 {
		margin: 0;
	}

	.toggle-demo {
		font-size: var(--text-body-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.toggle-demo:hover {
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	/* Demo Frame - Tufte: minimal chrome, data first */
	.demo-frame {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-sm);
		margin: var(--space-sm) 0;
	}

	/* Control Bar - horizontal, compact */
	.control-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.query-row {
		display: flex;
		flex: 1;
		min-width: 200px;
		gap: 2px;
	}

	.query-input-inline {
		flex: 1;
		padding: var(--space-xs) var(--space-sm);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xs) 0 0 var(--radius-xs);
		font-size: 12px;
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-fast) var(--ease-out);
	}

	.query-input-inline::placeholder {
		color: var(--color-fg-muted);
	}

	.query-input-inline:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.query-submit {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border: none;
		border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-fast) var(--ease-out);
	}

	.query-submit:hover:not(:disabled) {
		opacity: 0.9;
	}

	.query-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Active filter tags */
	.active-tags {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.filter-tag {
		font-size: 10px;
		padding: 1px 6px;
		background: var(--color-fg-tertiary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-xs);
	}

	.clear-link {
		font-size: 10px;
		color: var(--color-fg-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--color-border-default);
		transition: color var(--duration-fast) var(--ease-out);
	}

	.clear-link:hover {
		color: var(--color-fg-tertiary);
	}

	.expand-toggle {
		font-size: 10px;
		padding: 2px 6px;
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xs);
		color: var(--color-fg-muted);
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--duration-fast) var(--ease-out);
	}

	.expand-toggle:hover {
		border-color: var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	/* Example queries - minimal */
	.example-row {
		display: flex;
		gap: var(--space-xs);
		align-items: center;
		margin-top: var(--space-xs);
		padding-left: 2px;
	}

	.example-label {
		font-size: 10px;
		color: var(--color-fg-muted);
	}

	.example-link {
		font-size: 10px;
		color: var(--color-fg-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--color-border-default);
		transition: color var(--duration-fast) var(--ease-out);
	}

	.example-link:hover {
		color: var(--color-fg-tertiary);
	}

	/* Expanded filters */
	.filters-expanded {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	/* Reasoning inline */
	.reasoning-inline {
		margin-top: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-xs);
	}

	.reasoning-text {
		font-size: 11px;
		color: var(--color-fg-secondary);
	}

	.reasoning-text.thinking {
		color: var(--color-fg-muted);
		font-style: italic;
	}

	/* Results area */
	.results-area {
		margin-top: var(--space-sm);
	}

	.results-header-tufte {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-xs);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-border-default);
	}

	.results-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.results-meta {
		font-size: 10px;
		color: var(--color-fg-muted);
	}

	.empty-notice {
		text-align: center;
		padding: var(--space-md);
		color: var(--color-fg-muted);
		font-size: 12px;
	}

	.empty-notice .hint {
		font-size: 10px;
		margin-top: var(--space-xs);
	}

	/* Implementation Grid */
	.implementation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}

	.impl-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: var(--space-sm) var(--space-md);
	}

	.impl-card h3 {
		font-size: 11px;
		font-weight: 600;
		margin: 0 0 var(--space-xs);
		font-family: var(--font-mono, monospace);
		color: var(--color-fg-secondary);
	}

	.impl-card p {
		font-size: 11px;
		margin: 0;
		color: var(--color-fg-muted);
		line-height: 1.4;
	}

	/* Lists */
	.hypothesis-list,
	.learnings-list,
	.limitations-list {
		margin: var(--space-sm) 0;
		padding-left: var(--space-md);
	}

	.hypothesis-list li,
	.learnings-list li,
	.limitations-list li {
		font-size: var(--text-body-sm);
		line-height: 1.5;
		margin-bottom: var(--space-xs);
		max-width: 720px;
		color: var(--color-fg-tertiary);
	}

	/* Action Button */
	.action-btn-secondary {
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		color: var(--color-fg-muted);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.action-btn-secondary:hover {
		border-color: var(--color-fg-primary);
		color: var(--color-fg-primary);
	}

	/* Utility Classes */
	.p-8 {
		padding: var(--space-xl);
	}

	.mb-4 {
		margin-bottom: var(--space-md);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.ascii-art {
			font-size: 0.4rem;
		}

		.control-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.query-row {
			min-width: 100%;
		}

		.active-tags {
			flex-wrap: wrap;
		}

		.expand-toggle {
			align-self: flex-start;
		}

		.example-row {
			flex-wrap: wrap;
		}
	}
</style>
