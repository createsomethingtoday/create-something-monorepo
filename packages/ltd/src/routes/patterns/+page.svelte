<svelte:head>
	<title>Patterns — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Common patterns and anti-patterns in applying 'less, but better.' Repeating solutions from the masters."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-4xl mx-auto text-center">
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">The Canon</p>
		<h1 class="mb-6">Patterns</h1>
		<p class="text-xl opacity-70 leading-relaxed">
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
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Constraint as Liberation</h3>
				<p class="text-sm opacity-60 mb-4">
					Limitation breeds creativity. Rams' 10 principles. Mies' steel and glass. The Eameses' plywood.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Limited color palette</p>
					<p class="mb-1">✓ Restricted component library</p>
					<p>✓ Fixed grid system</p>
				</div>
			</div>

			<!-- Pattern: Functional Transparency -->
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Functional Transparency</h3>
				<p class="text-sm opacity-60 mb-4">
					How something works should be evident. No mystery. No magic. Honest materials, honest code.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Exposed structure (like Eames chairs)</p>
					<p class="mb-1">✓ Self-documenting APIs</p>
					<p>✓ Clear dependency graphs</p>
				</div>
			</div>

			<!-- Pattern: Iterative Reduction -->
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Iterative Reduction</h3>
				<p class="text-sm opacity-60 mb-4">
					Start complex, remove relentlessly. Rams revised his designs dozens of times. So should you.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Ship, measure, simplify</p>
					<p class="mb-1">✓ Kill features based on usage</p>
					<p>✓ Refactor toward clarity</p>
				</div>
			</div>

			<!-- Pattern: Universal Utility -->
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Universal Utility</h3>
				<p class="text-sm opacity-60 mb-4">
					The Eameses' "the best for the most for the least." Tools should serve everyone without compromise.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Accessibility by default</p>
					<p class="mb-1">✓ Progressive enhancement</p>
					<p>✓ Zero-config options</p>
				</div>
			</div>

			<!-- Pattern: Timeless Materials -->
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Timeless Materials</h3>
				<p class="text-sm opacity-60 mb-4">
					Choose what ages well. Avoid trends. Mies used steel because it endures. What's the steel of software?
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Web standards over frameworks</p>
					<p class="mb-1">✓ SQL over NoSQL (for most cases)</p>
					<p>✓ HTTP over proprietary protocols</p>
				</div>
			</div>

			<!-- Pattern: Negative Space -->
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Negative Space</h3>
				<p class="text-sm opacity-60 mb-4">
					What you don't build matters as much as what you do. Whitespace in design. Silence in music. Restraint in code.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Generous margins and padding</p>
					<p class="mb-1">✓ Sparse UI with clear hierarchy</p>
					<p>✓ Functions that do one thing</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Anti-Patterns -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-5xl mx-auto">
		<h2 class="mb-12">Anti-Patterns to Avoid</h2>

		<div class="space-y-6">
			<!-- Anti-Pattern: Feature Creep -->
			<div class="border border-red-500/20 bg-red-500/5 p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg font-semibold mb-2">Feature Creep</h3>
						<p class="text-sm opacity-70 mb-3">
							Adding features because you can, not because users need them. Every addition requires justification.
						</p>
						<div class="text-xs opacity-50">
							<strong>Instead:</strong> Start with core functionality. Add only what proves necessary.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Decorative Complexity -->
			<div class="border border-red-500/20 bg-red-500/5 p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg font-semibold mb-2">Decorative Complexity</h3>
						<p class="text-sm opacity-70 mb-3">
							Ornamentation that serves ego, not users. Animations without purpose. Gradients for "visual interest."
						</p>
						<div class="text-xs opacity-50">
							<strong>Instead:</strong> Every visual element must communicate or assist. Otherwise, remove it.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Trend Chasing -->
			<div class="border border-red-500/20 bg-red-500/5 p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg font-semibold mb-2">Trend Chasing</h3>
						<p class="text-sm opacity-70 mb-3">
							Adopting the latest framework, design style, or methodology because it's popular. This ages poorly.
						</p>
						<div class="text-xs opacity-50">
							<strong>Instead:</strong> Choose based on fundamental principles. Trends fade. Standards endure.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Premature Abstraction -->
			<div class="border border-red-500/20 bg-red-500/5 p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg font-semibold mb-2">Premature Abstraction</h3>
						<p class="text-sm opacity-70 mb-3">
							Building for hypothetical future use cases. Creating frameworks before you have two examples.
						</p>
						<div class="text-xs opacity-50">
							<strong>Instead:</strong> Wait for the pattern to emerge three times. Then abstract.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Metric Vanity -->
			<div class="border border-red-500/20 bg-red-500/5 p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg font-semibold mb-2">Metric Vanity</h3>
						<p class="text-sm opacity-70 mb-3">
							Optimizing for engagement, clicks, or growth over utility. Users as numbers instead of people.
						</p>
						<div class="text-xs opacity-50">
							<strong>Instead:</strong> Measure what matters. Completion rates. Error reduction. Time saved.
						</div>
					</div>
				</div>
			</div>

			<!-- Anti-Pattern: Dishonest Documentation -->
			<div class="border border-red-500/20 bg-red-500/5 p-6">
				<div class="flex items-start gap-4">
					<span class="text-2xl">⚠</span>
					<div class="flex-1">
						<h3 class="text-lg font-semibold mb-2">Dishonest Documentation</h3>
						<p class="text-sm opacity-70 mb-3">
							Hiding limitations. Cherry-picking results. Marketing copy disguised as research.
						</p>
						<div class="text-xs opacity-50">
							<strong>Instead:</strong> Document failures alongside successes. Honest metrics. Transparent methodology.
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Pattern Recognition -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Recognizing Patterns in Your Work</h2>

		<div class="space-y-6 text-base opacity-70 leading-relaxed">
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

			<div class="mt-12 p-6 border border-white/10">
				<p class="text-sm opacity-60 italic">
					"The ability to simplify means to eliminate the unnecessary so that the necessary may speak."
				</p>
				<p class="text-xs opacity-40 mt-2">— Hans Hofmann</p>
			</div>
		</div>
	</div>
</section>
