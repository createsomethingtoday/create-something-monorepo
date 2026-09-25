import { validateAssignmentSchema } from './assignment-schema.mjs';
/** Evidence gate only. Does not persist a workflow or dispatch workers.
 * Caller maps a freshly read native Paperclip issue/run/lease snapshot to native.
 * Never construct this snapshot from terminal text or a local checkpoint alone.
 */
export const POLICY_VERSION = 'create-something.paperclip-delivery.v1';
const stages = ['implement', 'review', 'ci', 'merge', 'deploy', 'verify', 'complete'];
const sha = /^[a-f0-9]{40}$/;
function requireFact(ok, message) { if (!ok) throw new Error(message); }
function list(value) { return Array.isArray(value) && value.length > 0 && value.every(x => typeof x === 'string' && x.trim()); }
export function validateAssignment(packet) {
 requireFact(packet?.policyVersion === POLICY_VERSION, 'Unsupported policy version');
 requireFact(/^CRE-\d+$/.test(packet.linearIssue ?? ''), 'Canonical Linear issue required');
 for (const field of ['paperclipCaseId', 'companyId', 'workspace', 'releaseRunbook', 'targetEnvironment', 'targetSurface']) requireFact(typeof packet[field] === 'string' && packet[field].trim(), `${field} required`);
 requireFact(safePath(packet.workspace) && packet.workspace.startsWith('/') && packet.workspace !== '/Users/micahjohnson/Code/create-something-monorepo', 'Owned isolated absolute workspace required');
 for (const field of ['allowedPaths', 'acceptanceCriteria', 'requiredCiChecks']) requireFact(list(packet[field]), `${field} required`);
 requireFact(packet.allowedPaths.every(path => safePath(path) && !path.startsWith('/')), 'Canonical repository-relative allowed paths required');
 requireFact(safePath(packet.releaseRunbook) && packet.releaseRunbook.startsWith('/'), 'Absolute canonical release runbook required');
 requireFact(packet.productionAuthorized === true && packet.targetEnvironment === 'production', 'Explicit task production authorization required');
 requireFact(packet.authorization?.source === 'user' && typeof packet.authorization.reference === 'string' && packet.authorization.reference.trim(), 'User authorization reference required');
 requireFact(packet.maxRepairRounds === 3 && packet.maxResumeAttempts === 2, 'Bounded repair and recovery limits required');
 requireFact(packet.boundaries?.identityChanges === false && packet.boundaries?.payments === false && packet.boundaries?.destructiveActions === false && packet.boundaries?.externalMessages === false, 'Protected boundaries must remain excluded');
 requireFact(packet.delegation?.createAgents === true && packet.delegation?.createSkills === true && packet.delegation?.parallel === true && packet.delegation?.scope === 'parent-assignment', 'Scoped delegation grant required for every role');
 const ids = Object.values(packet.roles ?? {});
 requireFact(['coordinator','engineering','reviewer','releaseQa'].every(r => typeof packet.roles?.[r] === 'string' && packet.roles[r].trim()) && ids.length === 4 && new Set(ids).size === 4, 'Four distinct scoped role identities required');
 validateAssignmentSchema(packet);
 return packet;
}
export function validateStageEvidence(packet, native, evidence, target, now = Date.now()) {
 validateAssignment(packet);
 requireFact(stages.includes(target), 'Unknown target stage');
 requireFact(native?.source === 'paperclip-api' && native.caseId === packet.paperclipCaseId && native.companyId === packet.companyId, 'Matching native Paperclip state required');
 requireFact(Number.isFinite(native.readAtMs) && now >= native.readAtMs && now - native.readAtMs <= 30000, 'Fresh native state required');
 requireFact(native.pendingStage === target && typeof native.revision === 'string' && native.revision.length > 0, 'Native pending stage and revision required');
 requireFact(evidence?.nativeRevision === native.revision, 'Evidence must target the current native revision');
 requireFact(Array.isArray(native.activeWriterRunIds) && new Set(native.activeWriterRunIds).size === native.activeWriterRunIds.length, 'Duplicate or unknown writer ownership');
 if (native.activeWriterRunIds.length > 1) validateParallelWriters(packet, native.writerLeases, native.activeWriterRunIds);
 requireFact(native.unresolvedOutcomes === 0 && native.recoveryRequired === false, 'Unresolved execution outcome requires reconciliation');
 if (target !== 'implement') requireFact(native.activeWriterRunIds.length === 0, 'Writer must settle before review or promotion');
 const rank = stages.indexOf(target);
 if (rank >= 1) requireFact(sha.test(evidence.sourceSha ?? '') && evidence.tests?.passed === true && evidence.tests.sourceSha === evidence.sourceSha && list(evidence.tests.receipts), 'Exact source and passing test evidence required');
 if (rank >= 2) requireFact(evidence.review?.outcome === 'approved' && evidence.review.sourceSha === evidence.sourceSha && evidence.review.agentId === packet.roles.reviewer && list(evidence.review.receipts), 'Independent approval must match current source SHA');
 if (rank >= 3) requireFact(packet.requiredCiChecks.every(name => evidence.ci?.some(c => c.name === name && c.status === 'success' && c.sourceSha === evidence.sourceSha && typeof c.runUrl === 'string' && c.runUrl.startsWith('https://'))), 'All required CI checks must pass for reviewed SHA');
 if (rank >= 4) requireFact(sha.test(evidence.merge?.sha ?? '') && evidence.merge.reviewedHeadSha === evidence.sourceSha && evidence.merge.status === 'merged' && evidence.merge.treeMatchesReviewed === true && evidence.build?.sourceSha === evidence.merge.sha && evidence.build.passed === true && list(evidence.build.receipts) && typeof evidence.rollback?.versionId === 'string' && evidence.rollback.versionId.trim(), 'Reviewed merge, exact merged build and rollback evidence required');
 if (rank >= 5) requireFact(evidence.deployment?.sourceSha === evidence.merge.sha && evidence.deployment.targetSurface === packet.targetSurface && evidence.deployment.status === 'active' && typeof evidence.deployment.versionId === 'string' && evidence.deployment.versionId.trim() && list(evidence.deployment.providerReceipts), 'Active deployment provider readback required');
 if (rank >= 6) requireFact(evidence.live?.versionId === evidence.deployment.versionId && evidence.live.targetSurface === packet.targetSurface && evidence.live.passed === true && list(evidence.live.receipts) && packet.acceptanceCriteria.every(c => evidence.live.criteriaPassed?.includes(c)), 'Live readback and all acceptance criteria required');
 return { allowed: true, target, nativeRevision: native.revision, policyVersion: POLICY_VERSION };
}
export function validateRecovery(packet, native, recovery, now = Date.now()) {
 validateAssignment(packet);
 requireFact(native?.source === 'paperclip-api' && native.caseId === packet.paperclipCaseId && native.companyId === packet.companyId && typeof native.revision === 'string' && native.revision.trim() && recovery?.nativeRevision === native.revision, 'Matching native recovery revision required');
 requireFact(Number.isFinite(native.readAtMs) && now >= native.readAtMs && now - native.readAtMs <= 30000, 'Fresh native recovery state required');
 requireFact(Number.isInteger(recovery.attempt) && recovery.attempt >= 1 && recovery.attempt <= packet.maxResumeAttempts, 'Recovery attempts exhausted or invalid');
 requireFact(native.unresolvedOutcomes === 0 && native.recoveryRequired === false && Array.isArray(native.activeWriterRunIds) && native.activeWriterRunIds.length === 0, 'Reconcile outcome and release predecessor lease before resume');
 requireFact(recovery.predecessorStopped === true && recovery.checkpointVerified === true && recovery.sameScope === true && recovery.causeCorrected === true && list(recovery.receipts), 'Confirmed stop, corrected cause and verified checkpoint required');
 return { allowed: true, nativeRevision: native.revision };
}

