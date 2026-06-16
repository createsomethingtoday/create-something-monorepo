<script lang="ts">
	import WidgetRenderer from '$widgets/WidgetRenderer.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="split-layout">
	<aside class="context-column">
		<section class="glass panel">
			<div class="eyebrow">Operator Context</div>
			<h2 class="rail-title">{data.operatorMode.label}</h2>
			<p>{data.operatorMode.promise}</p>
			<div class="context-list">
				<div>
					<span>Runtime</span>
					<strong>{data.operatorMode.runtime}</strong>
				</div>
				<div>
					<span>Current state</span>
					<strong>{data.operatorState.label}</strong>
				</div>
				<div>
					<span>Policy</span>
					<strong>{data.nextStep.policyRef}</strong>
				</div>
			</div>
		</section>

		<section class="glass panel">
			<div class="eyebrow">Clear Language</div>
			<ul class="rule-list">
				{#each data.clearCommunicationRules as rule}
					<li>{rule}</li>
				{/each}
			</ul>
		</section>
	</aside>

	<div class="main-column">
		<section class="glass panel">
			<div class="thread-top">
				<div>
					<div class="eyebrow">Chat Rail</div>
					<h1 class="section-title">{data.thread.title}</h1>
					<p class="muted">{data.thread.subtitle}</p>
				</div>
				<span class={`status-pill ${data.operatorState.tone}`}>
					{data.operatorState.label}
				</span>
			</div>

			<div class="summary-banner">
				<div>
					<strong>{data.nextStep.label}</strong>
					<p>{data.nextStep.description}</p>
					<p class="operator-copy">{data.operatorState.operatorCopy}</p>
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
			<div class="eyebrow">Proof Rail</div>
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

		<section class="glass panel">
			<div class="eyebrow">Dify Boundary</div>
			<ul class="rule-list">
				{#each data.difyRuntimeBoundary.operator as rule}
					<li>{rule}</li>
				{/each}
			</ul>
		</section>
	</aside>
</section>

<style>
	.split-layout {
		display: grid;
		grid-template-columns: minmax(220px, 0.74fr) minmax(0, 1.5fr) minmax(300px, 0.86fr);
		gap: 1rem;
	}

	.context-column,
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

	.rail-title {
		margin: 0.7rem 0 0;
		font-size: 1.1rem;
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
		border-radius: var(--radius);
		background: var(--surface-strong);
		border: 1px solid var(--line);
	}

	.policy-ref {
		font-family: var(--font-mono);
		font-size: 0.82rem;
		color: var(--muted);
	}

	.operator-copy {
		color: var(--ink);
		font-weight: 600;
	}

	.message-list {
		display: grid;
		gap: 0.85rem;
	}

	.message {
		padding: 1rem 1.1rem;
	}

	.message.user {
		background: var(--ink);
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
		border-radius: var(--radius-tight);
		background: rgba(255, 255, 255, 0.22);
		font-size: 0.86rem;
		margin-right: 0.45rem;
	}

	.context-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.context-list div {
		display: grid;
		gap: 0.25rem;
		border-top: 1px solid var(--line);
		padding-top: 0.75rem;
	}

	.context-list span {
		color: var(--muted);
		font-size: 0.82rem;
	}

	.context-list strong {
		font-size: 0.94rem;
		line-height: 1.35;
	}

	.rule-list {
		margin: 0.9rem 0 0;
		padding-left: 1.1rem;
		color: var(--muted);
	}

	.rule-list li + li {
		margin-top: 0.65rem;
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
		border-radius: var(--radius);
		padding: 0.95rem 1rem;
		border: 1px solid var(--line);
		resize: vertical;
		background: var(--surface-strong);
	}

	@media (max-width: 1180px) {
		.split-layout {
			grid-template-columns: minmax(0, 1fr) minmax(300px, 0.85fr);
		}

		.context-column {
			grid-column: 1 / -1;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 820px) {
		.split-layout,
		.context-column {
			grid-template-columns: 1fr;
		}
	}
</style>
