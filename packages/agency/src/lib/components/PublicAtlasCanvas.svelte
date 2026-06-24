<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { getAnalytics } from '@create-something/canon/analytics';
	import {
		computePublicAtlasReadiness,
		createPublicAtlasCanvas,
		createPublicAtlasCanvasFromStarter,
		createPublicAtlasEdge,
		createPublicAtlasNode,
		normalizePublicAtlasCanvas,
		PUBLIC_ATLAS_INDUSTRY_STARTERS,
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
	let starterState = '';
	let hydrated = false;
	let addMenuOpen = false;
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
	const agentPrompts = [
		{ label: 'Owner', text: 'The workflow is owned by...' },
		{ label: 'Approval', text: 'The approval point is...' },
		{ label: 'Risk', text: 'The riskiest handoff is...' }
	];

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
	$: bookingUrl = buildBookingUrl();
	$: mappedPercent = Math.round((selectedDimensionCount / PUBLIC_ATLAS_LANES.length) * 100);
	$: leadTierLabel = usage.tier === 'warmLead' ? 'Warm lead' : 'Anonymous map';

	function normalizeAttributionToken(value: string | null, fallback?: string) {
		const normalized = (value ?? fallback ?? '')
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 90);
		return normalized || undefined;
	}

	function getEntryAttribution() {
		if (!browser) return {};
		const params = new URLSearchParams(window.location.search);
		return {
			entrySource: normalizeAttributionToken(
				params.get('entry_source') ?? params.get('source') ?? params.get('utm_source')
			),
			campaign: normalizeAttributionToken(params.get('campaign') ?? params.get('utm_campaign')),
			content: normalizeAttributionToken(params.get('utm_content')),
			medium: normalizeAttributionToken(params.get('utm_medium'))
		};
	}

	function getAtlasAnalyticsMetadata(extra: Record<string, unknown> = {}) {
		return {
			surface: 'public_atlas_canvas',
			canvasId: canvas.id,
			readiness: readiness.slug,
			readinessScore: readiness.score,
			mappedDimensionCount: selectedDimensionCount,
			nodeCount: canvas.nodes.length,
			edgeCount: canvas.edges.length,
			mutationCount: canvas.mutationCount,
			agentMessages: canvas.agentMessages,
			usageTier: usage.tier,
			...getEntryAttribution(),
			...extra
		};
	}

	function trackAtlasEvent(action: string, extra?: Record<string, unknown>) {
		getAnalytics()?.track('interaction', action, {
			target: 'public_atlas_canvas',
			value: readiness.score,
			metadata: getAtlasAnalyticsMetadata(extra)
		});
	}

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
		const attribution = getEntryAttribution();
		if (attribution.entrySource) params.set('entry_source', String(attribution.entrySource));
		if (attribution.campaign) params.set('campaign', String(attribution.campaign));
		if (attribution.content) params.set('utm_content', String(attribution.content));
		if (attribution.medium) params.set('utm_medium', String(attribution.medium));
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
		copyState = '';
		starterState = starter ? `${starter.name} loaded` : 'Starter loaded';
		saveState = 'Starter loaded';
		persistCanvas();
		trackAtlasEvent('atlas_starter_loaded', {
			starterId,
			starterFound: Boolean(starter)
		});
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
		trackAtlasEvent('atlas_node_added', { nodeKind: kind });
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
		trackAtlasEvent('atlas_node_removed', { nodeKind: node.kind });
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
		trackAtlasEvent('atlas_edge_connected');
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
		trackAtlasEvent('atlas_agent_prompt_submitted', {
			messageLength: text.length,
			hasVisitorEmail: Boolean(visitorEmail.trim())
		});

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
			trackAtlasEvent('atlas_agent_response_received', {
				agentMode: result.agentMode ?? 'unknown',
				mutationCount: result.mutationCount,
				suggestionCount: result.suggestions?.length ?? 0
			});
		} catch (error) {
			agentError = error instanceof Error ? error.message : 'The mapping agent is unavailable.';
			messages = [...messages, { role: 'assistant', text: agentError }];
			trackAtlasEvent('atlas_agent_response_failed', {
				errorName: error instanceof Error ? error.name : 'unknown'
			});
		} finally {
			agentBusy = false;
		}
	}

	async function copySummary() {
		persistCanvas();
		if (!browser || !navigator.clipboard) {
			copyState = 'Saved';
			trackAtlasEvent('atlas_summary_copied', { clipboardAvailable: false });
			return;
		}
		try {
			await navigator.clipboard.writeText(summary);
			copyState = 'Copied';
			trackAtlasEvent('atlas_summary_copied', { clipboardAvailable: true });
		} catch {
			copyState = 'Saved';
			trackAtlasEvent('atlas_summary_copied', {
				clipboardAvailable: true,
				clipboardWriteSucceeded: false
			});
		}
	}

	function resetCanvas() {
		trackAtlasEvent('atlas_canvas_reset');
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
	}

	function handleBookingClick() {
		persistCanvas();
		trackAtlasEvent('atlas_booking_cta_clicked', {
			bookingHref: bookingUrl
		});
	}

	onMount(() => {
		const raw = window.localStorage.getItem(PUBLIC_ATLAS_STORAGE_KEYS.canvas);
		let restored = false;
		if (raw) {
			try {
				canvas = normalizePublicAtlasCanvas(JSON.parse(raw));
				selectedNodeId = canvas.nodes[0]?.id ?? '';
				selectedSourceId = canvas.nodes.find((node) => node.id === 'data_workflow')?.id ?? selectedNodeId;
				saveState = 'Draft restored';
				restored = true;
			} catch {
				saveState = 'Draft not saved';
			}
		}
		hydrated = true;
		trackAtlasEvent('atlas_canvas_started', { restored });

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
			<div class="canvas-shell">
				<div class="canvas-header">
					<div class="canvas-status">
						<div>
							<span>Map readiness</span>
							<strong>{readiness.level}</strong>
						</div>
						<div class="progress-meter" aria-label={`${mappedPercent}% of Atlas dimensions mapped`}>
							<span style={`width: ${mappedPercent}%`}></span>
						</div>
						<div class="dimension-strip" aria-label="Atlas dimension coverage">
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

				<div
					class="atlas-flow-viewport"
					bind:this={flowHost}
					aria-label="Atlas flow canvas"
				></div>

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
				<div class="limit-copy">
					<span>{usage.mutationsUsed}/{usage.mutationsLimit} mutations</span>
					<span>Public map only</span>
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
						<a href={bookingUrl} onclick={handleBookingClick}>Use this in booking</a>
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
		gap: 1rem;
	}

	.atlas-copy {
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
	.handoffs p {
		margin: 0;
		color: var(--color-clear-grey, #636363);
		line-height: 1.55;
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
	.prompt-row button,
	.starter-grid button,
	.summary-actions button,
	.summary-actions a,
	.danger {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 6px;
		background: #ffffff;
		color: var(--color-clear-onyx, #0a0e19);
		font: inherit;
	}

	.add-node-options small,
	.handoffs small,
	.starter-grid small {
		color: var(--color-clear-grey, #636363);
		font-size: 0.72rem;
		line-height: 1.25;
	}

	.canvas-shell,
	.agent-panel,
	.inspector-panel,
	.starter-panel,
	.summary-panel {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background: #ffffff;
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
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
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
		border-color: #0a0e19;
		background: #fbfbf8;
	}

	.starter-grid strong {
		color: var(--color-clear-onyx, #0a0e19);
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
		color: var(--color-clear-onyx, #0a0e19);
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
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 999px;
		background: #fbfbf8;
		color: var(--color-clear-onyx, #0a0e19);
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
		color: var(--color-clear-grey, #636363);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.progress-meter {
		width: min(100%, 28rem);
		height: 0.45rem;
		overflow: hidden;
		border-radius: 999px;
		background: #ecece6;
	}

	.progress-meter span {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: #0a0e19;
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
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 999px;
		background: #fbfbf8;
		color: var(--color-clear-grey, #636363);
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1;
		padding: 0.35rem 0.5rem;
	}

	.dimension-strip span.mapped {
		border-color: #d7e6dc;
		background: #f5fbf6;
		color: #1e3c2c;
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
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 8px;
		background: #ffffff;
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
		background: #f4f4ef;
	}

	.atlas-flow-viewport {
		position: relative;
		height: clamp(31rem, 58vh, 46rem);
		min-height: 31rem;
		overflow: hidden;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(251, 251, 248, 0.92)),
			#fbfbf8;
	}

	.handoffs {
		display: grid;
		gap: 0.45rem;
		padding: 0.85rem 0.95rem;
		border-top: 1px solid var(--color-clear-border, #e1e1e1);
		background: #fcfcfa;
	}

	.handoffs-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.handoffs-title strong {
		border-radius: 999px;
		background: #ffffff;
		color: var(--color-clear-onyx, #0a0e19);
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
		border: 1px solid #d7e6dc;
		border-radius: 8px;
		background: #f5fbf6;
		color: #1e3c2c;
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
		background: #ffffff;
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
		background: #fbfbf8;
		color: var(--color-clear-grey, #636363);
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.35rem 0.5rem;
	}

	.prompt-row button:hover {
		border-color: rgba(10, 14, 25, 0.18);
		background: #f4f4ef;
		color: var(--color-clear-onyx, #0a0e19);
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

	.agent-form .prompt-row button {
		background: #fbfbf8;
		color: var(--color-clear-grey, #636363);
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

	.limit-copy {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
		color: var(--color-clear-grey, #636363);
	}

	.limit-copy span {
		border: 1px solid var(--color-clear-border, #e1e1e1);
		border-radius: 999px;
		background: #fbfbf8;
		padding: 0.3rem 0.5rem;
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
		border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
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
