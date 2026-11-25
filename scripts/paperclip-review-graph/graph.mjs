import { readFileSync } from 'node:fs';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const workflow = freeze(
  JSON.parse(readFileSync(new URL('./workflow.json', import.meta.url), 'utf8'))
);
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${label} must be an object`);
}
function revision(value, label) {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value))
    throw new TypeError(`${label} must be a full lowercase hexadecimal SHA (40 or 64 characters)`);
}
function text(value) {
  return typeof value === 'string' && value.trim().length > 0 && value === value.trim();
}
function newerCi(pass, failure) {
  if (!pass || pass.verdict !== 'passed') return false;
  if (!pass.runId || !failure.runId) return false;
  return (
    BigInt(pass.runId) > BigInt(failure.runId) ||
    (pass.runId === failure.runId && pass.runAttempt > failure.runAttempt)
  );
}
function eligible(rule, facts) {
  if (rule.all) return rule.all.every((key) => facts[key] === true);
  if (rule.any) return rule.any.some((key) => facts[key] === true);
  throw new TypeError('Unsupported workflow eligibility');
}

/** Pure planner. Receipts need durable native IDs and case binding. Failures are
 * sticky for review per SHA; newer CI runs may supersede CI failures. Case-wide dispatched repair receipts bound retry expenditure.
 * The caller must retain the complete case receipt history, including old SHAs.
 */
export function plan(input) {
  object(input, 'input');
  const { caseId, sha, events } = input;
  if (!text(caseId)) throw new TypeError('caseId must be a nonempty trimmed string');
  revision(sha, 'sha');
  if (!Array.isArray(events)) throw new TypeError('events must be an array');
  const ids = new Set();
  const latest = {};
  const failures = [];
  const repairs = [];
  const ignoredReceipts = [];
  events.forEach((event, index) => {
    object(event, `events[${index}]`);
    if (
      !Object.hasOwn(workflow.events, event.type) ||
      !workflow.events[event.type].includes(event.verdict)
    )
      throw new TypeError(`events[${index}] has an unsupported type or verdict`);
    revision(event.sha, `events[${index}].sha`);
    if (event.caseId !== caseId) throw new TypeError(`events[${index}] requires matching caseId`);
    if (!text(event.id) || ids.has(event.id))
      throw new TypeError(`events[${index}].id must be nonempty and unique`);
    ids.add(event.id);
    if (event.type === 'review' && event.verdict === 'approved' && event.independent !== true)
      throw new TypeError(`events[${index}] approval requires independent: true`);
    if (event.type === 'ci' && (event.runId !== undefined || event.runAttempt !== undefined)) {
      if (
        typeof event.runId !== 'string' ||
        !/^[1-9][0-9]*$/.test(event.runId) ||
        !Number.isSafeInteger(event.runAttempt) ||
        event.runAttempt < 1
      ) {
        throw new TypeError(
          `events[${index}] requires decimal runId and positive integer runAttempt`
        );
      }
    }
    const receipt = {
      index,
      id: event.id,
      sha: event.sha,
      type: event.type,
      verdict: event.verdict,
      ...(event.runId !== undefined ? { runId: event.runId, runAttempt: event.runAttempt } : {})
    };
    if (event.type === 'repair') repairs.push(receipt);
    if (event.sha !== sha)
      ignoredReceipts.push({
        ...receipt,
        reason: 'Receipt revision differs from current revision'
      });
    else {
      latest[event.type] = receipt;
      if (['changes_requested', 'failed'].includes(event.verdict)) failures.push(receipt);
    }
  });
  const currentCiPasses = events.filter(
    (event) => event.sha === sha && event.type === 'ci' && event.verdict === 'passed'
  );
  const activeFailures = failures.filter(
    (receipt) => receipt.type !== 'ci' || !currentCiPasses.some((pass) => newerCi(pass, receipt))
  );
  failures.splice(0, failures.length, ...activeFailures);
  // Source snapshots may arrive out of append order. A proven newer passing
  // workflow run remains the current receipt even if an older failure arrives late.
  for (const pass of currentCiPasses) {
    if (latest.ci && newerCi(pass, latest.ci)) {
      latest.ci = { ...pass, index: events.indexOf(pass) };
    }
  }
  const hasFailure = failures.length > 0;
  const repairedCurrentRevision = repairs.some((receipt) => receipt.sha === sha);
  const attemptedShas = new Set(repairs.map((receipt) => receipt.sha));
  const repairLimitReached = hasFailure && attemptedShas.size >= workflow.maxRepairAttempts;
  const facts = {
    hasFailure,
    noFailure: !hasFailure && !repairedCurrentRevision,
    repairedCurrentRevision,
    repairLimitReached,
    repairAllowed: !repairLimitReached && !repairedCurrentRevision,
    reviewPassed: latest.review?.verdict === 'approved',
    ciPassed: latest.ci?.verdict === 'passed',
    missingReview: latest.review?.verdict !== 'approved',
    missingCi: latest.ci?.verdict !== 'passed'
  };
  const receiptIds = (
    hasFailure ? failures : ['review', 'ci'].map((type) => latest[type]).filter(Boolean)
  )
    .map((receipt) => receipt.id)
    .sort();
  const values = {
    caseId,
    sha,
    receiptIds,
    repairReceiptIds: repairs.map((receipt) => receipt.id).sort(),
    repairAttempt: attemptedShas.size + 1,
    repairLimit: workflow.maxRepairAttempts
  };
  const reasons = {
    hold: repairLimitReached
      ? 'Case repair budget exhausted; operator resolution required'
      : 'This revision already has a dispatched or completed repair; await its native result and submit the new SHA',
    run_cook_repair:
      'Current SHA has failed gates; Cook must repair these exact receipts and submit a new SHA',
    request_independent_review: 'No independent approval exists for the exact current SHA',
    run_ci: 'No passing CI receipt exists for the exact current SHA',
    assess_release_readiness:
      'Exact-SHA gates passed; assess artifact, scope, destination and explicit release authority'
  };
  const actions = workflow.steps
    .filter(
      (step) =>
        step.dependsOn.every((key) => facts[key] === true) && eligible(step.eligibility, facts)
    )
    .map((step) => ({
      type: step.action,
      role: step.role,
      caseId,
      sha,
      reason: reasons[step.action],
      inputs: Object.fromEntries(step.input.map((key) => [key, values[key]])),
      output: step.output,
      evidence: (hasFailure
        ? failures
        : ['review', 'ci'].map((type) => latest[type]).filter(Boolean)
      ).map((receipt) => ({ ...receipt }))
    }));
  const state = actions.some((action) => action.type === 'hold')
    ? 'held'
    : hasFailure
      ? 'repair_required'
      : actions.some((action) => action.type === 'assess_release_readiness')
        ? 'release_readiness'
        : 'gates_pending';
  return {
    version: workflow.version,
    caseId,
    sha,
    state,
    actions,
    ignoredReceipts,
    releaseAuthorized: false
  };
}
