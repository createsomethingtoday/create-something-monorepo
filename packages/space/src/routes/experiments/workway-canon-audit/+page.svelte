<script lang="ts">
	/**
	 * WORKWAY SDK: The Hermeneutic Circle in Practice
	 *
	 * Applying Dieter Rams' 10 Principles to integration SDK development.
	 * Score improved from 41/50 to 48/50 through iterative implementation.
	 *
	 * "The circle closes: implementation reveals what documentation cannot."
	 */

	const workwayRepo = 'https://github.com/WORKWAYCO/WORKWAY';
</script>

<svelte:head>
	<title>WORKWAY Canon Audit | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="Applying Dieter Rams' 10 Principles to SDK development. The hermeneutic circle in practice."
	/>
</svelte:head>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="bg-black border border-white/10 rounded-lg overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="text-white/80 text-[0.6rem] sm:text-[0.75rem] md:text-sm leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   WORKWAY SDK CANON AUDIT                       |
    |                                                 |
    |   Pre-understanding    Emergent understanding   |
    |   (README)             (Implementation)         |
    |                                                 |
    |        |                      |                 |
    |        v                      v                 |
    |   ActionResult  ──────►  DX Helpers             |
    |   IntegrationError ───►  Error Taxonomy         |
    |   Timeout ────────────►  AbortController        |
    |   Retry ──────────────►  Exponential Backoff    |
    |                                                 |
    |   Score: 41/50 ──────────────────► 48/50        |
    |                                                 |
    |   "The circle closes: implementation            |
    |    reveals what documentation cannot."          |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="text-4xl md:text-5xl font-bold text-white">WORKWAY SDK</h1>
		<p class="text-lg text-white/60 italic">The Hermeneutic Circle in Practice</p>
		<p class="text-white/40 max-w-2xl mx-auto">
			Applying Dieter Rams' 10 Principles to integration SDK development. The canon doesn't exist
			in isolation—it's validated through practice.
		</p>
	</div>
</section>

