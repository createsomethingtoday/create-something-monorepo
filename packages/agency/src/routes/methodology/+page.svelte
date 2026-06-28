<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { BlurFade, ShimmerButton } from '@create-something/canon/magicui';
	import PublicAtlasStoryCanvas from '$lib/components/PublicAtlasStoryCanvas.svelte';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';

	const disciplines = [
		{
			level: 1,
			name: 'DRY',
			domain: 'Implementation',
			question: 'Have we built this before?',
			action: 'Unify',
			description:
				'I look for duplicate tools, repeated workflows, and the same data being entered twice. If three teams solve the same problem three different ways, that is design debt. We map it, measure it, and collapse it into one clearer system.',
			outcome: 'Less duplication, cleaner data, lower drag.'
		},
		{
			level: 2,
			name: 'Rams',
				domain: 'Evidence',
			question: 'Does this earn its existence?',
			action: 'Remove',
			description:
				'Named for Dieter Rams: less, but better. Every tool, workflow, and automation has to justify its place in the stack. If nobody would miss it, trust it, or measure it, we stop carrying it.',
			outcome: 'A leaner stack where every component earns its keep.'
		},
		{
			level: 3,
			name: 'Heidegger',
			domain: 'System',
			question: 'Does this serve the whole?',
			action: 'Reconnect',
			description:
				'Named for the hermeneutic circle: every part must serve the whole, and the whole gives meaning to every part. The tools that survive the first two cuts must connect into one operating system, not a row of isolated islands.',
			outcome: 'A connected system where every component serves the mission.'
		}
	];

	const phases = [
		{
			weeks: 'Step 1',
			name: 'Map the manual coverage burden',
			description: 'Name the handoff, owner, systems, exceptions, and current human execution or monitoring burden.'
		},
		{
			weeks: 'Step 2',
			name: 'Subtract the noise',
			description: 'Remove duplicated work, excess tools, and disconnected records before adding automation.'
		},
		{
			weeks: 'Step 3',
			name: 'Classify the decisions',
			description: 'Define what can auto-run, what needs approval, and what should block with a reason.'
		},
		{
			weeks: 'Step 4',
			name: 'Ship the operator path',
				description: 'Deliver the first controlled connection, runbook, operating notes, and operator brief surface.'
		}
	];

	const tiers = [
		{
			name: 'Database',
			subtitle: 'What exists',
			items: ['State', 'Content', 'Records'],
			description:
				'The foundation — where your data lives, how it\'s structured, and whether the right information is available to the right systems.'
		},
		{
			name: 'Automation',
			subtitle: 'What happens',
			items: ['Tools', 'Integrations', 'Workflows'],
			description:
				'The engine — how systems connect, how data moves, and how actions get triggered without manual intervention.'
		},
		{
			name: 'Judgment',
			subtitle: 'What needs the operator',
				items: ['Controls', 'Approvals', 'Briefs'],
				description:
					'The decision layer — where the trust layer classifies safe work, approval-needed work, and blocked states before the operator is interrupted.'
		}
	];
</script>

<SEO
	title="How It Works | CREATE SOMETHING .agency"
	description="CREATE SOMETHING removes duplication, excess, and disconnection before turning a workflow into controlled delegation with a trust layer."
	keywords="how CREATE SOMETHING works, workflow control layer, controlled workflow, first controlled connection, automation audit, Subtractive Triad"
	ogImage="/og-image.svg"
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'How It Works', url: '/methodology' }
	]}
/>

<main class="methodology-page">
<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<BlurFade delay={0}>
			<p class="hero-eyebrow">How It Works</p>
		</BlurFade>
		<BlurFade delay={0.1}>
				<h1 class="hero-title">Subtract first. Control what remains.</h1>
		</BlurFade>
		<BlurFade delay={0.2}>
			<p class="hero-subtitle">
				Calm, transparent workflow systems do not start by adding more agents. They start
				by removing duplication, stripping excess, reconnecting what matters, and then
				deciding what agents and tools can do, what needs approval, and what should stop.
			</p>
		</BlurFade>
	</div>
</section>

<!-- The Core Principle -->
<section class="principle-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
				<div class="principle-card">
					<h2 class="principle-heading">The Core Principle</h2>
				<p class="principle-body">
					Most automation strategies fail because they add more tools, more exceptions, and more
					hidden handoffs than the operator can actually monitor. The Subtractive Triad inverts
						that instinct. Remove what does not belong first, then control the workflow that remains.
				</p>
				</div>
		</BlurFade>
	</div>
