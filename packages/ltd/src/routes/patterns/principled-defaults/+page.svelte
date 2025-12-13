<script lang="ts">
	/**
	 * Principled Defaults
	 *
	 * Every configuration value traces to a principle.
	 * Arbitrary numbers are decoration in disguise.
	 */
</script>

<svelte:head>
	<title>Principled Defaults — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Every configuration value traces to a principle. No arbitrary numbers. Spacing from golden ratio. Colors from functional meaning. Typography from readability research."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Principled Defaults</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Every configuration value traces to a principle. No arbitrary numbers.
			20px padding—why 20? If you can't answer, it's decoration.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"Indifference towards people and the reality in which they live
				is actually the one and only cardinal sin in design."
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
				<strong>Principled Defaults</strong> means every value in a system can be
				traced to a reason. Not "20px because it looks good" but "20px because
				it's the base unit (16px) multiplied by 1.25 (minor third)."
			</p>

			<p>
				This isn't pedantry—it's design honesty. Arbitrary values are hidden opinions.
				Principled values are explicit decisions. When you can explain why, you can
				also explain when to deviate and when not to.
			</p>

			<p>
				The CREATE SOMETHING design system derives all values from principles:
				typography from readability research, spacing from mathematical ratios,
				colors from functional meaning. Nothing is arbitrary. Everything traces.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"If you can't explain the principle behind the value, the value is arbitrary."
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
				<h3 class="text-lg-canon font-semibold mb-3">Typography from Research</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Line height, measure (line length), and font size derive from readability
					studies. Optimal reading: 16-20px body, 45-75 characters per line, 1.5-1.6 line height.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Body: 18px (within 16-20px optimal)</p>
					<p class="mb-1">✓ Measure: 65ch (within 45-75ch optimal)</p>
					<p>✓ Line height: 1.6 (within 1.5-1.6 optimal)</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Spacing from Ratios</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Use mathematical ratios: golden ratio (1.618), modular scales,
					or consistent base units. Spacing values should relate to each other.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Base unit: 16px</p>
					<p class="mb-1">✓ Scale: × 0.618, × 1, × 1.618, × 2.618</p>
					<p>✓ All spacing derived from scale (10px, 16px, 26px, 42px)</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Colors from Function</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Colors should have meaning, not just aesthetics. Error is red not because
					red is pretty but because red signals danger. Green means success.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Primary: white (pure information)</p>
					<p class="mb-1">✓ Secondary: white/80 (supporting content)</p>
					<p>✓ Muted: white/40 (de-emphasized)</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Trace Every Value</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Document the principle behind each value. If a value can't be traced,
					question whether it should exist.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Design tokens with documented rationale</p>
					<p class="mb-1">✓ Comments explaining "why" not "what"</p>
					<p>✓ Review process that questions arbitrary values</p>
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
					<li>• Creating design systems</li>
					<li>• Establishing configuration defaults</li>
					<li>• Values will be reused across projects</li>
					<li>• Multiple people will make design decisions</li>
					<li>• Consistency matters long-term</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Balance With</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Practical constraints (sometimes 20px just works)</li>
					<li>• Exploration phase (find principles through iteration)</li>
					<li>• Context-specific overrides</li>
					<li>• Pragmatism over dogmatism</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Example -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Derivation Example</h2>

		<div class="border border-canon p-8">
			<h3 class="text-xl-canon font-semibold mb-6">Spacing Scale Derivation</h3>

			<div class="overflow-x-auto">
				<table class="w-full text-sm-canon">
					<thead>
						<tr class="border-b border-canon">
							<th class="text-left py-2 pr-4 font-semibold">Token</th>
							<th class="text-left py-2 pr-4 font-semibold">Value</th>
							<th class="text-left py-2 font-semibold">Derivation</th>
						</tr>
					</thead>
					<tbody class="opacity-70-canon font-mono text-xs-canon">
						<tr class="border-b border-canon">
							<td class="py-2 pr-4">--space-xs</td>
							<td class="py-2 pr-4">10px</td>
							<td class="py-2">16 × 0.618 ≈ 10</td>
						</tr>
						<tr class="border-b border-canon">
							<td class="py-2 pr-4">--space-sm</td>
							<td class="py-2 pr-4">16px</td>
							<td class="py-2">Base unit (1rem)</td>
						</tr>
						<tr class="border-b border-canon">
							<td class="py-2 pr-4">--space-md</td>
							<td class="py-2 pr-4">26px</td>
							<td class="py-2">16 × 1.618 ≈ 26</td>
						</tr>
						<tr class="border-b border-canon">
							<td class="py-2 pr-4">--space-lg</td>
							<td class="py-2 pr-4">42px</td>
							<td class="py-2">16 × 2.618 ≈ 42</td>
						</tr>
						<tr>
							<td class="py-2 pr-4">--space-xl</td>
							<td class="py-2 pr-4">68px</td>
							<td class="py-2">16 × 4.236 ≈ 68</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p class="text-sm-canon opacity-50-canon mt-6">
				Every spacing value derives from base unit (16px) × golden ratio powers.
				No arbitrary values. Complete traceability.
			</p>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/constraint-as-liberation" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Constraint as Liberation</h3>
				<p class="text-sm-canon opacity-60-canon">
					Principles become constraints. Derivation rules limit options, enabling focus.
				</p>
			</a>

			<a href="/patterns/dwelling-in-tools" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Dwelling in Tools</h3>
				<p class="text-sm-canon opacity-60-canon">
					Principled defaults require less adjustment, enabling tool-dwelling.
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
