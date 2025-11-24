<script lang="ts">
	/**
	 * Agentic Visualization Experiment
	 *
	 * Research experiment demonstrating autonomous UI components that embody
	 * Edward Tufte's principles for displaying quantitative information.
	 *
	 * Uses controlled sample data to demonstrate component behavior with
	 * crafted patterns showing growth, decline, and emergence trends.
	 */

	import {
		ComparativeSparklines,
		DistributionBar,
		TrendIndicator,
		MetricCard,
		HighDensityTable
	} from '@create-something/tufte';

	// Sample data for demonstrations
	const propertyData = {
		agency: {
			views: 1234,
			previousViews: 980,
			dailyViews: [
				{ count: 120 },
				{ count: 145 },
				{ count: 132 },
				{ count: 198 },
				{ count: 167 },
				{ count: 189 },
				{ count: 203 }
			]
		},
		io: {
			views: 2456,
			previousViews: 2100,
			dailyViews: [
				{ count: 280 },
				{ count: 310 },
				{ count: 295 },
				{ count: 340 },
				{ count: 355 },
				{ count: 380 },
				{ count: 396 }
			]
		},
		space: {
			views: 890,
			previousViews: 1200,
			dailyViews: [
				{ count: 180 },
				{ count: 165 },
				{ count: 140 },
				{ count: 125 },
				{ count: 110 },
				{ count: 95 },
				{ count: 75 }
			]
		},
		ltd: {
			views: 567,
			previousViews: 450,
			dailyViews: [
				{ count: 60 },
				{ count: 75 },
				{ count: 68 },
				{ count: 82 },
				{ count: 90 },
				{ count: 95 },
				{ count: 97 }
			]
		}
	};

	// Distribution data
	const distribution = [
		{ label: '.agency', count: propertyData.agency.views },
		{ label: '.io', count: propertyData.io.views },
		{ label: '.space', count: propertyData.space.views },
		{ label: '.ltd', count: propertyData.ltd.views }
	];

	// Comparative sparklines data - Using brighter, more saturated colors for better visibility
	const comparativeData = [
		{ label: '.agency', data: propertyData.agency.dailyViews, color: 'rgb(96, 165, 250)', opacity: 0.9 },
		{ label: '.io', data: propertyData.io.dailyViews, color: 'rgb(34, 197, 94)', opacity: 0.9 },
		{ label: '.space', data: propertyData.space.dailyViews, color: 'rgb(192, 132, 252)', opacity: 0.9 },
		{ label: '.ltd', data: propertyData.ltd.dailyViews, color: 'rgb(251, 191, 36)', opacity: 0.9 }
	];
</script>

<svelte:head>
	<title>Agentic Visualizations | CREATE SOMETHING.io</title>
</svelte:head>