<!-- Score Summary -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<div class="bg-white/5 border border-white/10 rounded-xl p-6">
			<div class="grid md:grid-cols-3 gap-6 text-center">
				<div>
					<div class="text-3xl font-bold text-white/40">41/50</div>
					<div class="text-sm text-white/50">Initial Score</div>
				</div>
				<div>
					<div class="text-3xl font-bold text-green-400">48/50</div>
					<div class="text-sm text-white/50">Final Score</div>
				</div>
				<div>
					<div class="text-3xl font-bold text-white">+7</div>
					<div class="text-sm text-white/50">Improvement</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- The Experiment -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- The Hermeneutic Insight -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">The Hermeneutic Insight</h2>
				<span class="text-sm text-white/40">ALETHEIA</span>
			</div>
			<p class="text-white/70 leading-relaxed">
				The README represented <strong class="text-white">pre-understanding</strong>—how we thought
				the SDK worked. But through building concrete integrations (Gmail, Slack, Stripe, Notion,
				GoogleSheets), a different understanding emerged.
			</p>
			<p class="text-white/50 text-sm">
				This is the hermeneutic circle: the whole (SDK architecture) is understood through the
				parts (individual integrations), and the parts are understood through the whole. Each
				iteration deepens understanding.
			</p>
		</div>

		<!-- What Emerged -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">What Emerged Through Praxis</h2>
				<span class="text-sm text-white/40">EMERGENT UNDERSTANDING</span>
			</div>

			<div class="space-y-4">
				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">ActionResult.error Structure</h3>
					<p class="text-white/50 text-sm">
						The README didn't capture that <code class="text-white/70">result.error</code> is an
						object <code class="text-white/70">{`{ message, code }`}</code>, not a string. Tests
						revealed this gotcha. DX helpers were added.
					</p>
				</div>

				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Timeout Patterns</h3>
					<p class="text-white/50 text-sm">
						No timeout handling existed. Through implementation, the AbortController pattern emerged
						as the canonical solution.
					</p>
				</div>

				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Retry Logic</h3>
					<p class="text-white/50 text-sm">
						Critical for production use. Exponential backoff with jitter, rate limit awareness—none
						of this was documented because it only emerged through building real integrations.
					</p>
				</div>

				<div class="p-4 bg-black/30 rounded-lg space-y-2">
					<h3 class="text-white font-medium">Capabilities Honesty</h3>
					<p class="text-white/50 text-sm">
						Gmail claimed <code class="text-white/70">canHandleAttachments: true</code> but didn't
						implement it. The Canon (Principle 6: Honest) required correction.
					</p>
				</div>
			</div>
		</div>

		<!-- Principle Scores -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Rams' Principles Applied</h2>
				<span class="text-sm text-white/40">CANON</span>
			</div>

			<div class="space-y-3">
				{#each [
					{ n: 1, name: 'Innovative', prev: 5, curr: 5, note: 'Two-layer architecture remains novel' },
					{ n: 2, name: 'Useful', prev: 4, curr: 5, note: 'DX helpers added' },
					{ n: 3, name: 'Aesthetic', prev: 4, curr: 5, note: 'Consistent 80-char dividers' },
					{ n: 4, name: 'Understandable', prev: 4, curr: 5, note: 'DEVELOPERS.md created' },
					{ n: 5, name: 'Unobtrusive', prev: 5, curr: 5, note: 'Tool recedes' },
					{ n: 6, name: 'Honest', prev: 3, curr: 5, note: 'Fixed capabilities overstatement' },
					{ n: 7, name: 'Long-lasting', prev: 4, curr: 5, note: 'Retry + timeout patterns' },
					{ n: 8, name: 'Thorough', prev: 3, curr: 4, note: '42 tests, more needed' },
					{ n: 9, name: 'Env. Friendly', prev: 5, curr: 5, note: 'Edge-native' },
					{ n: 10, name: 'As Little As Possible', prev: 4, curr: 4, note: 'Could simplify further' }
				] as principle}
					<div class="flex items-center gap-4 p-3 bg-black/30 rounded-lg">
						<div class="w-8 text-white/40 text-sm">{principle.n}.</div>
						<div class="flex-1 text-white text-sm">{principle.name}</div>
						<div class="text-white/40 text-sm">{principle.prev}/5</div>
						<div class="text-white/20">→</div>
						<div
							class="text-sm font-medium {principle.curr > principle.prev
								? 'text-green-400'
								: 'text-white'}"
						>
							{principle.curr}/5
						</div>
						<div class="hidden md:block text-white/40 text-xs max-w-48 truncate">{principle.note}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Critical Fixes -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Critical Violations Addressed</h2>
				<span class="text-sm text-white/40">REMEDIATION</span>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-white/50 border-b border-white/10">
							<th class="pb-2">Violation</th>
							<th class="pb-2">Fix</th>
						</tr>
					</thead>
					<tbody class="text-white/70">
						<tr class="border-b border-white/5">
							<td class="py-2">No retry logic</td>
							<td class="py-2"><code class="text-white/50">retry.ts</code> with exponential backoff</td>
						</tr>
						<tr class="border-b border-white/5">
							<td class="py-2">Capabilities overstatement</td>
							<td class="py-2">Honest declarations in Gmail, Stripe</td>
						</tr>
						<tr class="border-b border-white/5">
							<td class="py-2">No request timeout</td>
							<td class="py-2">AbortController in all 5 integrations</td>
						</tr>
						<tr class="border-b border-white/5">
							<td class="py-2">No webhook tests</td>
							<td class="py-2">42 tests (Stripe + template)</td>
						</tr>
						<tr>
							<td class="py-2">Type conflicts</td>
							<td class="py-2">Removed duplicate definitions</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- The Circle Closes -->
		<div class="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
			<h2 class="text-xl font-bold text-white">The Circle Closes</h2>
			<p class="text-white/70 leading-relaxed">
				Pre-understanding (README) described <em>what</em> the SDK does. Emergent understanding
				(DEVELOPERS.md) describes <em>how to build with it</em>—the practical knowledge that only
				emerges through praxis.
			</p>
			<p class="text-white/50 text-sm">
				This is the hermeneutic circle applied to software: implementation reveals what
				documentation cannot. The canon is not static dogma but living philosophy, validated and
				refined through practice.
			</p>
		</div>

		<!-- Links -->
		<div class="flex flex-wrap gap-4 justify-center">
			<a
				href={workwayRepo}
				target="_blank"
				rel="noopener noreferrer"
				class="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
			>
				View Repository
			</a>
			<a
				href="/experiments"
				class="px-6 py-3 border border-white/20 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
			>
				All Experiments
			</a>
		</div>
	</div>
</section>
