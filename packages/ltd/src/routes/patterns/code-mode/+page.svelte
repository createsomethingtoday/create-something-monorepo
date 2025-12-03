<script lang="ts">
	/**
	 * Code Mode
	 *
	 * Code as the primary medium of creation. Not a translation of
	 * design, but design itself. The tool becomes transparent when
	 * the syntax becomes fluent.
	 */
</script>

<svelte:head>
	<title>Code Mode — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Code as the primary medium of creation. Not a translation of design, but design itself. When syntax becomes fluent, the tool becomes transparent."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm opacity-40 hover:opacity-70 transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Pattern</p>
		<h1 class="mb-6">Code Mode</h1>
		<p class="text-xl opacity-70 leading-relaxed">
			Code as the primary medium of creation. Not a translation of design, but design itself.
			When syntax becomes fluent, the tool becomes transparent.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-white/10">
			<p class="text-lg opacity-70 italic">
				"The medium is the message."
			</p>
			<p class="text-sm opacity-40 mt-2">— Marshall McLuhan</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base opacity-70 leading-relaxed">
			<p>
				<strong>Code Mode</strong> is the recognition that for certain practitioners,
				code is not a secondary artifact—a translation of design—but the primary
				medium of creation itself. The designer thinks in code. The configuration is code.
				The artifact is code that produces other artifacts.
			</p>

			<p>
				This mirrors how an architect thinks in spatial relationships, not in
				blueprint conventions. The blueprint is a notation for communicating,
				but the thinking happens in the medium. For code-native practitioners,
				a YAML configuration file is less natural than a TypeScript function.
			</p>

			<p>
				Code Mode enables Zuhandenheit—Heidegger's ready-to-hand relationship
				where the tool disappears into use. When syntax is fluent, attention
				flows through the code to the creation. The keyboard, the IDE, the
				language all recede. What remains is making.
			</p>

			<div class="p-6 border border-white/10 my-8">
				<p class="text-sm opacity-60 italic">
					"When you think in code, you create in code. The translation layer dissolves."
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
				<h3 class="text-lg font-semibold mb-3">Code as Configuration</h3>
				<p class="text-sm opacity-60 mb-4">
					Configuration files (YAML, JSON, INI) exist because code was considered
					too complex for non-programmers. For code-native practitioners, these
					formats add translation overhead. Use code for configuration.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ TypeScript over JSON where logic is needed</p>
					<p class="mb-1">✓ Functions over static declarations</p>
					<p>✓ Type safety and autocompletion as features</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Code as Design</h3>
				<p class="text-sm opacity-60 mb-4">
					For component-driven development, the component IS the design.
					A Figma mockup is a translation; the component is the source of truth.
					Design in the medium that will be shipped.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Components as design tokens</p>
					<p class="mb-1">✓ Storybook as design documentation</p>
					<p>✓ CSS-in-code over separate design files</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Code as Communication</h3>
				<p class="text-sm opacity-60 mb-4">
					Well-structured code communicates intent better than documentation.
					The code is the specification. Comments explain why, not what.
					Types document contracts.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Self-documenting function names</p>
					<p class="mb-1">✓ Types as API documentation</p>
					<p>✓ Tests as usage examples</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Fluency Enables Dwelling</h3>
				<p class="text-sm opacity-60 mb-4">
					Code Mode requires fluency—keyboard shortcuts, language idioms,
					tooling mastery. Investment in fluency pays dividends in flow.
					The unfluent user constantly fights the medium.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Master one language deeply before broadening</p>
					<p class="mb-1">✓ Learn IDE shortcuts until automatic</p>
					<p>✓ Let syntax become invisible through practice</p>
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
					<li>• The team is code-fluent</li>
					<li>• Configuration has logic or conditions</li>
					<li>• Type safety adds value</li>
					<li>• The code IS the deliverable</li>
					<li>• Iteration speed matters</li>
				</ul>
			</div>

			<div class="p-6 bg-yellow-500/5 border border-yellow-500/20">
				<h3 class="text-lg font-semibold text-yellow-300 mb-4">Consider Alternatives</h3>
				<ul class="space-y-2 text-sm opacity-70">
					<li>• Non-programmers need to edit configuration</li>
					<li>• Visual design requires visual tools</li>
					<li>• Domain experts aren't code-fluent</li>
					<li>• Collaboration spans skill sets</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Example -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Code Mode in Practice</h2>

		<div class="border border-white/10 p-8">
			<h3 class="text-xl font-semibold mb-6">Configuration Comparison</h3>

			<div class="grid md:grid-cols-2 gap-6 mb-6">
				<div>
					<p class="text-xs opacity-40 mb-2">YAML (Translation Mode)</p>
					<div class="bg-white/5 p-4 font-mono text-xs opacity-60">
						<p>routes:</p>
						<p>&nbsp;&nbsp;- path: /api/users</p>
						<p>&nbsp;&nbsp;&nbsp;&nbsp;method: GET</p>
						<p>&nbsp;&nbsp;&nbsp;&nbsp;handler: getUsers</p>
						<p>&nbsp;&nbsp;- path: /api/users/:id</p>
						<p>&nbsp;&nbsp;&nbsp;&nbsp;method: GET</p>
						<p>&nbsp;&nbsp;&nbsp;&nbsp;handler: getUser</p>
					</div>
				</div>
				<div>
					<p class="text-xs opacity-40 mb-2">TypeScript (Code Mode)</p>
					<div class="bg-white/5 p-4 font-mono text-xs opacity-60">
						<p>const routes = [</p>
						<p>&nbsp;&nbsp;get('/api/users', getUsers),</p>
						<p>&nbsp;&nbsp;get('/api/users/:id', getUser),</p>
						<p>] as const;</p>
						<p class="opacity-40 mt-2">// Type-safe, composable, refactorable</p>
					</div>
				</div>
			</div>

			<p class="text-sm opacity-50">
				The TypeScript version is shorter, type-safe, and works with existing
				refactoring tools. For a code-fluent team, it's the natural choice.
			</p>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference: Claude Code as Code Mode</h2>

		<div class="border border-white/10 p-8">
			<p class="text-sm opacity-60 mb-6">
				The CREATE SOMETHING methodology uses Claude Code as the primary
				creation interface—code mode embodied. Natural language becomes
				the input; code becomes the output. The AI recedes; the creation emerges.
			</p>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="p-4 bg-white/5">
					<div class="font-mono text-sm mb-2">Creation Domain</div>
					<div class="text-xs opacity-50">Claude Code writes, refactors, understands</div>
				</div>
				<div class="p-4 bg-white/5">
					<div class="font-mono text-sm mb-2">Execution Domain</div>
					<div class="text-xs opacity-50">WezTerm deploys, monitors, validates</div>
				</div>
			</div>

			<p class="text-sm opacity-50 mt-6">
				Clear boundaries. Creation in one tool, execution in another.
				Tool complementarity enables code mode for creation.
			</p>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/dwelling-in-tools" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Dwelling in Tools</h3>
				<p class="text-sm opacity-60">
					Code Mode enables dwelling. Fluent syntax lets the tool disappear.
				</p>
			</a>

			<a href="/patterns/tool-complementarity" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Tool Complementarity</h3>
				<p class="text-sm opacity-60">
					Code Mode is the domain for creation. Other domains serve other purposes.
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
