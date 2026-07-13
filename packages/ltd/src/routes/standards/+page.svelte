<script lang="ts">
	import {
		PerformancePageSection,
		PerformanceThesisConditions,
		SEO,
		type PerformanceCondition
	} from '@create-something/canon';

	const standardReadiness: PerformanceCondition[] = [
		{
			label: 'Clarity',
			title: 'Visible',
			detail: 'Offer, audience, trust signal, and next action resolve in the first viewport.',
			tone: 'signal'
		},
		{
			label: 'Proof',
			title: 'Attached',
			detail: 'Every material claim points to an artifact, result, source, or operating boundary.',
			tone: 'growth'
		},
		{
			label: 'Pressure',
			title: 'Reviewed',
			detail: 'Mobile, failure, permission, and recovery states are checked before release.',
			tone: 'pressure'
		}
	];
</script>

<SEO
	title="Operational Standards"
	description="Canonical criteria for evaluating CREATE SOMETHING pages, workflows, and deliverables before they ship."
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Standards', url: 'https://createsomething.ltd/standards' }
	]}
/>

<PerformancePageSection
	variant="hero"
	titleLevel="h1"
	eyebrow="The Canon"
	title="Make standards visible."
	description="Codified criteria for evaluating pages, workflows, experiments, and deliverables. The reader should see the rule, the proof, and the next action."
	ariaLabel="The Canon standards opening"
/>

<PerformanceThesisConditions
	eyebrow="Operational standard"
	title="Standards must survive contact."
	description="The system is ready only when the rule is visible, the proof is attached, and the pressured state has been reviewed."
	conditions={standardReadiness}
	ariaLabel="Performance Lab interface standards"
/>

<!-- Core Standards -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Universal Standards</h2>

		<div class="space-y-8">
			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">1. Justification</h3>
				<p class="opacity-70-canon leading-relaxed">
					Every element must justify its existence. If it cannot, consider removing it. Decoration often obscures meaning. Complexity often signals unclear thinking.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">2. Clarity</h3>
				<p class="opacity-70-canon leading-relaxed">
					Purpose must be immediately clear. Users should understand without explanation. Code should read like prose.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">3. Honesty</h3>
				<p class="opacity-70-canon leading-relaxed">
					Metrics must be accurate. Claims must be verifiable. Failures must be documented alongside successes.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">4. Longevity</h3>
				<p class="opacity-70-canon leading-relaxed">
					Build for years, not quarters. Solutions should age well. Avoid trends. Embrace timeless principles.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">5. Unobtrusiveness</h3>
				<p class="opacity-70-canon leading-relaxed">
					Tools serve users, not egos. The best interface is invisible. The best code requires no comments.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Platform Conviction Standard -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Platform Conviction Standard</h2>
		<p class="opacity-70-canon leading-relaxed mb-8">
			A platform claim is canonical only when it names a deliberate current choice and proves that
			the surrounding system remains owned. Apply
			<a href="/canon/concepts/conviction-without-dependence">Conviction Without Dependence</a>
			before publishing vendor-specific language.
		</p>

		<div class="space-y-8">
			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">1. Current Default</h3>
				<p class="opacity-70-canon leading-relaxed">
					Name the model or agent environment in current use and the evidence that makes it the default.
					Do not turn the supplier into the company category.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">2. Owned Boundary</h3>
				<p class="opacity-70-canon leading-relaxed">
					Show which data, MCP contracts, harness behavior, skills, prompts, policy, evals, receipts, and
					recovery artifacts remain under organizational control.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">3. Tested Exit</h3>
				<p class="opacity-70-canon leading-relaxed">
					Document model routing, fallback, and rollback. Portability is not proven until the same policy
					and golden tasks can evaluate another hosted, open-weight, or custom model.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">4. Relationship Accuracy</h3>
				<p class="opacity-70-canon leading-relaxed">
					Describe ordinary product use as product use. Partnership, certification, affiliation, resale,
					or endorsement language requires documentary authorization.
				</p>
			</div>
		</div>

		<div class="mt-8 border border-canon p-6 space-y-3">
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>The current platform is named without becoming the offer.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>The owned system is concrete enough to inspect and move.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>Routing, fallback, eval, and rollback evidence exists.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>No vendor relationship is implied beyond the available authority.</span>
			</label>
		</div>
	</div>
