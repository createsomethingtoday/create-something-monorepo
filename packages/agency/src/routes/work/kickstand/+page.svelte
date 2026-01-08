<script lang="ts">
	import { PageActions, MarkdownPreviewModal } from '@create-something/components';
	import { page } from '$app/stores';

	// Modal state
	let showMarkdownPreview = $state(false);
	let markdownContent = $state('');

	function handlePreview(markdown: string) {
		markdownContent = markdown;
		showMarkdownPreview = true;
	}

	// Extract full URL for metadata
	const fullUrl = $derived(`${$page.url.origin}${$page.url.pathname}`);

	// Construct comprehensive markdown content for export
	const workContent = $derived(`
## Challenge

Kickstand had grown organically over time, accumulating technical debt: 155 active scripts, 30 TypeScript errors, and documentation scattered across multiple formats. The system worked but was becoming difficult to maintain and extend.

**Initial assessment:**
- 155 active scripts (many redundant or orphaned)
- 30 TypeScript errors blocking type safety
- Documentation inconsistency across README, CLAUDE.md, ARCHITECTURE.md
- Health score: 6.2/10

## Solution: The Subtractive Triad

This project was the first formal application of the Subtractive Triad framework: DRY → Rams → Heidegger.

### The Three Levels:

**Level 1: DRY (Implementation)**
→ "Have I built this before?"
→ Action: Unify
→ Result: Consolidated 155 → 13 scripts

**Level 2: Rams (Artifact)**
→ "Does this earn its existence?"
→ Action: Remove
→ Result: Fixed 30 → 0 TypeScript errors

**Level 3: Heidegger (System)**
→ "Does this serve the whole?"
→ Action: Reconnect
→ Result: Unified documentation canon

**Key insight:** "Creation is the discipline of removing what obscures. Each level of the triad subtracts differently—duplication, excess, disconnection—but all reveal the same truth."

## Results

**Validated outcomes:**
- Removed 142 orphaned/redundant scripts (92% reduction)
- TypeScript strict mode enabled with zero errors (100% fix rate)
- Documentation unified into canonical UNDERSTANDING.md format
- 48% health score improvement (6.2 → 9.2)

### Cost Impact

**Before optimization:** $40/day (~$1,200/month projected)
**After optimization:** $39/month (97% reduction)

**Root causes identified:**
- 89% duplicate data (11,104 redundant records)
- Redundant API calls from orphaned scripts
- Missing deduplication in data pipeline

After optimization: same coverage of 100 venues, 4x daily monitoring, 97% lower cost.

## Pattern Validation

Kickstand was the first production application of the Subtractive Triad. The framework proved that systematic subtraction at three levels—implementation, artifact, system—yields compounding benefits.

The triad has since been formalized into the Kickstand Triad Audit experiment and documented in the CREATE SOMETHING canon.

---

**Full experiment documentation:** https://createsomething.io/experiments/kickstand-triad-audit
`);
</script>

<svelte:head>
	<title>Kickstand — Case Study | CREATE SOMETHING Agency</title>
	<meta
		name="description"
		content="155 scripts became 13. $40/day became $39/month. Health score: 6.2 to 9.2. A venue intelligence system that actually works."
	/>
</svelte:head>

<div class="page-container min-h-screen">
	<!-- Hero -->
	<section class="hero-section pt-32 pb-16 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="mb-6 flex items-center justify-between">
				<a href="/work" class="body-sm link-muted">← Back to Work</a>
				<PageActions
					title="Kickstand Case Study"
					content={workContent}
					metadata={{
						category: 'Venue Intelligence',
						sourceUrl: fullUrl,
						keywords: ['Subtractive Triad', 'DRY', 'Technical Debt', 'Cost Optimization', 'System Health']
					}}
					claudePrompt="Help me understand this case study and how to apply the Subtractive Triad to my own codebase."
					onpreview={handlePreview}
				/>
			</div>
			<p class="body-sm tracking-widest uppercase body-tertiary mb-4">Venue Intelligence</p>
			<h1 class="mb-6">Kickstand</h1>
			<p class="heading-2 body-tertiary leading-relaxed mb-8">
				155 scripts became 13. $40/day became $39/month. A system that works without anyone thinking about it.
			</p>
			<div class="flex flex-wrap gap-4 body-sm body-muted">
				<span>• 92% script reduction</span>
				<span>• 97% cost reduction</span>
				<span>• 48% health improvement</span>
			</div>
		</div>
	</section>

	<!-- Overview -->
	<section class="py-16 px-6">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">The Challenge</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					Kickstand had grown organically over time, accumulating technical debt: 155 active scripts,
					30 TypeScript errors, and documentation scattered across multiple formats. The system
					worked but was becoming difficult to maintain and extend.
				</p>

				<p><strong>Initial assessment:</strong></p>

				<ul class="space-y-3 body body-tertiary pl-6">
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>155 active scripts (many redundant or orphaned)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>30 TypeScript errors blocking type safety</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Documentation inconsistency across README, CLAUDE.md, ARCHITECTURE.md</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Health score: 6.2/10</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- The Subtractive Triad -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Applying the Subtractive Triad</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					This project was the first formal application of the <a
						href="https://createsomething.ltd/ethos"
						class="underline link-hover">Subtractive Triad</a
					> framework: DRY → Rams → Heidegger.
				</p>

				<div class="my-8 p-8 card-surface">
					<p class="body-sm font-mono body-tertiary mb-4">The Three Levels:</p>
					<pre class="body-sm body-tertiary font-mono leading-loose overflow-x-auto">
