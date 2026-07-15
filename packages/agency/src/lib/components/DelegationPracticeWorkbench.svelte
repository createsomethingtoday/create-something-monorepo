<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		buildPracticeReceipt,
		createEmptyPracticeSession,
		DELEGATION_PRACTICE_STORAGE_KEY,
		DELEGATION_PRACTICE_STORAGE_VERSION,
		delegationPracticeArtifactFields,
		delegationPracticeStages,
		evaluateEarnedAuthority,
		nextDelegationPracticeStageId,
		parsePracticeState,
		serializePracticeState,
		type DelegationPracticeStageId,
		type DelegationPracticeReceipt,
		type DelegationPracticeRequiredField
	} from '$lib/practice/delegation-practice';

	let activeStageId: DelegationPracticeStageId = 'enter';
	let session = createEmptyPracticeSession();
	let receipt: DelegationPracticeReceipt | null = null;
	let receiptIssuedAt: string | null = null;
	let receiptMissingFields: DelegationPracticeRequiredField[] = [];
	let resetPending = false;
	let persistenceReady = false;

	$: activeStage = delegationPracticeStages.find((stage) => stage.id === activeStageId) ?? delegationPracticeStages[0];
	$: activeStageIndex = delegationPracticeStages.findIndex((stage) => stage.id === activeStageId);
	$: activeArtifactFields = delegationPracticeArtifactFields[activeStageId];
	$: missingActiveFields = activeArtifactFields.filter((field) => session[field.name].trim().length === 0);
	$: authorityEvidence = session.authorityEvidence;
	$: authorityResult = evaluateEarnedAuthority(authorityEvidence);
	$: if (browser && persistenceReady) {
		const hasDraft =
			receiptIssuedAt !== null ||
			Object.values(delegationPracticeArtifactFields)
				.flat()
				.some((field) => session[field.name].trim().length > 0);
		if (hasDraft) {
			localStorage.setItem(
				DELEGATION_PRACTICE_STORAGE_KEY,
				serializePracticeState({
					version: DELEGATION_PRACTICE_STORAGE_VERSION,
					session,
					receiptIssuedAt
				})
			);
		} else {
			localStorage.removeItem(DELEGATION_PRACTICE_STORAGE_KEY);
		}
	}

	onMount(() => {
		const serializedState = localStorage.getItem(DELEGATION_PRACTICE_STORAGE_KEY);
		if (serializedState) {
			const persistedState = parsePracticeState(serializedState);
			if (persistedState) {
				session = persistedState.session;
				receiptIssuedAt = persistedState.receiptIssuedAt;
				if (receiptIssuedAt) {
					const recoveredReceipt = buildPracticeReceipt(session, receiptIssuedAt);
					if (recoveredReceipt.ok) receipt = recoveredReceipt.receipt;
				}
			} else {
				localStorage.removeItem(DELEGATION_PRACTICE_STORAGE_KEY);
			}
		}
		persistenceReady = true;
	});

	function selectStage(stageId: DelegationPracticeStageId) {
		activeStageId = stageId;
	}

	function activateOnKeyboard(event: KeyboardEvent, action: () => void) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		action();
	}

	function moveToNextStage() {
		activeStageId = nextDelegationPracticeStageId(activeStageId);
	}

	function updateArtifactField(field: DelegationPracticeRequiredField, value: string) {
		receipt = null;
		receiptIssuedAt = null;
		receiptMissingFields = [];
		if (field === 'evidenceReceipt') {
			session = {
				...session,
				evidenceReceipt: value,
				authorityEvidence: {
					...session.authorityEvidence,
					receiptPresent: value.trim().length > 0
				}
			};
			return;
		}
		session = { ...session, [field]: value };
	}

	function isStageComplete(stageId: DelegationPracticeStageId) {
		return delegationPracticeArtifactFields[stageId].every(
			(field) => session[field.name].trim().length > 0
		);
	}

	function loadScenario(
		scenario:
			| 'complete-proof'
			| 'owner-approval'
			| 'missing-receipt'
			| 'stale-policy'
			| 'false-confidence'
			| 'boundary-breach'
	) {
		receipt = null;
		receiptIssuedAt = null;
		receiptMissingFields = [];
		session = {
			...session,
			authorityEvidence: {
			currentState: 'prepare',
			receiptPresent:
				scenario === 'missing-receipt' ? false : session.evidenceReceipt.trim().length > 0,
			policyCurrent: scenario !== 'stale-policy',
			criticalBoundaryBreach: scenario === 'boundary-breach',
			calibrationFailure: scenario === 'false-confidence',
			promotionEvidenceComplete: scenario === 'complete-proof' || scenario === 'owner-approval',
			ownerApproved: scenario === 'owner-approval'
			}
		};
	}

	function fieldLabel(fieldName: DelegationPracticeRequiredField) {
		for (const fields of Object.values(delegationPracticeArtifactFields)) {
			const field = fields.find((candidate) => candidate.name === fieldName);
			if (field) return field.label;
		}
		return fieldName;
	}

	function stageForField(fieldName: DelegationPracticeRequiredField) {
		return delegationPracticeStages.find((stage) =>
			delegationPracticeArtifactFields[stage.id].some((field) => field.name === fieldName)
		)?.id;
	}

	function generatePracticeReceipt() {
		const issuedAt = new Date().toISOString();
		const result = buildPracticeReceipt(session, issuedAt);
		if (!result.ok) {
			receipt = null;
			receiptIssuedAt = null;
			receiptMissingFields = result.missingFields;
			const firstMissingStage = stageForField(result.missingFields[0]);
			if (firstMissingStage) activeStageId = firstMissingStage;
			return;
		}
		receiptMissingFields = [];
		receiptIssuedAt = issuedAt;
		receipt = result.receipt;
	}

	function resetPracticeSession() {
		session = createEmptyPracticeSession();
		receipt = null;
		receiptIssuedAt = null;
		receiptMissingFields = [];
		activeStageId = 'enter';
		resetPending = false;
		localStorage.removeItem(DELEGATION_PRACTICE_STORAGE_KEY);
	}
