<script lang="ts">
	/**
	 * Subtractive Triad Audit
	 *
	 * Three questions, three levels, one discipline.
	 * DRY → Rams → Heidegger. Implementation → Artifact → System.
	 */
</script>

<svelte:head>
	<title>Subtractive Triad Audit — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Three questions at three levels: DRY for implementation, Rams for artifact, Heidegger for system. A systematic framework for subtractive design decisions."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm opacity-40 hover:opacity-70 transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Pattern</p>
		<h1 class="mb-6">Subtractive Triad Audit</h1>
		<p class="text-xl opacity-70 leading-relaxed">
			Three questions at three levels. DRY asks about implementation.
			Rams asks about the artifact. Heidegger asks about the whole.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-white/10">
			<p class="text-lg opacity-70 italic">
				"Weniger, aber besser."
			</p>
			<p class="text-sm opacity-40 mt-2">— Dieter Rams</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base opacity-70 leading-relaxed">
			<p>
				The <strong>Subtractive Triad Audit</strong> is a systematic framework for
				evaluating any creation through three lenses, each operating at a different
				level of abstraction. It transforms "should I remove this?" from intuition
				into method.
			</p>

			<p>
				The triad applies the same principle—subtractive revelation—at three scales:
				implementation (code), artifact (product), and system (ecosystem). Each level
				has its master: DRY eliminates duplication, Rams eliminates excess, Heidegger
				eliminates disconnection.
			</p>

			<p>
				The power is in the sequence. You must ask the questions in order: DRY before
				Rams before Heidegger. Why? Because you can't evaluate an artifact's essence
				if it's cluttered with duplicates. You can't evaluate systemic fit if the
				artifact itself is unclear.
			</p>

			<div class="p-6 border border-white/10 my-8">
				<p class="text-sm opacity-60 italic">
					"Creation is the discipline of removing what obscures."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- The Three Levels -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Three Levels</h2>

		<div class="space-y-8">
			<div class="border border-white/10 p-6">
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl font-mono opacity-40">1</span>
					<div>
						<h3 class="text-lg font-semibold">DRY — Implementation</h3>
						<p class="text-sm opacity-50">Don't Repeat Yourself</p>
					</div>
				</div>
				<p class="text-sm opacity-60 mb-4">
					<strong>Question:</strong> "Have I built this before?"
				</p>
				<p class="text-sm opacity-60 mb-4">
					<strong>Action:</strong> Unify. Find the abstraction that eliminates
					duplication without premature generalization.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Extract shared functions and components</p>
					<p class="mb-1">✓ Consolidate configuration</p>
					<p>✓ Single source of truth for each concept</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl font-mono opacity-40">2</span>
					<div>
						<h3 class="text-lg font-semibold">Rams — Artifact</h3>
						<p class="text-sm opacity-50">Weniger, aber besser</p>
					</div>
				</div>
				<p class="text-sm opacity-60 mb-4">
					<strong>Question:</strong> "Does this earn its existence?"
				</p>
				<p class="text-sm opacity-60 mb-4">
					<strong>Action:</strong> Remove. If something doesn't serve an essential
					function, it shouldn't exist.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Every feature must justify itself</p>
					<p class="mb-1">✓ Decoration is guilt until proven innocent</p>
					<p>✓ Fewer, better elements</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl font-mono opacity-40">3</span>
					<div>
						<h3 class="text-lg font-semibold">Heidegger — System</h3>
						<p class="text-sm opacity-50">The Hermeneutic Circle</p>
					</div>
				</div>
				<p class="text-sm opacity-60 mb-4">
					<strong>Question:</strong> "Does this serve the whole?"
				</p>
				<p class="text-sm opacity-60 mb-4">
					<strong>Action:</strong> Reconnect. Every part must serve the system,
					and the system must give meaning to each part.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Parts reference each other coherently</p>
					<p class="mb-1">✓ Nothing is orphaned or purposeless</p>
					<p>✓ The whole is revealed through its parts</p>
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
					<li>• Reviewing any significant creation</li>
					<li>• Code review or design critique</li>
					<li>• Deciding what to remove</li>
					<li>• System architecture decisions</li>
					<li>• Onboarding new work to existing systems</li>
				</ul>
			</div>

			<div class="p-6 bg-yellow-500/5 border border-yellow-500/20">
				<h3 class="text-lg font-semibold text-yellow-300 mb-4">Critical Order</h3>
				<ul class="space-y-2 text-sm opacity-70">
					<li>• Always DRY before Rams</li>
					<li>• Always Rams before Heidegger</li>
					<li>• Never skip levels</li>
					<li>• Iterate if changes at one level affect others</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Example -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Audit Example: Component Library</h2>

		<div class="border border-white/10 p-8">
			<h3 class="text-xl font-semibold mb-6">Auditing a Button Component</h3>

			<div class="space-y-6">
				<div class="border-l-2 border-white/20 pl-4">
					<p class="text-sm font-semibold mb-2">Level 1: DRY</p>
					<p class="text-xs opacity-60 mb-2">
						Are there other button-like components? Does PrimaryButton duplicate
						SecondaryButton logic? Can we unify into one Button with variants?
					</p>
					<p class="text-xs opacity-40 font-mono">→ Unify: One Button component with variant prop</p>
				</div>

				<div class="border-l-2 border-white/20 pl-4">
					<p class="text-sm font-semibold mb-2">Level 2: Rams</p>
					<p class="text-xs opacity-60 mb-2">
						Does every prop earn its existence? Is the "loading" state needed,
						or is it decoration? What about the icon slot?
					</p>
					<p class="text-xs opacity-40 font-mono">→ Remove: Drop unused size="xl" variant</p>
				</div>

				<div class="border-l-2 border-white/20 pl-4">
					<p class="text-sm font-semibold mb-2">Level 3: Heidegger</p>
					<p class="text-xs opacity-60 mb-2">
						Does Button connect to the design system's purpose? Does it reference
						typography tokens? Does it enable the product vision?
					</p>
					<p class="text-xs opacity-40 font-mono">→ Reconnect: Derive from semantic color tokens</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference: WORKWAY SDK Audit</h2>

		<div class="border border-white/10 p-8">
			<p class="text-sm opacity-60 mb-6">
				The Subtractive Triad Audit was applied to the WORKWAY SDK integration
				to determine what to include in the CREATE SOMETHING ecosystem.
			</p>

			<div class="grid md:grid-cols-3 gap-4 text-center">
				<div class="p-4 bg-white/5">
					<div class="text-2xl font-mono mb-1 text-green-300">DRY</div>
					<div class="text-xs opacity-50">Unified canon patterns</div>
				</div>
				<div class="p-4 bg-white/5">
					<div class="text-2xl font-mono mb-1 text-green-300">Rams</div>
					<div class="text-xs opacity-50">Removed redundant features</div>
				</div>
				<div class="p-4 bg-white/5">
					<div class="text-2xl font-mono mb-1 text-green-300">Heidegger</div>
					<div class="text-xs opacity-50">Reconnected to triad</div>
				</div>
			</div>

			<div class="border-t border-white/10 pt-6 mt-6">
				<a
					href="/experiments/workway-sdk-canon-audit"
					class="text-xs font-mono opacity-50 hover:opacity-100 transition-opacity"
				>
					View full audit →
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/iterative-reduction" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Iterative Reduction</h3>
				<p class="text-sm opacity-60">
					The triad guides each reduction cycle. Apply, reduce, repeat.
				</p>
			</a>

			<a href="/patterns/hermeneutic-spiral" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Hermeneutic Spiral</h3>
				<p class="text-sm opacity-60">
					The third level of the triad—ensuring parts serve the whole.
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