</section>

<!-- The Three Disciplines -->
<section class="disciplines-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<h2 class="section-heading">The Three Checks</h2>
		</BlurFade>
			<BlurFade delay={0.15}>
				<p class="section-subhead">
					One principle applied at three scales so the workflow gets simpler before it gets
					faster.
				</p>
			</BlurFade>

		<div class="disciplines-stack">
			{#each disciplines as discipline, i}
				<BlurFade delay={0.2 + i * 0.1}>
					<div class="discipline-card">
						<div class="discipline-header">
							<div class="discipline-level">
								<span class="level-number">Level {discipline.level}</span>
								<span class="level-domain">{discipline.domain}</span>
							</div>
							<div class="discipline-meta">
								<h3 class="discipline-name">{discipline.name}</h3>
								<div class="discipline-action">
									<span class="action-label">Action:</span>
									<span class="action-value">{discipline.action}</span>
								</div>
							</div>
						</div>

						<div class="discipline-question">
							<span class="question-mark">"</span>
							{discipline.question}
							<span class="question-mark">"</span>
						</div>

						<div class="discipline-body">
							<p class="discipline-description">{discipline.description}</p>
							<div class="discipline-outcome">
								<span class="outcome-label">Outcome</span>
								<p class="outcome-text">{discipline.outcome}</p>
							</div>
						</div>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- The Process Applied -->
<section class="process-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<h2 class="section-heading">The Process Applied</h2>
		</BlurFade>
			<BlurFade delay={0.15}>
				<p class="section-subhead">
						How the Triad becomes a calm workflow path, from workflow map to trust layer.
				</p>
			</BlurFade>

		<div class="phases-grid">
			{#each phases as phase, i}
				<BlurFade delay={0.2 + i * 0.08}>
					<div class="phase-card">
						<div class="phase-weeks">{phase.weeks}</div>
						<h3 class="phase-name">{phase.name}</h3>
						<p class="phase-description">{phase.description}</p>
						{#if i < phases.length - 1}
							<div class="phase-connector">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</div>
						{/if}
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- Method Visualized -->
<section class="method-canvas-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<h2 class="section-heading">The method as a map</h2>
		</BlurFade>
		<BlurFade delay={0.15}>
			<p class="section-subhead">
				The same canvas language explains what can run, what waits for judgment, what stops,
				and where proof lands before a workflow earns more authority.
			</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<PublicAtlasStoryCanvas
				starterId="revops-lead-handoff"
				storyId="methodology-revops-lead-handoff-story"
				eyebrow="Method canvas"
				title="A workflow becomes trustworthy when the boundary is visible."
				description="This is the visual grammar behind the service: one owner, one workflow artifact, bounded automation, human judgment, a stop rule, and an inspection surface."
				compact
			/>
		</BlurFade>
	</div>
</section>

<!-- Why Three Levels -->
<section class="why-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<div class="why-card">
				<h2 class="why-heading">Why Three Levels</h2>
				<div class="why-body">
					<p>
						The triad is coherent because it's one principle — <strong>subtractive revelation</strong>
						— applied at three scales.
					</p>
					<p>
						Most automation reviews stop at Level 1: finding duplicates. That's useful, but
						incomplete. Deduplication alone leaves you with a tighter stack that still contains
						tools nobody uses and systems that don't talk to each other.
					</p>
					<p>
						We go deeper. Removing excess (Level 2) strips the stack to only what produces
						outcomes. Reconnecting what remains (Level 3) transforms isolated tools into a
						system that serves the whole.
					</p>
					<p>
						This is what produces architectures that last — not because they're complex, but
						because everything that doesn't belong has been removed.
					</p>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- The Three-Tier Framework -->
<section class="framework-section">
	<div class="section-container">
		<BlurFade delay={0.1}>
			<h2 class="section-heading">The Three-Tier Framework</h2>
		</BlurFade>
		<BlurFade delay={0.15}>
			<p class="section-subhead">
				Every part of your system does one of three jobs. Knowing which job it owns is how you keep automation legible.
			</p>
		</BlurFade>

		<div class="tiers-grid">
			{#each tiers as tier, i}
				<BlurFade delay={0.2 + i * 0.1}>
					<div class="tier-card">
						<div class="tier-header">
							<h3 class="tier-name">{tier.name}</h3>
							<span class="tier-subtitle">{tier.subtitle}</span>
						</div>
						<div class="tier-items">
							{#each tier.items as item}
								<span class="tier-item">{item}</span>
							{/each}
						</div>
						<p class="tier-description">{tier.description}</p>
					</div>
				</BlurFade>
			{/each}
		</div>

		<BlurFade delay={0.5}>
			<div class="framework-insight">
				<p>
					Every component in your automation stack maps to one of these tiers. When tiers are
					misaligned — when automation makes decisions that should be judgment, or when records
					aren't available to the systems that need them — the operator gets dragged back into
					the dashboard. The Three-Tier Framework reveals these misalignments before they become
					expensive.
				</p>
			</div>
		</BlurFade>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade delay={0}>
			<h2 class="cta-heading">Ready to make the workflow quieter?</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
				<p class="cta-subtext">
					Every project starts with this operating model. We remove what does not belong, then
					ship the smallest controlled path that lets the operator stop watching everything.
				</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<div class="cta-buttons">
				<ShimmerButton href="/book">
					{agencyCoreMessaging.bookMappingSessionLabel}
				</ShimmerButton>
				<a href="/services" class="cta-secondary">
					How I work →
				</a>
			</div>
		</BlurFade>
	</div>
</section>
</main>

<style>
	/* ─── Layout ─── */
	.methodology-page {
		background: var(--color-clear-panel, #ffffff);
		color: var(--color-clear-onyx, #0a0e19);
		--color-fg-primary: var(--color-clear-onyx, #0a0e19);
		--color-fg-secondary: #252a34;
		--color-fg-muted: var(--color-clear-grey, #636363);
		--color-fg-tertiary: var(--color-clear-grey, #636363);
		--color-bg-pure: var(--color-clear-panel, #ffffff);
		--color-bg-surface: var(--color-clear-panel, #ffffff);
		--color-bg-subtle: var(--color-clear-porcelain, #f9f9f9);
		--color-border-emphasis: var(--color-clear-border, #e1e1e1);
	}

	.section-container {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}

	.section-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-3, 0.75rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}

	.section-subhead {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		text-align: center;
		margin-bottom: var(--space-8, 3rem);
		max-width: 40rem;
		margin-left: auto;
		margin-right: auto;
		line-height: var(--leading-relaxed);
	}

	/* ─── Hero ─── */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
		overflow: hidden;
	}

	.hero-grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 60px 60px;
		mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		text-align: center;
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}

	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-5, 1.5rem);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
		line-height: 1.1;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 42rem;
		margin: 0 auto;
		line-height: var(--leading-relaxed);
	}

	/* ─── Core Principle ─── */
	.principle-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
	}

	.principle-card {
		max-width: 44rem;
		margin: 0 auto;
		padding: var(--space-8, 3rem) var(--space-7, 2.5rem);
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		text-align: center;
	}

	.principle-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}

	.principle-body {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* ─── Three Disciplines ─── */
	.disciplines-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
	}

	.disciplines-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-5, 1.5rem);
		max-width: 52rem;
		margin: 0 auto;
	}

	.discipline-card {
		position: relative;
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		overflow: hidden;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.discipline-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}

	.discipline-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 10%;
		right: 10%;
		height: 1px;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.12),
			transparent
		);
	}

	.discipline-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-5, 1.5rem);
		padding: var(--space-6, 2rem) var(--space-6, 2rem) 0;
	}

	.discipline-level {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1, 0.25rem);
		flex-shrink: 0;
		min-width: 4.5rem;
	}

	.level-number {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-fg-muted);
	}

	.level-domain {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.discipline-meta {
		flex: 1;
	}

	.discipline-name {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight, -0.015em);
		margin-bottom: var(--space-1, 0.25rem);
	}

	.discipline-action {
		font-size: var(--text-body-sm);
	}

	.action-label {
		color: var(--color-fg-muted);
		margin-right: 0.35rem;
	}

	.action-value {
		color: var(--color-fg-secondary);
		font-weight: var(--font-semibold);
	}

	.discipline-question {
		padding: var(--space-5, 1.5rem) var(--space-6, 2rem);
		font-size: var(--text-body-lg);
		font-style: italic;
		color: var(--color-fg-primary);
		margin: var(--space-5, 1.5rem) 0 0;
		background: var(--color-bg-subtle);
	}

	.question-mark {
		color: var(--color-fg-muted);
		font-style: normal;
	}

	.discipline-body {
		padding: var(--space-5, 1.5rem) var(--space-6, 2rem) var(--space-6, 2rem);
	}

	.discipline-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-5, 1.5rem);
	}

	.discipline-outcome {
		padding: var(--space-4, 1rem) var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface);
	}

	.outcome-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		display: block;
		margin-bottom: var(--space-1, 0.25rem);
	}

	.outcome-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	/* ─── Process ─── */
	.process-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
	}

	.phases-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4, 1rem);
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}

	.phase-card {
		position: relative;
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		text-align: center;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.phase-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}

	.phase-weeks {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}

	.phase-name {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}

	.phase-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.phase-connector {
		display: none;
		position: absolute;
		right: -18px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-fg-muted);
		z-index: 1;
	}

	@media (min-width: 769px) {
		.phase-connector {
			display: block;
		}
	}

	/* ─── Why Three Levels ─── */
	.method-canvas-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
	}

	.why-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
	}

	.why-card {
		max-width: 44rem;
		margin: 0 auto;
		padding: var(--space-8, 3rem) var(--space-7, 2.5rem);
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
	}

	.why-heading {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-6, 2rem);
		text-align: center;
		letter-spacing: var(--tracking-tight, -0.015em);
	}

	.why-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4, 1rem);
	}

	.why-body p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.why-body strong {
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	/* ─── Three-Tier Framework ─── */
	.framework-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
	}

	.tiers-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		max-width: var(--content-width-xl);
		margin: 0 auto var(--space-6, 2rem);
		align-items: stretch;
	}

	/* BlurFade wrappers must stretch so grid equalizes row height */
	.tiers-grid > :global(*) {
		display: flex;
		flex-direction: column;
	}

	.tier-card {
		flex: 1;
		padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		display: flex;
		flex-direction: column;
		transition:
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}

	.tier-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}

	.tier-header {
		text-align: center;
		margin-bottom: var(--space-4, 1rem);
	}

	.tier-name {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight, -0.015em);
	}

	.tier-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	.tier-items {
		display: flex;
		justify-content: center;
		gap: var(--space-2, 0.5rem);
		margin-bottom: var(--space-4, 1rem);
		flex-wrap: wrap;
	}

	.tier-item {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full, 9999px);
		padding: 0.2rem 0.75rem;
		font-family: var(--font-mono, monospace);
	}

	.tier-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		text-align: center;
	}

	.framework-insight {
		max-width: 44rem;
		margin: 0 auto;
		padding: var(--space-6, 2rem) var(--space-7, 2.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface);
	}

	.framework-insight p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		text-align: center;
	}

	/* ─── CTA ─── */
	.cta-section {
		padding: var(--section-padding, 6rem) var(--container-padding, 1.5rem);
		text-align: center;
	}

	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}

	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
		max-width: 36rem;
		margin-left: auto;
		margin-right: auto;
		line-height: var(--leading-relaxed);
	}

	.cta-buttons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4, 1rem);
	}

	.cta-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.cta-secondary:hover {
		color: var(--color-fg-primary);
	}

	/* ─── Responsive ─── */
	@media (max-width: 1024px) {
		.phases-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.tiers-grid {
			grid-template-columns: 1fr;
			max-width: 28rem;
		}
	}

	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}

		.hero-title {
			font-size: var(--text-h1);
		}

		.phases-grid {
			grid-template-columns: 1fr;
			max-width: 24rem;
			margin: 0 auto;
		}

		.discipline-header {
			flex-direction: column;
			gap: var(--space-2, 0.5rem);
		}

		.discipline-level {
			flex-direction: row;
			gap: var(--space-2, 0.5rem);
		}

		.principle-card,
		.why-card {
			padding: var(--space-6, 2rem) var(--space-5, 1.5rem);
		}

		.framework-insight {
			padding: var(--space-5, 1.5rem);
		}

		/* Mobile section padding */
		.principle-section,
		.disciplines-section,
		.process-section,
		.method-canvas-section,
		.why-section,
		.framework-section,
		.cta-section {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
	}
</style>