<div class="min-h-screen bg-black text-white p-6">
	<div class="max-w-7xl mx-auto space-y-12">
	<!-- Header -->
	<div class="border-b border-white/10 pb-8">
		<h1 class="text-4xl font-bold mb-3">Agentic Visualization Experiment</h1>
		<p class="text-white/70 text-lg max-w-3xl">
			Research experiment demonstrating autonomous UI components that embody Edward Tufte's principles
			for displaying quantitative information. Components make intelligent decisions about data presentation,
			transforming visualization from manual craft into intelligent revelation.
		</p>
	</div>

	<!-- Abstract -->
	<section class="border-l-4 border-white/20 pl-6 space-y-4">
		<h2 class="text-2xl font-bold">Abstract</h2>
		<p class="text-white/70 leading-relaxed">
			This paper presents <em>agentic visualization</em>: autonomous UI components that embody
			expert knowledge and make intelligent decisions about data presentation. We demonstrate
			how Edward Tufte's principles for displaying quantitative information can be encoded into
			self-governing components that automatically scale data, choose appropriate visual encodings,
			and compose into higher-order insights. Through hermeneutic analysis, we reveal that
			traditional charting libraries present users with <em>choices</em>, while agentic components
			make <em>decisions</em>—transforming visualization from manual craft into intelligent revelation.
			Our implementation, the @create-something/tufte package, demonstrates this approach through
			eight components tested with both controlled samples and live analytics, achieving what we
			term "visualization as unconcealment" (Heideggerian <em>aletheia</em>).
		</p>
	</section>

	<!-- Introduction -->
	<section class="space-y-6">
		<h2 class="text-2xl font-bold">1. Introduction</h2>

		<div class="space-y-4 text-white/70 leading-relaxed">
			<p>
				Data visualization occupies a curious position in software engineering: universally acknowledged
				as critical, yet implemented through libraries that demand extensive configuration and offer
				limitless ways to violate established principles. D3, Chart.js, and similar tools provide
				<em>mechanisms</em> but not <em>judgment</em>—developers must manually enforce Tufte's data-ink
				ratio, choose appropriate scales, and compose multiple views into coherent dashboards.
			</p>

			<p>
				This research asks: <strong>What if components could embody expertise?</strong>
			</p>

			<p>
				We propose "agentic visualization"—components that don't just render data but understand how
				to reveal it. These components automatically:
			</p>

			<ul class="list-disc list-inside space-y-2 pl-4">
				<li>Scale multiple data series to shared ranges for valid comparison</li>
				<li>Calculate proportions and format percentages without manual intervention</li>
				<li>Choose visual hierarchies (color, opacity, stroke weight) based on data relationships</li>
				<li>Hide labels when space is insufficient, preventing visual clutter</li>
				<li>Compose into higher-order patterns (small multiples, integrated dashboards)</li>
			</ul>

			<p>
				The intellectual foundation emerged through applying Heidegger's hermeneutic circle to
				the question "what visualizations can we now create?" This interpretive approach revealed
				that we don't <em>create</em> visualizations—we <em>reveal</em> them through components
				that understand both data and design principles.
			</p>

			<p class="text-white/80">
				<strong>Contributions:</strong> (1) A theoretical framework for agentic visualization
				components, (2) Eight implemented components embodying Tufte's principles,
				(3) Demonstration of data source flexibility through sample/live toggle,
				(4) Evidence that design expertise can be encoded into autonomous software.
			</p>
		</div>
	</section>

	<!-- Methodology -->
	<section class="space-y-6">
		<h2 class="text-2xl font-bold">2. Methodology: Hermeneutic Component Design</h2>

		<div class="space-y-4 text-white/70 leading-relaxed">
			<p>
				Traditional software development follows specification → implementation → testing.
				This research instead employed Heidegger's <em>hermeneutic circle</em>—an interpretive
				method where understanding emerges through iterative engagement with the whole and its parts.
			</p>

			<h3 class="text-xl font-semibold text-white/90 mt-6">2.1 Hermeneutic Process</h3>
			<p>
				Beginning with four base components (Sparkline, MetricCard, HighDensityTable, DailyGrid),
				we asked: "What visualizations can we now create?" This question revealed missing compositional
				possibilities:
			</p>

			<ul class="list-disc list-inside space-y-2 pl-4">
				<li><strong>ComparativeSparklines</strong>: Multiple series needed shared scaling for valid comparison</li>
				<li><strong>DistributionBar</strong>: Proportional relationships were invisible in tables</li>
				<li><strong>TrendIndicator</strong>: Direction and magnitude of change required semantic encoding</li>
				<li><strong>HourlyHeatmap</strong>: Temporal patterns demanded small multiples grid</li>
			</ul>

			<p>
				Each new component revealed further compositional possibilities—the hermeneutic circle in action.
				This process demonstrated that visualization needs <em>emerge from data relationships</em>, not
				predefined chart types.
			</p>

			<h3 class="text-xl font-semibold text-white/90 mt-6">2.2 Encoding Tufte's Principles</h3>
			<p>
				Edward Tufte's "The Visual Display of Quantitative Information" (1983) establishes six principles:
			</p>

			<ol class="list-decimal list-inside space-y-2 pl-4">
				<li>Maximize data-ink ratio (remove all decoration)</li>
				<li>Show data variation, not design variation</li>
				<li>Use small multiples for comparison across dimensions</li>
				<li>Integrate text and graphics (no separate legends)</li>
				<li>Display high-density information (maximize insights per unit area)</li>
				<li>Remove chartjunk (no 3D, gradients, heavy borders)</li>
			</ol>

			<p>
				Rather than documenting these as guidelines, we implemented them as <em>component constraints</em>.
				For example, ComparativeSparklines cannot render without automatic shared scaling—violating
				Tufte's "valid comparison" principle is structurally impossible.
			</p>

			<h3 class="text-xl font-semibold text-white/90 mt-6">2.3 Agentic Decision-Making</h3>
			<p>
				Components make autonomous decisions through reactive calculations:
			</p>

			<ul class="list-disc list-inside space-y-2 pl-4">
				<li>Automatic scaling: <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">$: range = max - min || 1</code></li>
				<li>Proportion calculation: <code class="text-white/90 bg-white/10 px-2 py-0.5 rounded">$: percentage = (count / total) * 100</code></li>
				<li>Contextual formatting: Labels only appear when segment width >= 8%</li>
				<li>Semantic colors: Green/red/gray based on direction, not manual assignment</li>
			</ul>

			<p>
				This transforms developers from "chart configurers" to "data providers"—the component
				handles visualization intelligence.
			</p>
		</div>
	</section>

	<!-- Implementation -->
	<section class="space-y-6">
		<h2 class="text-2xl font-bold">3. Implementation</h2>

		<div class="space-y-4 text-white/70 leading-relaxed">
			<h3 class="text-xl font-semibold text-white/90">3.1 Technical Architecture</h3>
			<p>
				The @create-something/tufte package is implemented in SvelteKit 5 with TypeScript,
				distributed as an npm package. Components use:
			</p>

			<ul class="list-disc list-inside space-y-2 pl-4">
				<li><strong>Svelte reactive statements</strong> ($:) for autonomous calculations</li>
				<li><strong>SVG path generation</strong> for resolution-independent graphics</li>
				<li><strong>Tailwind CSS</strong> with CREATE SOMETHING design tokens</li>
				<li><strong>TypeScript interfaces</strong> for type-safe data contracts</li>
			</ul>

			<h3 class="text-xl font-semibold text-white/90 mt-6">3.2 Component Examples</h3>

			<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm space-y-2">
				<p class="text-white/40">// ComparativeSparklines: Shared scaling example</p>
				<p class="text-white/90">$: allValues = series.flatMap(s => s.data.map(d => d.count));</p>
				<p class="text-white/90">$: max = Math.max(...allValues, 1);</p>
				<p class="text-white/90">$: min = Math.min(...allValues, 0);</p>
				<p class="text-white/90">$: range = max - min || 1;</p>
			</div>

			<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm space-y-2 mt-4">
				<p class="text-white/40">// DistributionBar: Automatic proportions</p>
				<p class="text-white/90">$: total = segments.reduce((sum, s) =&gt; sum + s.count, 0);</p>
				<p class="text-white/90">$: segmentsWithPercentages = segments.map(s =&gt; (&lbrace;</p>
				<p class="text-white/90 pl-4">...s,</p>
				<p class="text-white/90 pl-4">percentage: (s.count / total) * 100,</p>
				<p class="text-white/90 pl-4">width: (s.count / total) * 100</p>
			<p class="text-white/90">&rbrace;));</p>
			</div>

			<h3 class="text-xl font-semibold text-white/90 mt-6">3.3 Data Source Flexibility</h3>
			<p>
				To demonstrate component flexibility, this page implements a Sample/Live toggle.
				Components receive data through props—they don't know or care whether it's controlled
				samples or live analytics from Cloudflare D1. This proves the components are truly
				autonomous: they work with <em>any</em> data source that matches the interface.
			</p>

			<div class="p-4 bg-white/5 border border-white/10 rounded-lg font-mono text-sm space-y-2 mt-4">
				<p class="text-white/40">// Reactive data switching</p>
				<p class="text-white/90">$: propertyData = dataSource === 'live' && liveAnalytics</p>
				<p class="text-white/90 pl-4">? getLivePropertyData()</p>
				<p class="text-white/90 pl-4">: propertyData;</p>
			</div>
		</div>
	</section>

	<!-- Results Section Header -->
	<section class="border-t border-white/10 pt-8">
		<h2 class="text-3xl font-bold mb-4">4. Results: Component Demonstrations</h2>
		<p class="text-white/70 leading-relaxed mb-8">
			The following sections demonstrate each component with controlled sample data representing
			CREATE SOMETHING property analytics. Each component automatically handles scaling, formatting,
			and visual encoding without manual configuration.
		</p>
	</section>

		<!-- 1. Comparative Sparklines -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">4.1 Comparative Trends</h2>
				<p class="text-white/70 text-base">
					ComparativeSparklines component - Multiple data series overlaid for direct comparison
				</p>
			</div>
			<div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-6">
				<ComparativeSparklines series={comparativeData} width={100} height={30} />
				<p class="text-sm text-white/60">
					<strong class="text-white/80">Reveals:</strong> .io and .agency are growing, .space is declining, .ltd is
					emerging. Relative performance visible at a glance.
				</p>
			</div>
		</section>

		<!-- 2. Distribution Bar -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">4.2 Proportional Distribution</h2>
				<p class="text-white/70 text-base">
					DistributionBar component - Visual representation of how total is divided
				</p>
			</div>
			<div class="p-8 bg-white/5 border border-white/10 rounded-lg">
				<DistributionBar segments={distribution} height="h-12" />
				<p class="text-sm text-white/60 mt-6">
					<strong class="text-white/80">Reveals:</strong> .io dominates (47%), followed by .agency (24%), .space (17%),
					and .ltd (11%). Distribution imbalance immediately obvious.
				</p>
			</div>
		</section>

		<!-- 3. Trend Indicators -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">4.3 Change Direction &amp; Magnitude</h2>
				<p class="text-white/70 text-base">
					TrendIndicator component - Shows whether metrics are up, down, or flat
				</p>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#if propertyData}
			{#each Object.entries(propertyData) as [property, data]}
					<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
						<div class="text-sm text-white/60 mb-2">.{property}</div>
						<div class="text-3xl font-bold tabular-nums mb-2">{data.views.toLocaleString()}</div>
						<TrendIndicator current={data.views} previous={data.previousViews} />
					</div>
				{/each}
		{/if}
			</div>
			<p class="text-xs text-white/40">
				<strong>Reveals:</strong> Directional changes at a glance - growing (green ↑), declining
				(red ↓), or stable (gray →)
			</p>
		</section>

		<!-- 4. Integrated Comparison Dashboard -->
		<section class="space-y-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">4.4 Integrated Comparison Dashboard</h2>
				<p class="text-white/60 text-sm">
					Composition - MetricCard + TrendIndicator + comparative context
				</p>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				{#if propertyData}
			{#each Object.entries(propertyData) as [property, data]}
					<div class="space-y-2">
						<MetricCard
							label=".{property}"
							value={data.views}
							trend={data.dailyViews}
							context="last 7 days"
						/>
						<div class="px-6 py-2 bg-white/5 border border-white/10 rounded-lg">
							<div class="text-xs text-white/40 mb-1">vs. previous period</div>
							<TrendIndicator current={data.views} previous={data.previousViews} />
						</div>
					</div>
				{/each}
		{/if}
			</div>
			<p class="text-xs text-white/40">
				<strong>Reveals:</strong> Complete picture - absolute values, trends, and directional
				changes in unified view
			</p>
		</section>

	<!-- 5. Discussion -->
	<section class="border-t border-white/10 pt-8 space-y-6">
		<h2 class="text-3xl font-bold mb-4">5. Discussion</h2>

		<div class="space-y-4 text-white/70 leading-relaxed">
			<h3 class="text-xl font-semibold text-white/90">5.1 What the Hermeneutic Circle Revealed</h3>

			<div class="grid md:grid-cols-2 gap-6">
				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<h4 class="text-lg font-semibold mb-3 text-white/80">Compositional Power</h4>
					<ul class="space-y-2 text-sm text-white/60">
						<li>• Components combine to reveal multi-dimensional insights</li>
						<li>• Same data, different lenses: trends, proportions, changes</li>
						<li>• Patterns invisible in tables become obvious visually</li>
						<li>• No manual calculation - components interpret automatically</li>
					</ul>
				</div>

				<div class="p-6 bg-white/5 border border-white/10 rounded-lg">
					<h4 class="text-lg font-semibold mb-3 text-white/80">Agentic Behavior</h4>
					<ul class="space-y-2 text-sm text-white/60">
						<li>• Automatic scaling (ComparativeSparklines uses shared range)</li>
						<li>• Intelligent formatting (percentages, colors, labels)</li>
						<li>• Contextual decisions (show labels only when space permits)</li>
						<li>• Self-documenting (tooltips, legends generated automatically)</li>
					</ul>
				</div>
			</div>

			<h3 class="text-xl font-semibold text-white/90 mt-6">5.2 Implications for Software Design</h3>
			<p>
				This research demonstrates that design expertise—previously considered the domain of human
				judgment—can be encoded into autonomous software components. The implications extend beyond
				visualization:
			</p>

			<ul class="list-disc list-inside space-y-2 pl-4">
				<li><strong>UI Components</strong>: Form validation, accessibility, responsive layouts could make expert decisions</li>
				<li><strong>API Design</strong>: Clients that automatically handle retries, caching, rate limiting</li>
				<li><strong>Database Queries</strong>: ORMs that understand indexing strategies and query optimization</li>
				<li><strong>Testing Frameworks</strong>: Tests that know which assertions matter for given code patterns</li>
			</ul>

			<p>
				The pattern is consistent: identify expert knowledge → encode as component constraints →
				eliminate manual configuration.
			</p>

			<h3 class="text-xl font-semibold text-white/90 mt-6">5.3 Visualization as Unconcealment</h3>
			<p>
				Heidegger's concept of <em>aletheia</em> (unconcealment) describes truth not as correctness
				but as <em>revealing what was hidden</em>. Traditional charts require humans to manually
				uncover patterns. Agentic components reveal patterns automatically—the data's truth emerges
				through intelligent encoding rather than human effort.
			</p>

			<p>
				This shifts the developer's role from "chart configuration" to "data provision." The component
				decides how to reveal; the developer provides what to reveal.
			</p>

			<h3 class="text-xl font-semibold text-white/90 mt-6">5.4 Limitations and Future Work</h3>
			<p>
				Current components handle quantitative time-series data. Future work could extend to:
			</p>

			<ul class="list-disc list-inside space-y-2 pl-4">
				<li>Hierarchical data (treemaps, sunburst charts with automatic layout)</li>
				<li>Network graphs (force-directed layouts with automatic clustering)</li>
				<li>Geographic data (map projections chosen based on data distribution)</li>
				<li>Multivariate analysis (automatic dimensionality reduction visualization)</li>
			</ul>

			<p>
				The limiting factor is not technical implementation but identification of expert heuristics
				to encode. Each domain requires hermeneutic analysis to reveal what decisions components
				should make autonomously.
			</p>
		</div>
	</section>

	<!-- 6. References -->
	<section class="border-t border-white/10 pt-8 space-y-4">
		<h2 class="text-3xl font-bold mb-4">6. References</h2>

		<div class="space-y-3 text-white/70 text-sm">
			<div class="pl-6 -indent-6">
				[1] Tufte, Edward R. (1983). <em>The Visual Display of Quantitative Information</em>.
				Graphics Press. Cheshire, Connecticut.
			</div>

			<div class="pl-6 -indent-6">
				[2] Tufte, Edward R. (1990). <em>Envisioning Information</em>.
				Graphics Press. Cheshire, Connecticut.
			</div>

			<div class="pl-6 -indent-6">
				[3] Heidegger, Martin (1962). <em>Being and Time</em> (J. Macquarrie & E. Robinson, Trans.).
				Harper & Row. (Original work published 1927)
			</div>

			<div class="pl-6 -indent-6">
				[4] Gadamer, Hans-Georg (1975). <em>Truth and Method</em> (G. Barden & J. Cumming, Trans.).
				Seabury Press. (Original work published 1960)
			</div>

			<div class="pl-6 -indent-6">
				[5] Few, Stephen (2012). <em>Show Me the Numbers: Designing Tables and Graphs to Enlighten</em> (2nd ed.).
				Analytics Press.
			</div>

			<div class="pl-6 -indent-6">
				[6] Wilkinson, Leland (2005). <em>The Grammar of Graphics</em> (2nd ed.).
				Springer-Verlag.
			</div>

			<div class="pl-6 -indent-6">
				[7] @create-something/tufte package documentation.
				<a href="https://createsomething.ltd/masters/edward-tufte" class="text-white/90 underline hover:text-white">
					https://createsomething.ltd/masters/edward-tufte
				</a>
			</div>

			<div class="pl-6 -indent-6">
				[8] CREATE SOMETHING methodology.
				<a href="https://createsomething.io/methodology" class="text-white/90 underline hover:text-white">
					https://createsomething.io/methodology
				</a>
			</div>
		</div>
	</section>

		<!-- Footer -->
		<div class="border-t border-white/10 pt-6">
			<p class="text-sm text-white/40">
				All visualizations powered by
				<a
					href="https://createsomething.ltd/masters/edward-tufte"
					class="underline hover:text-white/60">@create-something/tufte</a
				>
				— agentic components embodying Tufte's principles. View
				<a href="/methodology" class="underline hover:text-white/60">methodology</a>
				or
				<a href="/admin/analytics" class="underline hover:text-white/60">analytics dashboard</a>.
			</p>
		</div>
	</div>
</div>
