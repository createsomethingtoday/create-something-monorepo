<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleString('en-US', {
			month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
		});
	}

	const statusCopy = {
		operational: { label: 'All four sites responded', detail: 'Each public site returned a successful response during this check.' },
		degraded: { label: 'Some sites need attention', detail: 'At least one site responded successfully and at least one did not.' },
		outage: { label: 'All sites reported a problem', detail: 'Every public site responded, but none returned a successful response.' },
		unknown: { label: 'Current status is unknown', detail: 'None of the public sites returned a response before this check ended.' }
	} as const;
</script>

<svelte:head>
	<title>Public Site Status | CREATE SOMETHING</title>
	<meta name="description" content="A current response check for the four CREATE SOMETHING public sites." />
</svelte:head>

<div class="status-page">
	<section class="chapter task-state" data-performance-chapter="task-state">
		<p class="eyebrow">Current check</p>
		<h1>{statusCopy[data.status.status].label}</h1>
		<p class="lede">{statusCopy[data.status.status].detail}</p>
		<div class:operational={data.status.status === 'operational'} class:degraded={data.status.status === 'degraded'} class:outage={data.status.status === 'outage'} class:unknown={data.status.status === 'unknown'} class="state-badge">
			{data.status.status}
		</div>
		<p class="freshness">Checked {formatTime(data.status.updated_at)}</p>
	</section>

	<section class="chapter workspace" data-performance-chapter="workspace">
		<div class="section-heading">
			<div>
				<p class="eyebrow">Four direct checks</p>
				<h2>See which site responded</h2>
			</div>
			<a class="check-again" href="/status">Check again</a>
		</div>
		<div class="property-grid">
			{#each data.status.properties as property}
				<article class:healthy={property.healthy} class="property-card">
					<div>
						<h3>{property.domain}</h3>
						<p>{property.healthy ? 'Responded successfully' : property.error}</p>
					</div>
					<div class="code">
						<span>HTTP status</span>
						<strong>{property.status_code || 'No response'}</strong>
					</div>
				</article>
			{/each}
		</div>
		<p class="scope-note">These checks confirm that each home page responds. They do not test every feature behind it.</p>
	</section>

	<section class="chapter receipt" data-performance-chapter="decision-receipt">
		<p class="eyebrow">Incident record</p>
		<h2>Use history to decide what to inspect next</h2>
		{#if data.status.incidentSource.state === 'unavailable'}
			<div class="incident-state" role="status">
				Incident history is unavailable. The current site checks above are still valid, but we cannot confirm whether a recent problem was recorded.
			</div>
		{:else if data.status.incidents.length > 0}
			<ul class="incidents">
				{#each data.status.incidents as incident}
					<li><time>{formatTime(incident.timestamp)}</time><span>{incident.message}</span></li>
				{/each}
			</ul>
		{:else}
			<p class="incident-state">The incident source responded with no recorded incidents.</p>
		{/if}
		<div class="handoff">
			<p>If a site failed, check its owned service and recent deployment before changing shared infrastructure.</p>
			<a href="/">Return to research home</a>
		</div>
	</section>
</div>

<style>
	.status-page { max-width: 980px; margin: 0 auto; padding: 0 var(--space-performance-md) var(--space-performance-2xl); }
	.chapter { padding: clamp(2.25rem, 7vw, 5rem) 0; border-bottom: 1px solid var(--color-performance-border-default); }
	.chapter:last-child { border-bottom: 0; }
	.task-state { max-width: 820px; }
	.eyebrow { margin: 0 0 .7rem; color: var(--color-performance-fg-muted); font-size: var(--text-performance-caption); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
	h1 { max-width: 760px; margin: 0; font-size: clamp(2.7rem, 8vw, 6rem); line-height: .95; letter-spacing: -.06em; }
	h2 { margin: 0; font-size: clamp(1.7rem, 4vw, 2.7rem); letter-spacing: -.04em; }
	h3 { margin: 0; font-size: var(--text-performance-body-lg); }
	.lede { max-width: 640px; margin: 1.35rem 0; color: var(--color-performance-fg-secondary); font-size: var(--text-performance-body-lg); line-height: 1.55; }
	.state-badge { display: inline-flex; padding: .4rem .65rem; border: 1px solid currentColor; border-radius: 999px; font-size: var(--text-performance-caption); font-weight: 750; text-transform: uppercase; }
	.state-badge.operational { color: var(--color-performance-success); }
	.state-badge.degraded { color: var(--color-performance-warning); }
	.state-badge.outage { color: var(--color-performance-error); }
	.state-badge.unknown { color: var(--color-performance-fg-muted); }
	.freshness, .scope-note { color: var(--color-performance-fg-muted); font-size: var(--text-performance-body-sm); }
	.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
	.check-again, .handoff a { display: inline-flex; align-items: center; min-height: 44px; padding: .6rem .85rem; border: 1px solid var(--color-performance-border-strong); color: var(--color-performance-fg-primary); text-decoration: none; }
	.property-grid { display: grid; gap: .7rem; }
	.property-card { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem; border-left: 4px solid var(--color-performance-error); background: var(--color-performance-bg-surface); }
	.property-card.healthy { border-left-color: var(--color-performance-success); }
	.property-card p { margin: .35rem 0 0; color: var(--color-performance-fg-muted); }
	.code { display: flex; flex-direction: column; align-items: end; gap: .2rem; }
	.code span { color: var(--color-performance-fg-muted); font-size: var(--text-performance-caption); }
	.code strong { font-family: 'Geist Mono', monospace; }
	.scope-note { margin: 1rem 0 0; }
	.incident-state { max-width: 720px; margin-top: 1.2rem; padding: 1rem; border-left: 3px solid var(--color-performance-data-4, #9a6b00); background: var(--color-performance-bg-subtle); color: var(--color-performance-fg-secondary); }
	.incidents { margin: 1.2rem 0 0; padding: 0; list-style: none; }
	.incidents li { display: grid; grid-template-columns: 180px 1fr; gap: 1rem; padding: .8rem 0; border-bottom: 1px solid var(--color-performance-border-default); }
	.incidents time { color: var(--color-performance-fg-muted); }
	.handoff { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; margin-top: 2rem; }
	.handoff p { max-width: 620px; color: var(--color-performance-fg-secondary); }

	@media (max-width: 620px) {
		.section-heading, .property-card, .handoff { align-items: stretch; flex-direction: column; }
		.code { align-items: start; }
		.incidents li { grid-template-columns: 1fr; gap: .25rem; }
	}
</style>
