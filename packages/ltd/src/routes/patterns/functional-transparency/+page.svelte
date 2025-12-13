<script lang="ts">
	/**
	 * Functional Transparency
	 *
	 * How something works should be evident. No mystery. No magic.
	 * Honest materials, honest code.
	 */
</script>

<svelte:head>
	<title>Functional Transparency — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="How something works should be evident. No mystery. No magic. Exposed structure like Eames chairs. Self-documenting code. Honest materials."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Functional Transparency</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			How something works should be evident. No mystery. No magic.
			Exposed structure like Eames chairs. Self-documenting code. Honest materials.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"Good design makes a product understandable."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Dieter Rams, Principle 4</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				<strong>Functional Transparency</strong> means the mechanism is visible. You
				can see how it works by looking at it. The Eames LCW chair exposes its plywood
				layers. A well-written function reveals its purpose through its name and structure.
			</p>

			<p>
				This is Rams' fourth principle made concrete: the product clarifies its own
				structure. No hidden complexity. No "magic" that mystifies. The user (or
				developer) can trace cause to effect without documentation.
			</p>

			<p>
				In architecture, this means exposed steel and visible joinery. In software,
				it means self-documenting APIs, clear dependency graphs, and code that reads
				like prose. The structure <em>is</em> the documentation.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"If you have to explain it, you haven't made it transparent enough."
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
				<h3 class="text-lg-canon font-semibold mb-3">Expose Structure</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Don't hide how things connect. Show the joints. Reveal the dependencies.
					The Pompidou Centre puts its pipes on the outside. Your architecture should too.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Visible folder structure matching mental model</p>
					<p class="mb-1">✓ Clear import paths showing relationships</p>
					<p>✓ Architecture diagrams derived from code, not imagined</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Name Things Honestly</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Names should describe function, not obscure it. A function called
					<code class="bg-surface px-1 rounded">processData</code> is opaque.
					<code class="bg-surface px-1 rounded">calculateMonthlyRevenue</code> is transparent.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Verb + noun naming (getUserById, sendNotification)</p>
					<p class="mb-1">✓ No abbreviations that require lookup</p>
					<p>✓ File names that predict contents</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Honest Materials</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Use materials for what they are, not to simulate something else.
					Concrete should look like concrete. A database should behave like a database.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ HTML for structure, CSS for style, JS for behavior</p>
					<p class="mb-1">✓ Types that reflect actual data shapes</p>
					<p>✓ APIs that expose, not hide, underlying capabilities</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Eliminate Magic</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Every "magical" behavior should be traceable. If something happens
					automatically, the trigger should be visible. No spooky action at a distance.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Explicit over implicit configuration</p>
					<p class="mb-1">✓ Visible side effects in function signatures</p>
					<p>✓ Clear cause-effect chains in event handling</p>
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
					<li>• Building shared libraries or APIs</li>
					<li>• Onboarding new team members</li>
					<li>• Debugging is taking too long</li>
					<li>• Documentation keeps getting out of sync</li>
					<li>• Users ask "how does this work?"</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Balance With</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Appropriate abstraction (not everything exposed)</li>
					<li>• User-facing simplicity (internal transparency)</li>
					<li>• Security boundaries (some things should hide)</li>
					<li>• Progressive disclosure for complex systems</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference: Understanding Graphs</h2>

		<div class="border border-canon p-8">
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-xl-canon font-semibold mb-2">UNDERSTANDING.md</h3>
					<p class="text-sm-canon opacity-50-canon">Functional transparency for codebases</p>
				</div>
			</div>

			<div class="space-y-4 text-sm-canon opacity-60-canon mb-8">
				<p>
					The Understanding Graphs paper demonstrates functional transparency applied
					to codebase navigation. Instead of hiding dependency relationships in
					tooling, UNDERSTANDING.md files expose them in plain markdown.
				</p>
				<p>
					Every package declares: what it depends on (and why), what depends on it
					(and for what), and where to start reading. The structure is the documentation.
				</p>
			</div>

			<div class="border-t border-canon pt-6">
				<a
					href="https://createsomething.io/papers/understanding-graphs"
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs-canon font-mono opacity-50-canon hover:opacity-100 transition-opacity"
				>
					Read the paper →
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/dwelling-in-tools" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Dwelling in Tools</h3>
				<p class="text-sm-canon opacity-60-canon">
					Transparency enables dwelling. When you see how tools work, they become extensions of thought.
				</p>
			</a>

			<a href="/patterns/code-mode" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Code Mode</h3>
				<p class="text-sm-canon opacity-60-canon">
					Code is transparent by nature. The instructions are visible. The mechanism is the message.
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

	.text-2xl-canon {
		font-size: var(--text-h2);
	}

	.text-3xl-canon {
		font-size: var(--text-h1);
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

	.opacity-80-canon {
		color: var(--color-fg-secondary);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}

	.border-emphasis {
		border-color: var(--color-border-emphasis);
	}

	.border-hover {
		border-color: var(--color-border-emphasis);
	}

	.divide-canon > * + * {
		border-color: var(--color-border-default);
	}

	/* Backgrounds */
	.bg-surface-subtle {
		background: var(--color-bg-subtle);
	}

	.bg-surface {
		background: var(--color-bg-surface);
	}

	/* Semantic colors */
	.text-success {
		color: #4ade80;
	}

	.text-error {
		color: #f87171;
	}

	.text-warning {
		color: #fbbf24;
	}

	.bg-success-subtle {
		background: rgba(74, 222, 128, 0.05);
	}

	.bg-success-muted {
		background: rgba(74, 222, 128, 0.1);
	}

	.bg-error-subtle {
		background: rgba(248, 113, 113, 0.05);
	}

	.bg-error-muted {
		background: rgba(248, 113, 113, 0.1);
	}

	.bg-warning-subtle {
		background: rgba(251, 191, 36, 0.05);
	}

	.bg-warning-muted {
		background: rgba(251, 191, 36, 0.1);
	}

	.border-success {
		border-color: rgba(74, 222, 128, 0.2);
	}

	.border-error {
		border-color: rgba(248, 113, 113, 0.2);
	}

	.border-warning {
		border-color: rgba(251, 191, 36, 0.2);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}

	table {
		border-color: var(--color-border-default);
	}

	thead {
		border-color: var(--color-border-default);
	}
</style>