</section>

<!-- Clear Communication UI Standards -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Performance Lab UI</h2>
		<p class="opacity-70-canon leading-relaxed mb-8">
			Use CREATE SOMETHING Performance Lab as the active design reference: light operational
			surfaces, disciplined dark proof rooms, compact navigation, crisp borders, readable
			hierarchy, visible proof, readiness states, and direct action.
		</p>

		<div class="space-y-8">
			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">1. First-Screen Clarity</h3>
				<p class="opacity-70-canon leading-relaxed">
					The first viewport must answer what this is, who it is for, why it can be trusted, and what to do next. Do not require the reader to understand framework language before seeing the outcome.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">2. Proof Artifacts</h3>
				<p class="opacity-70-canon leading-relaxed">
					Every major claim needs a nearby artifact: workflow state, approval note, command output, delivery page, screenshot, run log, rollback note, or named system boundary.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">3. Readable Hierarchy</h3>
				<p class="opacity-70-canon leading-relaxed">
					Use one primary claim, one supporting paragraph, visible CTAs, and compact proof. Small panels need smaller type. Headline scale belongs to true page leads.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">4. Restrained Visual System</h3>
				<p class="opacity-70-canon leading-relaxed">
					Prefer light, legible surfaces, clear contrast, stable spacing, and visible boundaries. Effects must support comprehension, not mood.
				</p>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">5. No Decorative Complexity</h3>
				<p class="opacity-70-canon leading-relaxed">
					Remove abstract panels, empty visual weight, and hidden animation states when they delay comprehension. If an element does not name work, show proof, or move the user to a decision, cut it.
				</p>
			</div>
		</div>

		<div class="mt-8 border border-canon p-6 space-y-3">
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>The first viewport contains the offer, audience, trust signal, and next action.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>The concrete workflow appears before abstract framework language.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>Every major claim has proof or an operational example nearby.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>Text, buttons, and proof panels do not overlap on mobile or desktop.</span>
			</label>
			<label class="flex items-start gap-3 cursor-pointer">
				<input type="checkbox" class="mt-1" disabled />
				<span>Visual effects are restrained enough that the reader sees the work first.</span>
			</label>
		</div>
	</div>
</section>

