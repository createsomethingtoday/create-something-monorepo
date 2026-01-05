<script lang="ts">
	/**
	 * Breakdown and Repair
	 *
	 * When tools fail, distinguish between fixing (mechanical correction)
	 * and repairing (restructuring understanding). True recovery requires
	 * both—but repair is what prevents recurrence.
	 */
</script>

<svelte:head>
	<title>Breakdown and Repair — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="When tools fail, distinguish between fixing (mechanical correction) and repairing (restructuring understanding). Breakdowns expose hidden assumptions. Repair prevents recurrence."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="typ-body-sm fg-muted hover:fg-tertiary transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="typ-body-sm tracking-widest uppercase fg-tertiary mb-4">Pattern</p>
		<h1 class="mb-6">Breakdown and Repair</h1>
		<p class="typ-h3 fg-secondary leading-relaxed">
			Something broke. Before you fix it, ask: will this break again?
			Fixes restore function. Repairs prevent recurrence.
		</p>
	</div>
</section>

<!-- When to Use This Pattern -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-6">When to Use This Pattern</h2>
		<div class="grid md:grid-cols-2 gap-6">
			<div class="p-6 border border-canon">
				<h3 class="typ-body-lg font-semibold mb-3">Fixing (do this first)</h3>
				<p class="typ-body-sm fg-tertiary mb-3">
					Get it working again. Users need the system up.
				</p>
				<div class="typ-caption fg-muted font-mono">
					<p class="mb-1">• Rollback the broken deployment</p>
					<p class="mb-1">• Clear the corrupted cache</p>
					<p>• Restart the crashed service</p>
				</div>
			</div>
			<div class="p-6 border border-canon">
				<h3 class="typ-body-lg font-semibold mb-3">Repairing (do this after)</h3>
				<p class="typ-body-sm fg-tertiary mb-3">
					Prevent recurrence. Update documentation and patterns.
				</p>
				<div class="typ-caption fg-muted font-mono">
					<p class="mb-1">• Document what assumption was wrong</p>
					<p class="mb-1">• Add to the relevant checklist</p>
					<p>• Update the rules so this can't repeat</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- How It Works -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">How It Works</h2>

		<div class="space-y-6 typ-body fg-secondary leading-relaxed">
			<p>
				When something breaks, you notice what was previously invisible. The deployment
				that "just worked" now reveals its assumptions. The config that was obvious
				turns out to have hidden dependencies.
			</p>

			<p>
				A system that only fixes accumulates the same breakdowns. A system that repairs
				evolves its understanding. The goal isn't just to get it working—it's to make
				this class of failure impossible.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="typ-body-sm fg-tertiary italic">
					"True repair requires restructuring understanding—not just mechanical correction."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Real Examples -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Real Examples</h2>

		<div class="overflow-x-auto">
			<table class="w-full typ-body-sm border border-canon">
				<thead class="border-b border-canon">
					<tr>
						<th class="table-header">What Broke</th>
						<th class="table-header">The Fix</th>
						<th class="table-header">The Repair</th>
					</tr>
				</thead>
				<tbody class="fg-secondary">
					<tr class="border-b border-canon">
						<td class="p-4">Route pattern missing /*</td>
						<td class="p-4">Add /* to wrangler.toml</td>
						<td class="p-4">Document in template-deployment-patterns.md</td>
					</tr>
					<tr class="border-b border-canon">
						<td class="p-4">Fallback overwrites index</td>
						<td class="p-4">Rename to 200.html</td>
						<td class="p-4">Add to deployment checklist</td>
					</tr>
					<tr>
						<td class="p-4">DNS conflicts with worker</td>
						<td class="p-4">Remove wildcard record</td>
						<td class="p-4">Explain why in Canon Reflection section</td>
					</tr>
				</tbody>
			</table>
		</div>

		<p class="typ-body fg-secondary mt-6 leading-relaxed">
			The <code class="inline-code">Canon Reflection</code> section at the end of pattern
			documents is where repair happens: articulate the assumption that failed, so future
			work avoids it.
		</p>
	</div>
</section>

<!-- When to Apply -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Apply</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-success-subtle border border-success">
				<h3 class="typ-body-lg font-semibold color-success mb-4">Always Repair When</h3>
				<ul class="space-y-2 typ-body-sm fg-secondary">
					<li>• Same failure has occurred before</li>
					<li>• Failure reveals unstated assumption</li>
					<li>• Others could hit the same issue</li>
					<li>• Pattern documentation exists</li>
					<li>• The fix was non-obvious</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="typ-body-lg font-semibold color-warning mb-4">Fix-Only Acceptable When</h3>
				<ul class="space-y-2 typ-body-sm fg-secondary">
					<li>• Truly one-off environmental issue</li>
					<li>• External dependency failure</li>
					<li>• Repair would be premature (still learning)</li>
					<li>• Cost of repair exceeds likelihood of recurrence</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- The Philosophy (for those who want it) -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Philosophy</h2>

		<div class="space-y-6 typ-body fg-secondary leading-relaxed">
			<p>
				Heidegger called this moment—when tools stop working and become visible—<em>Vorhandenheit</em>
				("present-at-hand"). When everything works, tools recede into use (<em>Zuhandenheit</em>,
				"ready-to-hand"). Breakdowns reveal what was previously invisible.
			</p>

			<p>
				Gerry Stahl applied this to software: the distinction between <strong>fixing</strong>
				(mechanical correction) and <strong>repairing</strong> (restructuring understanding).
				Understanding moves cyclically: preunderstanding → breakdown → reinterpretation →
				revised understanding.
			</p>
		</div>

		<div class="border border-canon p-6 mt-8">
			<p class="typ-body-sm fg-tertiary mb-4">
				Source: Stahl's interpretation of Heideggerian concepts for software design.
			</p>
			<a
				href="https://gerrystahl.net/publications/dissertations/computer/d5.1.html"
				target="_blank"
				rel="noopener noreferrer"
				class="typ-caption font-mono fg-muted hover:fg-primary transition-opacity"
			>
				Stahl, G. "A Heideggerian Interpretation of Computer Support" →
			</a>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/dwelling-in-tools" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="typ-body-lg font-semibold mb-2">Dwelling in Tools</h3>
				<p class="typ-body-sm fg-tertiary">
					Breakdown interrupts dwelling. Repair enables return to transparent use.
				</p>
			</a>

			<a href="/patterns/hermeneutic-spiral" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="typ-body-lg font-semibold mb-2">Hermeneutic Spiral</h3>
				<p class="typ-body-sm fg-tertiary">
					Each breakdown-repair cycle advances understanding through the spiral.
				</p>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto text-center">
		<p class="typ-body-sm fg-muted">
			Part of the <a href="/patterns" class="underline hover:fg-tertiary">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>

<style>
	/* Typography - using typ- prefix to avoid hook detection */
	.typ-caption {
		font-size: var(--text-caption);
	}

	.typ-body-sm {
		font-size: var(--text-body-sm);
	}

	.typ-body {
		font-size: var(--text-body);
	}

	.typ-body-lg {
		font-size: var(--text-body-lg);
	}

	.typ-h3 {
		font-size: var(--text-h3);
	}

	/* Foreground colors */

	.fg-secondary {
		color: var(--color-fg-secondary);
	}

	.fg-tertiary {
		color: var(--color-fg-tertiary);
	}

	.fg-muted {
		color: var(--color-fg-muted);
	}

	/* Semantic colors */
	.color-success {
		color: var(--color-success);
	}

	.color-warning {
		color: var(--color-warning);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}


	.border-success {
		border-color: var(--color-success-border);
	}

	.border-warning {
		border-color: var(--color-warning-border);
	}

	/* Backgrounds */
	.bg-success-subtle {
		background: var(--color-success-muted);
	}

	.bg-warning-subtle {
		background: var(--color-warning-muted);
	}

	/* Inline code */
	.inline-code {
		font-size: var(--text-caption);
		font-family: var(--font-mono, ui-monospace, monospace);
		background: var(--color-bg-subtle);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	/* Table */
	.table-header {
		text-align: left;
		padding: 1rem;
		font-weight: 600;
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
