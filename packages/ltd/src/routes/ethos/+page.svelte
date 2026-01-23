<script lang="ts">
	import SubtractiveTriadAnimation from '$lib/components/SubtractiveTriadAnimation.svelte';
	import { SEO } from '@create-something/components';
</script>

<SEO
	title="Ethos"
	description="How Create Something applies the canon of 'less, but better' across research, practice, and services."
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Ethos', url: 'https://createsomething.ltd/ethos' }
	]}
/>

<!-- Header -->
<section class="header-section px-6">
	<div class="max-w-4xl mx-auto text-center">
		<p class="eyebrow mb-4">Our Philosophy</p>
		<h1 class="mb-6">Ethos</h1>
		<p class="intro-text leading-relaxed">
			Remove what doesn't earn its place. Keep what serves the work.
		</p>
	</div>
</section>

<!-- What This Means in Practice -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">What This Means in Practice</h2>

		<div class="space-y-6 text-lg-canon opacity-80-canon leading-relaxed">
			<p>
				Before adding anything—a feature, a paragraph, a design element—ask three questions:
			</p>

			<div class="border border-canon p-6 my-8">
				<div class="space-y-4">
					<div class="flex items-start gap-3">
						<span class="opacity-40-canon">1.</span>
						<span><strong>Have I built this before?</strong> If yes, unify it.</span>
					</div>
					<div class="flex items-start gap-3">
						<span class="opacity-40-canon">2.</span>
						<span><strong>Does this earn its existence?</strong> If not, remove it.</span>
					</div>
					<div class="flex items-start gap-3">
						<span class="opacity-40-canon">3.</span>
						<span><strong>Does this serve the whole?</strong> If not, reconnect or remove it.</span>
					</div>
				</div>
			</div>

			<p>
				This isn't minimalism for aesthetics. It's discipline for clarity. Every element must justify
				its place—in code, in writing, in design.
			</p>
		</div>
	</div>
</section>

<!-- Core Philosophy -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Principle: Less, But Better</h2>

		<div class="space-y-6 text-lg-canon opacity-80-canon leading-relaxed">
			<p>
				Dieter Rams asked: "Is my design good design?" We ask the same of every experiment, every
				paper, every line of code. The answer requires honest self-examination.
			</p>

			<p>
				Mies van der Rohe proved that "less is more" in architecture. We prove it in software. Not
				by removing features—by ensuring every element justifies its existence.
			</p>

			<p>
				The Eameses showed us "the best for the most for the least." We build tools that serve
				developers without waste, without bloat, without compromise.
			</p>
		</div>
	</div>
</section>

<!-- The Subtractive Triad -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Subtractive Triad</h2>

		<div class="triad-intro space-y-6 leading-relaxed">
			<p>
				<strong>Creation is the discipline of removing what obscures.</strong> This meta-principle
				manifests at three levels, each with its own question:
			</p>
		</div>

		<!-- Mobile Card Layout -->
		<div class="responsive-table-cards mt-8">
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Implementation</span>
					<span class="responsive-table-card-badge">Unify</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Discipline</span>
						<span class="responsive-table-card-value">DRY</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Question</span>
						<span class="responsive-table-card-value triad-question">"Have I built this before?"</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">Artifact</span>
					<span class="responsive-table-card-badge">Remove</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Discipline</span>
						<span class="responsive-table-card-value">Rams</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Question</span>
						<span class="responsive-table-card-value triad-question">"Does this earn its existence?"</span>
					</div>
				</div>
			</div>
			<div class="responsive-table-card">
				<div class="responsive-table-card-header">
					<span class="responsive-table-card-title">System</span>
					<span class="responsive-table-card-badge">Reconnect</span>
				</div>
				<div class="responsive-table-card-body">
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Discipline</span>
						<span class="responsive-table-card-value">Heidegger</span>
					</div>
					<div class="responsive-table-card-row">
						<span class="responsive-table-card-label">Question</span>
						<span class="responsive-table-card-value triad-question">"Does this serve the whole?"</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Desktop Table Layout -->
		<div class="responsive-table-wrapper mt-8 border border-canon">
			<table class="responsive-table">
				<thead class="border-b border-canon">
					<tr>
						<th>Level</th>
						<th>Discipline</th>
						<th>Question</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-canon">
					<tr>
						<td class="font-medium">Implementation</td>
						<td>DRY</td>
						<td>"Have I built this before?"</td>
						<td>Unify</td>
					</tr>
					<tr>
						<td class="font-medium">Artifact</td>
						<td>Rams</td>
						<td>"Does this earn its existence?"</td>
						<td>Remove</td>
					</tr>
					<tr>
						<td class="font-medium">System</td>
						<td>Heidegger</td>
						<td>"Does this serve the whole?"</td>
						<td>Reconnect</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="mt-8 space-y-6 text-lg-canon opacity-80-canon leading-relaxed">
			<p>
				The triad is coherent because it's <strong>one principle</strong>—subtractive
				revelation—applied at <strong>three scales</strong>. Truth emerges through disciplined
				removal at every level of abstraction.
			</p>

			<p>
				For any decision, ask the three questions in order. If you've built it before, unify. If it
				doesn't earn its place, remove. If it doesn't serve the whole, reconnect—or remove.
			</p>
		</div>

		<!-- Visual Demonstration -->
		<div class="mt-12">
			<p class="text-sm-canon uppercase tracking-widest opacity-40-canon mb-4">Visual Demonstration</p>
			<SubtractiveTriadAnimation />
			<p class="mt-4 text-sm-canon opacity-50-canon italic">
				Inspired by Gabriel Santos (Stone Story RPG): "I start with the full pyramid and I erase it
				layer by layer."
			</p>
		</div>
	</div>
