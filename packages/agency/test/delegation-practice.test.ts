import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const routeUrl = new URL('../src/routes/practice/+page.svelte', import.meta.url);
const modelUrl = new URL('../src/lib/practice/delegation-practice.ts', import.meta.url);
const workbenchUrl = new URL('../src/lib/components/DelegationPracticeWorkbench.svelte', import.meta.url);

test('The Delegation Practice gives accountable operators a concrete first action', () => {
	assert.equal(existsSync(routeUrl), true, 'the /practice route should exist');

	const route = readFileSync(routeUrl, 'utf8');
	assert.ok(route.includes('The Delegation Practice'));
	assert.ok(route.includes('Map one workflow'));
	assert.ok(route.includes('Examine the evidence'));
});

test('the operator journey exposes all ten artifact-producing stages in order', async () => {
	assert.equal(existsSync(modelUrl), true, 'the Delegation Practice model should exist');

	const { delegationPracticeStages } = await import('../src/lib/practice/delegation-practice.ts');
	assert.deepEqual(
		delegationPracticeStages.map((stage) => stage.id),
		['enter', 'claim', 'map', 'bound', 'rehearse', 'operate', 'prove', 'advance', 'defend', 'practice']
	);
	assert.ok(delegationPracticeStages.every((stage) => stage.artifact.length > 0));
});

test('stage progression stops at the practice handoff instead of wrapping or inventing completion', async () => {
	const { nextDelegationPracticeStageId } = await import('../src/lib/practice/delegation-practice.ts');

	assert.equal(nextDelegationPracticeStageId('enter'), 'claim');
	assert.equal(nextDelegationPracticeStageId('advance'), 'defend');
	assert.equal(nextDelegationPracticeStageId('practice'), 'practice');
});

test('Earned Authority fails closed and never expands without owner approval', async () => {
	const { evaluateEarnedAuthority } = await import('../src/lib/practice/delegation-practice.ts');
	const currentState = 'prepare' as const;
	const validEvidence = {
		currentState,
		receiptPresent: true,
		policyCurrent: true,
		criticalBoundaryBreach: false,
		calibrationFailure: false,
		promotionEvidenceComplete: true,
		ownerApproved: true
	};

	assert.equal(evaluateEarnedAuthority({ ...validEvidence, receiptPresent: false }).decision, 'suspend');
	assert.equal(evaluateEarnedAuthority({ ...validEvidence, policyCurrent: false }).decision, 'recertify');
	assert.equal(
		evaluateEarnedAuthority({ ...validEvidence, criticalBoundaryBreach: true }).decision,
		'revoke'
	);
	assert.equal(evaluateEarnedAuthority({ ...validEvidence, calibrationFailure: true }).decision, 'narrow');
	assert.equal(evaluateEarnedAuthority({ ...validEvidence, ownerApproved: false }).decision, 'preserve');
	assert.deepEqual(evaluateEarnedAuthority(validEvidence), {
		decision: 'expand',
		nextState: 'execute_with_approval',
		reason: 'Current evidence and accountable-owner approval support one bounded expansion.'
	});
});

test('the public route mounts an interactive workbench with a current stage and authority envelope', () => {
	assert.equal(existsSync(workbenchUrl), true, 'the Delegation Practice workbench should exist');

	const route = readFileSync(routeUrl, 'utf8');
	const workbench = readFileSync(workbenchUrl, 'utf8');
	assert.ok(route.includes('<DelegationPracticeWorkbench'));
	assert.ok(workbench.includes('aria-current={isActive ? \'step\' : undefined}'));
	assert.ok(workbench.includes('Authority Envelope'));
	assert.ok(workbench.includes('Next stage'));
	assert.ok(workbench.includes('No score. One contextual authority decision.'));
});

test('the experience connects diagnosis, workflow map, proof, defense, and practice without inventing publication', () => {
	const route = readFileSync(routeUrl, 'utf8');

	assert.ok(route.includes('<PerformanceThesisConditions'));
	assert.ok(route.includes("title=\"Diagnose the system before changing the policy.\""));
	assert.ok(route.includes("label: 'Database'"));
	assert.ok(route.includes("label: 'Automation'"));
	assert.ok(route.includes("label: 'Judgment'"));
	assert.ok(route.includes('<PublicAtlasStoryCanvas'));
	assert.ok(route.includes('starterId="marketplace-review-queue"'));
	assert.ok(route.includes('storyId="delegation-practice-marketplace-story"'));
	assert.ok(route.includes('<PerformanceEvidenceIndex'));
	assert.ok(route.includes('Governed Agent Delivery'));
	assert.ok(route.includes('Practice Receipt'));
	assert.ok(route.includes('Skeptical review'));
	assert.ok(route.includes('href="/proof/marketplace-workflow"'));
	assert.equal(route.includes('Now available'), false);
	assert.equal(route.includes('Certified'), false);
});

