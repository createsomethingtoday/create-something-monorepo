<script lang="ts">
	import {
		Button,
		PerformanceCampaignOpening,
		PerformanceCardGrid,
		SEO,
		NewsletterSignup,
		PropertyFunnel,
		type PerformanceCardItem,
		type PerformanceCampaignProof
	} from '@create-something/canon';
	import { ltdOperatingFieldMedia } from '$lib/operator-library/court-media';
	import { playbooks } from '$lib/operator-library/playbooks';

	const heroProofItems: PerformanceCampaignProof[] = [
		{ label: 'Start', value: 'One workflow' },
		{ label: 'Name', value: 'One owner' },
		{ label: 'Set', value: 'One boundary' },
		{ label: 'Keep', value: 'One receipt' }
	];

	const playbookCards: PerformanceCardItem[] = playbooks.map((playbook) => ({
		eyebrow: playbook.label,
		icon: 'check',
		title: playbook.title,
		detail: playbook.summary,
		points: [
			`Approved work: ${playbook.approvedWork}`,
			`Receipt: ${playbook.proof}`
		],
		href: `/playbooks/${playbook.slug}`
	}));

	const oppositionCards: PerformanceCardItem[] = [
		{
			eyebrow: '01 · Clarity',
			icon: 'search',
			title: 'Ambiguity',
			detail: 'The outcome, next action, or decision is still too vague for a team or agent to move.'
		},
		{
			eyebrow: '02 · Access',
			icon: 'settings',
			title: 'Unreachable work',
			detail: 'The records or authority needed to help are unavailable, unclear, or outside the allowed boundary.'
		},
		{
			eyebrow: '03 · Trust',
			icon: 'document',
			title: 'Untrusted automation',
			detail: 'People cannot inspect the reason, source, owner, or recovery path behind an action.'
		}
	];
</script>

<SEO
	title="The Operating Library for AI Work"
	description="CREATE SOMETHING .ltd gives operators practical playbooks for AI work: name the owner, set the boundary, and leave proof behind."
	keywords="AI workflow playbooks, operator runbooks, AI readiness, workflow proof, controlled delegation"
	ogImage="/og-image.png"
	propertyName="ltd"
/>

<PerformanceCampaignOpening
	mobileSearchBoundary
	eyebrow="CREATE SOMETHING .ltd · The operator library"
	title="Run AI work people can trust."
	lede="Start with one recurring workflow. Leave with a playbook that tells your team and its AI what can run, what waits for a person, and what proves the work happened."
	media={ltdOperatingFieldMedia}
	proof={heroProofItems}
	mode="ink"
	density="compact"
