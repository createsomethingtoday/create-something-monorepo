<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import PublicAtlasFlow from '$lib/components/PublicAtlasFlow.svelte';
	import {
		computePublicAtlasReadiness,
		createPublicAtlasCanvas,
		createPublicAtlasEdge,
		createPublicAtlasFocusGroups,
		createPublicAtlasNode,
		normalizePublicAtlasCanvas,
		PUBLIC_ATLAS_LANES,
		summarizePublicAtlasCanvas,
		type PublicAtlasCanvas,
		type PublicAtlasFocusGroupId,
		type PublicAtlasNode,
		type PublicAtlasNodeKind,
		type PublicAtlasNodeStatus,
		type PublicAtlasReadiness
	} from '@create-something/canon/atlas/headless';
	import {
		createPublicAtlasCanvasFromStarter,
		PUBLIC_ATLAS_INDUSTRY_STARTERS
	} from '$lib/atlas/public';
	import { buildPublicAtlasBookingUrl } from '$lib/atlas/public-booking';
	import { PUBLIC_ATLAS_LIMITS, PUBLIC_ATLAS_STORAGE_KEYS } from '$lib/atlas/intake-policy';

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
	export let flowId = 'public-atlas-flow';

	let canvas = createPublicAtlasCanvas();
	let selectedNodeId = 'data_workflow';
	let selectedSourceId = 'data_workflow';
	let agentInput = '';
	let visitorEmail = '';
	let agentBusy = false;
	let agentError = '';
	let copyState = '';
	let saveState = 'Draft not saved';
	let starterState = '';
	let hydrated = false;
	let addMenuOpen = false;
	let activeFocusId: PublicAtlasFocusGroupId = 'owner';
	let agentSuggestions = ['Name the owner', 'Find the approval point', 'Mark the riskiest handoff'];
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
				'Name the workflow, owner, and first decision. I will turn it into a bounded map with run, wait, stop, and proof points.'
		}
	];
	const agentPrompts = [
		{ label: 'Owner', text: 'The workflow is owned by...' },
		{ label: 'Approval', text: 'The approval point is...' },
		{ label: 'Risk', text: 'The riskiest handoff is...' }
	];
	const focusControlLabels: Record<PublicAtlasFocusGroupId, string> = {
		owner: 'Focus owner',
		run: 'Focus run',
		wait: 'Focus wait',
		stop: 'Focus stop',
		proof: 'Focus proof'
	};

	function initialUsage(tier: AgentResponse['usage']['tier']): AgentResponse['usage'] {
		const limits = PUBLIC_ATLAS_LIMITS[tier];
		return {
			tier,
			messagesUsed: 0,
			messagesLimit: limits.messagesPerMap,
			mutationsUsed: 0,
			mutationsLimit: limits.mutationsPerMap,
			dailyMessagesUsed: 0,
			dailyMessagesLimit: limits.dailyMessagesPerVisitor
		};
	}

	$: selectedNode = canvas.nodes.find((node) => node.id === selectedNodeId) ?? canvas.nodes[0];
	$: readiness = computePublicAtlasReadiness(canvas);
	$: summary = summarizePublicAtlasCanvas(canvas, readiness);
	$: selectedDimensionCount = PUBLIC_ATLAS_LANES.filter((lane) =>
		canvas.nodes.some((node) => node.kind === lane.kind)
	).length;
	$: dimensionCoverage = PUBLIC_ATLAS_LANES.map((lane) => {
		const count = canvas.nodes.filter((node) => node.kind === lane.kind).length;
		return {
			...lane,
			count,
			mapped: count > 0
		};
	});
	$: focusGroups = createPublicAtlasFocusGroups(canvas);
	$: activeFocusGroup = focusGroups.find((group) => group.id === activeFocusId) ?? focusGroups[0];
	$: activeFocusNodeIds = activeFocusGroup?.nodeIds ?? [];
	$: activeFocusEdgeIds = activeFocusGroup?.edgeIds ?? [];
	$: bookingUrl = buildPublicAtlasBookingUrl({ bookingHref, canvas, readiness });
	$: mappedPercent = Math.round((selectedDimensionCount / PUBLIC_ATLAS_LANES.length) * 100);
	$: leadTierLabel = usage.tier === 'warmLead' ? 'Warm lead' : 'Anonymous map';

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

	function loadStarterMap(starterId: string) {
		const starter = PUBLIC_ATLAS_INDUSTRY_STARTERS.find((item) => item.id === starterId);
		const next = createPublicAtlasCanvasFromStarter(starterId);
		canvas = next;
		selectedNodeId = next.nodes.find((node) => node.id === 'data_workflow')?.id ?? next.nodes[0]?.id ?? '';
		selectedSourceId = selectedNodeId;
		messages = [
			messages[0],
			{
				role: 'assistant',
				text: starter
					? `${starter.name} is loaded. Adjust the owner, systems, approval point, or stop condition before booking.`
					: 'Starter map loaded.'
			}
		];
		usage = initialUsage(visitorEmail.trim() ? 'warmLead' : 'anonymous');
		agentSuggestions = [
			'Name the decision owner',
			'Add the stop condition',
			'Show where proof should land'
		];
		activeFocusId = 'owner';
		copyState = '';
		starterState = starter ? `${starter.name} loaded` : 'Starter loaded';
		saveState = 'Starter loaded';
		persistCanvas();
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

	function addNodeFromMenu(kind: PublicAtlasNodeKind) {
		addNode(kind);
		addMenuOpen = false;
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
			agentSuggestions = result.suggestions?.length
				? result.suggestions.slice(0, 3)
				: agentPrompts.map((prompt) => prompt.text);
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
		usage = initialUsage(visitorEmail.trim() ? 'warmLead' : 'anonymous');
		if (browser) {
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.canvas);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.meta);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupSummary);
			window.localStorage.removeItem(PUBLIC_ATLAS_STORAGE_KEYS.warmupDraft);
		}
		saveState = 'Draft cleared';
		starterState = '';
		addMenuOpen = false;
		activeFocusId = 'owner';
		agentSuggestions = ['Name the owner', 'Find the approval point', 'Mark the riskiest handoff'];
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
	});

	$: if (browser && hydrated) {
		canvas;
		persistCanvas();
	}

