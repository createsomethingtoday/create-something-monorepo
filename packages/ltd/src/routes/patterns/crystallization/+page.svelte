<script lang="ts">
	/**
	 * Crystallization
	 *
	 * Encode human judgment into configurable constraints.
	 * AI executes within those constraints. One human scales infinitely.
	 */
</script>

<svelte:head>
	<title>Crystallization — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Curated autonomy: crystallize human judgment into configurable constraints. One expert's judgment scales through AI execution."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Crystallization</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Encode human judgment into configurable constraints. AI executes within those constraints.
			One expert's judgment scales through AI execution.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"Your judgment, crystallized."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— CREATE SOMETHING</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				<strong>Crystallization</strong> is the process of encoding human judgment—taste,
				philosophy, domain expertise—into configurable constraints that AI agents can execute.
				The expert doesn't disappear; they become infrastructure.
			</p>

			<p>
				This is <strong>curated autonomy</strong>: the human decides the boundaries, the AI
				works within them. Unlike "autonomous organizations without humans in the loop,"
				crystallization keeps human judgment central—it just doesn't require human presence
				for every decision.
			</p>

			<p>
				A legal expert crystallizes contract review criteria. A finance expert crystallizes
				audit trail requirements. A designer crystallizes aesthetic principles. The AI
				executes these judgments at scale.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"The question is not 'can AI do this?' but 'what judgment should guide how AI does this?'"
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Curated Autonomy vs. No Humans -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Curated Autonomy vs. Full Autonomy</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-success-subtle border border-success">
				<h3 class="text-lg-canon font-semibold text-success mb-4">Curated Autonomy</h3>
				<p class="text-sm-canon opacity-70-canon mb-4">
					Human judgment crystallized into constraints. AI executes within boundaries.
				</p>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Expert encodes quality criteria</li>
					<li>• AI executes at scale</li>
					<li>• Judgment persists across sessions</li>
					<li>• One human serves many</li>
					<li>• Constraints evolve with learning</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Full Autonomy</h3>
				<p class="text-sm-canon opacity-70-canon mb-4">
					"No humans in the loop." AI makes all decisions.
				</p>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• No quality criteria encoding</li>
					<li>• AI decides what "good" means</li>
					<li>• No domain expertise transfer</li>
					<li>• Humans are replaced, not scaled</li>
					<li>• Black box decision-making</li>
				</ul>
			</div>
		</div>

		<div class="mt-8 p-6 border border-canon">
			<p class="text-sm-canon opacity-70-canon">
				<strong>The difference:</strong> Crystallization answers "who decides what good looks like?"
				with "the human expert, once, forever." Full autonomy answers "the AI, every time, alone."
			</p>
		</div>
	</div>
</section>