<!-- Domain-Specific Standards -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-5xl mx-auto">
		<h2 class="mb-12 text-center">Standards Across the Ecosystem</h2>

		<div class="space-y-12">
			<!-- .io Standards -->
			<div class="border border-canon p-8">
				<div class="mb-6">
					<span class="text-xs-canon font-mono opacity-40-canon">.io</span>
					<h3 class="text-2xl-canon font-semibold mt-2">Research Standards</h3>
				</div>

				<ul class="space-y-4 text-base-canon opacity-70-canon">
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Every paper must answer: <strong>Is this useful?</strong> Not interesting, not novel—useful.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Findings must be <strong>reproducible</strong>. Methodology transparent. Metrics honest.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Writing serves the reader. <strong>Clarity over cleverness.</strong> Simple language over jargon.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>If a principle from .ltd applies, cite it. <strong>Connect theory to the lineage.</strong></span>
					</li>
				</ul>
			</div>

			<!-- .space Standards -->
			<div class="border border-canon p-8">
				<div class="mb-6">
					<span class="text-xs-canon font-mono opacity-40-canon">.space</span>
					<h3 class="text-2xl-canon font-semibold mt-2">Practice Standards</h3>
				</div>

				<ul class="space-y-4 text-base-canon opacity-70-canon">
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Every experiment must <strong>teach a principle</strong>, not just a technique.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Interfaces are minimal. <strong>Zero decoration.</strong> Only essential feedback.</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Success is completion, not clicks. <strong>Measure learning, not engagement.</strong></span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Link to .io for depth, to .ltd for philosophy. <strong>Practice without context is shallow.</strong></span>
					</li>
				</ul>
			</div>

			<!-- .agency Standards -->
			<div class="border border-canon p-8">
				<div class="mb-6">
					<span class="text-xs-canon font-mono opacity-40-canon">.agency</span>
					<h3 class="text-2xl-canon font-semibold mt-2">Service Standards</h3>
				</div>

				<ul class="space-y-4 text-base-canon opacity-70-canon">
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Delivered work must meet canonical standards. <strong>No shortcuts, no compromises.</strong></span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Solutions solve problems. <strong>Not features for features' sake.</strong></span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Documentation is complete. Code is readable. <strong>Future maintainers are users too.</strong></span>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span>Case studies cite which .ltd principles were applied. <strong>Proof, not just claims.</strong></span>
					</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- CSS Architecture Standard -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">CSS Architecture</h2>

		<div class="space-y-6 text-lg-canon opacity-80-canon leading-relaxed">
			<p>
				<strong>Tailwind for structure, Canon for aesthetics.</strong> This separation resolves the hermeneutic tension between utility frameworks and design tokens.
			</p>

			<p>
				The canon defines design tokens as CSS custom properties in <code class="text-sm-canon bg-surface px-2 py-1">app.css</code>. These are the ontological ground—what things <em>are</em> in this system. Tailwind introduces a parallel ontology that competes with the canon.
			</p>
		</div>

		<!-- Mobile Card Layout -->
		<div class="responsive-table-cards mt-8">
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Layout</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Tailwind</span>
						<span class="responsive-table-card-value text-success">✓ Use</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Canon</span>
						<span class="responsive-table-card-value opacity-50-canon">Not defined</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Border Radius</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Tailwind</span>
						<span class="responsive-table-card-value text-error">✗ Avoid</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Canon</span>
						<span class="responsive-table-card-value text-success">var(--radius-performance-scale-*)</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Colors</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Tailwind</span>
						<span class="responsive-table-card-value text-error">✗ Avoid</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Canon</span>
						<span class="responsive-table-card-value text-success">var(--color-performance-*)</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Spacing</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Tailwind</span>
						<span class="responsive-table-card-value text-warning">~ Acceptable</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Canon</span>
						<span class="responsive-table-card-value text-success">var(--space-performance-*)</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Typography</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Tailwind</span>
						<span class="responsive-table-card-value text-error">✗ Avoid</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Canon</span>
						<span class="responsive-table-card-value text-success">var(--text-performance-*)</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Shadows</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Tailwind</span>
						<span class="responsive-table-card-value text-error">✗ Avoid</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Canon</span>
						<span class="responsive-table-card-value text-success">var(--shadow-performance-*)</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Desktop Table Layout -->
		<div class="responsive-table-wrapper mt-8 border border-canon">
			<table class="responsive-table">
				<thead class="border-b border-canon">
					<tr>
						<th>Category</th>
						<th>Tailwind</th>
						<th>Canon</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-canon">
					<tr>
						<td class="font-medium">Layout</td>
						<td class="text-success">✓ Use</td>
						<td class="opacity-50-canon">Not defined</td>
					</tr>
					<tr>
						<td class="font-medium">Border Radius</td>
						<td class="text-error">✗ Avoid</td>
						<td class="text-success">var(--radius-performance-scale-*)</td>
					</tr>
					<tr>
						<td class="font-medium">Colors</td>
						<td class="text-error">✗ Avoid</td>
						<td class="text-success">var(--color-performance-*)</td>
					</tr>
					<tr>
						<td class="font-medium">Spacing</td>
						<td class="text-warning">~ Acceptable</td>
						<td class="text-success">var(--space-performance-*)</td>
					</tr>
					<tr>
						<td class="font-medium">Typography</td>
						<td class="text-error">✗ Avoid</td>
						<td class="text-success">var(--text-performance-*)</td>
					</tr>
					<tr>
						<td class="font-medium">Shadows</td>
						<td class="text-error">✗ Avoid</td>
						<td class="text-success">var(--shadow-performance-*)</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="mt-8 space-y-6">
			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">Layout Utilities (Keep)</h3>
				<p class="opacity-70-canon leading-relaxed mb-3">
					Tailwind's layout utilities don't conflict with the canon because CSS Flexbox and Grid are universal primitives, not design decisions.
				</p>
				<code class="text-sm-canon opacity-60-canon font-mono">flex, grid, items-center, justify-between, relative, absolute, w-full, gap-*</code>
			</div>

			<div class="border-l-2 border-emphasis pl-6">
				<h3 class="text-xl-canon font-semibold mb-3">Design Utilities (Migrate)</h3>
				<p class="opacity-70-canon leading-relaxed mb-3">
					Design utilities compete with canonical tokens. Use CSS custom properties instead to maintain hermeneutic coherence.
				</p>
				<code class="text-sm-canon opacity-60-canon font-mono">rounded-*, bg-*, text-*, border-*, shadow-* → var(--*)</code>
			</div>
		</div>

		<div class="mt-8 p-6 border border-canon bg-surface-subtle">
			<p class="text-sm-canon font-mono opacity-60-canon mb-4">The Principle:</p>
			<p class="text-lg-canon italic opacity-80-canon">
				"Tailwind provides syntax for structure. The canon provides semantics for aesthetics. When they compete, the canon wins."
			</p>
		</div>
	</div>
