<script lang="ts">
	import {
		Button,
		PerformanceCampaignOpening,
		PerformanceCardGrid,
		SEO,
		type PerformanceCardItem,
		type PerformanceCampaignProof
	} from '@create-something/canon';
	import { ltdPlaybookRouteMedia } from '$lib/operator-library/court-media';
	import { playbooks } from '$lib/operator-library/playbooks';

	const heroProof: PerformanceCampaignProof[] = [
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
		points: [playbook.approvedWork, `Proof: ${playbook.proof}`],
		href: `/playbooks/${playbook.slug}`
	}));
</script>

<SEO
	title="Operator Playbooks"
	description="Practical playbooks for operators putting AI into real work: name the owner, set the boundary, and leave proof behind."
	keywords="AI workflow playbooks, operator runbooks, AI readiness, workflow proof, controlled delegation"
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Playbooks', url: 'https://createsomething.ltd/playbooks' }
	]}
/>

<PerformanceCampaignOpening
	mobileSearchBoundary
	eyebrow="CREATE SOMETHING .ltd · Operator playbooks"
	title="Start with the work that has to move."
	lede="Each playbook gives a team and its AI the same operating picture: what can run, what needs a person, and what proves the work happened."
	media={ltdPlaybookRouteMedia}
	proof={heroProof}
	mode="ink"
	density="compact"
>
	{#snippet actions()}
		<Button href="/readiness">Assess a workflow</Button>
		<Button href="/canon" variant="secondary">Why this works</Button>
	{/snippet}
</PerformanceCampaignOpening>

<section class="playbook-index" aria-labelledby="playbook-library-title">
	<div class="playbook-index__heading">
		<p class="playbook-index__eyebrow">The library</p>
		<h2 id="playbook-library-title">Choose the moment where work gets stuck.</h2>
		<p>
			These are operating tools, not generic templates. A playbook sets the decision model; its
			runbook shows the live steps, checks, exceptions, and recovery path.
		</p>
	</div>

	<PerformanceCardGrid items={playbookCards} columns={3} ariaLabel="Operator playbooks" />
</section>

<section class="playbook-note" aria-labelledby="playbook-note-title">
	<p class="playbook-note__eyebrow">A shared language</p>
	<h2 id="playbook-note-title">The opposition is unclear work.</h2>
	<p>
		Ambiguity, inaccessible records, unnamed decisions, untrusted automation, and missing proof
		are not abstract risks. They are the reasons useful work waits. The playbooks make each one
		visible before it becomes a handoff failure.
	</p>
	<a href="/readiness">Find the boundary in your workflow <span aria-hidden="true">→</span></a>
</section>

<style>
	.playbook-index,
	.playbook-note {
		padding: clamp(3.5rem, 8vw, 7rem) clamp(1rem, 5vw, 5rem);
	}

	.playbook-index {
		background: var(--color-performance-panel, #fff);
	}

	.playbook-index__heading {
		max-width: 48rem;
		margin-bottom: clamp(1.8rem, 4vw, 3.5rem);
	}

	.playbook-index__eyebrow,
	.playbook-note__eyebrow {
		margin: 0 0 0.8rem;
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.75rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.playbook-index h2,
	.playbook-note h2 {
		margin: 0;
		font-size: clamp(2rem, 4.1vw, 4rem);
		font-weight: var(--font-performance-medium);
		letter-spacing: -0.055em;
		line-height: 0.98;
		text-wrap: balance;
	}

	.playbook-index__heading > p:last-child,
	.playbook-note > p:not(.playbook-note__eyebrow) {
		max-width: 41rem;
		margin: 1.2rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: clamp(1rem, 1.65vw, 1.2rem);
		line-height: 1.55;
	}

	.playbook-note {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	.playbook-note > p:not(.playbook-note__eyebrow) {
		color: rgba(255, 255, 255, 0.72);
	}

	.playbook-note a {
		display: inline-flex;
		gap: 0.5rem;
		margin-top: 1.75rem;
		color: inherit;
		font-weight: var(--font-performance-semibold);
		text-decoration-thickness: 1px;
		text-underline-offset: 0.25em;
	}

	@media (max-width: 47.99rem) {
		:global(.clear-card-grid--3) {
			grid-template-columns: 1fr;
		}
	}
</style>
