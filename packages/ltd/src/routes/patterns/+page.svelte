<svelte:head>
	<title>Patterns — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Common patterns and anti-patterns in applying 'less, but better.' Repeating solutions from the masters."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-4xl mx-auto text-center">
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">The Canon</p>
		<h1 class="mb-6">Patterns</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Repeating solutions from the masters. How "less, but better" manifests across domains.
		</p>
	</div>
</section>

<!-- Good Patterns -->
<section class="py-16 px-6">
	<div class="max-w-5xl mx-auto">
		<h2 class="mb-12">Patterns to Embrace</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- Pattern: Constraint as Liberation -->
			<a href="/patterns/constraint-as-liberation" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Constraint as Liberation</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Limitation breeds creativity. Rams' 10 principles. Mies' steel and glass. The Eameses' plywood.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Limited color palette</p>
					<p class="mb-1">✓ Restricted component library</p>
					<p>✓ Fixed grid system</p>
				</div>
			</a>

			<!-- Pattern: Functional Transparency -->
			<a href="/patterns/functional-transparency" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Functional Transparency</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					How something works should be evident. No mystery. No magic. Honest materials, honest code.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Exposed structure (like Eames chairs)</p>
					<p class="mb-1">✓ Self-documenting APIs</p>
					<p>✓ Clear dependency graphs</p>
				</div>
			</a>

			<!-- Pattern: Iterative Reduction -->
			<a href="/patterns/iterative-reduction" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Iterative Reduction</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Start complex, remove relentlessly. Rams revised his designs dozens of times. So should you.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Ship, measure, simplify</p>
					<p class="mb-1">✓ Kill features based on usage</p>
					<p>✓ Refactor toward clarity</p>
				</div>
			</a>

			<!-- Pattern: Universal Utility -->
			<a href="/patterns/universal-utility" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Universal Utility</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					The Eameses' "the best for the most for the least." Tools should serve everyone without compromise.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Accessibility by default</p>
					<p class="mb-1">✓ Progressive enhancement</p>
					<p>✓ Zero-config options</p>
				</div>
			</a>

			<!-- Pattern: Timeless Materials -->
			<a href="/patterns/timeless-materials" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Timeless Materials</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Choose what ages well. Avoid trends. Mies used steel because it endures. What's the steel of software?
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Web standards over frameworks</p>
					<p class="mb-1">✓ SQL over NoSQL (for most cases)</p>
					<p>✓ HTTP over proprietary protocols</p>
				</div>
			</a>

			<!-- Pattern: Negative Space -->
			<a href="/patterns/negative-space" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Negative Space</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					What you don't build matters as much as what you do. Whitespace in design. Silence in music. Restraint in code.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Generous margins and padding</p>
					<p class="mb-1">✓ Sparse UI with clear hierarchy</p>
					<p>✓ Functions that do one thing</p>
				</div>
			</a>

			<!-- Pattern: Tool Complementarity -->
			<a href="/patterns/tool-complementarity" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Tool Complementarity</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Tools should not compete for the same ontological space. Each has a domain. Heidegger's Zuhandenheit—ready-to-hand tools recede from consciousness.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Clear boundaries between tools</p>
					<p class="mb-1">✓ Handoff protocols, not redundancy</p>
					<p>✓ Creation vs. operation domains</p>
				</div>
			</a>

			<!-- Pattern: Dwelling in Tools -->
			<a href="/patterns/dwelling-in-tools" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Dwelling in Tools</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Build habits that make tools transparent. A carpenter forgets the hammer exists. Infrastructure should be invisible.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Workflows that become automatic</p>
					<p class="mb-1">✓ Configuration once, use forever</p>
					<p>✓ Minimize conspicuousness, obtrusiveness, obstinacy</p>
				</div>
			</a>

			<!-- Pattern: Principled Defaults -->
			<a href="/patterns/principled-defaults" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Principled Defaults</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Every configuration value traces to a principle. Arbitrary numbers are decoration in disguise. 20px padding? Why 20?
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Spacing from golden ratio (1.618rem)</p>
					<p class="mb-1">✓ Colors from functional meaning, not trends</p>
					<p>✓ Typography from readability research</p>
				</div>
			</a>

			<!-- Pattern: Subtractive Triad Audit -->
			<a href="/patterns/subtractive-triad-audit" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Subtractive Triad Audit</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Three questions at three levels. DRY for implementation, Rams for artifacts, Heidegger for systems. Apply in order.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ "Have I built this before?" → Unify</p>
					<p class="mb-1">✓ "Does this earn its existence?" → Remove</p>
					<p>✓ "Does this serve the whole?" → Reconnect</p>
				</div>
			</a>

			<!-- Pattern: Hermeneutic Spiral -->
			<a href="/patterns/hermeneutic-spiral" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Hermeneutic Spiral</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Understanding accumulates—it doesn't reset. Each interaction deepens context. Parts inform the whole; the whole informs the parts.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Remember what you learn, ask only what's new</p>
					<p class="mb-1">✓ Delta intake over stateless repetition</p>
					<p>✓ Returning users encounter evolved context</p>
				</div>
			</a>

			<!-- Pattern: Code Mode -->
			<a href="/patterns/code-mode" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-3">Code Mode</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Tools recede when expressed as code. Heidegger's Zuhandenheit—ready-to-hand tools disappear into familiar patterns. The hammer vanishes when hammering.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Write code that uses tools as libraries</p>
					<p class="mb-1">✓ Familiar grammar enables tool-transparency</p>
					<p>✓ Compose operations, don't invoke schemas</p>
				</div>
			</a>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-5xl mx-auto">
		<h2 class="mb-6">Reference Implementation</h2>
		<p class="text-base-canon opacity-60-canon mb-12 max-w-3xl">
			How patterns combine in practice. A terminal configuration applying hermeneutic analysis.
		</p>

		<div class="border border-canon p-8">
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-xl-canon font-semibold mb-2">Terminal as Dwelling</h3>
					<p class="text-sm-canon opacity-50-canon">WezTerm + Shell Configuration</p>
				</div>
				<div class="text-xs-canon opacity-40-canon font-mono text-right">
					<p>Patterns applied: 5</p>
					<p>Elements removed: 2</p>
					<p>Values derived: 4</p>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
				<!-- What was derived -->
				<div>
					<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Derived from Canon</h4>
					<div class="space-y-3 text-xs-canon font-mono opacity-50-canon">
						<div class="flex justify-between">
							<span>font_size</span>
							<span>15pt ← canonical body (16-20px)</span>
						</div>
						<div class="flex justify-between">
							<span>line_height</span>
							<span>1.5 ← canonical body (1.5-1.6)</span>
						</div>
						<div class="flex justify-between">
							<span>padding</span>
							<span>26px ← golden ratio (--space-md)</span>
						</div>
						<div class="flex justify-between">
							<span>colors</span>
							<span>muted ← functional, not iOS</span>
						</div>
					</div>
				</div>

				<!-- What was removed -->
				<div>
					<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Removed (Failed Justification)</h4>
					<div class="space-y-3 text-xs-canon font-mono opacity-50-canon">
						<div class="flex justify-between">
							<span class="line-through">Claude launcher</span>
							<span>feature creep</span>
						</div>
						<div class="flex justify-between">
							<span class="line-through">Resize keybindings</span>
							<span>system conflict</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Patterns demonstrated -->
			<div class="border-t border-canon pt-6">
				<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Patterns Demonstrated</h4>
				<div class="flex flex-wrap gap-2">
					<span class="text-xs-canon px-3 py-1 border border-emphasis">Dwelling in Tools</span>
					<span class="text-xs-canon px-3 py-1 border border-emphasis">Principled Defaults</span>
					<span class="text-xs-canon px-3 py-1 border border-emphasis">Iterative Reduction</span>
					<span class="text-xs-canon px-3 py-1 border border-emphasis">Constraint as Liberation</span>
					<span class="text-xs-canon px-3 py-1 border border-emphasis">Functional Transparency</span>
				</div>
			</div>

			<!-- The hermeneutic test -->
			<div class="border-t border-canon pt-6 mt-6">
				<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Hermeneutic Verification</h4>
				<div class="text-xs-canon opacity-50-canon space-y-2">
					<p><strong>Part → Whole:</strong> Does this config reveal the CREATE SOMETHING ethos? Yes—black/white palette, mathematical spacing, no decoration.</p>
					<p><strong>Whole → Part:</strong> Can every value trace to canon? Yes—typography, spacing, colors all derive from .ltd standards.</p>
					<p><strong>Circle Closes:</strong> The tool recedes. The user dwells. Zuhandenheit achieved.</p>
				</div>
			</div>

			<!-- Source -->
			<div class="border-t border-canon pt-6 mt-6">
				<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Source</h4>
				<a
					href="https://github.com/createsomethingtoday/create-something-monorepo/tree/main/terminal"
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs-canon font-mono opacity-50-canon hover:opacity-100 transition-opacity"
				>
					/terminal/wezterm.lua · shell-config.zsh
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Anti-Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-5xl mx-auto">
		<h2 class="mb-12">Anti-Patterns to Avoid</h2>

		<div class="space-y-6">
			<!-- Anti-Pattern: Feature Creep -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Feature Creep</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Adding features because you can, not because users need them. Every addition requires justification.
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Start with core functionality. Add only what proves necessary.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Decorative Complexity -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Decorative Complexity</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Ornamentation that serves ego, not users. Animations without purpose. Gradients for "visual interest."
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Every visual element must communicate or assist. Otherwise, remove it.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Trend Chasing -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Trend Chasing</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Adopting the latest framework, design style, or methodology because it's popular. This ages poorly.
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Choose based on fundamental principles. Trends fade. Standards endure.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Premature Abstraction -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Premature Abstraction</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Building for hypothetical future use cases. Creating frameworks before you have two examples.
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Wait for the pattern to emerge three times. Then abstract.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Metric Vanity -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Metric Vanity</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Optimizing for engagement, clicks, or growth over utility. Users as numbers instead of people.
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Measure what matters. Completion rates. Error reduction. Time saved.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Dishonest Documentation -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Dishonest Documentation</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Hiding limitations. Cherry-picking results. Marketing copy disguised as research.
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Document failures alongside successes. Honest metrics. Transparent methodology.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Tool Redundancy -->
			<div class="border border-error bg-error-subtle p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl-canon">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg-canon font-semibold mb-2">Tool Redundancy</h3>
						<p class="text-sm-canon opacity-70-canon mb-3">
							Multiple tools competing for the same task. Confusion about which to use. Duplicated capabilities without differentiation.
						</p>
						<div class="text-xs-canon opacity-50-canon">
							<strong>Instead:</strong> Assign clear domains. Define handoff protocols. Eliminate overlap.
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Pattern Recognition -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Recognizing Patterns in Your Work</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				The masters didn't invent these patterns—they discovered them through decades of practice. You'll find them too.
			</p>

			<p>
				When you remove a feature and the product gets better, that's <strong>Iterative Reduction</strong>.
			</p>

			<p>
				When constraints force you to solve a problem elegantly, that's <strong>Constraint as Liberation</strong>.
			</p>

			<p>
				When code needs no comments because the structure is self-evident, that's <strong>Functional Transparency</strong>.
			</p>

			<p>
				When you stop asking "which tool should I use?" because each has a clear domain, that's <strong>Tool Complementarity</strong>.
			</p>

			<p>
				When a returning user doesn't have to repeat themselves because the system remembers, that's the <strong>Hermeneutic Spiral</strong>.
			</p>

			<p>
				When you write code that uses tools as libraries and forget you're invoking an API, that's <strong>Code Mode</strong>.
			</p>

			<div class="mt-12 p-6 border border-canon">
				<p class="text-sm-canon opacity-60-canon italic">
					"The ability to simplify means to eliminate the unnecessary so that the necessary may speak."
				</p>
				<p class="text-xs-canon opacity-40-canon mt-2">— Hans Hofmann</p>
			</div>
		</div>
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
