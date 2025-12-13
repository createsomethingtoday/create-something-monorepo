<script lang="ts">
	/**
	 * Tool Complementarity
	 *
	 * Tools should not compete for the same ontological space.
	 * Each has a domain. Clear boundaries. Handoff protocols.
	 */
</script>

<svelte:head>
	<title>Tool Complementarity — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Tools should not compete for the same ontological space. Clear boundaries between tools. Handoff protocols, not redundancy. Creation vs. operation domains."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Tool Complementarity</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Tools should not compete for the same ontological space. Each has a domain.
			Clear boundaries. Handoff protocols, not redundancy.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"Equipment is essentially 'something in-order-to...' A totality of equipment
				is constituted by various ways of the 'in-order-to.'"
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Heidegger, Being and Time</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				<strong>Tool Complementarity</strong> means each tool has a distinct purpose that
				doesn't overlap with others. The hammer is for hammering; the saw is for sawing.
				You don't debate which to use—the task determines the tool.
			</p>

			<p>
				In Heidegger's analysis, tools form a "totality of equipment"—an interconnected
				system where each tool points to others. The hammer refers to the nail, the nail
				to the wood, the wood to the house. Tools don't compete; they complement.
			</p>

			<p>
				Software tools should follow this principle. If two tools can accomplish the
				same task, confusion arises. The user must stop and think: "Which do I use?"
				This breaks flow. Clear domains eliminate the question.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"When tools have clear domains, the question 'which tool?' never arises."
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
				<h3 class="text-lg-canon font-semibold mb-3">Non-Overlapping Domains</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Each tool owns a clear territory. When domains threaten to overlap,
					redraw boundaries or eliminate redundancy.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Claude Code for creation, WezTerm for execution</p>
					<p class="mb-1">✓ Notion for documents, GitHub for code</p>
					<p>✓ One tool per job, not "also works for..."</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Handoff Protocols</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Where tools meet, define explicit handoffs. The output of one becomes
					the input of another. Clear interfaces, not blurred responsibilities.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ "Claude writes, user deploys"</p>
					<p class="mb-1">✓ API contracts between services</p>
					<p>✓ Documented transition points</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Totality of Equipment</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Tools should reference each other, forming a coherent system.
					The design tool points to the development tool, which points to
					the deployment tool. A complete chain.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Tools that integrate, not isolate</p>
					<p class="mb-1">✓ Shared data formats and protocols</p>
					<p>✓ Workflow that flows through tools naturally</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Eliminate Redundancy</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Two tools for the same purpose creates confusion and maintenance burden.
					Choose one. Commit. Eliminate the other.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Regular audit of tool overlap</p>
					<p class="mb-1">✓ Deprecation paths for redundant tools</p>
					<p>✓ Single source of truth for each function</p>
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
					<li>• Users ask "which tool should I use?"</li>
					<li>• Multiple tools solve the same problem</li>
					<li>• Workflow friction at tool boundaries</li>
					<li>• Maintenance burden is duplicated</li>
					<li>• Onboarding involves tool choice paralysis</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Consider When</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Overlap provides resilience</li>
					<li>• Different contexts need different tools</li>
					<li>• Migration is in progress</li>
					<li>• User expertise varies widely</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference: CREATE SOMETHING Domains</h2>

		<div class="border border-canon p-8">
			<h3 class="text-xl-canon font-semibold mb-6">The Four Properties</h3>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div class="p-4 bg-surface-subtle text-center">
					<div class="font-mono text-lg-canon mb-1">.ltd</div>
					<div class="text-xs-canon opacity-50-canon">Canon</div>
				</div>
				<div class="p-4 bg-surface-subtle text-center">
					<div class="font-mono text-lg-canon mb-1">.io</div>
					<div class="text-xs-canon opacity-50-canon">Research</div>
				</div>
				<div class="p-4 bg-surface-subtle text-center">
					<div class="font-mono text-lg-canon mb-1">.space</div>
					<div class="text-xs-canon opacity-50-canon">Practice</div>
				</div>
				<div class="p-4 bg-surface-subtle text-center">
					<div class="font-mono text-lg-canon mb-1">.agency</div>
					<div class="text-xs-canon opacity-50-canon">Service</div>
				</div>
			</div>

			<p class="text-sm-canon opacity-60-canon">
				Each property has a clear domain. Philosophy goes to .ltd. Research goes to .io.
				Experiments go to .space. Client work goes to .agency. The question "where does
				this belong?" always has one answer.
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
					Clear domains enable dwelling. When you know which tool to use, you can master it.
				</p>
			</a>

			<a href="/patterns/code-mode" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Code Mode</h3>
				<p class="text-sm-canon opacity-60-canon">
					Code Mode is the domain for tool-mediated action. Tool calling has its own domain.
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
