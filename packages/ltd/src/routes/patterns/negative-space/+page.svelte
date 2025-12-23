<script lang="ts">
	/**
	 * Negative Space
	 *
	 * What you don't build matters as much as what you do.
	 * Whitespace in design. Silence in music. Restraint in code.
	 */
</script>

<svelte:head>
	<title>Negative Space — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="What you don't build matters as much as what you do. Whitespace in design. Silence in music. Restraint in code. The power of deliberate emptiness."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Negative Space</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			What you don't build matters as much as what you do. Whitespace in design.
			Silence in music. Restraint in code. The power of deliberate emptiness.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"Simplicity is not the absence of clutter; that's a consequence of simplicity.
				Simplicity is somehow essentially describing the purpose and place of an object and product."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Jonathan Ive</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				<strong>Negative Space</strong> is the deliberate use of emptiness. In visual design,
				it's whitespace—the areas without content that give structure to what remains. In music,
				it's the rests between notes. In code, it's the features you don't build.
			</p>

			<p>
				The power of negative space is counterintuitive: emptiness creates meaning. A page with
				generous margins feels calm and intentional. A function that does one thing clearly is
				more powerful than one that attempts everything.
			</p>

			<p>
				This pattern asks: what would happen if you removed this? If the answer is "nothing much,"
				remove it. If the answer is "the remaining elements gain clarity," definitely remove it.
				Negative space is active design through subtraction.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"The space between things is as important as the things themselves."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Principles -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Principles</h2>

		<div class="space-y-8">
			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Generous Margins</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Content needs room to breathe. Margins aren't wasted space—they're
					essential structure. The emptiness around elements defines their importance.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Padding that exceeds expectation</p>
					<p class="mb-1">✓ Whitespace that clarifies hierarchy</p>
					<p>✓ Empty space as intentional design element</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Sparse UI</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Every element competes for attention. Fewer elements means each one matters more.
					The sparse interface lets users focus on what's important.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ One primary action per screen</p>
					<p class="mb-1">✓ Progressive disclosure of secondary options</p>
					<p>✓ Visual hierarchy through restraint</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Functions That Do One Thing</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					The negative space around a function's purpose makes it powerful.
					A function that does one thing can be understood, tested, and composed.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Single responsibility principle</p>
					<p class="mb-1">✓ Small, focused modules</p>
					<p>✓ Clear boundaries between concerns</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Features Not Built</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					The most important product decisions are what not to build.
					Every feature adds complexity. Empty product space is a feature.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Explicit "won't do" lists</p>
					<p class="mb-1">✓ Scope actively protected</p>
					<p>✓ Saying no as product strategy</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- When to Use -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Apply</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-success-subtle border border-success">
				<h3 class="text-lg-canon font-semibold text-success mb-4">Apply When</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Interface feels cluttered or overwhelming</li>
					<li>• Users struggle to find primary actions</li>
					<li>• Code is doing too many things</li>
					<li>• Product scope keeps expanding</li>
					<li>• Adding more isn't solving problems</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Balance With</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Necessary information density</li>
					<li>• Power user needs</li>
					<li>• Accessibility requirements</li>
					<li>• Context that aids understanding</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Visual Example -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Visual Demonstration</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="border border-error p-4">
				<div class="text-xs-canon opacity-40-canon mb-2">Without negative space:</div>
				<div class="bg-surface p-2 text-xs-canon space-y-1">
					<div class="demo-element p-1">Element</div>
					<div class="demo-element p-1">Element</div>
					<div class="demo-element p-1">Element</div>
					<div class="demo-element p-1">Element</div>
				</div>
			</div>

			<div class="border border-success p-4">
				<div class="text-xs-canon opacity-40-canon mb-2">With negative space:</div>
				<div class="p-4 text-xs-canon space-y-4">
					<div class="demo-element p-2">Element</div>
					<div class="demo-element p-2">Element</div>
				</div>
			</div>
		</div>

		<p class="text-sm-canon opacity-50-canon mt-6 text-center">
			Fewer elements. More space. Greater clarity.
		</p>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/iterative-reduction" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Iterative Reduction</h3>
				<p class="text-sm-canon opacity-60-canon">
					Negative space is created through reduction. Each removal adds emptiness.
				</p>
			</a>

			<a href="/patterns/subtractive-triad-audit" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Subtractive Triad Audit</h3>
				<p class="text-sm-canon opacity-60-canon">
					The framework for deciding what emptiness to create.
				</p>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto text-center">
		<p class="text-sm-canon opacity-40-canon">
			Part of the <a href="/patterns" class="underline hover:opacity-70-canon">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>

<style>
	/* Typography */
	.text-xs-canon {
		font-size: var(--text-caption);
	}

	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-base-canon {
		font-size: var(--text-body);
	}

	.text-lg-canon {
		font-size: var(--text-body-lg);
	}

	.text-xl-canon {
		font-size: var(--text-h3);
	}

	/* Opacity as color tokens */
	.opacity-40-canon {
		color: var(--color-fg-muted);
	}

	.opacity-50-canon {
		color: var(--color-fg-muted);
	}

	.opacity-60-canon {
		color: var(--color-fg-tertiary);
	}

	.opacity-70-canon {
		color: var(--color-fg-secondary);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}


	/* Backgrounds */

	/* Demo elements */
	.demo-element {
		background: var(--color-border-emphasis);
	}

	/* Semantic colors */
	.text-success {
		color: #4ade80;
	}

	.text-warning {
		color: #fbbf24;
	}

	.bg-success-subtle {
		background: var(--color-success-muted);
	}

	.bg-warning-subtle {
		background: var(--color-warning-muted);
	}

	.border-success {
		border-color: var(--color-success-border);
	}

	.border-error {
		border-color: var(--color-error-border);
	}

	.border-warning {
		border-color: var(--color-warning-border);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}
</style>