test('the authority workbench keeps proof completion separate from accountable-owner approval', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes('data-testid="authority-complete-proof"'));
	assert.ok(workbench.includes('data-testid="authority-owner-approval"'));
	assert.ok(workbench.includes("ownerApproved: scenario === 'owner-approval'"));
	assert.ok(workbench.includes('Owner approves expansion'));
});

test('a Practice Receipt fails closed until every operator artifact and governance binding exists', async () => {
	const { buildPracticeReceipt, createEmptyPracticeSession } = await import(
		'../src/lib/practice/delegation-practice.ts'
	);
	const session = createEmptyPracticeSession();
	const incomplete = buildPracticeReceipt(session, '2026-07-14T20:00:00.000Z');

	assert.equal(incomplete.ok, false);
	if (incomplete.ok) assert.fail('an empty preview session must not produce a receipt');
	assert.ok(incomplete.missingFields.includes('workflowName'));
	assert.ok(incomplete.missingFields.includes('policyVersion'));
	assert.ok(incomplete.missingFields.includes('appealPath'));

	Object.assign(session, {
		operatorName: 'Internal operator',
		workflowName: 'Marketplace review queue',
		accountableOwner: 'Marketplace review owner',
		stakes: 'Prevent unsupported approval and preserve creator recourse.',
		thesisClaim: 'Governed delegation should make the review boundary inspectable.',
		systemMap: 'Submission -> validation -> reviewer decision -> receipt.',
		allowedActions: 'Validate files, summarize evidence, prepare reviewer questions.',
		forbiddenActions: 'Approve, reject, promise timelines, or make unsupported security claims.',
		policyVersion: 'policy.marketplace-review.v1',
		verifier: 'Independent marketplace reviewer',
		rollbackTrigger: 'Missing receipt, stale policy, or unsupported approval.',
		goldenTask: 'Valid submission, policy ambiguity, missing evidence, and recovery.',
		fieldObservation: 'Automation prepared evidence; the reviewer retained the decision.',
		evidenceReceipt: 'RECEIPT-LOCAL-001',
		authorityDecisionRationale: 'Preserve preparation authority until independent review evidence exists.',
		affectedParty: 'Template creator',
		noticePlan: 'Show the creator the evidence, policy basis, and review state.',
		appealPath: 'Route a disputed decision to a different accountable reviewer.',
		unresolvedConcern: 'The preview does not yet test authenticated reviewer identity.',
		nextReviewDate: '2026-08-14'
	});
	const complete = buildPracticeReceipt(session, '2026-07-14T20:00:00.000Z');

	if (!complete.ok) assert.fail(`complete session was rejected: ${complete.missingFields.join(', ')}`);
	assert.equal(complete.ok, true);
	assert.deepEqual(complete.receipt.labels, ['Internal preview', 'Not certification']);
	assert.equal(complete.receipt.workflowName, 'Marketplace review queue');
	assert.equal(complete.receipt.authority.decision, 'preserve');
	assert.equal(complete.receipt.affectedParty.appealPath, session.appealPath);
});

test('preview session persistence round-trips the current version and rejects corrupt or incompatible state', async () => {
	const { createEmptyPracticeSession, parsePracticeSession, serializePracticeSession } = await import(
		'../src/lib/practice/delegation-practice.ts'
	);
	const session = createEmptyPracticeSession();
	session.operatorName = 'Internal operator';
	session.workflowName = 'Marketplace review queue';
	session.authorityEvidence.ownerApproved = true;

	assert.deepEqual(parsePracticeSession(serializePracticeSession(session)), session);
	assert.equal(parsePracticeSession('{not-json'), null);
	assert.equal(parsePracticeSession(JSON.stringify({ ...session, version: 2 })), null);
	assert.equal(parsePracticeSession(JSON.stringify({ ...session, authorityEvidence: null })), null);
});

test('every required preview artifact belongs to exactly one of the ten practice stages', async () => {
	const { delegationPracticeArtifactFields, delegationPracticeRequiredFields, delegationPracticeStages } =
		await import('../src/lib/practice/delegation-practice.ts');

	assert.deepEqual(Object.keys(delegationPracticeArtifactFields), delegationPracticeStages.map((stage) => stage.id));
	assert.deepEqual(
		Object.values(delegationPracticeArtifactFields)
			.flat()
			.map((field) => field.name)
			.sort(),
		[...delegationPracticeRequiredFields].sort()
	);
	assert.ok(Object.values(delegationPracticeArtifactFields).every((fields) => fields.length > 0));
});

