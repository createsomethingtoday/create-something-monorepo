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
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Subtractive Triad Audit</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Three questions at three levels. DRY asks about implementation.
			Rams asks about the artifact. Heidegger asks about the whole.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"Weniger, aber besser."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Dieter Rams</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
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

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"Creation is the discipline of removing what obscures."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- The Three Levels -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Three Levels</h2>

		<div class="space-y-8">
			<div class="border border-canon p-6">
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl-canon font-mono opacity-40-canon">1</span>
					<div>
						<h3 class="text-lg-canon font-semibold">DRY — Implementation</h3>
						<p class="text-sm-canon opacity-50-canon">Don't Repeat Yourself</p>
					</div>
				</div>
				<p class="text-sm-canon opacity-60-canon mb-4">
					<strong>Question:</strong> "Have I built this before?"
				</p>
				<p class="text-sm-canon opacity-60-canon mb-4">
					<strong>Action:</strong> Unify. Find the abstraction that eliminates
					duplication without premature generalization.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Extract shared functions and components</p>
					<p class="mb-1">✓ Consolidate configuration</p>
					<p>✓ Single source of truth for each concept</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl-canon font-mono opacity-40-canon">2</span>
					<div>
						<h3 class="text-lg-canon font-semibold">Rams — Artifact</h3>
						<p class="text-sm-canon opacity-50-canon">Weniger, aber besser</p>
					</div>
				</div>
				<p class="text-sm-canon opacity-60-canon mb-4">
					<strong>Question:</strong> "Does this earn its existence?"
				</p>
				<p class="text-sm-canon opacity-60-canon mb-4">
					<strong>Action:</strong> Remove. If something doesn't serve an essential
					function, it shouldn't exist.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Every feature must justify itself</p>
					<p class="mb-1">✓ Decoration is guilt until proven innocent</p>
					<p>✓ Fewer, better elements</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<div class="flex items-center gap-4 mb-4">
					<span class="text-2xl-canon font-mono opacity-40-canon">3</span>
					<div>
						<h3 class="text-lg-canon font-semibold">Heidegger — System</h3>
						<p class="text-sm-canon opacity-50-canon">The Hermeneutic Circle</p>
					</div>
				</div>
				<p class="text-sm-canon opacity-60-canon mb-4">
					<strong>Question:</strong> "Does this serve the whole?"
				</p>
				<p class="text-sm-canon opacity-60-canon mb-4">
					<strong>Action:</strong> Reconnect. Every part must serve the system,
					and the system must give meaning to each part.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Parts reference each other coherently</p>
					<p class="mb-1">✓ Nothing is orphaned or purposeless</p>
					<p>✓ The whole is revealed through its parts</p>
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
					<li>• Reviewing any significant creation</li>
					<li>• Code review or design critique</li>
					<li>• Deciding what to remove</li>
					<li>• System architecture decisions</li>
					<li>• Onboarding new work to existing systems</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Critical Order</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
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
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Audit Example: Component Library</h2>

		<div class="border border-canon p-8">
			<h3 class="text-xl-canon font-semibold mb-6">Auditing a Button Component</h3>

			<div class="space-y-6">
				<div class="border-l-2 border-emphasis pl-4">
					<p class="text-sm-canon font-semibold mb-2">Level 1: DRY</p>
					<p class="text-xs-canon opacity-60-canon mb-2">
						Are there other button-like components? Does PrimaryButton duplicate
						SecondaryButton logic? Can we unify into one Button with variants?
					</p>
					<p class="text-xs-canon opacity-40-canon font-mono">→ Unify: One Button component with variant prop</p>
				</div>

				<div class="border-l-2 border-emphasis pl-4">
					<p class="text-sm-canon font-semibold mb-2">Level 2: Rams</p>
					<p class="text-xs-canon opacity-60-canon mb-2">
						Does every prop earn its existence? Is the "loading" state needed,
						or is it decoration? What about the icon slot?
					</p>
					<p class="text-xs-canon opacity-40-canon font-mono">→ Remove: Drop unused size="xl" variant</p>
				</div>

				<div class="border-l-2 border-emphasis pl-4">
					<p class="text-sm-canon font-semibold mb-2">Level 3: Heidegger</p>
					<p class="text-xs-canon opacity-60-canon mb-2">
						Does Button connect to the design system's purpose? Does it reference
						typography tokens? Does it enable the product vision?
					</p>
					<p class="text-xs-canon opacity-40-canon font-mono">→ Reconnect: Derive from semantic color tokens</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference: WORKWAY SDK Audit</h2>

		<div class="border border-canon p-8">
			<p class="text-sm-canon opacity-60-canon mb-6">
				The Subtractive Triad Audit was applied to the WORKWAY SDK integration
				to determine what to include in the CREATE SOMETHING ecosystem.
			</p>

			<div class="grid md:grid-cols-3 gap-4 text-center">
				<div class="p-4 bg-surface-subtle">
					<div class="text-2xl-canon font-mono mb-1 text-success">DRY</div>
					<div class="text-xs-canon opacity-50-canon">Unified canon patterns</div>
				</div>
				<div class="p-4 bg-surface-subtle">
					<div class="text-2xl-canon font-mono mb-1 text-success">Rams</div>
					<div class="text-xs-canon opacity-50-canon">Removed redundant features</div>
				</div>
				<div class="p-4 bg-surface-subtle">
					<div class="text-2xl-canon font-mono mb-1 text-success">Heidegger</div>
					<div class="text-xs-canon opacity-50-canon">Reconnected to triad</div>
				</div>
			</div>

			<div class="border-t border-canon pt-6 mt-6">
				<a
					href="/experiments/workway-sdk-canon-audit"
					class="text-xs-canon font-mono opacity-50-canon hover:opacity-100 transition-opacity"
				>
					View full audit →
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
			<a href="/patterns/iterative-reduction" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Iterative Reduction</h3>
				<p class="text-sm-canon opacity-60-canon">
					The triad guides each reduction cycle. Apply, reduce, repeat.
				</p>
			</a>

			<a href="/patterns/hermeneutic-spiral" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Hermeneutic Spiral</h3>
				<p class="text-sm-canon opacity-60-canon">
					The third level of the triad—ensuring parts serve the whole.
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
