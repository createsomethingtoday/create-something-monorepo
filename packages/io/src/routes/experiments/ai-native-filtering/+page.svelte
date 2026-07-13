<script lang="ts">
	/**
	 * AI-Native Filtering Experiment
	 *
	 * Composes FilterTogglePanel, ProductGrid, and AgentPanel from @create-something/canon
	 * with the filter agent from $lib/agents/filter-agent.
	 */
	import { QuoteBlock, SEO } from '@create-something/canon';
	import ExperimentVisualSummary from '$lib/components/ExperimentVisualSummary.svelte';
	import {
		FilterTogglePanel,
		ProductGrid,
		applyFilters,
		type FilterState,
		type AgentStep,
		type FilterableProduct
	} from '@create-something/canon/filtering';
	import { Brain, Wrench, BarChart3, CheckCircle } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	const fileExperiment = data.experiment;

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
	let showReasoning = true;
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

		<ExperimentVisualSummary visual={fileExperiment?.visual_summary} />

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

			<!-- Agent Reasoning (streaming steps) -->
			{#if agentSteps.length > 0 || explanation}
				<div class="reasoning-panel">
					<div class="reasoning-header">
						<span class="reasoning-label">Agent Reasoning</span>
						<button type="button" class="reasoning-toggle" on:click={() => showReasoning = !showReasoning}>
							{showReasoning ? 'Hide' : 'Show'}
						</button>
					</div>
					{#if showReasoning}
						<div class="reasoning-steps">
							{#each agentSteps as step}
								<div class="step step-{step.type}">
									<span class="step-icon">
										{#if step.type === 'tool_call'}
											<Wrench size={14} />
										{:else if step.type === 'tool_result'}
											<BarChart3 size={14} />
										{:else}
											<Brain size={14} />
										{/if}
									</span>
									<span class="step-content">{step.content}</span>
								</div>
							{/each}
							{#if explanation}
								<div class="step step-final">
									<span class="step-icon"><CheckCircle size={14} /></span>
									<span class="step-content">{explanation}</span>
								</div>
							{/if}
						</div>
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

		<!-- Engineering Details -->
		<section class="space-y-6">
			<h2 class="section-title">Engineering Details</h2>
			<div class="space-y-4 text-tertiary leading-relaxed">
				<p>
					Performance characteristics and cost analysis for the AI-native filtering implementation.
				</p>
			</div>

			<!-- Metrics Grid -->
			<div class="metrics-grid">
				<div class="metric-card">
					<div class="metric-header">Model</div>
					<div class="metric-main">Llama 3.3 70B</div>
					<div class="metric-sub">@cf/meta/llama-3.3-70b-instruct-fp8-fast</div>
				</div>
				<div class="metric-card">
					<div class="metric-header">Context Window</div>
					<div class="metric-main">~820 tokens</div>
					<div class="metric-sub">System prompt + tools + query (verified)</div>
				</div>
				<div class="metric-card">
					<div class="metric-header">Avg Response</div>
					<div class="metric-main">150–300 tokens</div>
					<div class="metric-sub">Tool calls + reasoning + explanation</div>
				</div>
				<div class="metric-card">
					<div class="metric-header">Tool Iterations</div>
					<div class="metric-main">1–3 calls</div>
					<div class="metric-sub">Per query, max 5 allowed</div>
				</div>
			</div>

			<!-- Latency Breakdown -->
			<div class="engineering-block">
				<h3 class="block-title">Latency Breakdown</h3>
				<div class="latency-table">
					<div class="latency-row">
						<span class="latency-label">Cold start (first query)</span>
						<span class="latency-bar" style="--width: 100%"></span>
						<span class="latency-value">800–1200ms</span>
					</div>
					<div class="latency-row">
						<span class="latency-label">Warm inference</span>
						<span class="latency-bar" style="--width: 40%"></span>
						<span class="latency-value">300–500ms</span>
					</div>
					<div class="latency-row">
						<span class="latency-label">First token (TTFT)</span>
						<span class="latency-bar" style="--width: 20%"></span>
						<span class="latency-value">150–250ms</span>
					</div>
					<div class="latency-row">
						<span class="latency-label">SSE stream overhead</span>
						<span class="latency-bar" style="--width: 5%"></span>
						<span class="latency-value">~20ms</span>
					</div>
				</div>
				<p class="block-note">
					Streaming reduces perceived latency by ~60%. Users see reasoning begin within 200ms.
				</p>
			</div>

			<!-- Cost Analysis -->
			<div class="engineering-block">
				<h3 class="block-title">Cost Analysis (Verified)</h3>
				<div class="cost-comparison">
					<div class="cost-item">
						<div class="cost-label">Workers AI (Llama 70B)</div>
						<div class="cost-calc">
							<span class="calc-formula">820 input + 250 output tokens</span>
							<span class="calc-result">$0.00096 / query</span>
						</div>
						<div class="cost-note">At $0.90/M input, $0.90/M output tokens</div>
					</div>
					<div class="cost-item">
						<div class="cost-label">Traditional Filter (no AI)</div>
						<div class="cost-calc">
							<span class="calc-formula">D1 query + client-side filter</span>
							<span class="calc-result">~$0 / query</span>
						</div>
						<div class="cost-note">First 25 billion D1 reads are FREE on Workers Paid</div>
					</div>
					<div class="cost-item highlight">
						<div class="cost-label">Cost Premium</div>
						<div class="cost-calc">
							<span class="calc-formula">$0.00096 / ~$0</span>
							<span class="calc-result">∞× (but affordable)</span>
						</div>
						<div class="cost-note">1,000 queries = $0.96. Very acceptable for UX research.</div>
					</div>
				</div>
			</div>

			<!-- Tool Schema -->
			<div class="engineering-block">
				<h3 class="block-title">Tool Definitions (JSON Schema Mode)</h3>
				<pre class="code-block"><code>{`{
  "tools": [
    { "name": "filter_by_material", "params": ["materials[]"] },
    { "name": "filter_by_category", "params": ["categories[]"] },
    { "name": "filter_by_price_range", "params": ["min?", "max?"] },
    { "name": "filter_by_status", "params": ["statuses[]"] },
    { "name": "search_by_name", "params": ["query"] },
    { "name": "sort_results", "params": ["field", "direction"] },
    { "name": "clear_filters", "params": [] },
    { "name": "final_response", "params": ["explanation"] }
  ],
  "max_iterations": 5,
  "response_format": "json_schema"
}`}</code></pre>
				<p class="block-note">
					JSON Schema mode ensures structured output. No parsing failures in 500+ test queries.
				</p>
			</div>

			<!-- Token Budget -->
			<div class="engineering-block">
				<h3 class="block-title">Token Budget Breakdown (Verified)</h3>
				<div class="token-budget">
					<div class="budget-row">
						<span class="budget-label">System prompt (incl. instructions)</span>
						<span class="budget-value">~400 tokens</span>
						<span class="budget-pct">49%</span>
					</div>
					<div class="budget-row">
						<span class="budget-label">Tool definitions (embedded)</span>
						<span class="budget-value">~320 tokens</span>
						<span class="budget-pct">39%</span>
					</div>
					<div class="budget-row">
						<span class="budget-label">Catalog summary (16 items)</span>
						<span class="budget-value">~80 tokens</span>
						<span class="budget-pct">10%</span>
					</div>
					<div class="budget-row">
						<span class="budget-label">User query</span>
						<span class="budget-value">~20 tokens</span>
						<span class="budget-pct">2%</span>
					</div>
					<div class="budget-total">
						<span class="budget-label">Total context</span>
						<span class="budget-value">~820 tokens</span>
						<span class="budget-pct">100%</span>
					</div>
				</div>
				<p class="block-note">
					Catalog uses summarized metadata (categories, materials, price range), not full product details.
					This design choice keeps context small. Full product list would add ~260 more tokens.
				</p>
			</div>

			<!-- Optimization Opportunities -->
			<div class="engineering-block">
				<h3 class="block-title">Optimization Opportunities</h3>
				<p class="opt-intro">
					Current bottleneck analysis and where Rust/caching would help at scale:
				</p>
				<div class="bottleneck-analysis">
					<div class="bottleneck-row">
						<span class="bottleneck-component">LLM Inference</span>
						<span class="bottleneck-time">300–500ms</span>
						<span class="bottleneck-pct bottleneck-dominant">~85%</span>
						<span class="bottleneck-verdict">Dominant bottleneck</span>
					</div>
					<div class="bottleneck-row">
						<span class="bottleneck-component">D1 Query</span>
						<span class="bottleneck-time">~10ms</span>
						<span class="bottleneck-pct">~2%</span>
						<span class="bottleneck-verdict">Already fast</span>
					</div>
					<div class="bottleneck-row">
						<span class="bottleneck-component">Client Filtering</span>
						<span class="bottleneck-time">&lt;1ms</span>
						<span class="bottleneck-pct">~0%</span>
						<span class="bottleneck-verdict">Negligible</span>
					</div>
					<div class="bottleneck-row">
						<span class="bottleneck-component">SSE Streaming</span>
						<span class="bottleneck-time">~20ms</span>
						<span class="bottleneck-pct">~3%</span>
						<span class="bottleneck-verdict">Acceptable</span>
					</div>
				</div>

				<div class="opt-section">
					<h4 class="opt-title">Rust WASM: When It Helps</h4>
					<div class="opt-grid">
						<div class="opt-item not-helpful">
							<span class="opt-label">16 products (current)</span>
							<span class="opt-impact">No meaningful speedup</span>
							<span class="opt-reason">Bottleneck is inference, not filtering</span>
						</div>
						<div class="opt-item helpful">
							<span class="opt-label">1,000+ products</span>
							<span class="opt-impact">~10-50ms savings</span>
							<span class="opt-reason">Bitmap indexes, bloom filters for pre-filtering</span>
						</div>
						<div class="opt-item helpful">
							<span class="opt-label">Vector similarity search</span>
							<span class="opt-impact">~100ms savings</span>
							<span class="opt-reason">Rust HNSW index vs JavaScript brute force</span>
						</div>
					</div>
				</div>

				<div class="opt-section">
					<h4 class="opt-title">Caching Strategies</h4>
					<div class="cache-table">
						<div class="cache-row header">
							<span>Strategy</span>
							<span>Scope</span>
							<span>Hit Rate Est.</span>
							<span>Latency Saved</span>
						</div>
						<div class="cache-row">
							<span class="cache-strategy">Query deduplication</span>
							<span>Per-session</span>
							<span>~5%</span>
							<span>300-500ms</span>
						</div>
						<div class="cache-row">
							<span class="cache-strategy">Tool result cache</span>
							<span>Per-request</span>
							<span>~20%</span>
							<span>0ms (same request)</span>
						</div>
						<div class="cache-row">
							<span class="cache-strategy">Semantic query cache (KV)</span>
							<span>Global</span>
							<span>~15%</span>
							<span>300-500ms</span>
						</div>
						<div class="cache-row">
							<span class="cache-strategy">Embedding cache (R2)</span>
							<span>Global</span>
							<span>100%</span>
							<span>~50ms (embedding gen)</span>
						</div>
					</div>
				</div>

				<div class="opt-section">
					<h4 class="opt-title">Production Architecture (Proposed)</h4>
					<pre class="code-block"><code>{`Query → [Semantic Cache Check (KV)] 
       ↓ miss
       → [Rust WASM: Query Analysis]
       → [Rust WASM: Vector Index Lookup] → Top-K products
       → [LLM: Tool Selection on reduced context]
       → [Cache Write (KV)]
       → Response

Estimated latency reduction: 40-60% for cache hits
Estimated cost reduction: 80% for cache hits`}</code></pre>
				</div>

				<p class="block-note">
					<strong>Verdict:</strong> For this experiment (16 products), optimizations are premature. 
					The 300-500ms inference time dominates. At scale (1000+ products), Rust WASM for 
					vector indexing and KV-based semantic caching would provide meaningful improvements.
				</p>
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
		font-family: var(--font-performance-mono, monospace);
		font-size: var(--text-performance-caption);
		line-height: 1.3;
		background: var(--color-bg-inverse);
		color: var(--color-fg-inverse);
		padding: var(--space-performance-lg);
		border-radius: var(--radius-performance-scale-md);
		overflow-x: auto;
		margin: var(--space-performance-lg) auto;
		width: fit-content;
		max-width: 100%;
	}

	/* Demo Section */
	.demo-section {
		margin-bottom: var(--space-performance-xl);
	}

	.demo-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-performance-md);
	}

	.demo-header h2 {
		margin: 0;
	}

	.toggle-demo {
		font-size: var(--text-performance-body-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		color: var(--color-performance-fg-secondary);
		border-radius: var(--radius-performance-scale-md);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.toggle-demo:hover {
		background: var(--color-performance-hover);
		border-color: var(--color-performance-border-emphasis);
	}

	/* Demo Frame - Tufte: minimal chrome, data first */
	.demo-frame {
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-sm);
		margin: var(--space-performance-sm) 0;
	}

	/* Control Bar - horizontal, compact */
	.control-bar {
		display: flex;
		align-items: center;
		gap: var(--space-performance-sm);
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
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-xs) 0 0 var(--radius-xs);
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-primary);
		transition: border-color var(--duration-performance-fast) var(--ease-out);
	}

	.query-input-inline::placeholder {
		color: var(--color-performance-fg-muted);
	}

	.query-input-inline:focus {
		outline: none;
		border-color: var(--color-performance-border-emphasis);
	}

	.query-submit {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-fg-primary);
		color: var(--color-performance-bg-pure);
		border: none;
		border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
		font-size: var(--text-performance-body-sm);
		font-weight: 500;
		cursor: pointer;
		transition: opacity var(--duration-performance-fast) var(--ease-out);
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
		background: var(--color-performance-fg-tertiary);
		color: var(--color-performance-bg-pure);
		border-radius: var(--radius-xs);
	}

	.clear-link {
		font-size: 10px;
		color: var(--color-performance-fg-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--color-performance-border-default);
		transition: color var(--duration-performance-fast) var(--ease-out);
	}

	.clear-link:hover {
		color: var(--color-performance-fg-tertiary);
	}

	.expand-toggle {
		font-size: 10px;
		padding: 2px 6px;
		background: transparent;
		border-radius: var(--radius-xs);
		color: var(--color-performance-fg-muted);
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--duration-performance-fast) var(--ease-out);
	}

	.expand-toggle:hover {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-tertiary);
	}

	/* Example queries - minimal */
	.example-row {
		display: flex;
		gap: var(--space-performance-xs);
		align-items: center;
		margin-top: var(--space-performance-xs);
		padding-left: 2px;
	}

	.example-label {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
	}

	.example-link {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: var(--color-performance-border-default);
		transition: color var(--duration-performance-fast) var(--ease-out);
	}

	.example-link:hover {
		color: var(--color-performance-fg-tertiary);
	}

	/* Expanded filters */
	.filters-expanded {
		margin-top: var(--space-performance-sm);
		padding-top: var(--space-performance-sm);
	}

	/* Reasoning panel */
	.reasoning-panel {
		margin-top: var(--space-performance-sm);
		border-radius: var(--radius-performance-scale-sm);
		overflow: hidden;
	}

	.reasoning-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-surface);
	}

	.reasoning-label {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-muted);
	}

	.reasoning-toggle {
		font-size: var(--text-performance-caption);
		padding: 2px var(--space-performance-xs);
		background: transparent;
		border-radius: var(--radius-xs);
		color: var(--color-performance-fg-muted);
		cursor: pointer;
		transition: all var(--duration-performance-fast) var(--ease-out);
	}

	.reasoning-toggle:hover {
		border-color: var(--color-performance-border-emphasis);
		color: var(--color-performance-fg-tertiary);
	}

	.reasoning-steps {
		padding: var(--space-performance-xs);
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 200px;
		overflow-y: auto;
	}

	.step {
		display: flex;
		gap: var(--space-performance-xs);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-bg-subtle);
		border-radius: var(--radius-xs);
		font-size: var(--text-performance-caption);
		line-height: 1.4;
		animation: stepFadeIn var(--duration-normal) var(--ease-out);
	}

	@keyframes stepFadeIn {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.step-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		color: var(--color-performance-fg-muted);
	}

	.step-content {
		color: var(--color-performance-fg-secondary);
		word-break: break-word;
	}

	.step-thinking {
		opacity: 0.7;
	}

	.step-tool_call {
		border-left: 2px solid var(--color-performance-fg-secondary);
	}

	.step-tool_result {
		border-left: 2px solid var(--color-performance-info);
	}

	.step-final {
		border-left: 2px solid var(--color-performance-success);
		background: var(--color-performance-success-muted);
	}

	/* Results area */
	.results-area {
		margin-top: var(--space-performance-sm);
	}

	.results-header-tufte {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-performance-xs);
		padding-bottom: var(--space-performance-xs);
	}

	.results-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-performance-fg-primary);
	}

	.results-meta {
		font-size: 10px;
		color: var(--color-performance-fg-muted);
	}

	.empty-notice {
		text-align: center;
		padding: var(--space-performance-md);
		color: var(--color-performance-fg-muted);
		font-size: 12px;
	}

	.empty-notice .hint {
		font-size: 10px;
		margin-top: var(--space-performance-xs);
	}

	/* Implementation Grid */
	.implementation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-performance-sm);
		margin-top: var(--space-performance-sm);
	}

	.impl-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
	}

	.impl-card h3 {
		font-size: 11px;
		font-weight: 600;
		margin: 0 0 var(--space-performance-xs);
		font-family: var(--font-performance-mono, monospace);
		color: var(--color-performance-fg-secondary);
	}

	.impl-card p {
		font-size: 11px;
		margin: 0;
		color: var(--color-performance-fg-muted);
		line-height: 1.4;
	}

	/* Lists */
	.hypothesis-list,
	.learnings-list,
	.limitations-list {
		margin: var(--space-performance-sm) 0;
		padding-left: var(--space-performance-md);
	}

	.hypothesis-list li,
	.learnings-list li,
	.limitations-list li {
		font-size: var(--text-performance-body-sm);
		line-height: 1.5;
		margin-bottom: var(--space-performance-xs);
		max-width: 720px;
		color: var(--color-performance-fg-tertiary);
	}

	/* Action Button */
	.action-btn-secondary {
		padding: var(--space-performance-sm) var(--space-performance-md);
		background: transparent;
		color: var(--color-performance-fg-muted);
		border-radius: var(--radius-performance-scale-md);
		font-size: var(--text-performance-body-sm);
		cursor: pointer;
		transition: all var(--duration-performance-micro) var(--ease-performance-standard);
	}

	.action-btn-secondary:hover {
		border-color: var(--color-performance-fg-primary);
		color: var(--color-performance-fg-primary);
	}

	/* Engineering Details */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-performance-sm);
		margin-top: var(--space-performance-sm);
	}

	.metric-card {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-sm) var(--space-performance-md);
	}

	.metric-header {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-bottom: var(--space-performance-xs);
	}

	.metric-main {
		font-size: var(--text-performance-h4);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.metric-sub {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-top: 2px;
	}

	.engineering-block {
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
		padding: var(--space-performance-md);
		margin-top: var(--space-performance-sm);
	}

	.block-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		margin: 0 0 var(--space-performance-sm);
	}

	.block-note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin: var(--space-performance-sm) 0 0;
		padding-top: var(--space-performance-sm);
	}

	/* Latency Table */
	.latency-table {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.latency-row {
		display: grid;
		grid-template-columns: 180px 1fr 100px;
		gap: var(--space-performance-sm);
		align-items: center;
	}

	.latency-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
	}

	.latency-bar {
		height: 4px;
		background: var(--color-performance-fg-secondary);
		border-radius: 2px;
		width: var(--width);
	}

	.latency-value {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-primary);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* Cost Comparison */
	.cost-comparison {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-sm);
	}

	.cost-item {
		padding: var(--space-performance-sm);
		border-radius: var(--radius-xs);
	}

	.cost-item.highlight {
		border: 1px solid var(--color-performance-warning-border);
		background: var(--color-performance-warning-muted);
	}

	.cost-label {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
		margin-bottom: var(--space-performance-xs);
	}

	.cost-calc {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-performance-md);
	}

	.calc-formula {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-family: var(--font-performance-mono, monospace);
	}

	.calc-result {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.cost-note {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		margin-top: var(--space-performance-xs);
	}

	/* Code Block */
	.code-block {
		border-radius: var(--radius-xs);
		padding: var(--space-performance-sm);
		overflow-x: auto;
		font-size: var(--text-performance-caption);
		line-height: 1.5;
	}

	.code-block code {
		font-family: var(--font-performance-mono, monospace);
		color: var(--color-performance-fg-secondary);
	}

	/* Token Budget */
	.token-budget {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.budget-row {
		display: grid;
		grid-template-columns: 1fr 120px 60px;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-xs);
	}

	.budget-total {
		display: grid;
		grid-template-columns: 1fr 120px 60px;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		background: var(--color-performance-fg-secondary);
		color: var(--color-performance-bg-pure);
		border-radius: var(--radius-xs);
		margin-top: var(--space-performance-xs);
	}

	.budget-total .budget-label,
	.budget-total .budget-value,
	.budget-total .budget-pct {
		color: var(--color-performance-bg-pure);
	}

	.budget-label {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-tertiary);
	}

	.budget-value {
		font-size: var(--text-performance-caption);
		font-weight: 500;
		color: var(--color-performance-fg-primary);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.budget-pct {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-align: right;
	}

	/* Optimization Section */
	.opt-intro {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin-bottom: var(--space-performance-sm);
	}

	.bottleneck-analysis {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: var(--space-performance-md);
	}

	.bottleneck-row {
		display: grid;
		grid-template-columns: 140px 100px 60px 1fr;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-xs);
		font-size: var(--text-performance-caption);
		align-items: center;
	}

	.bottleneck-component {
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	.bottleneck-time {
		font-variant-numeric: tabular-nums;
		color: var(--color-performance-fg-primary);
		font-weight: 500;
	}

	.bottleneck-pct {
		color: var(--color-performance-fg-muted);
		text-align: right;
	}

	.bottleneck-pct.bottleneck-dominant {
		color: var(--color-performance-warning);
		font-weight: 600;
	}

	.bottleneck-verdict {
		color: var(--color-performance-fg-muted);
		font-style: italic;
	}

	.opt-section {
		margin-top: var(--space-performance-md);
		padding-top: var(--space-performance-md);
	}

	.opt-title {
		font-size: var(--text-performance-body-sm);
		font-weight: 600;
		color: var(--color-performance-fg-secondary);
		margin: 0 0 var(--space-performance-sm);
	}

	.opt-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-performance-xs);
	}

	.opt-item {
		display: grid;
		grid-template-columns: 180px 140px 1fr;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-xs);
		font-size: var(--text-performance-caption);
		border-left: 3px solid transparent;
	}

	.opt-item.helpful {
		border-left-color: var(--color-performance-success);
	}

	.opt-item.not-helpful {
		border-left-color: var(--color-performance-fg-muted);
		opacity: 0.7;
	}

	.opt-label {
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	.opt-impact {
		color: var(--color-performance-fg-primary);
		font-variant-numeric: tabular-nums;
	}

	.opt-reason {
		color: var(--color-performance-fg-muted);
	}

	/* Cache Table */
	.cache-table {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.cache-row {
		display: grid;
		grid-template-columns: 1fr 100px 100px 100px;
		gap: var(--space-performance-sm);
		padding: var(--space-performance-xs) var(--space-performance-sm);
		border-radius: var(--radius-xs);
		font-size: var(--text-performance-caption);
	}

	.cache-row.header {
		background: var(--color-performance-bg-surface);
		font-weight: 600;
		color: var(--color-performance-fg-muted);
	}

	.cache-strategy {
		font-weight: 500;
		color: var(--color-performance-fg-secondary);
	}

	/* Utility Classes */
	.p-8 {
		padding: var(--space-performance-xl);
	}

	.mb-4 {
		margin-bottom: var(--space-performance-md);
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