<!-- What Gets Crystallized -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">What Gets Crystallized</h2>

		<div class="space-y-8">
			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Model Routing</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Which AI model handles which task. Cost optimization meets capability matching.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono bg-surface p-4">
					<p class="mb-1">modelRouting:</p>
					<p class="mb-1">  patterns:</p>
					<p class="mb-1">    haiku: [rename, typo, format]</p>
					<p class="mb-1">    opus: [architect, design, refactor]</p>
					<p>    sonnet: [add, update, fix]</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Quality Gates</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					What must pass before work is considered complete. Domain-specific criteria.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono bg-surface p-4">
					<p class="mb-1"># Legal domain example</p>
					<p class="mb-1">qualityGates:</p>
					<p class="mb-1">  custom:</p>
					<p class="mb-1">    - name: contract-validation</p>
					<p class="mb-1">      command: pnpm run validate:contracts</p>
					<p>      canBlock: true</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Review Criteria</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					What reviewers look for. Security, architecture, quality—with custom prompts.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono bg-surface p-4">
					<p class="mb-1">reviewers:</p>
					<p class="mb-1">  reviewers:</p>
					<p class="mb-1">    - id: compliance</p>
					<p class="mb-1">      type: custom</p>
					<p class="mb-1">      prompt: ./reviewers/compliance.md</p>
					<p>      canBlock: true</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Label Taxonomy</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					How work is categorized. Reflects organizational structure and priorities.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono bg-surface p-4">
					<p class="mb-1">labels:</p>
					<p class="mb-1">  scope: [agency, io, space, ltd]</p>
					<p>  type: [feature, bug, refactor, research]</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Domain Examples -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Domain Examples</h2>

		<div class="space-y-6">
			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Legal</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Contract review, compliance checking, redaction validation.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ contract-validation: Check clause requirements</p>
					<p class="mb-1">✓ redaction-check: Verify PII removal</p>
					<p>✓ compliance-review: Regulatory requirements</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Finance</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Audit trails, calculation verification, regulatory compliance.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ audit-trail: Ensure transaction logging</p>
					<p class="mb-1">✓ calculation-verify: Validate financial math</p>
					<p>✓ sox-compliance: SOX requirement checks</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Manufacturing</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Tolerance verification, BOM validation, quality control.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ tolerance-check: Verify specifications</p>
					<p class="mb-1">✓ bom-validation: Bill of materials accuracy</p>
					<p>✓ qc-inspection: Quality control criteria</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Design</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Canon compliance, accessibility, animation auditing.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ canon-audit: Design token compliance</p>
					<p class="mb-1">✓ a11y-check: WCAG requirements</p>
					<p>✓ motion-review: Animation purposefulness</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Implementation</h2>

		<div class="border border-canon p-8">
			<h3 class="text-xl-canon font-semibold mb-6">The Harness Config</h3>

			<p class="text-sm-canon opacity-60-canon mb-6">
				Place <code class="font-mono bg-surface px-2 py-1">harness.config.yaml</code> in your
				project root. The harness auto-discovers and applies it.
			</p>

			<div class="text-xs-canon opacity-70-canon font-mono bg-surface p-4 overflow-x-auto">
				<pre>{`version: "1.0"

modelRouting:
  default: sonnet
  complexity:
    trivial: haiku
    simple: sonnet
    standard: sonnet
    complex: opus
  patterns:
    haiku: [rename, typo, format]
    opus: [architect, design, refactor]

qualityGates:
  enabled: true
  builtIn:
    tests: true
    typecheck: true
    lint: true
  custom:
    - name: your-domain-check
      command: pnpm run validate
      canBlock: true

reviewers:
  enabled: true
  reviewers:
    - id: security
      type: security
      enabled: true
      canBlock: true
    - id: domain-expert
      type: custom
      prompt: ./reviewers/domain.md`}</pre>
			</div>

			<div class="mt-6 border-t border-canon pt-6">
				<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Usage</h4>
				<div class="text-xs-canon opacity-50-canon font-mono space-y-2">
					<p># Auto-discovers config</p>
					<p>harness work cs-xyz</p>
					<p></p>
					<p># Explicit config</p>
					<p>harness start spec.yaml --config custom.yaml</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Philosophy -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Philosophy</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				Crystallization is the Subtractive Triad applied to human judgment itself:
			</p>

			<div class="space-y-4 pl-6 border-l-2 border-canon">
				<p>
					<strong>DRY (Implementation):</strong> Encode judgment once, execute many times.
					Don't repeat the same quality decision for every task.
				</p>
				<p>
					<strong>Rams (Artifact):</strong> Only crystallize judgment that earns its existence.
					Not every preference needs to be a constraint.
				</p>
				<p>
					<strong>Heidegger (System):</strong> Crystallized judgment should serve the whole.
					Constraints that don't serve users get removed.
				</p>
			</div>

			<p>
				The hermeneutic circle applies: the crystallized config informs AI execution,
				AI execution reveals what needs crystallizing, which refines the config.
				Understanding deepens through the cycle.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"The goal is not to remove humans from the loop, but to make human judgment
					scale without requiring human presence for every decision."
				</p>
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
					<li>• Expert judgment should scale</li>
					<li>• Quality criteria are domain-specific</li>
					<li>• AI is executing, not deciding strategy</li>
					<li>• Consistency matters across executions</li>
					<li>• You want to serve many without being present</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Balance With</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Novel situations need fresh judgment</li>
					<li>• Over-constraint kills exploration</li>
					<li>• Some decisions should remain human</li>
					<li>• Crystallized != frozen (evolve the config)</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/principled-defaults" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Principled Defaults</h3>
				<p class="text-sm-canon opacity-60-canon">
					Every value traces to a principle. Crystallized judgment is principled by definition.
				</p>
			</a>

			<a href="/patterns/constraint-as-liberation" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Constraint as Liberation</h3>
				<p class="text-sm-canon opacity-60-canon">
					Crystallized constraints free AI to work without constant guidance.
				</p>
			</a>

			<a href="/patterns/dwelling-in-tools" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Dwelling in Tools</h3>
				<p class="text-sm-canon opacity-60-canon">
					Crystallized judgment enables tools to recede. The harness disappears; work remains.
				</p>
			</a>

			<a href="/patterns/hermeneutic-spiral" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Hermeneutic Spiral</h3>
				<p class="text-sm-canon opacity-60-canon">
					Crystallized configs evolve. Each execution informs the next refinement.
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

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}

	.border-hover {
		border-color: var(--color-border-emphasis);
	}

	/* Background */
	.bg-surface {
		background: var(--color-bg-surface);
	}

	/* Semantic colors */
	.text-success {
		color: var(--color-success);
	}

	.text-warning {
		color: var(--color-warning);
	}

	.bg-success-subtle {
		background: var(--color-success-muted);
	}

	.bg-warning-subtle {
		background: var(--color-warning-muted);
	}

	.border-success {
		border-color: var(--color-success-border);
	}

	.border-warning {
		border-color: var(--color-warning-border);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}

	pre {
		white-space: pre;
		overflow-x: auto;
	}
</style>