</script>

<section class="public-atlas" class:compact={compact} aria-label="Public Map workflow canvas">
	<div class="atlas-copy">
		<span>Mapping warmup</span>
		<h3>Turn one workflow into a map before booking.</h3>
		<p>
			Chat with the constrained mapping agent, shape the canvas, then carry the summary into the
			mapping session. This public agent can only edit this prospect map.
		</p>
	</div>

	<div class="atlas-layout">
		<div class="atlas-main">
			<div class="canvas-shell">
				<div class="canvas-header">
					<div class="canvas-status">
						<div>
							<span>Map readiness</span>
							<strong>{readiness.level}</strong>
						</div>
						<div class="progress-meter" aria-label={`${mappedPercent}% of Map dimensions mapped`}>
							<span style={`width: ${mappedPercent}%`}></span>
						</div>
						<div class="dimension-strip" aria-label="Map dimension coverage">
							{#each dimensionCoverage as lane}
								<span class:mapped={lane.mapped} title={lane.description}>
									{lane.label}
									<small>{lane.count || '—'}</small>
								</span>
							{/each}
						</div>
					</div>
					<div class="canvas-header-actions">
						<div class="score-pill">
							<span>{readiness.score}</span>
							<small>/100</small>
						</div>
						<div class="add-node-menu">
							<button
								type="button"
								class="add-node-trigger"
								aria-expanded={addMenuOpen}
								aria-controls="public-atlas-add-menu"
								onclick={() => (addMenuOpen = !addMenuOpen)}
							>
								Add node
							</button>
							{#if addMenuOpen}
								<div id="public-atlas-add-menu" class="add-node-options">
									{#each PUBLIC_ATLAS_LANES as lane}
										<button type="button" onclick={() => addNodeFromMenu(lane.kind)}>
											<strong>{lane.label}</strong>
											<small>{lane.description}</small>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>

				<div class="focus-strip" aria-label="Map focus mode">
					{#each focusGroups as group}
						<button
							type="button"
							class:active={group.id === activeFocusId}
							aria-pressed={group.id === activeFocusId}
							aria-label={focusControlLabels[group.id]}
							title={group.description}
							onclick={() => (activeFocusId = group.id)}
						>
							<span>{focusControlLabels[group.id]}</span>
							<strong>{group.nodeIds.length}</strong>
						</button>
					{/each}
				</div>

				<div class="atlas-flow-viewport" aria-label="Map flow canvas">
					<PublicAtlasFlow
						{canvas}
						{flowId}
						{selectedNodeId}
						focusedNodeIds={activeFocusNodeIds}
						focusedEdgeIds={activeFocusEdgeIds}
						dimUnfocused
						onMoveNode={moveNode}
						onSelectNode={selectNode}
					/>
				</div>

				<div class="handoffs">
					<div class="handoffs-title">
						<span>Handoffs</span>
						<strong>{canvas.edges.length}</strong>
					</div>
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
				<div class="agent-hero">
					<div>
						<span>Mapping agent</span>
						<strong>Shape the workflow map</strong>
					</div>
					<div class="agent-meter">
						<span>{usage.messagesUsed}/{usage.messagesLimit}</span>
						<small>messages</small>
					</div>
				</div>
				<div class="agent-state-grid" aria-label="Agent mapping state">
					<span>
						<strong>{readiness.score}/100</strong>
						<small>{readiness.level}</small>
					</span>
					<span>
						<strong>{usage.mutationsUsed}/{usage.mutationsLimit}</strong>
						<small>mutations</small>
					</span>
					<span>
						<strong>{leadTierLabel}</strong>
						<small>public map only</small>
					</span>
				</div>
				<label class="email-field">
					<span>{leadTierLabel}</span>
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
				<div class="agent-suggestions" aria-label="Agent follow-up suggestions">
					{#each agentSuggestions as suggestion}
						<button type="button" onclick={() => (agentInput = suggestion)}>{suggestion}</button>
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
					<div class="prompt-row" aria-label="Prompt starters">
						{#each agentPrompts as prompt}
							<button type="button" onclick={() => (agentInput = prompt.text)}>{prompt.label}</button>
						{/each}
					</div>
					<button type="submit" disabled={agentBusy || !agentInput.trim()}>
						{agentBusy ? 'Mapping...' : 'Ask mapping agent'}
					</button>
				</form>
				{#if agentError}
					<p class="error">{agentError}</p>
				{/if}
			</section>

			<section class="starter-panel">
				<div class="panel-title">
					<span>Starter maps</span>
					<strong>{starterState || 'Choose an industry'}</strong>
				</div>
				<div class="starter-grid">
					{#each PUBLIC_ATLAS_INDUSTRY_STARTERS as starter}
						<button type="button" onclick={() => loadStarterMap(starter.id)}>
							<span>{starter.industry}</span>
							<strong>{starter.name}</strong>
							<small>{starter.description}</small>
						</button>
					{/each}
				</div>
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
					<div class="field-pair">
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
							<span>Connect to</span>
							<select onchange={(event) => connectSelectedTo(event.currentTarget.value)}>
								<option value="">Choose target</option>
								{#each canvas.nodes.filter((node) => node.id !== selectedSourceId) as node}
									<option value={node.id}>{node.label}</option>
								{/each}
							</select>
						</label>
					</div>
					<label>
						<span>Notes</span>
						<textarea
							value={selectedNode.notes ?? ''}
							oninput={(event) =>
								updateNode(selectedNode.id, { notes: event.currentTarget.value })}
						></textarea>
					</label>
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
				<details>
					<summary>
						<span>Booking context</span>
						<strong>{saveState}</strong>
					</summary>
					<pre>{summary}</pre>
					<div class="summary-actions">
						<button type="button" onclick={copySummary}>{copyState || 'Copy summary'}</button>
						<a href={bookingUrl} onclick={persistCanvas}>Use this in booking</a>
						<button type="button" class="danger" onclick={resetCanvas}>Reset</button>
					</div>
				</details>
			</section>
		</aside>
	</div>
</section>

<style>
	.public-atlas {
		display: grid;
		gap: clamp(1.5rem, 3vw, 2.5rem);
	}

	.atlas-copy {
		display: grid;
		gap: 0.625rem;
		max-width: 54rem;
	}

	.atlas-copy > span,
	.panel-title span,
	.agent-hero span,
	.canvas-header span,
	.handoffs-title span,
	.email-field span,
	.inspector-panel label span,
	.summary-panel summary span,
	.starter-grid button > span {
		color: var(--color-performance-muted, #5e6268);
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.atlas-copy h3 {
		margin: 0;
		color: var(--color-performance-ink, #090909);
		font-size: clamp(1.45rem, 2vw, 2.2rem);
		letter-spacing: 0;
		line-height: 1.08;
	}

	.atlas-copy p,
	.handoffs p {
		margin: 0;
		color: var(--color-performance-muted, #5e6268);
		line-height: 1.55;
	}

	.atlas-copy p {
		max-width: 46rem;
	}

	.atlas-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.5fr) minmax(23rem, 0.7fr);
		gap: 1.1rem;
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

	.add-node-trigger,
	.add-node-options button,
	.agent-form button,
	.agent-suggestions button,
	.focus-strip button,
	.prompt-row button,
	.starter-grid button,
	.summary-actions button,
	.summary-actions a,
	.danger {
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 6px;
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		font: inherit;
	}

	.add-node-options small,
	.handoffs small,
	.starter-grid small {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.72rem;
		line-height: 1.25;
	}

	.canvas-shell,
	.agent-panel,
	.inspector-panel,
	.starter-panel,
	.summary-panel {
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 8px;
		background: var(--color-performance-panel, #ffffff);
		box-shadow: 0 18px 44px rgba(10, 14, 25, 0.045);
	}

	.canvas-header,
	.panel-title,
	.agent-hero,
	.summary-panel summary {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.95rem;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.starter-panel {
		overflow: hidden;
	}

	.starter-grid {
		display: grid;
		gap: 0.45rem;
		padding: 0.95rem;
	}

	.starter-grid button {
		display: grid;
		gap: 0.18rem;
		padding: 0.7rem 0.78rem;
		text-align: left;
	}

	.starter-grid button:hover,
	.starter-grid button:focus-visible {
		border-color: var(--color-performance-ink, #090909);
		background: var(--color-performance-paper, #f3f3f0);
	}

	.starter-grid strong {
		color: var(--color-performance-ink, #090909);
		font-size: 0.88rem;
		line-height: 1.2;
	}

	.canvas-header div,
	.panel-title,
	.agent-hero,
	.summary-panel summary {
		min-width: 0;
	}

	.canvas-status {
		display: grid;
		gap: 0.65rem;
	}

	.canvas-header strong,
	.panel-title strong,
	.agent-hero strong,
	.summary-panel summary strong {
		display: block;
		color: var(--color-performance-ink, #090909);
		font-size: 0.95rem;
		line-height: 1.25;
	}

	.canvas-header-actions {
		position: relative;
		display: flex;
		flex: 0 0 auto;
		align-items: flex-start;
		gap: 0.45rem;
	}

	.score-pill {
		display: inline-flex;
		align-items: baseline;
		gap: 0.12rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 999px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		padding: 0.45rem 0.65rem;
	}

	.score-pill span {
		color: inherit;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: none;
	}

	.score-pill small {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.progress-meter {
		width: min(100%, 28rem);
		height: 0.45rem;
		overflow: hidden;
		border-radius: 999px;
		background: var(--color-performance-line, #d7d7d2);
	}

	.progress-meter span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: var(--color-performance-ink, #090909);
	}

	.dimension-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		max-width: 46rem;
	}

	.dimension-strip span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 999px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1;
		padding: 0.35rem 0.5rem;
	}

	.dimension-strip span.mapped {
		border-color: color-mix(in srgb, var(--color-performance-growth, #007a4d) 24%, white);
		background: color-mix(in srgb, var(--color-performance-growth-soft, #dcece5) 34%, white);
		color: var(--color-performance-growth, #007a4d);
	}

	.dimension-strip small {
		color: inherit;
		font-size: 0.68rem;
		font-weight: 800;
	}

	.add-node-menu {
		position: relative;
	}

	.add-node-trigger {
		min-height: 2rem;
		padding: 0.35rem 0.6rem;
		white-space: nowrap;
	}

	.add-node-options {
		position: absolute;
		top: calc(100% + 0.45rem);
		right: 0;
		z-index: 20;
		display: grid;
		gap: 0.35rem;
		width: min(19rem, calc(100vw - 2rem));
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 8px;
		background: var(--color-performance-panel, #ffffff);
		box-shadow: 0 18px 38px rgba(10, 14, 25, 0.14);
		padding: 0.45rem;
	}

	.add-node-options button {
		display: grid;
		gap: 0.15rem;
		padding: 0.55rem;
		text-align: left;
	}

	.add-node-options button:hover,
	.add-node-trigger:hover {
		background: var(--color-performance-court, #e6e6e0);
	}

	.focus-strip {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.45rem;
		padding: 0.75rem 0.95rem;
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-panel, #ffffff);
	}

	.focus-strip button {
		display: flex;
		min-width: 0;
		min-height: 2.35rem;
		align-items: center;
		justify-content: space-between;
		gap: 0.45rem;
		padding: 0.5rem 0.58rem;
	}

	.focus-strip button.active {
		border-color: rgba(10, 14, 25, 0.42);
		background: var(--color-performance-ink, #090909);
		color: #ffffff;
	}

	.focus-strip button span {
		overflow: hidden;
		font-size: 0.76rem;
		font-weight: 800;
		line-height: 1;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.focus-strip button strong {
		display: inline-grid;
		min-width: 1.28rem;
		height: 1.28rem;
		align-items: center;
		justify-items: center;
		border-radius: 999px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		font-size: 0.7rem;
		line-height: 1;
	}

	.atlas-flow-viewport {
		position: relative;
		height: clamp(31rem, 58vh, 46rem);
		min-height: 31rem;
		overflow: hidden;
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--color-performance-panel, #ffffff) 82%, transparent),
				color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 92%, transparent)
			),
			var(--color-performance-paper, #f3f3f0);
	}

	.handoffs {
		display: grid;
		gap: 0.45rem;
		padding: 0.85rem 0.95rem;
		border-top: 1px solid var(--color-performance-line, #d7d7d2);
		background: var(--color-performance-paper, #f3f3f0);
	}

	.handoffs-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.handoffs-title strong {
		border-radius: 999px;
		background: var(--color-performance-panel, #ffffff);
		color: var(--color-performance-ink, #090909);
		font-size: 0.8rem;
		padding: 0.25rem 0.5rem;
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
		position: sticky;
		top: 1rem;
	}

	.agent-panel,
	.inspector-panel,
	.summary-panel {
		display: grid;
		gap: 0.8rem;
		padding: 0 0 0.9rem;
	}

	.agent-hero {
		border-bottom: 0;
		padding-bottom: 0.25rem;
	}

	.agent-meter {
		display: grid;
		min-width: 4.6rem;
		border: 1px solid color-mix(in srgb, var(--color-performance-growth, #007a4d) 24%, white);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-performance-growth-soft, #dcece5) 34%, white);
		color: var(--color-performance-growth, #007a4d);
		padding: 0.45rem 0.55rem;
		text-align: right;
	}

	.agent-meter span {
		color: inherit;
		font-size: 0.95rem;
		letter-spacing: 0;
		line-height: 1;
		text-transform: none;
	}

	.agent-meter small {
		color: inherit;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.agent-state-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
		padding: 0 0.85rem;
	}

	.agent-state-grid span {
		display: grid;
		gap: 0.16rem;
		min-width: 0;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 7px;
		background: var(--color-performance-paper, #f3f3f0);
		padding: 0.58rem;
	}

	.agent-state-grid strong {
		overflow-wrap: anywhere;
		color: var(--color-performance-ink, #090909);
		font-size: 0.86rem;
		line-height: 1.1;
	}

	.agent-state-grid small {
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1.15;
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
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 6px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
		font: inherit;
		padding: 0.75rem;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			box-shadow 140ms ease;
	}

	.email-field input:focus,
	.inspector-panel input:focus,
	.inspector-panel select:focus,
	.inspector-panel textarea:focus,
	.agent-form textarea:focus {
		outline: none;
		border-color: rgba(10, 14, 25, 0.38);
		background: var(--color-performance-panel, #ffffff);
		box-shadow: 0 0 0 3px rgba(10, 14, 25, 0.06);
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
		background: var(--color-performance-court, #e6e6e0);
	}

	.chat-log article.visitor {
		background: color-mix(in srgb, var(--color-performance-signal-soft, #dce8f5) 22%, white);
	}

	.chat-log strong {
		font-size: 0.75rem;
	}

	.chat-log p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.agent-suggestions {
		display: grid;
		gap: 0.38rem;
		padding: 0 0.85rem;
	}

	.agent-suggestions button {
		min-height: 2.25rem;
		padding: 0.52rem 0.62rem;
		text-align: left;
		color: var(--color-performance-ink, #090909);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.agent-suggestions button:hover,
	.agent-suggestions button:focus-visible {
		border-color: rgba(10, 14, 25, 0.24);
		background: var(--color-performance-court, #e6e6e0);
	}

	.agent-form {
		display: grid;
		gap: 0.5rem;
		padding: 0 0.85rem;
	}

	.agent-form textarea,
	.inspector-panel textarea {
		min-height: 5.25rem;
		resize: vertical;
	}

	.prompt-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.prompt-row button {
		min-height: 2rem;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-muted, #5e6268);
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.35rem 0.5rem;
	}

	.prompt-row button:hover {
		border-color: rgba(10, 14, 25, 0.18);
		background: var(--color-performance-court, #e6e6e0);
		color: var(--color-performance-ink, #090909);
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
		background: var(--color-performance-ink, #090909);
		color: var(--color-performance-panel, #ffffff);
	}

	.agent-form .prompt-row button {
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-muted, #5e6268);
	}

	.agent-form button:disabled,
	.danger:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.error {
		padding: 0 0.85rem;
		font-size: 0.82rem;
	}

	.error {
		color: #9d1b1b;
	}

	.field-pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		padding: 0 0.85rem;
	}

	.field-pair label {
		padding: 0;
	}

	.danger {
		margin: 0 0.85rem;
		background: transparent;
	}

	.summary-panel pre {
		max-height: 14rem;
		overflow: auto;
		margin: 0.75rem 0.85rem 0;
		border: 1px solid var(--color-performance-line, #d7d7d2);
		border-radius: 6px;
		background: var(--color-performance-paper, #f3f3f0);
		color: var(--color-performance-ink, #090909);
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

	.summary-panel {
		padding: 0;
	}

	.summary-panel details {
		display: grid;
	}

	.summary-panel summary {
		cursor: pointer;
		list-style: none;
		border-bottom: 0;
	}

	.summary-panel summary::-webkit-details-marker {
		display: none;
	}

	.summary-panel details[open] summary {
		border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
	}

	.summary-panel details[open] {
		padding-bottom: 0.85rem;
	}

	.compact .atlas-layout {
		grid-template-columns: 1fr;
	}

	@media (max-width: 1120px) {
		.atlas-layout {
			grid-template-columns: 1fr;
		}

		.atlas-side {
			position: static;
		}

		.focus-strip {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.canvas-header {
			display: grid;
		}

		.canvas-header-actions {
			width: 100%;
			justify-content: space-between;
		}

		.field-pair {
			grid-template-columns: 1fr;
		}

		.focus-strip {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.add-node-menu {
			position: static;
		}

		.add-node-options {
			right: 0;
			left: auto;
			width: min(19rem, calc(100vw - 2rem));
		}

		.atlas-flow-viewport {
			min-height: 28rem;
		}
	}
</style>