function safePath(path) {
 if (typeof path !== 'string' || !path || path.includes('\\') || /[\x00-\x1f\x7f]/.test(path)) return false;
 const parts = (path.startsWith('/') ? path.slice(1) : path).split('/');
 return parts.every(part => part && part !== '.' && part !== '..');
}
function within(path, parent) { return path === parent || path.startsWith(parent.replace(/\/$/, '') + '/'); }
export function validateParallelWriters(packet, leases, activeRunIds) {
 validateAssignment(packet);
 requireFact(Array.isArray(activeRunIds) && list(activeRunIds) && new Set(activeRunIds).size === activeRunIds.length, 'Unique native writer runs required');
 requireFact(Array.isArray(leases) && leases.length === activeRunIds.length, 'Native writer leases required for parallel work');
 const seenRuns = new Set(), seenWorkspaces = new Set(), claimedPaths = [];
 for (const lease of leases) {
  requireFact(activeRunIds.includes(lease.runId) && !seenRuns.has(lease.runId), 'Unique native writer run required');
  requireFact(safePath(lease.workspace) && lease.workspace.startsWith('/') && lease.workspace !== '/Users/micahjohnson/Code/create-something-monorepo' && ![...seenWorkspaces].some(old => within(old, lease.workspace) || within(lease.workspace, old)), 'Separate owned workspaces required');
  requireFact(list(lease.paths) && lease.paths.every(path => safePath(path) && packet.allowedPaths.some(parent => safePath(parent) && within(path,parent))), 'Writer paths exceed parent scope');
  for (const path of lease.paths) { requireFact(!claimedPaths.some(old => within(path,old) || within(old,path)), 'Overlapping writer paths'); claimedPaths.push(path); }
  seenRuns.add(lease.runId); seenWorkspaces.add(lease.workspace);
 }
 return true;
}
export function validateDelegation(packet, delegation) {
 validateAssignment(packet);
 requireFact(Object.values(packet.roles).includes(delegation?.parentAgentId) || delegation?.nativeScopedParentVerified === true, 'Native scoped parent required');
 requireFact(delegation.companyId === packet.companyId && delegation.paperclipCaseId === packet.paperclipCaseId, 'Delegation must retain parent task scope');
 requireFact(delegation.permissions?.createAgents === true && delegation.permissions?.createSkills === true && delegation.permissions?.parallel === true, 'Every delegated role inherits scoped creation and parallel authority');
 requireFact(['identityChanges','payments','destructiveActions','externalMessages'].every(k => delegation.boundaries?.[k] === false), 'Delegation cannot expand protected boundaries');
 requireFact(list(delegation.allowedPaths) && delegation.allowedPaths.every(path => safePath(path) && packet.allowedPaths.some(parent => safePath(parent) && within(path,parent))), 'Delegation paths exceed parent scope');
 requireFact(delegation.reviewIndependence === true && delegation.noPurchases === true, 'Reviewer independence and no purchases required');
 return {allowed:true};
}