Level 1: DRY (Implementation)
  → "Have I built this before?"
  → Action: Unify
  → Result: Consolidated 155 → 13 scripts

Level 2: Rams (Artifact)
  → "Does this earn its existence?"
  → Action: Remove
  → Result: Fixed 30 → 0 TypeScript errors

Level 3: Heidegger (System)
  → "Does this serve the whole?"
  → Action: Reconnect
  → Result: Unified documentation canon
					</pre>
				</div>

				<p><strong>Key insight:</strong></p>
				<p class="italic body-tertiary">
					"Creation is the discipline of removing what obscures. Each level of the triad
					subtracts differently—duplication, excess, disconnection—but all reveal the same truth."
				</p>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Results</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">92%</p>
						<p class="body-sm metric-label">Script reduction</p>
						<p class="body-xs metric-sublabel mt-1">155 → 13</p>
					</div>
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">100%</p>
						<p class="body-sm metric-label">Type errors fixed</p>
						<p class="body-xs metric-sublabel mt-1">30 → 0</p>
					</div>
					<div class="text-center p-6 metric-card">
						<p class="heading-2 font-bold mb-2">9.2</p>
						<p class="body-sm metric-label">Health score</p>
						<p class="body-xs metric-sublabel mt-1">Up from 6.2</p>
					</div>
				</div>

				<p><strong>Validated outcomes:</strong></p>

				<ul class="space-y-3 body body-tertiary pl-6">
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>Removed 142 orphaned/redundant scripts</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>TypeScript strict mode enabled with zero errors</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>Documentation unified into canonical UNDERSTANDING.md format</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">✓</span>
						<span>48% health score improvement (6.2 → 9.2)</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Cost Impact -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Cost Impact</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
				<div class="text-center p-6 metric-card">
					<p class="heading-2 font-bold mb-2">$40/day</p>
					<p class="body-sm metric-label">Before optimization</p>
					<p class="body-xs metric-sublabel mt-1">~$1,200/month projected</p>
				</div>
				<div class="text-center p-6 metric-card">
					<p class="heading-2 font-bold mb-2">$39/mo</p>
					<p class="body-sm metric-label">After optimization</p>
					<p class="body-xs metric-sublabel mt-1">97% reduction</p>
				</div>
			</div>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					Runaway API costs were consuming <strong>$40/day</strong> before the Subtractive Triad audit
					identified inefficient scraping patterns and duplicate data accumulation.
				</p>

				<p><strong>Root causes identified:</strong></p>

				<ul class="space-y-3 body body-tertiary pl-6">
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>89% duplicate data (11,104 redundant records)</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Redundant API calls from orphaned scripts</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="body-subtle mt-1">—</span>
						<span>Missing deduplication in data pipeline</span>
					</li>
				</ul>

				<p>
					After optimization: same coverage of 100 venues, 4x daily monitoring, <strong>97% lower cost</strong>.
				</p>
			</div>
		</div>
	</section>

	<!-- Pattern Validation -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto">
			<h2 class="mb-8">Why This Validates the Triad</h2>

			<div class="space-y-6 body-lg leading-relaxed">
				<p>
					Kickstand was the first production application of the Subtractive Triad. The framework
					proved that systematic subtraction at three levels—implementation, artifact, system—yields
					compounding benefits.
				</p>

				<p>
					The triad has since been formalized into the <a
						href="https://createsomething.io/experiments/kickstand-triad-audit"
						class="underline link-hover">Kickstand Triad Audit experiment</a
					> and documented in the CREATE SOMETHING canon.
				</p>

				<p class="pt-6 body body-tertiary italic">
					Full experiment documentation available at <a
						href="https://createsomething.io/experiments/kickstand-triad-audit"
						class="underline link-hover-strong">createsomething.io</a
					>.
				</p>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="py-16 px-6 section-border">
		<div class="max-w-3xl mx-auto text-center">
			<h2 class="mb-6">Need a Codebase Audit?</h2>
			<p class="body-lg body-tertiary mb-8 leading-relaxed">
				The Subtractive Triad can be applied to any system: legacy codebases, overgrown projects,
				or architectural reviews.
			</p>
			<a
				href="/contact"
				class="inline-block px-8 py-4 btn-primary"
			>
				Start a Conversation
			</a>
		</div>
	</section>
</div>

<!-- Markdown Preview Modal -->
<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title="Kickstand Case Study Markdown"
/>

<style>
	.page-container {
		background: var(--color-bg-pure);
	}

	.hero-section {
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.metric-card {
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-label {
		color: var(--color-fg-muted);
	}

	.metric-sublabel {
		color: var(--color-fg-subtle);
	}

	.heading-2 {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-3 {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.body-xl {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body-lg {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.body-sm {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.body-xs {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.body-secondary {
		color: var(--color-fg-secondary);
	}

	.body-tertiary {
		color: var(--color-fg-tertiary);
	}

	.body-muted {
		color: var(--color-fg-muted);
	}

	.body-subtle {
		color: var(--color-fg-subtle);
	}

	.link-hover {
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.link-hover:hover {
		color: var(--color-fg-tertiary);
	}

	.link-hover-strong:hover {
		color: var(--color-fg-primary);
	}

	.link {
		color: var(--color-fg-primary);
	}

	.link:hover {
		text-decoration: underline;
	}

	.card-surface {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-elevated {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.section-border {
		border-top: 1px solid var(--color-border-default);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: 600;
		border-radius: var(--radius-full);
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
	}

	.input:focus {
		border-color: var(--color-border-emphasis);
	}
</style>
