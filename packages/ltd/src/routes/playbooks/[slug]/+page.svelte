<script lang="ts">
	import { Button, SEO } from '@create-something/canon';

	let { data } = $props();
	const playbook = $derived(data.playbook);
</script>

<SEO
	title={playbook.title}
	description={playbook.summary}
	keywords="AI workflow playbook, runbook, owned automation, AI operations"
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Playbooks', url: 'https://createsomething.ltd/playbooks' },
		{ name: playbook.title, url: `https://createsomething.ltd/playbooks/${playbook.slug}` }
	]}
/>

<article class="playbook-detail">
	<header class="playbook-detail__hero">
		<a class="playbook-detail__back" href="/playbooks">← All playbooks</a>
		<p>{playbook.label}</p>
		<h1>{playbook.title}</h1>
		<p class="playbook-detail__summary">{playbook.summary}</p>
		<div class="playbook-detail__actions">
			<Button href="/readiness">Assess this workflow</Button>
			<Button href="/canon" variant="secondary">Read the Canon</Button>
		</div>
	</header>

	<section class="playbook-detail__instruction" aria-labelledby="when-to-use-title">
		<p class="playbook-detail__eyebrow">When to use it</p>
		<h2 id="when-to-use-title">{playbook.whenToUse}</h2>
	</section>

	<section class="playbook-detail__board" aria-labelledby="playbook-title">
		<div class="playbook-detail__board-heading">
			<p class="playbook-detail__eyebrow">The playbook</p>
			<h2 id="playbook-title">Put the same rules in front of people and AI.</h2>
		</div>
		<dl>
			<div>
				<dt>Owner</dt>
				<dd>{playbook.owner}</dd>
			</div>
			<div>
				<dt>Approved work</dt>
				<dd>{playbook.approvedWork}</dd>
			</div>
			<div>
				<dt>Wait point</dt>
				<dd>{playbook.waitPoint}</dd>
			</div>
			<div>
				<dt>Receipt</dt>
				<dd>{playbook.proof}</dd>
			</div>
		</dl>
	</section>

	<section class="playbook-detail__runbook" aria-labelledby="runbook-title">
		<div>
			<p class="playbook-detail__eyebrow">The runbook</p>
			<h2 id="runbook-title">Execute the decision without losing the boundary.</h2>
		</div>
		<ol>
			{#each playbook.runbook as step, index}
				<li>
					<span>0{index + 1}</span>
					<p>{step}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="playbook-detail__opposition" aria-labelledby="opposition-title">
		<p class="playbook-detail__eyebrow">What this prevents</p>
		<h2 id="opposition-title">Make the opposition visible before it takes possession of the work.</h2>
		<div>
			{#each playbook.opposition as item}
				<article>
					<h3>{item.title}</h3>
					<p>{item.detail}</p>
				</article>
			{/each}
		</div>
	</section>
</article>

<style>
	.playbook-detail {
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.playbook-detail__hero,
	.playbook-detail__instruction,
	.playbook-detail__board,
	.playbook-detail__runbook,
	.playbook-detail__opposition {
		padding: clamp(2rem, 6vw, 6rem) clamp(1rem, 8vw, 10rem);
	}

	.playbook-detail__hero {
		min-height: min(48rem, 78svh);
		display: grid;
		align-content: end;
		background:
			linear-gradient(90deg, transparent 49.9%, var(--color-performance-line, #d7d7d2) 50%, transparent 50.1%),
			var(--color-performance-paper, #f3f3f0);
	}

	.playbook-detail__back {
		position: absolute;
		top: clamp(6rem, 10vw, 8rem);
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.78rem;
		text-decoration: none;
		text-transform: uppercase;
	}

	.playbook-detail__hero > p:not(.playbook-detail__summary),
	.playbook-detail__eyebrow {
		margin: 0 0 1rem;
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.75rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.playbook-detail h1,
	.playbook-detail h2,
	.playbook-detail h3 {
		margin: 0;
		font-weight: var(--font-performance-medium);
		letter-spacing: -0.055em;
		line-height: 0.98;
		text-wrap: balance;
	}

	.playbook-detail h1 {
		max-width: 58rem;
		font-size: clamp(3.4rem, 8vw, 7.6rem);
	}

	.playbook-detail h2 {
		max-width: 50rem;
		font-size: clamp(2rem, 4.5vw, 4.4rem);
	}

	.playbook-detail__summary {
		max-width: 48rem;
		margin: 1.5rem 0 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: clamp(1.08rem, 2vw, 1.45rem);
		line-height: 1.48;
	}

	.playbook-detail__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.playbook-detail__instruction {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #fff);
	}

	.playbook-detail__instruction .playbook-detail__eyebrow {
		color: rgba(255, 255, 255, 0.65);
	}

	.playbook-detail__board {
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.playbook-detail__board-heading {
		margin-bottom: 2rem;
	}

	.playbook-detail__board dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin: 0;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		border-left: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.playbook-detail__board dl > div {
		min-height: 13rem;
		padding: 1.25rem;
		border-right: 1px solid var(--color-performance-line, #d7d7d2);
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.playbook-detail__board dt {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.75rem;
		font-weight: var(--font-performance-semibold);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.playbook-detail__board dd {
		max-width: 27rem;
		margin: 1rem 0 0;
		font-size: clamp(1.05rem, 1.8vw, 1.3rem);
		line-height: 1.4;
	}

	.playbook-detail__runbook {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		gap: clamp(2rem, 6vw, 8rem);
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-paper, #f3f3f0);
	}

	.playbook-detail__runbook ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.playbook-detail__runbook li {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		gap: 1rem;
		padding: 1.1rem 0;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.playbook-detail__runbook li:last-child {
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.playbook-detail__runbook li span {
		color: var(--color-performance-signal, #3267d6);
		font-family: var(--font-performance-mono);
		font-size: 0.8rem;
	}

	.playbook-detail__runbook li p,
	.playbook-detail__opposition article p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		font-size: 1rem;
		line-height: 1.5;
	}

	.playbook-detail__opposition {
		background: var(--color-performance-panel, #fff);
	}

	.playbook-detail__opposition > div {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		margin-top: 2rem;
		background: var(--color-performance-line, #d7d7d2);
		border: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.playbook-detail__opposition article {
		min-height: 12rem;
		padding: 1.25rem;
		background: var(--color-performance-panel, #fff);
	}

	.playbook-detail__opposition h3 {
		font-size: clamp(1.5rem, 2.4vw, 2.2rem);
	}

	.playbook-detail__opposition article p {
		margin-top: 1rem;
	}

	@media (max-width: 47.99rem) {
		.playbook-detail__hero {
			min-height: 37rem;
		}

		.playbook-detail__board dl,
		.playbook-detail__opposition > div,
		.playbook-detail__runbook {
			grid-template-columns: 1fr;
		}

		.playbook-detail__board dl > div {
			min-height: auto;
		}
	}
</style>