>
	{#snippet actions()}
		<Button href="/playbooks">Find your playbook</Button>
		<Button href="/readiness" variant="secondary">Assess a workflow</Button>
	{/snippet}
</PerformanceCampaignOpening>

<section class="operator-library" aria-labelledby="start-title">
	<div class="operator-library__heading">
		<p class="operator-library__eyebrow">Start where the work is real</p>
		<h2 id="start-title">A useful system gives everyone the same picture.</h2>
		<p>
			A playbook gives the team the decision model: the outcome, owner, approved work, wait
			point, and receipt. A runbook turns it into live steps, checks, exceptions, and recovery.
		</p>
	</div>

	<PerformanceCardGrid items={playbookCards} columns={3} ariaLabel="Start with a playbook" />
</section>

<section class="opposition" aria-labelledby="opposition-title">
	<div class="opposition__heading">
		<p class="opposition__eyebrow">What the library is built against</p>
		<h2 id="opposition-title">The opposition is unclear work.</h2>
		<p>
			Ambiguity, inaccessible context, and untrusted automation are why capable teams still
			wait. Make the boundary visible before it becomes a failed handoff.
		</p>
		<a href="/readiness">Find the boundary in your workflow <span aria-hidden="true">→</span></a>
	</div>
	<PerformanceCardGrid items={oppositionCards} columns={3} ariaLabel="Workflow opposition" />
</section>

<section class="library-loop" aria-labelledby="library-loop-title">
	<div>
		<p class="library-loop__eyebrow">A library that earns a return visit</p>
		<h2 id="library-loop-title">Keep the useful rules close to the work.</h2>
	</div>
	<div class="library-loop__steps">
		<article>
			<span>01</span>
			<h3>Choose the play</h3>
			<p>Find the recurring moment where a workflow needs a clearer decision.</p>
		</article>
		<article>
			<span>02</span>
			<h3>Run it with a boundary</h3>
			<p>Make the owner, allowed action, wait point, and recovery path inspectable.</p>
		</article>
		<article>
			<span>03</span>
			<h3>Keep the proof</h3>
			<p>Leave a record that another operator can review, trust, and improve.</p>
		</article>
	</div>
</section>

<section class="ltd-continuation" aria-label="Continue the operating loop">
	<PropertyFunnel
		current="ltd"
		heading="Put the playbook to work when the boundary is clear."
		description=".ltd gives you the operating language, .io carries the research and evidence, .space lets you rehearse the behavior, and .agency helps when a named workflow needs a dedicated build partner."
		density="compact"
	/>

	<NewsletterSignup
		eyebrow="Operator notes"
		headline="A quiet note when a playbook earns its place."
		description="New operating patterns, readiness checks, and source material for the people who own the work."
		actionLabel="Get the next operator note."
		submitLabel="Get the note"
		note="No noise. Just the next useful rule, runbook, or receipt pattern."
		source="ltd-operator-library"
	/>
</section>

<style>
	.operator-library,
	.opposition,
	.library-loop {
		padding: clamp(3.5rem, 8vw, 7rem) clamp(1rem, 5vw, 5rem);
	}

	.operator-library {
		background: var(--color-performance-panel, #fff);
	}

	.operator-library__heading,
	.opposition__heading {
		max-width: 48rem;
		margin-bottom: clamp(1.8rem, 4vw, 3.5rem);
	}

	.operator-library__eyebrow,
	.opposition__eyebrow,
	.library-loop__eyebrow {
		margin: 0 0 0.8rem;
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.75rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.operator-library h2,
	.opposition h2,
	.library-loop h2 {
		margin: 0;
		font-size: clamp(2rem, 4.1vw, 4rem);
		font-weight: var(--font-performance-medium);
		letter-spacing: -0.055em;
		line-height: 0.98;
		text-wrap: balance;
	}

	.operator-library__heading > p:last-child,
	.opposition__heading > p:not(.opposition__eyebrow) {
		max-width: 41rem;
		margin: 1.2rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: clamp(1rem, 1.65vw, 1.2rem);
		line-height: 1.55;
	}

	.opposition {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	.opposition__eyebrow,
	.opposition__heading > p:not(.opposition__eyebrow) {
		color: rgba(255, 255, 255, 0.68);
	}

	.opposition__heading a {
		display: inline-flex;
		gap: 0.5rem;
		margin-top: 1.75rem;
		color: inherit;
		font-weight: var(--font-performance-semibold);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}

	.opposition :global(.clear-card-grid__card) {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-performance-panel, #fff);
	}

	.opposition :global(.clear-card-grid__card strong),
	.opposition :global(.clear-card-grid__card p),
	.opposition :global(.clear-card-grid__eyebrow) {
		color: inherit;
	}

	.opposition :global(.clear-card-grid__icon) {
		border-color: rgba(255, 255, 255, 0.24);
		background: transparent;
		color: inherit;
	}

	.library-loop {
		display: grid;
		grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
		gap: clamp(2rem, 7vw, 10rem);
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-paper, #f3f3f0);
	}

	.library-loop__steps {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.library-loop__steps article {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		column-gap: 1rem;
		padding: 1.25rem 0;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.library-loop__steps span {
		grid-row: span 2;
		color: var(--color-performance-signal, #3267d6);
		font-family: var(--font-performance-mono);
		font-size: 0.8rem;
	}

	.library-loop h3 {
		margin: 0;
		font-size: 1.12rem;
		font-weight: var(--font-performance-semibold);
	}

	.library-loop__steps p {
		margin: 0.4rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		line-height: 1.48;
	}

	.ltd-continuation {
		background: var(--color-performance-panel, #fff);
	}

	.ltd-continuation :global(.newsletter-section) {
		padding-block: clamp(2.75rem, 5vw, 4rem);
	}

	@media (max-width: 47.99rem) {
		.library-loop,
		:global(.clear-card-grid--3) {
			grid-template-columns: 1fr;
		}
	}
</style>