</section>

<!-- Evaluation Checklist -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Evaluation Checklist</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon">
			<p>Before shipping any work, ask:</p>

			<div class="border border-canon p-6 space-y-3">
				<label class="flex items-start gap-3 cursor-pointer">
					<input type="checkbox" class="mt-1" disabled />
					<span>Can I remove anything without losing function?</span>
				</label>
				<label class="flex items-start gap-3 cursor-pointer">
					<input type="checkbox" class="mt-1" disabled />
					<span>Will this be clear to someone unfamiliar with the project?</span>
				</label>
				<label class="flex items-start gap-3 cursor-pointer">
					<input type="checkbox" class="mt-1" disabled />
					<span>Are the metrics honest and verifiable?</span>
				</label>
				<label class="flex items-start gap-3 cursor-pointer">
					<input type="checkbox" class="mt-1" disabled />
					<span>Will this work still be useful in 5 years?</span>
				</label>
				<label class="flex items-start gap-3 cursor-pointer">
					<input type="checkbox" class="mt-1" disabled />
					<span>Does it align with at least one principle from the canon?</span>
				</label>
				<label class="flex items-start gap-3 cursor-pointer">
					<input type="checkbox" class="mt-1" disabled />
					<span>Do design values use canonical tokens, not Tailwind utilities?</span>
				</label>
			</div>

			<p class="text-sm-canon opacity-60-canon italic pt-4">
				If any answer is "no," consider what needs to change before shipping.
			</p>
		</div>
	</div>
</section>

<style>
	/* Typography */
	.text-xs-canon {
		font-size: var(--text-performance-caption);
	}

	.text-sm-canon {
		font-size: var(--text-performance-body-sm);
	}

	.text-base-canon {
		font-size: var(--text-performance-body);
	}

	.text-lg-canon {
		font-size: var(--text-performance-body-lg);
	}

	.text-xl-canon {
		font-size: var(--text-performance-h3);
	}

	.text-2xl-canon {
		font-size: var(--text-performance-h2);
	}

	/* Opacity as color tokens */
	.opacity-40-canon {
		color: var(--color-performance-fg-muted);
	}

	.opacity-50-canon {
		color: var(--color-performance-fg-muted);
	}

	.opacity-60-canon {
		color: var(--color-performance-fg-tertiary);
	}

	.opacity-70-canon {
		color: var(--color-performance-fg-secondary);
	}

	.opacity-80-canon {
		color: var(--color-performance-fg-secondary);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-performance-border-default);
	}

	/* Backgrounds */
	.bg-surface-subtle {
		background: var(--color-performance-bg-subtle);
	}

	/* Semantic colors - using Canon tokens */
	.text-success {
		color: var(--color-performance-success);
	}

	.text-error {
		color: var(--color-performance-error);
	}

	.text-warning {
		color: var(--color-performance-warning);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-performance-border-default);
	}
</style>
