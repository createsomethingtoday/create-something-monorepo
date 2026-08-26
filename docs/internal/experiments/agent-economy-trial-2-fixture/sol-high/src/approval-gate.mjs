export function evaluateApprovalGate(input) {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !['auto_allow', 'approval_required', 'manual_only', 'blocked'].includes(input.autonomy) ||
    typeof input.evidenceComplete !== 'boolean' ||
    typeof input.approved !== 'boolean' ||
    typeof input.toolDeclared !== 'boolean'
  ) {
    throw new TypeError('invalid approval gate input');
  }

  if (input.autonomy === 'blocked') {
    return { disposition: 'stop', reason: 'BLOCKED', canInvoke: false };
  }
  if (!input.evidenceComplete) {
    return { disposition: 'stop', reason: 'MISSING_EVIDENCE', canInvoke: false };
  }
  if (input.autonomy === 'manual_only') {
    return { disposition: 'wait', reason: 'MANUAL_EXECUTION', canInvoke: false };
  }
  if (input.autonomy === 'approval_required' && !input.approved) {
    return { disposition: 'wait', reason: 'APPROVAL_REQUIRED', canInvoke: false };
  }
  if (!input.toolDeclared) {
    return { disposition: 'stop', reason: 'MISSING_TOOL', canInvoke: false };
  }
  return { disposition: 'pass', reason: 'READY', canInvoke: true };
}
