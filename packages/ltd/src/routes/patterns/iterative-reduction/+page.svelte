<script lang="ts">
	/**
	 * Iterative Reduction
	 *
	 * Start complex, remove relentlessly. Rams revised his designs
	 * dozens of times. So should you.
	 */
</script>

<svelte:head>
	<title>Iterative Reduction — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Start complex, remove relentlessly. Rams revised his designs dozens of times. Ship, measure, simplify. The discipline of continuous subtraction."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm opacity-40 hover:opacity-70 transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Pattern</p>
		<h1 class="mb-6">Iterative Reduction</h1>
		<p class="text-xl opacity-70 leading-relaxed">
			Start complex, remove relentlessly. Rams revised his designs dozens of times.
			Ship, measure, simplify. The discipline of continuous subtraction.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-white/10">
			<p class="text-lg opacity-70 italic">
				"Perfection is achieved, not when there is nothing more to add,
				but when there is nothing left to take away."
			</p>
			<p class="text-sm opacity-40 mt-2">— Antoine de Saint-Exupéry</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base opacity-70 leading-relaxed">
			<p>
				<strong>Iterative Reduction</strong> is the practice of systematic removal.
				You don't start minimal—you <em>arrive</em> at minimal through cycles of
				building, measuring, and subtracting.
			</p>

			<p>
				Rams didn't design the SK 4 record player in one pass. He revised it
				repeatedly, removing elements until only the essential remained. Each
				iteration asked: "Can this element be removed without losing function?"
			</p>

			<p>
				In software, this means shipping features, measuring usage, and removing
				what doesn't prove its value. The first version is never the simplest.
				Simplicity is earned through the discipline of subtraction.
			</p>

			<div class="p-6 border border-white/10 my-8">
				<p class="text-sm opacity-60 italic">
					"The first draft of anything is complex. The final draft is simple.
					The work is in between."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Principles -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Principles</h2>

		<div class="space-y-8">
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Ship to Learn</h3>
				<p class="text-sm opacity-60 mb-4">
					You cannot know what's essential until you see what's used.
					Ship the complex version. Measure. Then remove what proves unnecessary.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Deploy early, even if "too much"</p>
					<p class="mb-1">✓ Instrument everything for usage data</p>
					<p>✓ Schedule reduction reviews, not just feature planning</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Remove Based on Evidence</h3>
				<p class="text-sm opacity-60 mb-4">
					Don't remove based on intuition alone. Let usage data guide subtraction.
					Features with low engagement are candidates for removal.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Track feature usage, not just page views</p>
					<p class="mb-1">✓ Measure completion rates, not just starts</p>
					<p>✓ Interview users about what they actually use</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Celebrate Removal</h3>
				<p class="text-sm opacity-60 mb-4">
					Deletion is an achievement, not a failure. Create rituals around removal.
					A feature killed is complexity avoided for every future user.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ "Deletion Friday" or equivalent practice</p>
					<p class="mb-1">✓ Track lines of code removed as a positive metric</p>
					<p>✓ Document what was removed and why (for learning)</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Multiple Passes Required</h3>
				<p class="text-sm opacity-60 mb-4">
					One reduction pass is never enough. Plan for 3-5 cycles of refinement.
					Each pass reveals new removal opportunities invisible in earlier versions.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Schedule regular refactoring sprints</p>
					<p class="mb-1">✓ Revisit "finished" features quarterly</p>
					<p>✓ Question assumptions from earlier iterations</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- When to Use -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Apply</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-green-500/5 border border-green-500/20">
				<h3 class="text-lg font-semibold text-green-300 mb-4">Apply When</h3>
				<ul class="space-y-2 text-sm opacity-70">
					<li>• Product feels bloated or unfocused</li>
					<li>• Users complain about complexity</li>
					<li>• Onboarding takes too long</li>
					<li>• Maintenance burden is growing</li>
					<li>• You've shipped and have usage data</li>
				</ul>
			</div>

			<div class="p-6 bg-yellow-500/5 border border-yellow-500/20">
				<h3 class="text-lg font-semibold text-yellow-300 mb-4">Don't Apply When</h3>
				<ul class="space-y-2 text-sm opacity-70">
					<li>• You haven't shipped yet (premature optimization)</li>
					<li>• Removal is avoiding necessary complexity</li>
					<li>• You lack usage data to guide decisions</li>
					<li>• Core functionality is at stake</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- The Cycle -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Reduction Cycle</h2>

		<div class="border border-white/10 p-8">
			<div class="grid grid-cols-4 gap-4 text-center">
				<div class="p-4">
					<div class="text-2xl mb-2">1</div>
					<div class="text-sm font-semibold mb-1">Ship</div>
					<div class="text-xs opacity-50">Deploy with instrumentation</div>
				</div>
				<div class="p-4">
					<div class="text-2xl mb-2">2</div>
					<div class="text-sm font-semibold mb-1">Measure</div>
					<div class="text-xs opacity-50">Collect usage data</div>
				</div>
				<div class="p-4">
					<div class="text-2xl mb-2">3</div>
					<div class="text-sm font-semibold mb-1">Identify</div>
					<div class="text-xs opacity-50">Find low-value elements</div>
				</div>
				<div class="p-4">
					<div class="text-2xl mb-2">4</div>
					<div class="text-sm font-semibold mb-1">Remove</div>
					<div class="text-xs opacity-50">Delete and simplify</div>
				</div>
			</div>
			<div class="text-center mt-6 text-xs opacity-40">
				↺ Repeat until removal would harm function
			</div>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/subtractive-triad-audit" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Subtractive Triad Audit</h3>
				<p class="text-sm opacity-60">
					The framework for deciding what to remove: DRY, Rams, Heidegger.
				</p>
			</a>

			<a href="/patterns/constraint-as-liberation" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Constraint as Liberation</h3>
				<p class="text-sm opacity-60">
					Reduction creates constraints. Constraints enable focus.
				</p>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto text-center">
		<p class="text-sm opacity-40">
			Part of the <a href="/patterns" class="underline hover:opacity-70">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>
