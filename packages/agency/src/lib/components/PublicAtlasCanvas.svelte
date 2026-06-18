<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		computePublicAtlasReadiness,
		createPublicAtlasCanvas,
		createPublicAtlasEdge,
		createPublicAtlasNode,
		normalizePublicAtlasCanvas,
		PUBLIC_ATLAS_LANES,
		PUBLIC_ATLAS_LIMITS,
		PUBLIC_ATLAS_STORAGE_KEYS,
		summarizePublicAtlasCanvas,
		type PublicAtlasCanvas,
		type PublicAtlasNode,
		type PublicAtlasNodeKind,
		type PublicAtlasNodeStatus,
		type PublicAtlasReadiness
	} from '$lib/atlas/public';
	import type {
		PublicAtlasFlowController,
		PublicAtlasFlowProps
	} from '$lib/components/PublicAtlasFlow';

	type AgentMessage = {
		role: 'assistant' | 'visitor';
		text: string;
	};

	type AgentResponse = {
		reply: string;
		canvas: PublicAtlasCanvas;
		mutationCount: number;
		suggestions: string[];
		readiness: PublicAtlasReadiness;
		usage: {
			tier: 'anonymous' | 'warmLead';
			messagesUsed: number;
			messagesLimit: number;
			mutationsUsed: number;
			mutationsLimit: number;
			dailyMessagesUsed: number;
			dailyMessagesLimit: number;
		};
		agentMode?: 'model' | 'fallback';
	};

	export let compact = false;
	export let bookingHref = '/book';

	let canvas = createPublicAtlasCanvas();
	let selectedNodeId = 'data_workflow';
	let selectedSourceId = 'data_workflow';
	let agentInput = '';
	let visitorEmail = '';
	let agentBusy = false;
	let agentError = '';
	let copyState = '';
	let saveState = 'Draft not saved';
	let hydrated = false;
	let flowHost: HTMLDivElement;
	let flowController: PublicAtlasFlowController | undefined;
	let usage: AgentResponse['usage'] = {
		tier: 'anonymous',
		messagesUsed: 0,
		messagesLimit: PUBLIC_ATLAS_LIMITS.anonymous.messagesPerMap,
		mutationsUsed: 0,
		mutationsLimit: PUBLIC_ATLAS_LIMITS.anonymous.mutationsPerMap,
		dailyMessagesUsed: 0,
		dailyMessagesLimit: PUBLIC_ATLAS_LIMITS.anonymous.dailyMessagesPerVisitor
	};
	let messages: AgentMessage[] = [
		{
			role: 'assistant',
			text:
				'Name the workflow, the owner, and the first decision. I will help turn that into a map with human tasks, AI tasks, systems, data, constraints, and touchpoints.'
		}
	];

	$: selectedNode = canvas.nodes.find((node) => node.id === selectedNodeId) ?? canvas.nodes[0];
	$: readiness = computePublicAtlasReadiness(canvas);
	$: summary = summarizePublicAtlasCanvas(canvas, readiness);
	$: selectedDimensionCount = PUBLIC_ATLAS_LANES.filter((lane) =>
		canvas.nodes.some((node) => node.kind === lane.kind)
	).length;
	$: bookingUrl = buildBookingUrl();

	function buildBookingUrl() {
		const base = bookingHref.split('?')[0] || '/book';
		const params = new URLSearchParams({
			source: 'atlas-canvas',
			intent: readiness.intent,
			lane: readiness.lane,
			warmup: 'atlas_canvas',
			readiness: readiness.slug,
			score: String(readiness.score),
			atlas_session_id: canvas.id,
			agent_messages: String(canvas.agentMessages)
		});
		return `${base}?${params.toString()}`;
	}

	function persistCanvas() {
		if (!browser) return;
		window.localStorage.setItem(PUBLIC_ATLAS_STORAGE_KEYS.canvas, JSON.stringify(canvas));
		window.localStorage.setItem(
			PUBLIC_ATLAS_STORAGE_KEYS.meta,
			JSON.stringify({
				sessionId: canvas.id,
				readiness: readiness.slug,
				score: readiness.score,
				agentMessages: canvas.agentMessages,
				mutationCount: canvas.mutationCount,
				updatedAt: canvas.updatedAt
			})
		);
		window.localStorage.setItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary, summary);
		window.localStorage.setItem(
			PUBLIC_ATLAS_STORAGE_KEYS.warmupDraft,
			JSON.stringify({
				workflowName: canvas.nodes.find((node) => node.id === 'data_workflow')?.label ?? '',
				owner: canvas.nodes.find((node) => node.kind === 'actor')?.label ?? '',
				nextDecision: readiness.nextStep,
				selections: Object.fromEntries(
					PUBLIC_ATLAS_LANES.map((lane) => [
						lane.kind === 'constraint' ? 'constraints' : lane.kind,
						canvas.nodes.filter((node) => node.kind === lane.kind).map((node) => node.label)
					])
				)
			})
		);
		saveState = 'Saved for booking';
	}

	function buildFlowProps(): PublicAtlasFlowProps {
		return {
			canvas,
			selectedNodeId,
			onConnectNodes: connectNodes,
			onMoveNode: moveNode,
			onSelectNode: selectNode
		};
	}

	function updateCanvas(next: PublicAtlasCanvas) {
		canvas = normalizePublicAtlasCanvas({ ...next, updatedAt: new Date().toISOString() });
		if (!canvas.nodes.some((node) => node.id === selectedNodeId)) {
			selectedNodeId = canvas.nodes[0]?.id ?? '';
		}
		if (!canvas.nodes.some((node) => node.id === selectedSourceId)) {
			selectedSourceId = canvas.nodes[0]?.id ?? '';
		}
		persistCanvas();
	}

	function selectNode(nodeId: string) {
		selectedNodeId = nodeId;
		selectedSourceId = nodeId;
	}

	function addNode(kind: PublicAtlasNodeKind) {
		const node = createPublicAtlasNode(kind, { createdBy: 'visitor' });
		updateCanvas({
			...canvas,
			nodes: [...canvas.nodes, node],
			mutationCount: canvas.mutationCount + 1
		});
		selectedNodeId = node.id;
		selectedSourceId = node.id;
	}

	function removeNode(nodeId: string) {
		const node = canvas.nodes.find((item) => item.id === nodeId);
		if (!node || node.createdBy === 'system') return;
		updateCanvas({
			...canvas,
			nodes: canvas.nodes.filter((item) => item.id !== nodeId),
			edges: canvas.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
			mutationCount: canvas.mutationCount + 1
		});
	}

	function updateNode(nodeId: string, patch: Partial<PublicAtlasNode>) {
		updateCanvas({
			...canvas,
			nodes: canvas.nodes.map((node) =>
				node.id === nodeId ? { ...node, ...patch, updatedAt: new Date().toISOString() } : node
			)
		});
	}

	function connectNodes(sourceId: string, targetId: string) {
		if (!sourceId || !targetId || sourceId === targetId) return;
		const exists = canvas.edges.some((edge) => edge.source === sourceId && edge.target === targetId);
		if (exists) return;
		updateCanvas({
			...canvas,
			edges: [
				...canvas.edges,
				createPublicAtlasEdge(sourceId, targetId, {
					label: 'hands off to',
					createdBy: 'visitor'
				})
			],
			mutationCount: canvas.mutationCount + 1
		});
	}

	function connectSelectedTo(targetId: string) {
		connectNodes(selectedSourceId, targetId);
	}

	function moveNode(nodeId: string, position: { x: number; y: number }) {
		selectNode(nodeId);
		updateNode(nodeId, position);
	}

	async function askAgent() {
		const text = agentInput.trim();
		if (!text || agentBusy) return;
		agentInput = '';
		agentBusy = true;
		agentError = '';
		messages = [...messages, { role: 'visitor', text }];

		try {
			const response = await fetch('/api/atlas/public-agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					canvas,
					message: text,
					selectedNodeId,
					selectedSourceId,
					visitorEmail: visitorEmail.trim() || undefined
				})
			});
			const result = (await response.json()) as Partial<AgentResponse> & { error?: string };
			if (!response.ok || !result.canvas || !result.reply || !result.readiness || !result.usage) {
				throw new Error(result.error || 'The mapping agent is temporarily unavailable.');
			}
			usage = result.usage;
			updateCanvas(result.canvas);
			messages = [...messages, { role: 'assistant', text: result.reply }];
		} catch (error) {
			agentError = error instanceof Error ? error.message : 'The mapping agent is unavailable.';
			messages = [...messages, { role: 'assistant', text: agentError }];
		} finally {
			agentBusy = false;
		}
	}

	async function copySummary() {
		persistCanvas();
		if (!browser || !navigator.clipboard) {
			copyState = 'Saved';
			return;
		}
		try {
			await navigator.clipboard.writeText(summary);
			copyState = 'Copied';
		} catch {
			copyState = 'Saved';
		}
	}

	function resetCanvas() {
		canvas = createPublicAtlasCanvas();
		selectedNodeId = 'data_workflow';
		selectedSourceId = 'data_workflow';
		messages = messages.slice(0, 1);
		usage = {
			tier: visitorEmail.trim() ? 'warmLead' : 'anonymous',
			messagesUsed: 0,
			messagesLimit: visitorEmail.trim()
				? PUBLIC_ATLAS_LIMITS.warmLead.messagesPerMap
				: PUBLIC_ATLAS_LIMITS.anonymous.messagesPerMap,
			mutationsUsed: 0,
			mutationsLimit: visitorEmail.trim()
				? PUBLIC_ATLAS_LIMITS.warmLead.mutationsPerMap
				: PUBLIC_ATLAS_LIMITS.anonymous.mutationsPerMap,
			dailyMessagesUsed: 0,
			dailyMessagesLimit: visitorEmail.trim()
				? PUBLIC_ATLAS_LIMITS.warmLead.dailyMessagesPerVisitor
				: PUBLIC_ATLAS_LIMITS.anonymous.dailyMessagesPerVisitor
		};
		if (browser) {
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.canvas);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.meta);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupDraft);
		}
		saveState = 'Draft cleared';
	}

	onMount(() => {
		const raw = window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.canvas);
		if (raw) {
			try {
				canvas = normalizePublicAtlasCanvas(JSON.parse(raw));
				selectedNodeId = canvas.nodes[0]?.id ?? '';
				selectedSourceId = canvas.nodes.find((node) => node.id === 'data_workflow')?.id ?? selectedNodeId;
				saveState = 'Draft restored';
			} catch {
				saveState = 'Draft not saved';
			}
		}
		hydrated = true;

		let destroyed = false;
		void (async () => {
			const module = await import('$lib/components/PublicAtlasFlow');
			if (destroyed || !flowHost) return;
			flowController = module.mountPublicAtlasFlow(flowHost, buildFlowProps());
		})();

		return () => {
			destroyed = true;
			flowController?.destroy();
			flowController = undefined;
		};
	});

	$: if (browser && hydrated) {
		canvas;
		persistCanvas();
	}

	$: if (flowController && hydrated) {
		canvas;
		selectedNodeId;
		flowController.update(buildFlowProps());
	}
