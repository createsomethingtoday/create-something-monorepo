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
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm opacity-40 hover:opacity-70 transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Pattern</p>
		<h1 class="mb-6">Principled Defaults</h1>
		<p class="text-xl opacity-70 leading-relaxed">
			Every configuration value traces to a principle. No arbitrary numbers.
			20px padding—why 20? If you can't answer, it's decoration.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-white/10">
			<p class="text-lg opacity-70 italic">
				"Indifference towards people and the reality in which they live
				is actually the one and only cardinal sin in design."
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

			<div class="p-6 border border-white/10 my-8">
				<p class="text-sm opacity-60 italic">
					"If you can't explain the principle behind the value, the value is arbitrary."
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
				<h3 class="text-lg font-semibold mb-3">Typography from Research</h3>
				<p class="text-sm opacity-60 mb-4">
					Line height, measure (line length), and font size derive from readability
					studies. Optimal reading: 16-20px body, 45-75 characters per line, 1.5-1.6 line height.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Body: 18px (within 16-20px optimal)</p>
					<p class="mb-1">✓ Measure: 65ch (within 45-75ch optimal)</p>
					<p>✓ Line height: 1.6 (within 1.5-1.6 optimal)</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Spacing from Ratios</h3>
				<p class="text-sm opacity-60 mb-4">
					Use mathematical ratios: golden ratio (1.618), modular scales,
					or consistent base units. Spacing values should relate to each other.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Base unit: 16px</p>
					<p class="mb-1">✓ Scale: × 0.618, × 1, × 1.618, × 2.618</p>
					<p>✓ All spacing derived from scale (10px, 16px, 26px, 42px)</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Colors from Function</h3>
				<p class="text-sm opacity-60 mb-4">
					Colors should have meaning, not just aesthetics. Error is red not because
					red is pretty but because red signals danger. Green means success.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Primary: white (pure information)</p>
					<p class="mb-1">✓ Secondary: white/80 (supporting content)</p>
					<p>✓ Muted: white/40 (de-emphasized)</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Trace Every Value</h3>
				<p class="text-sm opacity-60 mb-4">
					Document the principle behind each value. If a value can't be traced,
					question whether it should exist.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Design tokens with documented rationale</p>
					<p class="mb-1">✓ Comments explaining "why" not "what"</p>
					<p>✓ Review process that questions arbitrary values</p>
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
					<li>• Creating design systems</li>
					<li>• Establishing configuration defaults</li>
					<li>• Values will be reused across projects</li>
					<li>• Multiple people will make design decisions</li>
					<li>• Consistency matters long-term</li>
				</ul>
			</div>

			<div class="p-6 bg-yellow-500/5 border border-yellow-500/20">
				<h3 class="text-lg font-semibold text-yellow-300 mb-4">Balance With</h3>
				<ul class="space-y-2 text-sm opacity-70">
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
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Derivation Example</h2>

		<div class="border border-white/10 p-8">
			<h3 class="text-xl font-semibold mb-6">Spacing Scale Derivation</h3>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-white/10">
							<th class="text-left py-2 pr-4 font-semibold">Token</th>
							<th class="text-left py-2 pr-4 font-semibold">Value</th>
							<th class="text-left py-2 font-semibold">Derivation</th>
						</tr>
					</thead>
					<tbody class="opacity-70 font-mono text-xs">
						<tr class="border-b border-white/10">
							<td class="py-2 pr-4">--space-xs</td>
							<td class="py-2 pr-4">10px</td>
							<td class="py-2">16 × 0.618 ≈ 10</td>
						</tr>
						<tr class="border-b border-white/10">
							<td class="py-2 pr-4">--space-sm</td>
							<td class="py-2 pr-4">16px</td>
							<td class="py-2">Base unit (1rem)</td>
						</tr>
						<tr class="border-b border-white/10">
							<td class="py-2 pr-4">--space-md</td>
							<td class="py-2 pr-4">26px</td>
							<td class="py-2">16 × 1.618 ≈ 26</td>
						</tr>
						<tr class="border-b border-white/10">
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

			<p class="text-sm opacity-50 mt-6">
				Every spacing value derives from base unit (16px) × golden ratio powers.
				No arbitrary values. Complete traceability.
			</p>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/constraint-as-liberation" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Constraint as Liberation</h3>
				<p class="text-sm opacity-60">
					Principles become constraints. Derivation rules limit options, enabling focus.
				</p>
			</a>

			<a href="/patterns/dwelling-in-tools" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Dwelling in Tools</h3>
				<p class="text-sm opacity-60">
					Principled defaults require less adjustment, enabling tool-dwelling.
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
