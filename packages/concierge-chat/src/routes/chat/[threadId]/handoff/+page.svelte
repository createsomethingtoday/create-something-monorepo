<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="glass panel">
	<div class="section-header">
		<div>
			<div class="eyebrow">Handoff Packet</div>
			<h1 class="section-title">{data.packet.queueName}</h1>
		</div>
		<a class="link-button" href={`/chat/${data.thread.id}`}>Back to thread</a>
	</div>

	<p class="muted">{data.packet.summary}</p>

	<div class="stats">
		<div>
			<strong>{data.packet.eta}</strong>
			<div class="muted">Estimated review time</div>
		</div>
		<div>
			<strong>{data.packet.profileCompletion}%</strong>
			<div class="muted">Profile completion</div>
		</div>
		<div>
			<strong>{data.packet.confirmedFieldCount}</strong>
			<div class="muted">Confirmed fields</div>
		</div>
	</div>
</section>

<section class="split-layout section-gap">
	<div class="glass panel">
		<div class="eyebrow">Operator Brief</div>
		<p>{data.packet.operatorBrief}</p>

		<h2 class="section-title">Reason codes</h2>
		<div class="chips">
			{#each data.packet.reasonCodes as code}
				<span class="chip">{code}</span>
			{/each}
		</div>

		<h2 class="section-title">Pending tasks</h2>
		<ul>
			{#each data.packet.pendingTasks as task}
				<li>{task}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<div class="eyebrow">Attached Artifacts</div>
		<div class="artifact-list">
			{#each data.packet.artifactTitles as artifact}
				<div class="artifact-row">
					<strong>{artifact}</strong>
					<span class="status-pill good">included</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.panel {
		padding: 1.2rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.artifact-row,
	.stats {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.link-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: var(--radius-tight);
		background: var(--ink);
		color: white;
		text-decoration: none;
	}

	.stats {
		margin-top: 1rem;
	}

	.split-layout {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		padding: 0.35rem 0.65rem;
		border-radius: var(--radius-tight);
		background: rgba(162, 61, 53, 0.12);
		color: var(--danger);
		font-size: 0.88rem;
	}

	.artifact-list {
		display: grid;
		gap: 0.75rem;
	}

	@media (max-width: 960px) {
		.split-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