</script>

<section class="public-atlas" class:compact={compact} aria-label="Public Atlas workflow canvas">
	<div class="atlas-copy">
		<span>Public Atlas canvas</span>
		<h3>Turn one workflow into a map before booking.</h3>
		<p>
			Chat with the constrained mapping agent, shape the canvas, then carry the summary into the
			mapping session. This public agent can only edit this prospect map.
		</p>
	</div>

	<div class="atlas-layout">
		<div class="atlas-main">
			<div class="atlas-toolbar" aria-label="Add map nodes">
				{#each PUBLIC_ATLAS_LANES as lane}
					<button type="button" onclick={() => addNode(lane.kind)}>
						<strong>{lane.label}</strong>
						<small>{lane.description}</small>
					</button>
				{/each}
			</div>

			<div class="canvas-shell">
				<div class="canvas-header">
					<div>
						<span>{selectedDimensionCount}/7 dimensions mapped</span>
						<strong>{readiness.level}</strong>
					</div>
					<small>{readiness.score}/100</small>
				</div>

				<div
					class="atlas-flow-viewport"
					bind:this={flowHost}
					aria-label="Atlas flow canvas"
				></div>

				<div class="handoffs">
					<span>Handoffs</span>
					{#if canvas.edges.length}
						<ul>
							{#each canvas.edges as edge}
								<li>
									{canvas.nodes.find((node) => node.id === edge.source)?.label ?? edge.source}
									→
									{canvas.nodes.find((node) => node.id === edge.target)?.label ?? edge.target}
									{#if edge.label}
										<small>{edge.label}</small>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p>No handoffs connected yet.</p>
					{/if}
				</div>
			</div>
		</div>

		<aside class="atlas-side">
			<section class="agent-panel">
				<div class="panel-title">
					<span>Mapping agent</span>
					<strong>{usage.messagesUsed}/{usage.messagesLimit} messages</strong>
				</div>
				<label class="email-field">
					<span>Optional email for higher warm-lead limit</span>
					<input bind:value={visitorEmail} type="email" placeholder="you@example.com" />
				</label>
				<div class="chat-log" aria-live="polite">
					{#each messages as message}
						<article class={message.role}>
							<strong>{message.role === 'assistant' ? 'Agent' : 'You'}</strong>
							<p>{message.text}</p>
						</article>
					{/each}
				</div>
				<form
					class="agent-form"
					onsubmit={(event) => {
						event.preventDefault();
						void askAgent();
					}}
				>
					<textarea
						bind:value={agentInput}
						maxlength={visitorEmail.trim()
							? PUBLIC_ATLAS_LIMITS.warmLead.maxMessageChars
							: PUBLIC_ATLAS_LIMITS.anonymous.maxMessageChars}
						placeholder="Describe the workflow, owner, tools, approval point, or risk."
					></textarea>
					<button type="submit" disabled={agentBusy || !agentInput.trim()}>
						{agentBusy ? 'Mapping...' : 'Ask agent'}
					</button>
				</form>
				{#if agentError}
					<p class="error">{agentError}</p>
				{/if}
				<p class="limit-copy">
					{usage.mutationsUsed}/{usage.mutationsLimit} mutations used. Public maps cannot run
					production tools or access private systems.
				</p>
			</section>

			<section class="inspector-panel">
				<div class="panel-title">
					<span>Selected node</span>
					<strong>{selectedNode?.kind ?? 'none'}</strong>
				</div>
				{#if selectedNode}
					<label>
						<span>Label</span>
						<input
							value={selectedNode.label}
							oninput={(event) =>
								updateNode(selectedNode.id, { label: event.currentTarget.value })}
						/>
					</label>
					<label>
						<span>Owner</span>
						<input
							value={selectedNode.owner ?? ''}
							oninput={(event) =>
								updateNode(selectedNode.id, { owner: event.currentTarget.value })}
						/>
					</label>
					<label>
						<span>Status</span>
						<select
							value={selectedNode.status}
							onchange={(event) =>
								updateNode(selectedNode.id, {
									status: event.currentTarget.value as PublicAtlasNodeStatus
								})}
						>
							<option value="unknown">unknown</option>
							<option value="run">run</option>
							<option value="wait">wait</option>
							<option value="stop">stop</option>
						</select>
					</label>
					<label>
						<span>Notes</span>
						<textarea
							value={selectedNode.notes ?? ''}
							oninput={(event) =>
								updateNode(selectedNode.id, { notes: event.currentTarget.value })}
						></textarea>
					</label>
					<div class="connect-row">
						<label>
							<span>Connect selected to</span>
							<select onchange={(event) => connectSelectedTo(event.currentTarget.value)}>
								<option value="">Choose target</option>
								{#each canvas.nodes.filter((node) => node.id !== selectedSourceId) as node}
									<option value={node.id}>{node.label}</option>
								{/each}
							</select>
						</label>
					</div>
					<button
						type="button"
						class="danger"
						disabled={selectedNode.createdBy === 'system'}
						onclick={() => removeNode(selectedNode.id)}
					>
						Remove node
					</button>
				{/if}
			</section>

			<section class="summary-panel">
				<div class="panel-title">
					<span>Booking context</span>
					<strong>{saveState}</strong>
				</div>
				<pre>{summary}</pre>
				<div class="summary-actions">
					<button type="button" onclick={copySummary}>{copyState || 'Copy summary'}</button>
					<a href={bookingUrl} onclick={persistCanvas}>Use this in booking</a>
					<button type="button" class="danger" onclick={resetCanvas}>Reset</button>
				</div>
			</section>
		</aside>
	</div>
</section>

<style>
	.public-atlas {
		display: grid;
		gap: 1rem;
	}

	.atlas-copy {
		max-width: 54rem;
	}

	.atlas-copy > span,
	.panel-title span,
	.canvas-header span,
	.handoffs > span,
	.email-field span,
	.inspector-panel label span {
		color: var(--color-clear-grey, #636363);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.atlas-copy h3 {
		margin: 0.25rem 0;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: clamp(1.45rem, 2vw, 2.2rem);
		letter-spacing: 0;
		line-height: 1.08;
	}

	.atlas-copy p,
	.limit-copy,
	.handoffs p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		line-height: 1.55;
	}

	.atlas-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.45fr) minmax(22rem, 0.75fr);
		gap: 1rem;
		align-items: start;
	}

	.atlas-main,
	.atlas-side,
	.agent-panel,
	.inspector-panel,
	.summary-panel,
	.canvas-shell {
		min-width: 0;
	}

	.atlas-toolbar {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.45rem;
		margin-bottom: 0.75rem;
	}

	.atlas-toolbar button,
	.agent-form button,
	.summary-actions button,
	.summary-actions a,
	.danger {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 6px;
		background: #ffffff;
		color: var(--color-clear-onyx, #0a0e19);
		font: inherit;
	}

	.atlas-toolbar button {
		display: grid;
		gap: 0.2rem;
		min-height: 4.2rem;
		padding: 0.65rem;
		text-align: left;
	}

	.atlas-toolbar small,
	.handoffs small {
		color: var(--color-clear-grey, #636363);
		font-size: 0.72rem;
		line-height: 1.25;
	}

	.canvas-shell,
	.agent-panel,
	.inspector-panel,
	.summary-panel {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background: #ffffff;
		box-shadow: 0 12px 30px rgba(10, 14, 25, 0.04);
	}

	.canvas-header,
	.panel-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem;
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.canvas-header div,
	.panel-title {
		min-width: 0;
	}

	.canvas-header strong,
	.panel-title strong {
		display: block;
		color: var(--color-clear-onyx, #0a0e19);
		font-size: 0.95rem;
		line-height: 1.25;
	}

	.canvas-header small {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 999px;
		padding: 0.35rem 0.55rem;
	}

	.atlas-flow-viewport {
		position: relative;
		height: clamp(31rem, 58vh, 46rem);
		min-height: 31rem;
		overflow: hidden;
		background-color: #fbfbf8;
	}

	.handoffs {
		display: grid;
		gap: 0.45rem;
		padding: 0.85rem;
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
	}

	.handoffs ul {
		display: grid;
		gap: 0.35rem;
		margin: 0;
		padding-left: 1rem;
	}

	.atlas-side {
		display: grid;
		gap: 0.75rem;
	}

	.agent-panel,
	.inspector-panel,
	.summary-panel {
		display: grid;
		gap: 0.75rem;
		padding-bottom: 0.85rem;
	}

	.email-field,
	.inspector-panel label {
		display: grid;
		gap: 0.35rem;
		padding: 0 0.85rem;
	}

	.email-field input,
	.inspector-panel input,
	.inspector-panel select,
	.inspector-panel textarea,
	.agent-form textarea {
		min-width: 0;
		width: 100%;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 6px;
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-onyx, #0a0e19);
		font: inherit;
		padding: 0.7rem;
	}

	.chat-log {
		display: grid;
		gap: 0.55rem;
		max-height: 18rem;
		overflow: auto;
		padding: 0 0.85rem;
	}

	.chat-log article {
		display: grid;
		gap: 0.25rem;
		border-radius: 7px;
		padding: 0.65rem;
	}

	.chat-log article.assistant {
		background: #f4f4ef;
	}

	.chat-log article.visitor {
		background: #eef4ff;
	}

	.chat-log strong {
		font-size: 0.75rem;
	}

	.chat-log p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.agent-form {
		display: grid;
		gap: 0.5rem;
		padding: 0 0.85rem;
	}

	.agent-form textarea,
	.inspector-panel textarea {
		min-height: 5.5rem;
		resize: vertical;
	}

	.agent-form button,
	.summary-actions button,
	.summary-actions a,
	.danger {
		display: inline-flex;
		min-height: 2.55rem;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-weight: 700;
		padding: 0.65rem 0.85rem;
		text-decoration: none;
	}

	.agent-form button,
	.summary-actions a {
		background: var(--color-clear-onyx, #0a0e19);
		color: #ffffff;
	}

	.agent-form button:disabled,
	.danger:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.limit-copy,
	.error {
		padding: 0 0.85rem;
		font-size: 0.82rem;
	}

	.error {
		color: #9d1b1b;
	}

	.connect-row {
		display: grid;
		gap: 0.5rem;
	}

	.danger {
		margin: 0 0.85rem;
		background: transparent;
	}

	.summary-panel pre {
		max-height: 14rem;
		overflow: auto;
		margin: 0 0.85rem;
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 6px;
		background: var(--color-clear-porcelain, #f9f9f9);
		color: var(--color-clear-onyx, #0a0e19);
		font:
			0.76rem/1.55 ui-monospace,
			SFMono-Regular,
			Menlo,
			Monaco,
			Consolas,
			monospace;
		padding: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.summary-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		padding: 0 0.85rem;
	}

	.compact .atlas-layout {
		grid-template-columns: 1fr;
	}

	@media (max-width: 1120px) {
		.atlas-layout {
			grid-template-columns: 1fr;
		}

		.atlas-toolbar {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.atlas-toolbar {
			grid-template-columns: 1fr;
		}

		.atlas-flow-viewport {
			min-height: 28rem;
		}
	}
</style>
