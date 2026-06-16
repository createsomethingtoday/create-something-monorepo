<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="hero panel">
	<div class="eyebrow">Hosted Operator Plane</div>
	<h1 class="page-title">Ona-style operator chat for governed Dify agents.</h1>
	<p class="lede">
		{data.operatorMode.promise} Dify supplies the agent runtime; this shell owns the state,
		actions, evidence, and language operators need to move work safely.
	</p>

	<div class="hero-actions">
		<a class="link-button" href={data.latestThreadId ? `/chat/${data.latestThreadId}` : '/chat'}>Open demo thread</a>
		<a class="link-secondary" href="/chat">View thread list</a>
	</div>
</section>

<section class="state-strip section-gap" aria-label="Operator states">
	{#each data.operatorStateDefinitions as state}
		<div class={`state-cell ${state.tone}`}>
			<strong>{state.label}</strong>
			<span>{state.summary}</span>
		</div>
	{/each}
</section>

<section class="glass panel section-gap">
	<div class="section-header">
		<div>
			<div class="eyebrow">Shell Shape</div>
			<h2 class="section-title">Three rails for operator work</h2>
		</div>
		<span class="status-pill good">Dify hidden behind server proxy</span>
	</div>

	<div class="plane-grid">
		{#each data.operatorShellPlanes as plane}
			<article class="plane-card">
				<div class="plane-top">
					<div>
						<div class="eyebrow">{plane.owner}</div>
						<h3>{plane.label}</h3>
					</div>
					<span class="plane-id">{plane.id}</span>
				</div>
				<p>{plane.purpose}</p>
				<div class="signal-list">
					{#each plane.requiredSignals as signal}
						<span>{signal}</span>
					{/each}
				</div>
			</article>
		{/each}
	</div>
</section>

<section class="runtime-grid section-gap">
	<div class="glass panel">
		<div class="eyebrow">Browser Contract</div>
		<ul>
			{#each data.difyRuntimeBoundary.browser as rule}
				<li>{rule}</li>
			{/each}
		</ul>
	</div>
	<div class="glass panel">
		<div class="eyebrow">Server Contract</div>
		<ul>
			{#each data.difyRuntimeBoundary.server as rule}
				<li>{rule}</li>
			{/each}
		</ul>
	</div>
	<div class="glass panel">
		<div class="eyebrow">Operator Language</div>
		<ul>
			{#each data.clearCommunicationRules.slice(0, 3) as rule}
				<li>{rule}</li>
			{/each}
		</ul>
	</div>
</section>

<section class="glass panel section-gap">
	<div class="section-header">
		<div>
			<div class="eyebrow">Demo Threads</div>
			<h2 class="section-title">Scaffolded flows</h2>
		</div>
		<span class="status-pill">{data.threads.length} seeded threads</span>
	</div>

	<div class="thread-list">
		{#each data.threads as thread}
			<a class="thread-card" href={`/chat/${thread.id}`}>
				<div class="thread-top">
					<strong>{thread.title}</strong>
					<span class={`status-pill ${thread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
						{thread.status.replace('_', ' ')}
					</span>
				</div>
				<p>{thread.subtitle}</p>
				<div class="thread-meta">
					<span>{thread.profileCompletion}% complete</span>
					<span>{thread.pendingAction}</span>
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	.panel {
		padding: 1.35rem;
	}

	.hero {
		padding: 1.8rem;
		border: 1px solid var(--line-strong);
		background: var(--surface-strong);
	}

	.lede {
		max-width: 48rem;
		font-size: 1.08rem;
		color: var(--muted);
	}

	.hero-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1.5rem;
	}

	.link-button,
	.link-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: var(--radius-tight);
		text-decoration: none;
		border: 1px solid var(--line-strong);
	}

	.link-button {
		background: var(--ink);
		color: white;
	}

	.link-secondary {
		background: var(--surface-strong);
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.plane-top,
	.thread-top,
	.thread-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.state-strip,
	.plane-grid,
	.runtime-grid {
		display: grid;
		gap: 0.85rem;
	}

	.state-strip {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	.state-cell,
	.plane-card {
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: var(--radius);
	}

	.state-cell {
		display: grid;
		gap: 0.35rem;
		padding: 0.85rem;
		min-height: 7.25rem;
	}

	.state-cell span {
		color: var(--muted);
		font-size: 0.9rem;
		line-height: 1.35;
	}

	.state-cell.good {
		border-color: rgba(38, 114, 88, 0.35);
	}

	.state-cell.warn {
		border-color: rgba(152, 111, 22, 0.38);
	}

	.state-cell.danger {
		border-color: rgba(179, 63, 52, 0.38);
	}

	.plane-grid,
	.runtime-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin-top: 1rem;
	}

	.plane-card {
		padding: 1rem;
	}

	.plane-card h3 {
		margin: 0.45rem 0 0;
		font-size: 1.05rem;
	}

	.plane-card p {
		color: var(--muted);
	}

	.plane-id {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--muted);
	}

	.signal-list {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
		margin-top: 0.8rem;
	}

	.signal-list span {
		border: 1px solid var(--line);
		border-radius: var(--radius-tight);
		padding: 0.32rem 0.45rem;
		font-size: 0.82rem;
		background: var(--surface-strong);
	}

	ul {
		margin: 0.9rem 0 0;
		padding-left: 1.1rem;
		color: var(--muted);
	}

	.thread-list {
		display: grid;
		gap: 0.85rem;
		margin-top: 1rem;
	}

	.thread-card {
		padding: 1rem 1.1rem;
		border-radius: var(--radius);
		text-decoration: none;
		background: var(--surface-strong);
		border: 1px solid var(--line);
	}

	p {
		line-height: 1.6;
	}

	@media (max-width: 1080px) {
		.state-strip,
		.plane-grid,
		.runtime-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 720px) {
		.state-strip,
		.plane-grid,
		.runtime-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