test('the workbench mounts stage-owned inputs with visible internal-preview safety guidance', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes('delegationPracticeArtifactFields'));
	assert.ok(workbench.includes('Internal preview'));
	assert.ok(workbench.includes('Not certification'));
	assert.ok(workbench.includes('Do not enter secrets, credentials, private client data, or PII.'));
	assert.ok(workbench.includes('data-testid={`practice-field-${field.name}`}'));
	assert.ok(workbench.includes('Artifact ready'));
	assert.ok(workbench.includes('Missing artifact'));
});

test('the Authority Envelope reads the operator session and exposes affected-party recourse', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes("session.workflowName || 'Not named'"));
	assert.ok(workbench.includes("session.accountableOwner || 'Not named'"));
	assert.ok(workbench.includes("session.verifier || 'Not named'"));
	assert.ok(workbench.includes("session.policyVersion || 'Not bound'"));
	assert.ok(workbench.includes('Affected-party review'));
	assert.ok(workbench.includes("session.affectedParty || 'Not represented'"));
	assert.ok(workbench.includes("session.noticePlan || 'Missing'"));
	assert.ok(workbench.includes("session.appealPath || 'Missing'"));
});

test('the workbench exposes fail-closed receipt generation and a deliberate start-over path', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes('buildPracticeReceipt'));
	assert.ok(workbench.includes('data-testid="generate-practice-receipt"'));
	assert.ok(workbench.includes('data-testid="practice-receipt"'));
	assert.ok(workbench.includes('Internal preview'));
	assert.ok(workbench.includes('Not certification'));
	assert.ok(workbench.includes('Missing required artifacts'));
	assert.ok(workbench.includes('Start over'));
	assert.ok(workbench.includes('Erase browser-local draft'));
});

test('persisted preview state recovers a versioned session and receipt timestamp but rejects invalid envelopes', async () => {
	const {
		createEmptyPracticeSession,
		parsePracticeState,
		serializePracticeState
	} = await import('../src/lib/practice/delegation-practice.ts');
	const state = {
		version: 1 as const,
		session: createEmptyPracticeSession(),
		receiptIssuedAt: '2026-07-14T20:00:00.000Z'
	};
	state.session.workflowName = 'Marketplace review queue';

	assert.deepEqual(parsePracticeState(serializePracticeState(state)), state);
	assert.equal(parsePracticeState(JSON.stringify({ ...state, version: 2 })), null);
	assert.equal(parsePracticeState(JSON.stringify({ ...state, receiptIssuedAt: 'not-a-date' })), null);
	assert.equal(parsePracticeState(JSON.stringify({ ...state, session: null })), null);
});

test('the workbench persists and recovers only through the versioned browser-local state contract', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes('DELEGATION_PRACTICE_STORAGE_KEY'));
	assert.ok(workbench.includes('parsePracticeState'));
	assert.ok(workbench.includes('serializePracticeState'));
	assert.ok(workbench.includes('localStorage.getItem'));
	assert.ok(workbench.includes('localStorage.setItem'));
	assert.ok(workbench.includes('localStorage.removeItem'));
	assert.ok(workbench.includes('receiptIssuedAt'));
});

test('declared preview controls preserve explicit keyboard activation on the browser surface', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes('function activateOnKeyboard'));
	assert.ok(workbench.includes("event.key !== 'Enter' && event.key !== ' '"));
	assert.ok(workbench.includes('onkeydown={(event) => activateOnKeyboard(event, () => selectStage(stage.id))}'));
	assert.ok(workbench.includes('onkeydown={(event) => activateOnKeyboard(event, moveToNextStage)}'));
	assert.ok(workbench.includes("onkeydown={(event) => activateOnKeyboard(event, () => loadScenario('boundary-breach'))}"));
	assert.ok(workbench.includes('onkeydown={(event) => activateOnKeyboard(event, generatePracticeReceipt)}'));
	assert.ok(workbench.includes('onkeydown={(event) => activateOnKeyboard(event, resetPracticeSession)}'));
});

test('the mobile receipt stacks identity metadata before long values can overlap its labels', () => {
	const workbench = readFileSync(workbenchUrl, 'utf8');

	assert.ok(workbench.includes('.practice-receipt__document-meta { grid-template-columns: 1fr; }'));
	assert.ok(workbench.includes('.practice-receipt__document-meta > strong'));
	assert.ok(workbench.includes('overflow-wrap: anywhere'));
});
