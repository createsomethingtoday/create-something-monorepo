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
	import { createConciergeThreadClient, sendThreadMessage } from '$chat/client-actions';
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
	let railActionError = '';
	let assistantTyping = false;
	let creatingThread = false;
	let liveThreadView: ThreadViewState = structuredClone(data.threadView);
	let renderedMessages: UiMessage[] = liveThreadView.thread.messages.map((message) => ({
		...message
	}));
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

	function formatThreadUpdatedAt(updatedAt: string) {
		return new Date(updatedAt).toLocaleDateString([], {
			month: 'short',
			day: 'numeric'
		});
	}

	function formatMessageSentAt(createdAt: string, referenceDate = new Date()) {
		const sentAt = new Date(createdAt);

		if (Number.isNaN(sentAt.getTime())) {
			return 'Sent time unavailable';
		}

		const time = sentAt.toLocaleTimeString([], {
			hour: 'numeric',
			minute: '2-digit'
		});
		const isToday = sentAt.toDateString() === referenceDate.toDateString();

		if (isToday) {
			return `Sent today at ${time}`;
		}

		const dateOptions: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric'
		};

		if (sentAt.getFullYear() !== referenceDate.getFullYear()) {
			dateOptions.year = 'numeric';
		}

		return `Sent ${sentAt.toLocaleDateString([], dateOptions)} at ${time}`;
	}

	function formatMessageSentAtTitle(createdAt: string) {
		const sentAt = new Date(createdAt);

		if (Number.isNaN(sentAt.getTime())) {
			return 'Sent time unavailable';
		}

		return sentAt.toLocaleString([], {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		});
	}

	function formatThreadStatus(status: ThreadViewState['thread']['status']) {
		switch (status) {
			case 'awaiting_user':
				return 'Waiting on you';
			case 'handoff_ready':
				return 'Team review';
			default:
				return 'In progress';
		}
	}

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
		const baseMessages = threadView.thread.messages.filter(
			(message) => message.id !== assistantMessage.id
		);

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
				.find((message) => message.role === 'assistant' && !previousAssistantIds.has(message.id)) ??
			null;
		const previousInlineWidgetIds = new Set(
			previousThreadView.inlineWidgets.map((widget) => widget.id)
		);
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

	async function startNewThread() {
		creatingThread = true;
		railActionError = '';

		try {
			await createConciergeThreadClient();
		} catch (error) {
			railActionError =
				error instanceof Error ? error.message : 'Unable to start a new intake thread.';
		} finally {
			creatingThread = false;
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
		? 'Email verified'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Verification unavailable'
			: 'Email verification comes later';
	$: intakeVerificationDetail = data.intakeAccess.granted
		? 'Uploads and recruiter review can continue in this browser when they are ready.'
		: data.intakeAccess.reason === 'missing_secret'
			? 'Document upload and recruiter review are unavailable until verification is restored.'
			: 'Keep chatting now. When it is time for documents or recruiter review, I will ask for a one-time email code in this thread.';
	$: intakeProtectedActionsBlocked = !data.intakeAccess.granted;
	$: nurseGuidance = getNurseGuidance(liveThreadView.thread, {
		intakeVerified: data.intakeAccess.granted
	});
	$: showNurseVerificationPrompt =
		!showInternalOperatorUi &&
		!data.intakeAccess.granted &&
		liveThreadView.thread.profile.completion >= 25;
	$: showExpandedVerificationBanner = showInternalOperatorUi || showNurseVerificationPrompt;
	$: showStarterPrompt = !showInternalOperatorUi && liveThreadView.thread.profile.completion === 0;
	$: threadEyebrow = showInternalOperatorUi ? 'Primary Conversation Surface' : 'Application Chat';
	$: operatorPlaneSummary = data.operatorShellPlanes.map((plane) => plane.label).join(' / ');
	$: commandCenter = data.operatorCommandCenter;
	$: snapshotEyebrow = showInternalOperatorUi ? 'Application Snapshot' : 'Application Notes';
	$: snapshotTitle = showInternalOperatorUi ? 'What I have so far' : 'What Concierge has so far';
	$: snapshotSummary = showInternalOperatorUi
		? liveThreadView.thread.turn.summary
		: nurseGuidance.body;
	$: snapshotHelper = showInternalOperatorUi
		? ''
		: (nurseGuidance.helper ??
			'I will ask for documents, confirmation, or booking here as soon as they are needed.');
	$: visibleArtifacts = showInternalOperatorUi
		? liveThreadView.thread.artifacts
		: liveThreadView.thread.artifacts.filter((artifact) =>
				nurseVisibleArtifactKinds.has(artifact.kind)
			);
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
				<div class="command-summary">
					<div>
						<span>State reason</span>
						<strong>{commandCenter.stateReason}</strong>
					</div>
					<div>
						<span>Next owner</span>
						<strong>{commandCenter.nextActionOwner}</strong>
					</div>
				</div>
				<div class="metric-list" aria-label="Operator command metrics">
					{#each commandCenter.metrics as metric}
						<div class="metric-row">
							<div>
								<span>{metric.label}</span>
								<strong>{metric.value}</strong>
								<p>{metric.detail}</p>
							</div>
							<span class={`status-dot ${metric.tone}`} aria-label={metric.tone}></span>
						</div>
					{/each}
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
	{:else}
		<aside class="history-column" aria-label="Chat history">
			<section class="glass panel history-panel">
				<div class="history-header">
					<div>
						<div class="eyebrow">Your workspace</div>
						<h2 class="rail-title">Saved applications</h2>
					</div>
					<button
						class="rail-icon-button"
						type="button"
						aria-label="Start new intake"
						title="Start new intake"
						on:click={startNewThread}
						disabled={creatingThread}
					>
						<span aria-hidden="true"></span>
					</button>
				</div>

				{#if railActionError}
					<p class="error-text compact">{railActionError}</p>
				{/if}

				<div class="history-list">
					{#each data.threadSummaries as thread}
						<a
							class={`history-thread ${thread.id === liveThreadView.thread.id ? 'active' : ''}`}
							aria-current={thread.id === liveThreadView.thread.id ? 'page' : undefined}
							href={`/chat/${thread.id}`}
						>
							<div class="history-thread-top">
								<strong>{thread.title}</strong>
								<span
									class={`status-dot ${statusClass[thread.status]}`}
									aria-label={formatThreadStatus(thread.status)}
								></span>
							</div>
							<p>{thread.subtitle}</p>
							<div class="history-progress" aria-hidden="true">
								<div
									class="history-progress-fill"
									style={`width: ${thread.profileCompletion}%`}
								></div>
							</div>
							<div class="history-thread-meta">
								<span>{thread.profileCompletion}% complete</span>
								<span>{formatThreadUpdatedAt(thread.updatedAt)}</span>
							</div>
							<div class="history-pending">{thread.pendingAction}</div>
						</a>
					{/each}
				</div>
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
						showInternalOperatorUi
							? data.operatorState.tone
							: statusClass[liveThreadView.thread.status]
					}`}
				>
					{showInternalOperatorUi
						? data.operatorState.label
						: formatThreadStatus(liveThreadView.thread.status)}
				</span>
			</div>

			{#if !showInternalOperatorUi}
				<div class="application-completion" aria-label="Application completion">
					<div class="application-completion-copy">
						<span>Working profile</span>
						<strong>{liveThreadView.thread.profile.completion}% complete</strong>
					</div>
					<div class="application-completion-track" aria-hidden="true">
						<span style={`width: ${liveThreadView.thread.profile.completion}%`}></span>
					</div>
					<span class="application-completion-note">Built with you, one answer at a time.</span>
				</div>
			{/if}

			{#if showInternalOperatorUi}
				<div class="summary-banner">
					<div>
						<strong>{commandCenter.nextActionLabel}</strong>
						<p>{commandCenter.nextActionDetail}</p>
						<p class="operator-copy">{data.operatorState.operatorCopy}</p>
					</div>
					<div class="summary-meta">
						<span>Owner</span>
						<strong>{commandCenter.nextActionOwner}</strong>
						<span>Policy</span>
						<strong class="policy-ref">{commandCenter.policyRef}</strong>
					</div>
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

		{#if showInternalOperatorUi ? !data.intakeAccess.granted : showNurseVerificationPrompt}
			<IntakeVerificationPanel
				accessGranted={data.intakeAccess.granted}
				verifiedEmail={data.intakeAccess.grant?.email ?? null}
				verificationSupport={data.intakeVerification}
				title="Verify your email to keep going"
				description="Use a one-time code when this application is ready for document upload or recruiter review."
				compact={true}
			/>
		{/if}

		{#if showStarterPrompt}
			<section class="starter-card">
				<div>
					<div class="eyebrow">Good First Message</div>
					<p>Share specialty, shift, and location. A sentence is enough.</p>
				</div>
				<div class="starter-examples" aria-label="Example first messages">
					<span>ICU nights in Dallas</span>
					<span>ER days near Phoenix</span>
					<span>Compact license, open to Texas</span>
				</div>
			</section>
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
						<span class="message-sent-at" title={formatMessageSentAtTitle(message.createdAt)}>
							{formatMessageSentAt(message.createdAt)}
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
					{governedActionGate}
					{intakeProtectedActionsBlocked}
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
					Reply naturally and I will guide the next step. When I need documents or a booking, I will
					place that action directly into this thread.
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
					{showInternalOperatorUi ? 'Active blockers' : 'Next I Need'}
				</p>
				<ul class="blockers">
					{#each liveThreadView.thread.turn.blockers as blocker}
						<li>{blocker}</li>
					{/each}
				</ul>
			{:else}
				<p class="muted compact">Nothing is blocking the next guided step right now.</p>
			{/if}
			{#if showInternalOperatorUi}
				<div class="proof-inventory">
					<p class="muted compact section-kicker">Proof inventory</p>
					<div class="proof-list">
						{#each commandCenter.proofInventory as proof}
							<div class="proof-row">
								<div>
									<span>{proof.label}</span>
									<strong>{proof.value}</strong>
									{#if proof.detail}
										<p class="muted">{proof.detail}</p>
									{/if}
								</div>
								<span class={`status-pill ${proof.tone}`}>{proof.tone}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			<a class="inline-link" href={`/chat/${liveThreadView.thread.id}/profile`}
				>Review the details I captured</a
			>
		</section>

		{#if liveThreadView.railWidgets.length > 0}
			<WidgetRenderer
				widgets={liveThreadView.railWidgets}
				placement="rail"
				threadId={liveThreadView.thread.id}
				{governedActionGate}
				{intakeProtectedActionsBlocked}
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

			<section class="glass panel">
				<div class="eyebrow">Operator Checks</div>
				<div class="check-list">
					{#each commandCenter.checks as check}
						<div class="check-row">
							<div>
								<strong>{check.label}</strong>
								<p class="muted">{check.detail}</p>
							</div>
							<span class={`status-pill ${check.tone}`}>{check.status}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if visibleArtifacts.length > 0}
			<section class="glass panel">
				<div class="eyebrow">
					{showInternalOperatorUi ? 'Artifacts' : 'Files and confirmations'}
				</div>
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
				<div class="eyebrow">Agent runtime boundary</div>
				<ul class="rule-list">
					{#each data.agentRuntimeBoundary.operator as rule}
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

	.split-layout.nurse {
		grid-template-columns: minmax(0, 1.48fr) minmax(300px, 0.62fr);
		gap: clamp(1.15rem, 2vw, 1.75rem);
	}

	.split-layout.operator {
		grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.45fr) minmax(320px, 0.9fr);
	}

	.context-column,
	.history-column,
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
		margin: 0.62rem 0 0;
		font-size: var(--text-body-lg, 1.095rem);
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-snug, 1.375);
	}

	.operator-context {
		background: var(--surface-strong);
	}

	.history-column {
		position: sticky;
		top: 7rem;
	}

	.split-layout.nurse .history-column {
		position: static;
		grid-column: 1 / -1;
	}

	.history-panel {
		display: grid;
		gap: 1rem;
		max-height: calc(100vh - 8rem);
		overflow: auto;
		background: var(--surface-strong);
	}

	.split-layout.nurse .history-panel {
		grid-template-columns: minmax(190px, 0.3fr) minmax(0, 1fr);
		align-items: center;
		max-height: none;
		padding: 0 0 1.15rem;
		border: 0;
		border-bottom: 1px solid rgba(23, 21, 18, 0.12);
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}

	.history-header,
	.history-thread-top,
	.history-thread-meta {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.rail-icon-button {
		display: inline-grid;
		place-items: center;
		width: 2.15rem;
		height: 2.15rem;
		padding: 0;
		flex: 0 0 auto;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-soft);
		color: var(--ink);
		cursor: pointer;
		box-shadow: none;
	}

	.rail-icon-button:disabled {
		cursor: wait;
		opacity: 1;
		background: var(--disabled-bg);
		color: var(--disabled-ink);
	}

	.rail-icon-button span {
		position: relative;
		display: block;
		width: 0.86rem;
		height: 0.86rem;
	}

	.rail-icon-button span::before,
	.rail-icon-button span::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0.82rem;
		height: 2px;
		border-radius: 999px;
		background: currentColor;
		transform: translate(-50%, -50%);
	}

	.rail-icon-button span::after {
		transform: translate(-50%, -50%) rotate(90deg);
	}

	.history-list {
		display: grid;
		gap: 0.7rem;
	}

	.split-layout.nurse .history-list {
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	}

	.split-layout.nurse .history-thread {
		padding: 0.9rem 1rem;
		background: rgba(255, 250, 244, 0.72);
	}

	.history-thread {
		display: grid;
		gap: 0.58rem;
		padding: 0.82rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-tight);
		background: var(--surface);
		color: var(--ink-soft);
		text-decoration: none;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			transform 140ms ease;
	}

	.history-thread:hover,
	.history-thread.active {
		border-color: var(--line-strong);
		background: var(--selected-bg);
	}

	.history-thread.active {
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}

	.history-thread:hover {
		transform: translateY(-1px);
	}

	.history-thread strong {
		min-width: 0;
		font-size: var(--text-body-sm, 0.913rem);
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-snug, 1.375);
	}

	.history-thread p,
	.history-pending {
		margin: 0;
		color: var(--muted);
		font-size: var(--text-caption, 0.833rem);
		line-height: var(--leading-normal, 1.5);
	}

	.history-progress {
		height: 0.4rem;
		border-radius: 999px;
		background: var(--surface-overlay);
		border: 1px solid var(--line);
		overflow: hidden;
	}

	.history-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: var(--progress-fill);
	}

	.history-thread-meta {
		color: var(--muted-strong);
		font-family: var(--font-mono);
		font-size: var(--text-overline, 0.618rem);
		line-height: 1;
		letter-spacing: var(--tracking-wider, 0.05em);
		text-transform: uppercase;
	}

	.history-pending {
		padding-top: 0.55rem;
		border-top: 1px solid var(--line);
	}

	.thread-hero.nurse {
		position: relative;
		padding: clamp(1.5rem, 3vw, 2.35rem);
		border-color: rgba(23, 21, 18, 0.96);
		background:
			radial-gradient(circle at 84% 18%, rgba(29, 111, 138, 0.3), transparent 14rem),
			linear-gradient(135deg, #171512 0%, #211d19 100%);
		color: #ffffff;
		box-shadow: 0 28px 70px rgba(44, 34, 24, 0.16);
		overflow: hidden;
	}

	.thread-hero.nurse::after {
		content: '';
		position: absolute;
		right: -5rem;
		top: -8rem;
		width: 18rem;
		height: 18rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 999px;
		pointer-events: none;
	}

	.thread-hero.nurse .eyebrow {
		border-color: rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.07);
		color: #d7a77d;
	}

	.thread-hero.nurse .muted {
		color: rgba(255, 255, 255, 0.64);
	}

	.thread-hero.nurse .status-pill {
		border-color: rgba(255, 255, 255, 0.16);
		background: rgba(255, 255, 255, 0.08);
		color: #ffffff;
	}

	.thread-hero .section-title {
		font-size: var(--text-h2, clamp(1.2rem, 2vw + 0.5rem, 1.618rem));
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-tight, 1.25);
	}

	.thread-hero.nurse .section-title {
		margin-top: 0.3rem;
		font-size: clamp(2rem, 4vw, 3.45rem);
		font-weight: 560;
		line-height: 0.98;
		letter-spacing: -0.055em;
	}

	.application-completion {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: auto minmax(100px, 1fr) auto;
		align-items: center;
		gap: 18px;
		margin-top: clamp(1.5rem, 3vw, 2.6rem);
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.14);
	}

	.application-completion-copy {
		display: grid;
		gap: 4px;
	}

	.application-completion-copy span,
	.application-completion-note {
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.74rem;
	}

	.application-completion-copy strong {
		font-size: 0.9rem;
		font-weight: 580;
	}

	.application-completion-track {
		height: 4px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		overflow: hidden;
	}

	.application-completion-track span {
		display: block;
		height: 100%;
		min-width: 4px;
		border-radius: inherit;
		background: linear-gradient(90deg, #af7c54, #1d6f8a);
	}

	.guidance-panel .section-title,
	.snapshot-panel .section-title {
		font-size: var(--text-h3, clamp(1.02rem, 1vw + 0.5rem, 1.2rem));
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-snug, 1.375);
	}

	.access-banner {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.access-banner.good {
		border-color: var(--good-line);
	}

	.access-banner.warn {
		border-color: var(--warn-line);
	}

	.access-banner.danger {
		border-color: var(--danger-line);
	}

	.starter-card {
		display: grid;
		grid-template-columns: minmax(0, 0.95fr) minmax(220px, 1.05fr);
		gap: 1rem;
		align-items: center;
		padding: 1rem 1.05rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background:
			linear-gradient(110deg, rgba(175, 124, 84, 0.11), rgba(255, 250, 244, 0.86)), var(--surface);
	}

	.starter-card p {
		margin: 0.58rem 0 0;
		color: var(--muted-strong);
		font-size: var(--text-body-sm, 0.913rem);
	}

	.starter-examples {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.starter-examples span {
		min-height: 1.55rem;
		padding: 0.27rem 0.58rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--surface-soft);
		color: var(--ink-soft);
		font-size: 0.78rem;
		line-height: 1;
		display: inline-flex;
		align-items: center;
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
		border-radius: var(--radius);
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.summary-meta {
		display: grid;
		gap: 0.28rem;
		min-width: min(12rem, 100%);
		align-content: start;
	}

	.summary-meta span {
		color: var(--muted);
		font-size: 0.72rem;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.policy-ref {
		font-family: var(--font-mono);
		font-size: 0.78rem;
		color: var(--muted);
	}

	.operator-copy {
		color: var(--ink);
		font-weight: var(--font-medium, 500);
	}

	.guidance-panel {
		border-color: var(--line);
	}

	.guidance-panel.good {
		border-color: var(--good-line);
	}

	.guidance-panel.warn {
		border-color: var(--warn-line);
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
		font-size: 0.72rem;
		line-height: 1;
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

	.split-layout.nurse .message-list {
		gap: 1.15rem;
		padding: 0.45rem 0 0.25rem;
	}

	.message {
		padding: 1rem 1.1rem;
		max-width: min(100%, 92%);
		overflow: hidden;
		border-radius: var(--radius);
		scroll-margin-bottom: 16rem;
	}

	.split-layout.nurse .message.assistant {
		border-color: rgba(175, 124, 84, 0.22);
		background: rgba(255, 250, 244, 0.94);
		box-shadow: 0 18px 48px rgba(44, 34, 24, 0.07);
	}

	.message.user {
		margin-left: auto;
		max-width: min(100%, 80%);
		background: var(--surface-soft);
		color: var(--ink);
		border-color: var(--line-strong);
		box-shadow: var(--shadow);
		border-radius: var(--radius);
	}

	.split-layout.nurse .message.user {
		border-color: #171512;
		background: #171512;
		color: #ffffff;
		box-shadow: 0 18px 48px rgba(23, 21, 18, 0.15);
	}

	.split-layout.nurse .message.user .message-meta span {
		color: rgba(255, 255, 255, 0.56);
	}

	.message.assistant {
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
	}

	.message.pending,
	.message.streaming {
		border-color: var(--line-strong);
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
		background: linear-gradient(180deg, rgba(10, 14, 25, 0.18), rgba(10, 14, 25, 0.04));
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
		background: var(--surface-soft);
		font-size: 0.68rem;
	}

	.context-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.context-list div,
	.command-summary div {
		display: grid;
		gap: 0.25rem;
		border-top: 1px solid var(--line);
		padding-top: 0.75rem;
	}

	.context-list span,
	.command-summary span,
	.metric-row span,
	.proof-row span {
		color: var(--muted);
		font-size: 0.78rem;
	}

	.context-list strong,
	.command-summary strong {
		font-size: 0.94rem;
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-snug, 1.375);
	}

	.command-summary,
	.metric-list,
	.proof-list,
	.check-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.metric-row,
	.proof-row,
	.check-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.85rem;
		border-top: 1px solid var(--line);
		padding-top: 0.75rem;
	}

	.metric-row > div,
	.proof-row > div,
	.check-row > div {
		min-width: 0;
		display: grid;
		gap: 0.25rem;
	}

	.metric-row strong,
	.proof-row strong {
		font-size: 1rem;
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-snug, 1.375);
	}

	.metric-row p,
	.proof-row p,
	.check-row p {
		margin: 0;
		line-height: var(--leading-normal, 1.5);
	}

	.status-dot {
		width: 0.65rem;
		height: 0.65rem;
		flex: 0 0 auto;
		margin-top: 0.25rem;
		border-radius: 999px;
		background: var(--muted);
		box-shadow:
			0 0 0 3px var(--surface),
			0 0 0 4px var(--line);
	}

	.status-dot.good {
		background: var(--good);
	}

	.status-dot.warn {
		background: var(--warn);
	}

	.status-dot.danger {
		background: var(--danger);
	}

	.proof-inventory {
		margin-top: 1rem;
	}

	.proof-row .status-pill,
	.check-row .status-pill {
		flex: 0 0 auto;
		max-width: 12rem;
		white-space: normal;
		text-align: center;
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
		background: var(--accent);
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
		line-height: 1.2;
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
		font-weight: var(--font-medium, 500);
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
		position: relative;
		border-color: #171512;
		background:
			radial-gradient(circle at 90% 12%, rgba(29, 111, 138, 0.26), transparent 11rem), #171512;
		color: #ffffff;
		box-shadow: 0 24px 64px rgba(44, 34, 24, 0.14);
		overflow: hidden;
	}

	.snapshot-panel.nurse .eyebrow {
		border-color: rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.07);
		color: #d7a77d;
	}

	.snapshot-panel.nurse .muted,
	.snapshot-panel.nurse .snapshot-helper,
	.snapshot-panel.nurse .compact {
		color: rgba(255, 255, 255, 0.62);
	}

	.snapshot-panel.nurse .inline-link {
		display: inline-flex;
		margin-top: 1.15rem;
		padding-bottom: 0.3rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.28);
		color: #ffffff;
	}

	.snapshot-panel > .eyebrow {
		margin-bottom: 0.65rem;
	}

	.snapshot-helper {
		margin-top: 0.55rem;
	}

	.section-kicker {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	textarea {
		width: 100%;
		margin: 0.9rem 0 0;
		border-radius: var(--radius);
		padding: 1rem 1rem 1.05rem;
		border: 1px solid var(--line);
		resize: none;
		background: var(--field-bg);
		line-height: 1.55;
		min-height: 4rem;
		max-height: 13.75rem;
		transition:
			border-color 140ms ease,
			box-shadow 140ms ease,
			background 140ms ease;
	}

	textarea:focus-visible {
		border-color: var(--accent);
		box-shadow: 0 0 0 1px rgba(0, 72, 255, 0.18);
		background: var(--surface);
	}

	.composer {
		position: sticky;
		bottom: 1rem;
		z-index: 2;
		padding-block: 1rem;
		background: var(--surface);
		border-color: var(--line);
	}

	.composer.nurse {
		position: static;
		border-color: rgba(175, 124, 84, 0.28);
		background: rgba(255, 250, 244, 0.94);
		box-shadow: 0 24px 64px rgba(44, 34, 24, 0.13);
		backdrop-filter: blur(18px) saturate(1.1);
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
		min-width: 5.6rem;
		min-height: 2.5rem;
		padding: 0.55rem 0.95rem;
		border-radius: var(--radius-tight);
		line-height: 1;
	}

	.composer-actions button:disabled {
		background: var(--disabled-bg);
		border-color: var(--line);
		color: var(--disabled-ink);
	}

	.compact {
		margin-top: 0;
	}

	@media (max-width: 1024px) {
		.split-layout.operator,
		.split-layout.nurse,
		.split-layout {
			grid-template-columns: 1fr;
		}

		.history-column {
			position: static;
		}

		.history-panel {
			max-height: none;
		}

		.split-layout.nurse .history-panel {
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
		.starter-card {
			grid-template-columns: 1fr;
		}

		.starter-examples {
			justify-content: flex-start;
		}

		.thread-top .status-pill {
			order: -1;
		}

		.application-completion {
			grid-template-columns: 1fr;
			gap: 10px;
		}

		.application-completion-note {
			display: none;
		}

		.thread-hero.nurse .section-title {
			font-size: clamp(2rem, 12vw, 2.85rem);
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
