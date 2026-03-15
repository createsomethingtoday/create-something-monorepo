<script lang="ts">
	import WidgetRenderer from '$widgets/WidgetRenderer.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const statusClass = {
		active: 'good',
		awaiting_user: 'warn',
		handoff_ready: 'danger'
	} as const;
</script>

<section class="split-layout">
	<div class="main-column">
		<section class="glass panel">
			<div class="thread-top">
				<div>
					<div class="eyebrow">Primary Conversation Surface</div>
					<h1 class="section-title">{data.thread.title}</h1>
					<p class="muted">{data.thread.subtitle}</p>
				</div>
				<span class={`status-pill ${statusClass[data.thread.status]}`}>
					{data.thread.status.replace('_', ' ')}
				</span>
			</div>

			<div class="summary-banner">
				<div>
					<strong>{data.nextStep.label}</strong>
					<p>{data.nextStep.description}</p>
				</div>
				<div class="policy-ref">{data.nextStep.policyRef}</div>
			</div>
		</section>

		<section class="message-list">
			{#each data.thread.messages as message}
				<article class={`message glass ${message.role}`}>
					<div class="message-meta">
						<strong>{message.author}</strong>
						<span>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
					</div>
					<p>{message.body}</p>
					{#if message.evidence?.length}
						<div class="evidence">
							{#each message.evidence as item}
								<span class="chip">{item}</span>
							{/each}
						</div>
					{/if}
				</article>
			{/each}
		</section>

		<section>
			<WidgetRenderer widgets={data.inlineWidgets} placement="inline" />
		</section>

		<section class="glass composer">
			<div>
				<strong>Composer scaffold</strong>
				<p class="muted">
					Demo mode is read-only. Production wiring will persist turns, extract profile updates,
					and route tool actions through the governed hub.
				</p>
			</div>
			<form>
				<textarea rows="4" placeholder="Message Carmen or attach a new widget intent..." disabled></textarea>
				<button disabled>Send</button>
			</form>
		</section>
	</div>

	<aside class="side-column">
		<section class="glass panel">
			<div class="eyebrow">Profile State</div>
			<h2 class="section-title">Current turn</h2>
			<p>{data.thread.turn.summary}</p>
			<ul class="blockers">
				{#each data.thread.turn.blockers as blocker}
					<li>{blocker}</li>
				{/each}
			</ul>
			<a class="inline-link" href={`/chat/${data.thread.id}/profile`}>Review profile audit</a>
		</section>

		<WidgetRenderer widgets={data.railWidgets} placement="rail" />

		<section class="glass panel">
			<div class="eyebrow">Connected Tools</div>
			<div class="tool-list">
				{#each data.thread.connectedTools as tool}
					<div class="tool-row">
						<div>
							<strong>{tool.name}</strong>
							<div class="muted">{tool.note}</div>
						</div>
						{#if tool.actionHref}
							<a class="tool-link" href={tool.actionHref}>Resolve</a>
						{:else}
							<span class={`status-pill ${tool.status === 'connected' ? 'good' : 'warn'}`}>
								{tool.status.replace('_', ' ')}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<section class="glass panel">
			<div class="eyebrow">Artifacts</div>
			<div class="artifact-list">
				{#each data.thread.artifacts as artifact}
					<div class="artifact-row">
						<div>
							<strong>{artifact.title}</strong>
							<div class="muted">{artifact.summary}</div>
						</div>
						<span class={`status-pill ${artifact.status === 'ready' ? 'good' : 'warn'}`}>
							{artifact.status}
						</span>
					</div>
				{/each}
			</div>

			<a class="inline-link" href={`/chat/${data.thread.id}/handoff`}>Open handoff packet</a>
		</section>
	</aside>
</section>

<style>
	.split-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.95fr);
		gap: 1rem;
	}

	.main-column,
	.side-column {
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	.panel,
	.composer {
		padding: 1.2rem;
	}

	.thread-top,
	.message-meta,
	.summary-banner,
	.tool-row,
	.artifact-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.summary-banner {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.62);
	}

	.policy-ref {
		font-size: 0.82rem;
		color: var(--muted);
	}

	.message-list {
		display: grid;
		gap: 0.85rem;
	}

	.message {
		padding: 1rem 1.1rem;
	}

	.message.user {
		background: rgba(31, 27, 22, 0.92);
		color: white;
	}

	.message p,
	.panel p {
		margin: 0.55rem 0 0;
		line-height: 1.6;
	}

	.evidence,
	.tool-list,
	.artifact-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 0.9rem;
	}

	.chip {
		display: inline-flex;
		padding: 0.35rem 0.6rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.22);
		font-size: 0.86rem;
		margin-right: 0.45rem;
	}

	.blockers {
		margin: 0.8rem 0 0;
		padding-left: 1.1rem;
	}

	.inline-link,
	.tool-link {
		color: var(--accent);
		text-decoration: none;
		font-weight: 600;
	}

	textarea {
		width: 100%;
		margin: 0.85rem 0;
		border-radius: 18px;
		padding: 0.95rem 1rem;
		border: 1px solid var(--line);
		resize: vertical;
		background: rgba(255, 255, 255, 0.72);
	}

	@media (max-width: 1024px) {
		.split-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
