<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">Thread Workspace</div>
			<h1 class="section-title">Concierge sessions</h1>
		</div>
		{#if data.latestThreadId}
			<a class="cta" href={`/chat/${data.latestThreadId}`}>Resume latest thread</a>
		{/if}
	</div>

	<p class="muted">
		This scaffold keeps conversation state, profile audit state, and widget choice inside the
		product package. Live persistence and auth come later.
	</p>
</section>

<section class="thread-grid">
	{#each data.threads as thread}
		<a class="glass thread-card" href={`/chat/${thread.id}`}>
			<div class="thread-header">
				<div>
					<strong>{thread.title}</strong>
					<div class="muted">{thread.subtitle}</div>
				</div>
				<span class={`status-pill ${thread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
					{thread.status.replace('_', ' ')}
				</span>
			</div>

			<div class="meter" aria-hidden="true">
				<div class="fill" style={`width: ${thread.profileCompletion}%`}></div>
			</div>

			<div class="thread-footer">
				<span>{thread.profileCompletion}% complete</span>
				<span>{thread.pendingAction}</span>
			</div>

			<div class="badges">
				{#each thread.badges as badge}
					<span class="chip">{badge}</span>
				{/each}
			</div>
		</a>
	{/each}
</section>

<style>
	.panel {
		padding: 1.3rem;
	}

	.section-header,
	.thread-header,
	.thread-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: var(--radius-tight);
		background: var(--ink);
		color: white;
		text-decoration: none;
	}

	.thread-grid {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	.thread-card {
		padding: 1.15rem;
		text-decoration: none;
	}

	.meter {
		margin: 1rem 0;
		height: 0.65rem;
		border-radius: var(--radius-tight);
		background: rgba(31, 27, 22, 0.08);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent), #d69157);
	}

	.badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.chip {
		padding: 0.35rem 0.65rem;
		border-radius: var(--radius-tight);
		background: rgba(31, 27, 22, 0.08);
		font-size: 0.88rem;
	}
</style>