</script>

<section id="practice-workbench" class="practice-workbench" aria-labelledby="practice-workbench-title">
	<header class="practice-workbench__header">
		<div>
			<span>Operator journey</span>
			<small>{String(activeStageIndex + 1).padStart(2, '0')} / {String(delegationPracticeStages.length).padStart(2, '0')}</small>
		</div>
		<div>
			<h2 id="practice-workbench-title">Ten stages. Ten inspectable artifacts.</h2>
			<p>Progress follows the work produced, not time on page or content consumed.</p>
		</div>
	</header>

	<aside class="practice-preview-boundary" aria-label="Internal preview safety boundary">
		<div><strong>Internal preview</strong><span>Not certification</span></div>
		<p>Browser-local draft. Do not enter secrets, credentials, private client data, or PII.</p>
	</aside>

	<nav class="practice-workbench__stages" aria-label="Delegation Practice stages">
		<ol>
			{#each delegationPracticeStages as stage, index}
				{@const isActive = stage.id === activeStageId}
				{@const stageComplete = isStageComplete(stage.id)}
				<li>
					<button
						type="button"
						aria-current={isActive ? 'step' : undefined}
						data-active={isActive}
						data-complete={stageComplete}
						data-testid={`practice-stage-${stage.id}`}
						onclick={() => selectStage(stage.id)}
						onkeydown={(event) => activateOnKeyboard(event, () => selectStage(stage.id))}
					>
						<span>{String(index + 1).padStart(2, '0')}</span>
						<strong>{stage.label}</strong>
						<small>{stage.artifact}</small>
					</button>
				</li>
			{/each}
		</ol>
	</nav>

	<div class="practice-workbench__body">
		<article id={`stage-${activeStage.id}`} class="practice-workbench__chapter" aria-live="polite">
			<div class="practice-workbench__chapter-meta">
				<span>Stage {String(activeStageIndex + 1).padStart(2, '0')}</span>
				<small>{activeStage.artifact}</small>
			</div>
			<h3>{activeStage.label}</h3>
			<p class="practice-workbench__question">{activeStage.question}</p>
			<p>{activeStage.outcome}</p>
			<form class="practice-artifact-form" aria-label={`${activeStage.label} artifact`} onsubmit={(event) => event.preventDefault()}>
				{#each activeArtifactFields as field}
					{@const fieldId = `practice-${field.name}`}
					{@const hintId = `${fieldId}-hint`}
					<label for={fieldId}>
						<span>{field.label}</span>
						<small id={hintId}>{field.hint}</small>
					</label>
					{#if field.control === 'textarea'}
						<textarea
							id={fieldId}
							data-testid={`practice-field-${field.name}`}
							value={session[field.name]}
							placeholder={field.placeholder}
							aria-describedby={hintId}
							aria-invalid={session[field.name].trim().length === 0}
							oninput={(event) => updateArtifactField(field.name, event.currentTarget.value)}
						></textarea>
					{:else}
						<input
							id={fieldId}
							type={field.control}
							data-testid={`practice-field-${field.name}`}
							value={session[field.name]}
							placeholder={field.placeholder}
							aria-describedby={hintId}
							aria-invalid={session[field.name].trim().length === 0}
							oninput={(event) => updateArtifactField(field.name, event.currentTarget.value)}
						/>
					{/if}
				{/each}
				<p class="practice-artifact-form__status" data-ready={missingActiveFields.length === 0} aria-live="polite">
					{#if missingActiveFields.length === 0}
						Artifact ready
					{:else}
						Missing artifact: {missingActiveFields.map((field) => field.label).join(', ')}
					{/if}
				</p>
			</form>
			<button
				class="practice-workbench__next"
				type="button"
				data-testid="practice-next-stage"
				disabled={activeStageId === 'practice'}
				onclick={moveToNextStage}
				onkeydown={(event) => activateOnKeyboard(event, moveToNextStage)}
			>
				{activeStageId === 'practice' ? 'Practice handoff reached' : 'Next stage'}
			</button>
		</article>

		<aside class="authority-envelope" aria-labelledby="authority-envelope-title">
			<div class="authority-envelope__title">
				<span>Earned Authority</span>
				<h3 id="authority-envelope-title">Authority Envelope</h3>
				<p>No score. One contextual authority decision.</p>
			</div>
			<dl>
				<div><dt>Workflow</dt><dd>{session.workflowName || 'Not named'}</dd></div>
				<div><dt>Owner</dt><dd>{session.accountableOwner || 'Not named'}</dd></div>
				<div><dt>Verifier</dt><dd>{session.verifier || 'Not named'}</dd></div>
				<div><dt>Current state</dt><dd>{authorityEvidence.currentState.replaceAll('_', ' ')}</dd></div>
				<div><dt>Receipt</dt><dd>{session.evidenceReceipt || 'Missing'}</dd></div>
				<div><dt>Policy version</dt><dd>{session.policyVersion || 'Not bound'}</dd></div>
				<div><dt>Policy state</dt><dd>{authorityEvidence.policyCurrent ? 'current' : 'stale'}</dd></div>
				<div><dt>Decision</dt><dd data-decision={authorityResult.decision}>{authorityResult.decision}</dd></div>
				<div><dt>Next state</dt><dd>{authorityResult.nextState.replaceAll('_', ' ')}</dd></div>
				<div><dt>Rollback</dt><dd>{session.rollbackTrigger || 'Not bound'}</dd></div>
			</dl>
			<p class="authority-envelope__reason">{authorityResult.reason}</p>
			<div class="authority-envelope__boundary" aria-label="Allowed and forbidden actions">
				<div><span>Allowed</span><p>{session.allowedActions || 'Not bound'}</p></div>
				<div><span>Forbidden</span><p>{session.forbiddenActions || 'Not bound'}</p></div>
			</div>
			<div class="authority-envelope__scenarios" aria-label="Authority evidence scenarios">
				<button data-testid="authority-complete-proof" type="button" onclick={() => loadScenario('complete-proof')} onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('complete-proof'))}>Complete proof</button>
				<button data-testid="authority-owner-approval" type="button" onclick={() => loadScenario('owner-approval')} onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('owner-approval'))}>Owner approves expansion</button>
				<button data-testid="authority-missing-receipt" type="button" onclick={() => loadScenario('missing-receipt')} onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('missing-receipt'))}>Remove receipt</button>
				<button data-testid="authority-stale-policy" type="button" onclick={() => loadScenario('stale-policy')} onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('stale-policy'))}>Use stale policy</button>
				<button data-testid="authority-false-confidence" type="button" onclick={() => loadScenario('false-confidence')} onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('false-confidence'))}>Add false confidence</button>
				<button data-testid="authority-boundary-breach" type="button" onclick={() => loadScenario('boundary-breach')} onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('boundary-breach'))}>Attempt forbidden action</button>
			</div>
			<section class="authority-envelope__affected" aria-labelledby="affected-party-title">
				<h4 id="affected-party-title">Affected-party review</h4>
				<dl>
					<div><dt>Party</dt><dd>{session.affectedParty || 'Not represented'}</dd></div>
					<div><dt>Notice</dt><dd>{session.noticePlan || 'Missing'}</dd></div>
					<div><dt>Appeal</dt><dd>{session.appealPath || 'Missing'}</dd></div>
				</dl>
			</section>
		</aside>
	</div>

	<section id="practice-receipt" class="practice-receipt" aria-labelledby="practice-receipt-title">
		<header>
			<div>
				<span>Internal preview</span>
				<span>Not certification</span>
			</div>
			<h3 id="practice-receipt-title">Practice Receipt</h3>
			<p>Generate only after every artifact and governance binding is inspectable.</p>
		</header>

		<div class="practice-receipt__actions">
			<button data-testid="generate-practice-receipt" type="button" onclick={generatePracticeReceipt} onkeydown={(event) => activateOnKeyboard(event, generatePracticeReceipt)}>
				Generate Practice Receipt
			</button>
			{#if !resetPending}
				<button type="button" class="practice-receipt__secondary" onclick={() => (resetPending = true)} onkeydown={(event) => activateOnKeyboard(event, () => (resetPending = true))}>Start over</button>
			{:else}
				<div class="practice-receipt__reset" role="group" aria-label="Confirm start over">
					<strong>Erase browser-local draft?</strong>
					<button data-testid="reset-practice-session" type="button" onclick={resetPracticeSession} onkeydown={(event) => activateOnKeyboard(event, resetPracticeSession)}>Erase browser-local draft</button>
					<button type="button" class="practice-receipt__secondary" onclick={() => (resetPending = false)} onkeydown={(event) => activateOnKeyboard(event, () => (resetPending = false))}>Cancel</button>
				</div>
			{/if}
		</div>

		{#if receiptMissingFields.length > 0}
			<div class="practice-receipt__validation" role="alert" data-testid="practice-receipt-validation">
				<strong>Missing required artifacts</strong>
				<p>{receiptMissingFields.map(fieldLabel).join(', ')}</p>
			</div>
		{/if}

		{#if receipt}
			<article class="practice-receipt__document" data-testid="practice-receipt">
				<div class="practice-receipt__document-meta">
					<div>{#each receipt.labels as label}<span>{label}</span>{/each}</div>
					<strong>{receipt.id}</strong>
					<small>{receipt.issuedAt}</small>
				</div>
				<div class="practice-receipt__summary">
					<div><span>Operator</span><strong>{receipt.operatorName}</strong></div>
					<div><span>Workflow</span><strong>{receipt.workflowName}</strong></div>
					<div><span>Accountable owner</span><strong>{receipt.accountableOwner}</strong></div>
					<div><span>Verifier</span><strong>{receipt.verifier}</strong></div>
					<div><span>Policy</span><strong>{receipt.policyVersion}</strong></div>
					<div><span>Evidence receipt</span><strong>{receipt.evidenceReceipt}</strong></div>
					<div><span>Authority decision</span><strong>{receipt.authority.decision}</strong></div>
					<div><span>Next state</span><strong>{receipt.authority.nextState.replaceAll('_', ' ')}</strong></div>
				</div>
				<div class="practice-receipt__decision">
					<span>Decision rationale</span>
					<p>{receipt.authorityDecisionRationale}</p>
					<small>{receipt.authority.reason}</small>
				</div>
				<div class="practice-receipt__governance">
					<section><span>Allowed actions</span><p>{receipt.governance.allowedActions}</p></section>
					<section><span>Forbidden actions</span><p>{receipt.governance.forbiddenActions}</p></section>
					<section><span>Rollback trigger</span><p>{receipt.governance.rollbackTrigger}</p></section>
				</div>
				<section class="practice-receipt__affected">
					<h4>Affected-party review</h4>
					<p><strong>{receipt.affectedParty.name}</strong></p>
					<p><span>Notice</span>{receipt.affectedParty.noticePlan}</p>
					<p><span>Appeal</span>{receipt.affectedParty.appealPath}</p>
				</section>
				<ol class="practice-receipt__artifacts">
					{#each delegationPracticeStages as stage, index}
						<li>
							<span>{String(index + 1).padStart(2, '0')} / {stage.artifact}</span>
							<p>{receipt.artifacts[stage.id].join(' · ')}</p>
						</li>
					{/each}
				</ol>
				<footer>
					<div><span>Unresolved concern</span><p>{receipt.unresolvedConcern}</p></div>
					<div><span>Next review</span><p>{receipt.nextReviewDate}</p></div>
				</footer>
			</article>
		{/if}
	</section>
</section>

<style>
	.practice-workbench {
		width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
		margin: clamp(3rem, 7vw, 7rem) auto;
		border: 1px solid var(--color-performance-line-strong, #a9aaa5);
		background: var(--color-performance-panel, #fff);
		color: var(--color-performance-ink, #090909);
	}

	.practice-workbench__header {
		display: grid;
		grid-template-columns: minmax(13rem, 0.5fr) minmax(0, 1.5fr);
		border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5);
	}

	.practice-workbench__header > div { display: grid; align-content: space-between; gap: 1.5rem; min-height: 10rem; padding: 1.25rem; }
	.practice-workbench__header > div:first-child { border-right: 1px solid var(--color-performance-line-strong, #a9aaa5); background: var(--color-performance-ink, #090909); color: #fff; }
	.practice-workbench__header span,
	.practice-workbench__header small,
	.practice-workbench__stages span,
	.practice-workbench__stages small,
	.practice-workbench__chapter-meta,
	.authority-envelope dt,
	.authority-envelope__title > span {
		font-family: var(--font-performance-mono);
		font-size: 0.72rem;
		text-transform: uppercase;
	}

	.practice-workbench__header small { color: rgba(255, 255, 255, 0.58); }
	.practice-workbench h2 { max-width: 15ch; margin: 0; font-family: var(--font-performance-display, var(--font-performance-sans)); font-size: clamp(2.4rem, 5vw, 5rem); font-weight: var(--font-performance-medium, 500); letter-spacing: var(--tracking-performance-display, -0.03em); line-height: var(--leading-performance-display, 0.94); }
	.practice-workbench__header p { max-width: 42rem; margin: 0; color: var(--color-performance-muted, #5e6268); }

	.practice-preview-boundary { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: 0.9rem 1.25rem; border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); background: var(--color-performance-signal, #0057b8); color: #fff; }
	.practice-preview-boundary div { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.practice-preview-boundary strong,
	.practice-preview-boundary span { padding: 0.25rem 0.45rem; border: 1px solid currentColor; font-family: var(--font-performance-mono); font-size: 0.7rem; text-transform: uppercase; }
	.practice-preview-boundary p { max-width: 45rem; margin: 0; font-size: 0.82rem; line-height: 1.4; text-align: right; }

	.practice-workbench__stages ol { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); margin: 0; padding: 0; border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); list-style: none; }
	.practice-workbench__stages li { min-width: 0; border-right: 1px solid var(--color-performance-line, #d7d7d2); }
	.practice-workbench__stages li:last-child { border-right: 0; }
	.practice-workbench__stages button { display: grid; width: 100%; min-height: 7.5rem; align-content: space-between; gap: 0.6rem; padding: 0.75rem; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
	.practice-workbench__stages button:hover { background: var(--color-performance-paper, #f3f3f0); }
	.practice-workbench__stages button:focus-visible { outline: 3px solid var(--color-performance-signal, #0057b8); outline-offset: -3px; }
	.practice-workbench__stages button[data-active='true'] { background: var(--color-performance-ink, #090909); color: #fff; }
	.practice-workbench__stages button[data-active='true'] small,
	.practice-workbench__stages button[data-active='true'] span { color: rgba(255, 255, 255, 0.62); }
	.practice-workbench__stages span,
	.practice-workbench__stages small { color: var(--color-performance-muted, #5e6268); }
	.practice-workbench__stages strong { font-size: 0.86rem; font-weight: var(--font-performance-medium, 500); }

	.practice-workbench__body { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(20rem, 0.8fr); }
	.practice-workbench__chapter { display: grid; min-height: 34rem; align-content: center; justify-items: stretch; gap: 1.25rem; padding: clamp(2rem, 6vw, 6rem); }
	.practice-workbench__chapter-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; color: var(--color-performance-muted, #5e6268); }
	.practice-workbench__chapter h3 { max-width: 10ch; margin: 0; font-family: var(--font-performance-display, var(--font-performance-sans)); font-size: clamp(3rem, 7vw, 7rem); font-weight: var(--font-performance-medium, 500); letter-spacing: var(--tracking-performance-display, -0.03em); line-height: 0.9; }
	.practice-workbench__chapter p { max-width: 36rem; margin: 0; color: var(--color-performance-muted, #5e6268); line-height: 1.5; }
	.practice-workbench__chapter .practice-workbench__question { color: inherit; font-size: clamp(1.2rem, 2vw, 1.7rem); }
	.practice-workbench__next { margin-top: 1rem; padding: 0.8rem 1rem; border: 1px solid var(--color-performance-ink, #090909); background: var(--color-performance-ink, #090909); color: #fff; font: inherit; cursor: pointer; }
	.practice-workbench__next:disabled { cursor: default; opacity: 0.45; }

	.practice-artifact-form { display: grid; grid-template-columns: minmax(9rem, 0.7fr) minmax(0, 1.3fr); gap: 0.65rem 1rem; width: 100%; padding-top: 1.25rem; border-top: 1px solid var(--color-performance-line-strong, #a9aaa5); }
	.practice-artifact-form label { display: grid; align-content: start; gap: 0.3rem; padding-top: 0.7rem; }
	.practice-artifact-form label span { font-weight: var(--font-performance-medium, 500); }
	.practice-artifact-form label small { color: var(--color-performance-muted, #5e6268); line-height: 1.35; }
	.practice-artifact-form input,
	.practice-artifact-form textarea { width: 100%; box-sizing: border-box; padding: 0.75rem; border: 1px solid var(--color-performance-line-strong, #a9aaa5); border-radius: 0; background: #fff; color: inherit; font: inherit; line-height: 1.4; }
	.practice-artifact-form textarea { min-height: 7rem; resize: vertical; }
	.practice-artifact-form input:focus-visible,
	.practice-artifact-form textarea:focus-visible { outline: 3px solid var(--color-performance-signal, #0057b8); outline-offset: 2px; }
	.practice-artifact-form__status { grid-column: 2; font-family: var(--font-performance-mono); font-size: 0.72rem; text-transform: uppercase; }
	.practice-artifact-form__status[data-ready='true'] { color: var(--color-performance-growth, #007a4d); }

	.authority-envelope { display: grid; align-content: start; gap: 1.25rem; padding: clamp(1.5rem, 4vw, 3rem); border-left: 1px solid var(--color-performance-line-strong, #a9aaa5); background: var(--color-performance-paper, #f3f3f0); }
	.authority-envelope__title { display: grid; gap: 0.5rem; }
	.authority-envelope__title h3 { margin: 0; font-family: var(--font-performance-display, var(--font-performance-sans)); font-size: clamp(2rem, 3vw, 3.4rem); font-weight: var(--font-performance-medium, 500); letter-spacing: var(--tracking-performance-display, -0.03em); line-height: 0.95; }
	.authority-envelope__title p,
	.authority-envelope__reason { margin: 0; color: var(--color-performance-muted, #5e6268); line-height: 1.45; }
	.authority-envelope dl { margin: 0; border-top: 3px solid var(--color-performance-ink, #090909); }
	.authority-envelope dl > div { display: grid; grid-template-columns: minmax(7rem, 0.7fr) minmax(0, 1.3fr); gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); }
	.authority-envelope dt { color: var(--color-performance-muted, #5e6268); }
	.authority-envelope dd { margin: 0; font-size: 0.9rem; text-transform: capitalize; }
	.authority-envelope dd[data-decision='expand'] { color: var(--color-performance-growth, #007a4d); }
	.authority-envelope dd[data-decision='suspend'],
	.authority-envelope dd[data-decision='revoke'] { color: var(--color-performance-risk, #c62026); }
	.authority-envelope dd[data-decision='recertify'],
	.authority-envelope dd[data-decision='narrow'] { color: var(--color-performance-pressure, #e54800); }
	.authority-envelope__scenarios { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.authority-envelope__scenarios button { padding: 0.55rem 0.7rem; border: 1px solid var(--color-performance-line-strong, #a9aaa5); background: #fff; color: inherit; font: inherit; font-size: 0.8rem; cursor: pointer; }
	.authority-envelope__scenarios button:hover { border-color: var(--color-performance-ink, #090909); }
	.authority-envelope__scenarios button:focus-visible { outline: 3px solid var(--color-performance-signal, #0057b8); outline-offset: 2px; }
	.authority-envelope__boundary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid var(--color-performance-line-strong, #a9aaa5); }
	.authority-envelope__boundary > div { min-width: 0; padding: 0.85rem; }
	.authority-envelope__boundary > div + div { border-left: 1px solid var(--color-performance-line-strong, #a9aaa5); }
	.authority-envelope__boundary span,
	.authority-envelope__affected h4 { margin: 0; font-family: var(--font-performance-mono); font-size: 0.72rem; font-weight: var(--font-performance-semibold, 600); text-transform: uppercase; }
	.authority-envelope__boundary p { margin: 0.55rem 0 0; color: var(--color-performance-muted, #5e6268); font-size: 0.82rem; line-height: 1.4; }
	.authority-envelope__affected { display: grid; gap: 0.75rem; padding-top: 1.25rem; border-top: 3px solid var(--color-performance-ink, #090909); }

	.practice-receipt { display: grid; gap: 1.25rem; padding: clamp(1.5rem, 4vw, 3rem); border-top: 1px solid var(--color-performance-line-strong, #a9aaa5); background: var(--color-performance-ink, #090909); color: #fff; }
	.practice-receipt > header { display: grid; grid-template-columns: minmax(13rem, 0.5fr) minmax(0, 1fr); gap: 1rem; align-items: end; }
	.practice-receipt > header > div { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.practice-receipt > header span,
	.practice-receipt__document span,
	.practice-receipt__document small { font-family: var(--font-performance-mono); font-size: 0.7rem; text-transform: uppercase; }
	.practice-receipt > header span,
	.practice-receipt__document-meta span { padding: 0.25rem 0.45rem; border: 1px solid currentColor; }
	.practice-receipt h3 { grid-column: 2; margin: 0; font-family: var(--font-performance-display, var(--font-performance-sans)); font-size: clamp(2.5rem, 5vw, 5rem); font-weight: var(--font-performance-medium, 500); letter-spacing: var(--tracking-performance-display, -0.03em); line-height: 0.94; }
	.practice-receipt > header p { grid-column: 2; max-width: 38rem; margin: 0; color: rgba(255, 255, 255, 0.67); }
	.practice-receipt__actions { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center; padding-block: 1rem; border-block: 1px solid rgba(255, 255, 255, 0.35); }
	.practice-receipt__actions button { padding: 0.75rem 0.9rem; border: 1px solid #fff; background: #fff; color: var(--color-performance-ink, #090909); font: inherit; cursor: pointer; }
	.practice-receipt__actions button:focus-visible { outline: 3px solid var(--color-performance-signal, #4ea3ff); outline-offset: 3px; }
	.practice-receipt__actions .practice-receipt__secondary { background: transparent; color: #fff; }
	.practice-receipt__reset { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center; }
	.practice-receipt__validation { padding: 1rem; border: 1px solid var(--color-performance-risk, #c62026); background: rgba(198, 32, 38, 0.18); }
	.practice-receipt__validation p { margin: 0.45rem 0 0; }
	.practice-receipt__document { display: grid; gap: 1px; border: 1px solid #fff; background: rgba(255, 255, 255, 0.35); color: var(--color-performance-ink, #090909); }
	.practice-receipt__document > * { background: #fff; }
	.practice-receipt__document-meta { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.75rem; align-items: center; padding: 1rem; }
	.practice-receipt__document-meta > div { display: flex; flex-wrap: wrap; gap: 0.5rem; }
	.practice-receipt__document-meta small { grid-column: 2; color: var(--color-performance-muted, #5e6268); }
	.practice-receipt__summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--color-performance-line-strong, #a9aaa5); }
	.practice-receipt__summary > div { display: grid; gap: 0.45rem; min-width: 0; padding: 1rem; background: #fff; }
	.practice-receipt__summary strong { overflow-wrap: anywhere; }
	.practice-receipt__decision,
	.practice-receipt__affected,
	.practice-receipt__document footer { padding: 1rem; }
	.practice-receipt__decision p,
	.practice-receipt__decision small,
	.practice-receipt__affected p,
	.practice-receipt__document footer p { margin: 0.45rem 0 0; line-height: 1.45; }
	.practice-receipt__governance { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--color-performance-line-strong, #a9aaa5); }
	.practice-receipt__governance section { padding: 1rem; background: #fff; }
	.practice-receipt__governance p { margin: 0.55rem 0 0; line-height: 1.45; }
	.practice-receipt__affected h4 { margin: 0 0 0.75rem; font-family: var(--font-performance-display, var(--font-performance-sans)); font-size: 1.6rem; font-weight: 500; }
	.practice-receipt__affected p { display: grid; grid-template-columns: 8rem minmax(0, 1fr); gap: 1rem; }
	.practice-receipt__artifacts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: 0; padding: 0; background: var(--color-performance-line-strong, #a9aaa5); list-style: none; }
	.practice-receipt__artifacts li { padding: 1rem; background: #fff; }
	.practice-receipt__artifacts p { margin: 0.55rem 0 0; line-height: 1.45; }
	.practice-receipt__document footer { display: grid; grid-template-columns: 1fr 0.35fr; gap: 1rem; }

	@media (max-width: 72rem) {
		.practice-workbench__stages ol { grid-template-columns: repeat(5, minmax(0, 1fr)); }
		.practice-workbench__stages li:nth-child(5) { border-right: 0; }
		.practice-workbench__stages li:nth-child(-n + 5) { border-bottom: 1px solid var(--color-performance-line, #d7d7d2); }
	}

	@media (max-width: 50rem) {
		.practice-workbench__header,
		.practice-workbench__body { grid-template-columns: 1fr; }
		.practice-workbench__header > div { min-height: 0; }
		.practice-workbench__header > div:first-child { border-right: 0; border-bottom: 1px solid var(--color-performance-line-strong, #a9aaa5); }
		.practice-workbench__stages { overflow-x: auto; }
		.practice-workbench__stages ol { min-width: 75rem; grid-template-columns: repeat(10, minmax(7.5rem, 1fr)); }
		.practice-workbench__stages li:nth-child(5) { border-right: 1px solid var(--color-performance-line, #d7d7d2); }
		.practice-workbench__stages li:nth-child(-n + 5) { border-bottom: 0; }
		.authority-envelope { border-top: 1px solid var(--color-performance-line-strong, #a9aaa5); border-left: 0; }
		.practice-preview-boundary { align-items: flex-start; flex-direction: column; }
		.practice-preview-boundary p { text-align: left; }
		.practice-artifact-form { grid-template-columns: 1fr; }
		.practice-artifact-form__status { grid-column: 1; }
		.practice-receipt > header { grid-template-columns: 1fr; }
		.practice-receipt h3,
		.practice-receipt > header p { grid-column: 1; }
		.practice-receipt__document-meta { grid-template-columns: 1fr; }
		.practice-receipt__document-meta > strong,
		.practice-receipt__document-meta > small { grid-column: 1; overflow-wrap: anywhere; }
		.practice-receipt__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.practice-receipt__governance,
		.practice-receipt__artifacts,
		.practice-receipt__document footer { grid-template-columns: 1fr; }
	}

	@media (max-width: 36rem) {
		.practice-workbench { width: 100%; border-inline: 0; }
		.practice-workbench__chapter { min-height: 28rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.practice-workbench *,
		.practice-workbench *::before,
		.practice-workbench *::after { scroll-behavior: auto; transition: none !important; }
	}
</style>
