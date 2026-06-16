<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		getAgencyAccessControlPlaneSurface,
		getAgencyAccessDetail,
		getAgencyAccessStatusLabel,
		getAgencyAccessTone,
		getAgencyGovernedActionGate,
		isGovernedNextStepIntent
	} from '$lib/agency-access';
	import { sendThreadMessage } from '$chat/client-actions';
	import { CONCIERGE_THREAD_MUTATION_EVENT, type ThreadMutationResponse } from '$chat/api-contract';
	import { getNurseGuidance } from '$chat/nurse-guidance';
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
	import IntakeVerificationPanel from '$lib/intake/IntakeVerificationPanel.svelte';
	import WidgetRenderer from '$widgets/WidgetRenderer.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	type ThreadViewState = PageData['threadView'];
	type ThreadMessage = ThreadViewState['thread']['messages'][number];
	type UiMessage = ThreadMessage & { uiState?: 'pending' | 'streaming' };

	let composerText = '';
	let composerPending = false;
	let composerError = '';
	let assistantTyping = false;
	let liveThreadView: ThreadViewState = structuredClone(data.threadView);
	let renderedMessages: UiMessage[] = liveThreadView.thread.messages.map((message) => ({ ...message }));
	let renderedInlineWidgets = liveThreadView.inlineWidgets;
	let composerEl: HTMLTextAreaElement | null = null;
	let messageListEl: HTMLElement | null = null;
	let activeServerVersion = getThreadViewVersion(data.threadView);
	let streamRun = 0;

	const statusClass = {
		active: 'good',
		awaiting_user: 'warn',
		handoff_ready: 'danger'
	} as const;
	const nurseVisibleArtifactKinds = new Set([
		'indeed_application_receipt',
		'upload',
		'consent_receipt',
		'appointment_confirmation',
		'placement_confirmation',
		'staffing_closure',
		'onboarding_completion'
	]);

	function toUiMessages(messages: ThreadMessage[]): UiMessage[] {
		return messages.map((message) => ({ ...message }));
	}

	function getThreadViewVersion(threadView: ThreadViewState) {
		return [
			threadView.thread.updatedAt,
			threadView.thread.messages.length,
			threadView.inlineWidgets.length,
			threadView.railWidgets.length,
			threadView.thread.artifacts.length,
			threadView.thread.turn.nextActionLabel
		].join(':');
	}

	async function scrollConversation(behavior: ScrollBehavior = 'smooth') {
		await tick();
		messageListEl?.lastElementChild instanceof HTMLElement &&
			messageListEl.lastElementChild.scrollIntoView({ behavior, block: 'end' });
	}

	function hydrateThreadView(threadView: ThreadViewState) {
		liveThreadView = structuredClone(threadView);
		renderedMessages = toUiMessages(liveThreadView.thread.messages);
		renderedInlineWidgets = liveThreadView.inlineWidgets;
	}

	function clearConversationAnimation() {
		streamRun += 1;
		assistantTyping = false;
	}

	function syncComposerHeight() {
		if (!composerEl) {
			return;
		}

		composerEl.style.height = '0px';
		const nextHeight = Math.min(220, Math.max(64, composerEl.scrollHeight));
		composerEl.style.height = `${nextHeight}px`;
		composerEl.style.overflowY = composerEl.scrollHeight > nextHeight ? 'auto' : 'hidden';
	}

	function wait(ms: number) {
		return new Promise<void>((resolve) => {
			window.setTimeout(resolve, ms);
		});
	}

	async function streamAssistantReply(
		threadView: ThreadViewState,
		assistantMessage: ThreadMessage,
		persistentInlineWidgets: ThreadViewState['inlineWidgets']
	) {
		const runId = ++streamRun;
		const baseMessages = threadView.thread.messages.filter((message) => message.id !== assistantMessage.id);

		liveThreadView = structuredClone(threadView);
		renderedMessages = toUiMessages(baseMessages);
		renderedInlineWidgets = persistentInlineWidgets;
		assistantTyping = true;
		await scrollConversation();
		await wait(240);

		if (runId !== streamRun) {
			return;
		}

		assistantTyping = false;

		let visibleLength = 0;
		const targetBody = assistantMessage.body;
		const baseUiMessages = toUiMessages(baseMessages);

		renderedMessages = [...baseUiMessages, { ...assistantMessage, body: '', uiState: 'streaming' }];
		await scrollConversation();

		while (visibleLength < targetBody.length && runId === streamRun) {
			visibleLength = Math.min(
				targetBody.length,
				visibleLength + Math.max(3, Math.ceil(targetBody.length / 36))
			);
			renderedMessages = [
				...baseUiMessages,
				{
					...assistantMessage,
					body: targetBody.slice(0, visibleLength),
					uiState: visibleLength < targetBody.length ? 'streaming' : undefined
				}
			];
			await scrollConversation();
			await wait(18);
		}

		if (runId !== streamRun) {
			return;
		}

		renderedMessages = toUiMessages(threadView.thread.messages);
		await wait(120);

		if (runId !== streamRun) {
			return;
		}

		renderedInlineWidgets = threadView.inlineWidgets;
		await scrollConversation();
	}

	function applyThreadMutation(response: ThreadMutationResponse) {
		if (response.threadId !== liveThreadView.thread.id) {
			return;
		}

		const previousThreadView = liveThreadView;
		const nextThreadView = structuredClone(response.threadView);
		const previousAssistantIds = new Set(
			previousThreadView.thread.messages
				.filter((message) => message.role === 'assistant')
				.map((message) => message.id)
		);
		const latestAssistantMessage =
			[...nextThreadView.thread.messages]
				.reverse()
				.find(
					(message) => message.role === 'assistant' && !previousAssistantIds.has(message.id)
				) ?? null;
		const previousInlineWidgetIds = new Set(previousThreadView.inlineWidgets.map((widget) => widget.id));
		const persistentInlineWidgets = nextThreadView.inlineWidgets.filter((widget) =>
			previousInlineWidgetIds.has(widget.id)
		);

		if (!latestAssistantMessage) {
			clearConversationAnimation();
			hydrateThreadView(nextThreadView);
			return;
		}

		void streamAssistantReply(nextThreadView, latestAssistantMessage, persistentInlineWidgets);
	}

	function formatFileSize(byteSize?: number) {
		if (typeof byteSize !== 'number' || Number.isNaN(byteSize)) {
			return '';
		}

		if (byteSize < 1024) {
			return `${byteSize} B`;
		}

		if (byteSize < 1024 * 1024) {
			return `${(byteSize / 1024).toFixed(1)} KB`;
		}

		return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function submitComposer() {
		const trimmed = composerText.trim();
		if (!trimmed) {
			return;
		}

		const optimisticMessage: UiMessage = {
			id: `optimistic-user-${Date.now()}`,
			role: 'user',
			author: liveThreadView.thread.userName,
			body: trimmed,
			createdAt: new Date().toISOString(),
			uiState: 'pending'
		};

		composerPending = true;
		composerError = '';
		renderedMessages = [...renderedMessages, optimisticMessage];
		assistantTyping = true;
		composerText = '';
		await scrollConversation();

		try {
			await sendThreadMessage(liveThreadView.thread.id, trimmed);
		} catch (error) {
			clearConversationAnimation();
			renderedMessages = renderedMessages.filter((message) => message.id !== optimisticMessage.id);
			composerText = trimmed;
			composerError = error instanceof Error ? error.message : 'Unable to send the message.';
		} finally {
			composerPending = false;
		}
	}

	function handleComposerKeydown(event: KeyboardEvent) {
		if (
			event.key !== 'Enter' ||
			event.shiftKey ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.isComposing
		) {
			return;
		}

		event.preventDefault();
		if (!composerPending && composerText.trim()) {
			void submitComposer();
		}
	}

	onMount(() => {
		syncComposerHeight();
		const handleThreadMutation = (event: Event) => {
			applyThreadMutation((event as CustomEvent<ThreadMutationResponse>).detail);
		};

		window.addEventListener(CONCIERGE_THREAD_MUTATION_EVENT, handleThreadMutation);

		return () => {
			clearConversationAnimation();
			window.removeEventListener(CONCIERGE_THREAD_MUTATION_EVENT, handleThreadMutation);
		};
	});

	$: {
		const nextServerVersion = getThreadViewVersion(data.threadView);
		if (nextServerVersion !== activeServerVersion && !composerPending && !assistantTyping) {
			activeServerVersion = nextServerVersion;
			hydrateThreadView(data.threadView);
		}
	}

	$: governedNextStep = isGovernedNextStepIntent(liveThreadView.nextStep.intent);
	$: showInternalOperatorUi = data.agencyAccess.status !== 'anonymous';
	$: governedActionGate = getAgencyGovernedActionGate(data.agencyAccess);
	$: governedAccessTone = getAgencyAccessTone(data.agencyAccess);
	$: governedAccessLabel = getAgencyAccessStatusLabel(data.agencyAccess);
	$: governedAccessDetail = getAgencyAccessDetail(data.agencyAccess);
	$: governedAccessHref = buildControlPlaneBridgeHref(
		getAgencyAccessControlPlaneSurface(data.agencyAccess),
		{ threadId: liveThreadView.thread.id }
	);
	$: intakeVerificationTone = data.intakeAccess.granted
		? 'good'
		: data.intakeAccess.reason === 'missing_secret'
			? 'danger'
			: 'warn';
	$: intakeVerificationLabel = data.intakeAccess.granted
		? 'Secure verification active'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Verification unavailable'
			: 'Verification required before protected steps';
	$: intakeVerificationDetail = data.intakeAccess.granted
		? 'This thread can upload protected documents and progress into recruiter review when other policy gates clear.'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Protected document and staffing transitions are unavailable because the runtime verification secret is missing.'
			: 'Continue the public intake conversation here. A one-time email verification step is still required before uploads and later-stage staffing progression.';
	$: intakeProtectedActionsBlocked = !data.intakeAccess.granted;
	$: nurseGuidance = getNurseGuidance(liveThreadView.thread, {
		intakeVerified: data.intakeAccess.granted
	});
	$: showExpandedVerificationBanner = showInternalOperatorUi || !data.intakeAccess.granted;
	$: threadEyebrow = showInternalOperatorUi ? 'Primary Conversation Surface' : 'Chat with Concierge';
	$: operatorPlaneSummary = data.operatorShellPlanes
		.map((plane) => plane.label)
		.join(' / ');
	$: snapshotEyebrow = showInternalOperatorUi ? 'Application Snapshot' : 'What I know so far';
	$: snapshotTitle = showInternalOperatorUi ? 'What I have so far' : 'A calm running summary';
	$: snapshotSummary = showInternalOperatorUi ? liveThreadView.thread.turn.summary : nurseGuidance.body;
	$: snapshotHelper = showInternalOperatorUi
		? ''
		: nurseGuidance.helper ??
			'I will ask for documents, confirmation, or booking right here in chat as soon as they are needed.';
	$: visibleArtifacts = showInternalOperatorUi
		? liveThreadView.thread.artifacts
		: liveThreadView.thread.artifacts.filter((artifact) => nurseVisibleArtifactKinds.has(artifact.kind));
	$: if (composerEl) {
		composerText;
		syncComposerHeight();
	}
</script>

<section class={`split-layout ${showInternalOperatorUi ? 'operator' : 'nurse'}`}>
	{#if showInternalOperatorUi}
		<aside class="context-column">
			<section class="glass panel operator-context">
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
						<strong>{liveThreadView.nextStep.policyRef}</strong>
					</div>
					<div>
						<span>Rails</span>
						<strong>{operatorPlaneSummary}</strong>
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
	{/if}

	<div class="main-column">
		<section class={`glass panel thread-hero ${showInternalOperatorUi ? 'internal' : 'nurse'}`}>
			<div class="thread-top">
				<div>
					<div class="eyebrow">{showInternalOperatorUi ? 'Chat Rail' : threadEyebrow}</div>
					<h1 class="section-title">{liveThreadView.thread.title}</h1>
					<p class="muted">{liveThreadView.thread.subtitle}</p>
					{#if !showInternalOperatorUi && data.intakeAccess.granted}
						<div class="thread-meta-row">
							<span class="status-pill good">Verified intake</span>
							<span class="muted">Secure uploads and recruiter booking stay in this chat.</span>
						</div>
					{/if}
				</div>
				<span
					class={`status-pill ${
						showInternalOperatorUi ? data.operatorState.tone : statusClass[liveThreadView.thread.status]
					}`}
				>
					{showInternalOperatorUi
						? data.operatorState.label
						: liveThreadView.thread.status.replace('_', ' ')}
				</span>
			</div>

			{#if showInternalOperatorUi}
				<div class="summary-banner">
					<div>
						<strong>{liveThreadView.nextStep.label}</strong>
						<p>{liveThreadView.nextStep.description}</p>
						<p class="operator-copy">{data.operatorState.operatorCopy}</p>
					</div>
					<div class="policy-ref">{liveThreadView.nextStep.policyRef}</div>
				</div>
			{/if}
		</section>

		{#if showInternalOperatorUi}
			<section class={`glass panel guidance-panel ${nurseGuidance.tone}`}>
				<div class="guidance-top">
					<div class="assistant-chip">Concierge</div>
					<div>
						<div class="eyebrow">{nurseGuidance.eyebrow}</div>
						<h2 class="section-title">{nurseGuidance.title}</h2>
						<p>{nurseGuidance.body}</p>
						{#if nurseGuidance.helper}
							<p class="muted guidance-helper">{nurseGuidance.helper}</p>
						{/if}
					</div>
				</div>
			</section>
		{/if}

		{#if showExpandedVerificationBanner}
			<section class={`glass panel access-banner ${intakeVerificationTone}`}>
				<div>
					<div class="eyebrow">Intake Verification</div>
					<strong>{intakeVerificationLabel}</strong>
					<p>{intakeVerificationDetail}</p>
				</div>
			</section>
		{/if}

		{#if !data.intakeAccess.granted}
			<IntakeVerificationPanel
				accessGranted={data.intakeAccess.granted}
				verifiedEmail={data.intakeAccess.grant?.email ?? null}
				verificationSupport={data.intakeVerification}
				title="Verify this intake to unlock protected steps"
				description="Use a one-time email code to unlock secure document upload, recruiter review, staffing progression, and onboarding actions for this browser session."
				compact={true}
			/>
		{/if}

		{#if showInternalOperatorUi && governedNextStep}
			<section class={`glass panel access-banner ${governedAccessTone}`}>
				<div>
					<div class="eyebrow">Governed Staffing Access</div>
					<strong>{governedAccessLabel}</strong>
					<p>{governedAccessDetail}</p>
				</div>
				<a class="tool-link" href={governedAccessHref} target="_blank" rel="noreferrer">
					{data.agencyAccess.status === 'allowed' ? 'Open .agency account' : 'Review in .agency'}
				</a>
			</section>
		{/if}

		<section class="message-list" bind:this={messageListEl}>
			{#each renderedMessages as message}
				<article class={`message glass ${message.role} ${message.uiState ?? ''}`}>
					<div class="message-meta">
						<strong>{message.author}</strong>
						<span>
							{new Date(message.createdAt).toLocaleTimeString([], {
								hour: 'numeric',
								minute: '2-digit'
							})}
						</span>
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

			{#if assistantTyping}
				<article class="message glass assistant typing">
					<div class="message-meta">
						<strong>Concierge</strong>
						<span>typing…</span>
					</div>
					<div class="typing-dots" aria-hidden="true">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</article>
			{/if}
		</section>

		{#if renderedInlineWidgets.length > 0}
			<section class={`inline-widget-lane ${showInternalOperatorUi ? 'internal' : 'nurse'}`}>
				{#if !showInternalOperatorUi}
					<div class="inline-widget-note">
						<span class="assistant-chip subtle">Concierge</span>
						<p class="muted">Complete the next step right here in the conversation.</p>
					</div>
				{/if}
				<WidgetRenderer
					widgets={renderedInlineWidgets}
					placement="inline"
					threadId={liveThreadView.thread.id}
					governedActionGate={governedActionGate}
					intakeProtectedActionsBlocked={intakeProtectedActionsBlocked}
					intakeProtectionMessage={intakeVerificationDetail}
					showInternalWidgets={showInternalOperatorUi}
					showWidgetTypeBadge={showInternalOperatorUi}
					renderEmptyState={false}
				/>
			</section>
		{/if}

		<section class={`glass composer ${showInternalOperatorUi ? 'internal' : 'nurse'}`}>
			<div>
				<strong>{showInternalOperatorUi ? 'Chat with Concierge' : 'Message Concierge'}</strong>
				<p class="muted">
					Reply naturally and I will guide the next step. When I need documents or a booking,
					I will place that action directly into this thread.
				</p>
			</div>
			<form class="composer-form" on:submit|preventDefault={submitComposer}>
				<textarea
					rows="1"
					placeholder="Try: “I’m an ICU traveler looking for nights in Texas or Arizona.”"
					bind:value={composerText}
					bind:this={composerEl}
					on:keydown={handleComposerKeydown}
					on:input={syncComposerHeight}
				></textarea>
				<div class="composer-actions">
					<p class="muted compact">Enter sends. Shift+Enter makes a new line.</p>
					<button disabled={composerPending || !composerText.trim()}>
						{composerPending ? 'Sending...' : 'Send'}
					</button>
				</div>
			</form>
			{#if composerError}
				<p class="error-text">{composerError}</p>
			{/if}
		</section>
	</div>

	<aside class="side-column">
		<section class={`glass panel snapshot-panel ${showInternalOperatorUi ? 'internal' : 'nurse'}`}>
			<div class="eyebrow">{showInternalOperatorUi ? 'Proof Rail' : snapshotEyebrow}</div>
			<h2 class="section-title">{snapshotTitle}</h2>
			<p>{snapshotSummary}</p>
			{#if snapshotHelper}
				<p class="muted snapshot-helper">{snapshotHelper}</p>
			{/if}
			{#if liveThreadView.thread.turn.blockers.length > 0}
				<p class="muted compact section-kicker">
					{showInternalOperatorUi ? 'Active blockers' : 'Next I still need'}
				</p>
				<ul class="blockers">
					{#each liveThreadView.thread.turn.blockers as blocker}
						<li>{blocker}</li>
					{/each}
				</ul>
			{:else}
				<p class="muted compact">Nothing is blocking the next guided step right now.</p>
			{/if}
			<a class="inline-link" href={`/chat/${liveThreadView.thread.id}/profile`}>Review the details I captured</a>
		</section>

		{#if liveThreadView.railWidgets.length > 0}
			<WidgetRenderer
				widgets={liveThreadView.railWidgets}
				placement="rail"
				threadId={liveThreadView.thread.id}
				governedActionGate={governedActionGate}
				intakeProtectedActionsBlocked={intakeProtectedActionsBlocked}
				intakeProtectionMessage={intakeVerificationDetail}
				showInternalWidgets={showInternalOperatorUi}
				showWidgetTypeBadge={showInternalOperatorUi}
				renderEmptyState={false}
			/>
		{/if}

		{#if showInternalOperatorUi}
			<section class="glass panel">
				<div class="eyebrow">Connected Tools</div>
				<div class="tool-list">
					{#each liveThreadView.thread.connectedTools as tool}
						<div class="tool-row">
							<div>
								<strong>{tool.name}</strong>
								<div class="muted">{tool.note}</div>
							</div>
							{#if tool.actionHref}
								<a class="tool-link" href={tool.actionHref} target="_blank" rel="noreferrer">
									Open in .agency
								</a>
							{:else}
								<span class={`status-pill ${tool.status === 'connected' ? 'good' : 'warn'}`}>
									{tool.status.replace('_', ' ')}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if visibleArtifacts.length > 0}
			<section class="glass panel">
				<div class="eyebrow">{showInternalOperatorUi ? 'Artifacts' : 'Files and confirmations'}</div>
				<div class="artifact-list">
					{#each visibleArtifacts as artifact}
					<div class="artifact-row">
						<div>
							<strong>{artifact.title}</strong>
							<div class="muted">{artifact.summary}</div>
							{#if artifact.fileName || artifact.contentType || artifact.byteSize}
								<div class="muted artifact-meta">
									{#if artifact.fileName}
										<span>{artifact.fileName}</span>
									{/if}
									{#if artifact.byteSize}
										<span>{formatFileSize(artifact.byteSize)}</span>
									{/if}
									{#if artifact.contentType}
										<span>{artifact.contentType}</span>
									{/if}
								</div>
							{/if}
							{#if artifact.href}
								<a class="inline-link artifact-link" href={artifact.href}>Download artifact</a>
							{/if}
						</div>
						<span class={`status-pill ${artifact.status === 'ready' ? 'good' : 'warn'}`}>
							{artifact.status}
						</span>
					</div>
					{/each}
				</div>

				{#if showInternalOperatorUi && liveThreadView.hasHandoff}
					<a class="inline-link" href={`/chat/${liveThreadView.thread.id}/handoff`}>
						{liveThreadView.handoffPacket?.actionLabel ?? 'Open handoff packet'}
					</a>
				{/if}
			</section>
		{/if}

		{#if showInternalOperatorUi}
			<section class="glass panel">
				<div class="eyebrow">Dify Boundary</div>
				<ul class="rule-list">
					{#each data.difyRuntimeBoundary.operator as rule}
						<li>{rule}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</aside>
</section>

<style>
	.split-layout {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.95fr);
		gap: 1.15rem;
		align-items: start;
	}

	.split-layout.operator {
		grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.45fr) minmax(320px, 0.9fr);
	}

	.context-column,
	.main-column,
	.side-column {
		display: grid;
		gap: 1.15rem;
		align-content: start;
	}

	.panel,
	.composer {
		padding: clamp(1.1rem, 2vw, 1.35rem);
	}

	.rail-title {
		margin: 0.7rem 0 0;
		font-size: 1.1rem;
	}

	.operator-context {
		background: var(--surface-strong);
	}

	.thread-hero.nurse {
		padding-block: 1rem 1.05rem;
	}

	.access-banner {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.access-banner.good {
		border-color: rgba(107, 201, 152, 0.24);
	}

	.access-banner.warn {
		border-color: rgba(255, 214, 153, 0.24);
	}

	.access-banner.danger {
		border-color: rgba(255, 150, 144, 0.24);
	}

	.thread-top,
	.guidance-top,
	.message-meta,
	.summary-banner,
	.tool-row,
	.artifact-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.thread-top {
		align-items: flex-start;
	}

	.thread-top > :first-child {
		display: grid;
		gap: 0.45rem;
		min-width: 0;
		max-width: min(42rem, 100%);
	}

	.thread-meta-row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		flex-wrap: wrap;
		margin-top: 0.2rem;
	}

	.thread-top .status-pill {
		flex: 0 0 auto;
		align-self: flex-start;
		margin-top: 0.2rem;
		padding-inline: 0.85rem;
	}

	.summary-banner {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 18px;
		background: var(--surface-soft);
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

	.guidance-panel {
		border-color: rgba(167, 184, 255, 0.22);
	}

	.guidance-panel.good {
		border-color: rgba(107, 201, 152, 0.24);
	}

	.guidance-panel.warn {
		border-color: rgba(255, 214, 153, 0.24);
	}

	.guidance-top {
		align-items: flex-start;
	}

	.assistant-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 6.25rem;
		padding: 0.5rem 0.8rem;
		border-radius: 999px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
		font-family: var(--font-mono);
		font-size: 0.76rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.guidance-helper {
		margin-top: 0.75rem;
	}

	.message-list {
		display: grid;
		gap: 1rem;
		padding: 0.1rem 0.1rem 0.5rem;
	}

	.message {
		padding: 1rem 1.1rem;
		max-width: min(100%, 92%);
		overflow: hidden;
		border-radius: 24px 24px 24px 14px;
		scroll-margin-bottom: 16rem;
	}

	.message.user {
		margin-left: auto;
		max-width: min(100%, 80%);
		background: var(--surface-contrast);
		color: var(--ink);
		border-color: rgba(167, 184, 255, 0.24);
		box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28);
		border-radius: 24px 24px 14px 24px;
	}

	.message.assistant {
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
	}

	.message.pending,
	.message.streaming {
		border-color: rgba(167, 184, 255, 0.28);
	}

	.message p,
	.panel p {
		margin: 0.55rem 0 0;
		line-height: 1.6;
	}

	.message.typing {
		border-style: dashed;
		max-width: min(100%, 10rem);
	}

	.inline-widget-lane {
		display: grid;
		gap: 0.85rem;
	}

	.inline-widget-lane.nurse {
		position: relative;
		padding-left: 1.2rem;
	}

	.inline-widget-lane.nurse::before {
		content: '';
		position: absolute;
		left: 0.36rem;
		top: 0.2rem;
		bottom: 0.7rem;
		width: 1px;
		background: linear-gradient(
			180deg,
			rgba(167, 184, 255, 0.42),
			rgba(167, 184, 255, 0.08)
		);
	}

	.inline-widget-note {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding-left: 0.1rem;
	}

	.assistant-chip.subtle {
		min-width: auto;
		padding: 0.38rem 0.68rem;
		background: rgba(26, 34, 50, 0.55);
		font-size: 0.68rem;
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

	.typing-dots {
		display: inline-flex;
		gap: 0.4rem;
		margin-top: 0.8rem;
	}

	.typing-dots span {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: rgba(167, 184, 255, 0.9);
		animation: pulse 1s ease-in-out infinite;
	}

	.typing-dots span:nth-child(2) {
		animation-delay: 0.16s;
	}

	.typing-dots span:nth-child(3) {
		animation-delay: 0.32s;
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
		background: var(--surface-overlay);
		border: 1px solid var(--line);
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

	.artifact-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.35rem;
	}

	.artifact-link {
		display: inline-flex;
		margin-top: 0.45rem;
	}

	.error-text {
		margin: 0;
		color: var(--danger);
	}

	.snapshot-panel.nurse {
		background: linear-gradient(180deg, rgba(16, 22, 34, 0.9), rgba(10, 14, 22, 0.92));
		border-color: rgba(167, 184, 255, 0.14);
	}

	.snapshot-helper {
		margin-top: 0.55rem;
	}

	.section-kicker {
		font-family: var(--font-mono);
		font-size: 0.74rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	textarea {
		width: 100%;
		margin: 0.9rem 0 0;
		border-radius: 18px;
		padding: 1rem 1rem 1.05rem;
		border: 1px solid var(--line);
		resize: none;
		background: var(--field-bg);
		line-height: 1.55;
		min-height: 4rem;
		max-height: 13.75rem;
		transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
	}

	textarea:focus-visible {
		border-color: var(--line-accent);
		box-shadow: 0 0 0 1px rgba(167, 184, 255, 0.26);
		background: rgba(16, 21, 33, 0.96);
	}

	.composer {
		position: sticky;
		bottom: 1rem;
		z-index: 2;
		padding-block: 1rem;
		background:
			linear-gradient(180deg, rgba(18, 24, 37, 0.94) 0%, rgba(10, 14, 22, 0.98) 100%);
		border-color: rgba(167, 184, 255, 0.18);
	}

	.composer-form {
		display: grid;
		gap: 0.75rem;
	}

	.composer-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.composer-actions button {
		min-width: 7rem;
	}

	.compact {
		margin-top: 0;
	}

	@media (max-width: 1024px) {
		.split-layout.operator,
		.split-layout {
			grid-template-columns: 1fr;
		}

		.composer {
			position: static;
		}

		.message,
		.message.user,
		.message.typing {
			max-width: 100%;
		}

		.inline-widget-lane.nurse {
			padding-left: 0;
		}

		.inline-widget-lane.nurse::before {
			display: none;
		}
	}

	@media (max-width: 720px) {
		.thread-top .status-pill {
			order: -1;
		}
	}

	@keyframes pulse {
		0%,
		80%,
		100% {
			transform: translateY(0);
			opacity: 0.38;
		}

		40% {
			transform: translateY(-0.2rem);
			opacity: 1;
		}
	}
</style>
