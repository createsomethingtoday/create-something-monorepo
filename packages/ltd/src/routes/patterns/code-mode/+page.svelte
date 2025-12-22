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
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Code Mode</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Code as the primary medium of creation. Not a translation of design, but design itself.
			When syntax becomes fluent, the tool becomes transparent.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"The medium is the message."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Marshall McLuhan</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
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

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"When you think in code, you create in code. The translation layer dissolves."
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
				<h3 class="text-lg-canon font-semibold mb-3">Code as Configuration</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Configuration files (YAML, JSON, INI) exist because code was considered
					too complex for non-programmers. For code-native practitioners, these
					formats add translation overhead. Use code for configuration.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ TypeScript over JSON where logic is needed</p>
					<p class="mb-1">✓ Functions over static declarations</p>
					<p>✓ Type safety and autocompletion as features</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Code as Design</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					For component-driven development, the component IS the design.
					A Figma mockup is a translation; the component is the source of truth.
					Design in the medium that will be shipped.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Components as design tokens</p>
					<p class="mb-1">✓ Storybook as design documentation</p>
					<p>✓ CSS-in-code over separate design files</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Code as Communication</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Well-structured code communicates intent better than documentation.
					The code is the specification. Comments explain why, not what.
					Types document contracts.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Self-documenting function names</p>
					<p class="mb-1">✓ Types as API documentation</p>
					<p>✓ Tests as usage examples</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Fluency Enables Dwelling</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Code Mode requires fluency—keyboard shortcuts, language idioms,
					tooling mastery. Investment in fluency pays dividends in flow.
					The unfluent user constantly fights the medium.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Master one language deeply before broadening</p>
					<p class="mb-1">✓ Learn IDE shortcuts until automatic</p>
					<p>✓ Let syntax become invisible through practice</p>
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
					<li>• The team is code-fluent</li>
					<li>• Configuration has logic or conditions</li>
					<li>• Type safety adds value</li>
					<li>• The code IS the deliverable</li>
					<li>• Iteration speed matters</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Consider Alternatives</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
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
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Code Mode in Practice</h2>

		<div class="border border-canon p-8">
			<h3 class="text-xl-canon font-semibold mb-6">Configuration Comparison</h3>

			<div class="grid md:grid-cols-2 gap-6 mb-6">
				<div>
					<p class="text-xs-canon opacity-40-canon mb-2">YAML (Translation Mode)</p>
					<div class="bg-surface-subtle p-4 font-mono text-xs-canon opacity-60-canon">
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
					<p class="text-xs-canon opacity-40-canon mb-2">TypeScript (Code Mode)</p>
					<div class="bg-surface-subtle p-4 font-mono text-xs-canon opacity-60-canon">
						<p>const routes = [</p>
						<p>&nbsp;&nbsp;get('/api/users', getUsers),</p>
						<p>&nbsp;&nbsp;get('/api/users/:id', getUser),</p>
						<p>] as const;</p>
						<p class="opacity-40-canon mt-2">// Type-safe, composable, refactorable</p>
					</div>
				</div>
			</div>

			<p class="text-sm-canon opacity-50-canon">
				The TypeScript version is shorter, type-safe, and works with existing
				refactoring tools. For a code-fluent team, it's the natural choice.
			</p>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference: Claude Code as Code Mode</h2>

		<div class="border border-canon p-8">
			<p class="text-sm-canon opacity-60-canon mb-6">
				The CREATE SOMETHING methodology uses Claude Code as the primary
				creation interface—code mode embodied. Natural language becomes
				the input; code becomes the output. The AI recedes; the creation emerges.
			</p>

			<div class="grid md:grid-cols-2 gap-4">
				<div class="p-4 bg-surface-subtle">
					<div class="font-mono text-sm-canon mb-2">Creation Domain</div>
					<div class="text-xs-canon opacity-50-canon">Claude Code writes, refactors, understands</div>
				</div>
				<div class="p-4 bg-surface-subtle">
					<div class="font-mono text-sm-canon mb-2">Execution Domain</div>
					<div class="text-xs-canon opacity-50-canon">WezTerm deploys, monitors, validates</div>
				</div>
			</div>

			<p class="text-sm-canon opacity-50-canon mt-6">
				Clear boundaries. Creation in one tool, execution in another.
				Tool complementarity enables code mode for creation.
			</p>
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
					Code Mode enables dwelling. Fluent syntax lets the tool disappear.
				</p>
			</a>

			<a href="/patterns/tool-complementarity" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Tool Complementarity</h3>
				<p class="text-sm-canon opacity-60-canon">
					Code Mode is the domain for creation. Other domains serve other purposes.
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
		background: var(--color-success-muted);
	}

	.bg-success-muted {
		background: var(--color-success-muted);
	}

	.bg-error-subtle {
		background: var(--color-error-muted);
	}

	.bg-error-muted {
		background: var(--color-error-muted);
	}

	.bg-warning-subtle {
		background: var(--color-warning-muted);
	}

	.bg-warning-muted {
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

	table {
		border-color: var(--color-border-default);
	}

	thead {
		border-color: var(--color-border-default);
	}
</style>