</section>

<!-- Standards for Each Domain -->
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
						<span
							>Every paper must answer: <strong>Is this useful?</strong> Not interesting, not novel—useful.</span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Findings must be <strong>reproducible</strong>. Methodology transparent. Metrics honest.</span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Writing serves the reader. <strong>Clarity over cleverness.</strong> Simple language over
							jargon.</span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>If a principle from .ltd applies, cite it. <strong
								>Connect theory to the lineage.</strong
							></span
						>
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
						<span
							>Every experiment must <strong>teach a principle</strong>, not just a technique.</span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Interfaces are minimal. <strong>Zero decoration.</strong> Only essential feedback.</span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Success is completion, not clicks. <strong>Measure learning, not engagement.</strong
							></span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Link to .io for depth, to .ltd for philosophy. <strong
								>Practice without context is shallow.</strong
							></span
						>
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
						<span
							>Delivered work must meet canonical standards. <strong
								>No shortcuts, no compromises.</strong
							></span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Solutions solve problems. <strong>Not features for features' sake.</strong></span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Documentation is complete. Code is readable. <strong
								>Future maintainers are users too.</strong
							></span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="opacity-40-canon mt-1">—</span>
						<span
							>Case studies cite which .ltd principles were applied. <strong
								>Proof, not just claims.</strong
							></span
						>
					</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- The Hermeneutic Circle -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">The Hermeneutic Circle</h2>

		<div class="space-y-6 text-lg-canon opacity-80-canon leading-relaxed">
			<p>
				.ltd provides the <strong>horizon of understanding</strong> for everything else. You can't
				evaluate research (.io) without standards. You can't design practice (.space) without
				principles. You can't deliver services (.agency) without a philosophical ground.
			</p>

			<p>
				But the circle feeds back: real-world outcomes test the canon. If a principle doesn't hold
				in production, it doesn't belong in .ltd. The canon evolves—slowly, carefully—through
				validation.
			</p>

			<div class="mt-12 p-8 border border-canon">
				<pre class="text-sm-canon opacity-60-canon font-mono leading-relaxed overflow-x-auto">
.ltd (STANDARDS)
    ↓ provides criteria
.io (RESEARCH)
    ↓ validated through
.space (PRACTICE)
    ↓ applied to clients
.agency (SERVICES)
    ↓ feeds back to
.ltd (ethos evolves)
				</pre>
			</div>
		</div>
	</div>
</section>

<style>
	.header-section {
		padding-top: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-body-sm);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-fg-tertiary);
	}

	.intro-text {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-lg-canon {
		font-size: var(--text-body-lg);
	}

	.text-xs-canon {
		font-size: var(--text-caption);
	}

	.text-base-canon {
		font-size: var(--text-body);
	}

	.text-2xl-canon {
		font-size: var(--text-h2);
	}

	.opacity-40-canon {
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

	.border-canon {
		border-color: var(--color-border-default);
	}

	section {
		border-color: var(--color-border-default);
	}

	/* Custom styling for triad question (italic) */
	.triad-question {
		font-style: italic;
	}

	.triad-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}
</style>
