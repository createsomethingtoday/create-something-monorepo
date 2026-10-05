/** Educational simulation only. Never supplies authority to a real service. */
export const VERSION = 1;
export type Input = { destination: string; quantity: number; instruction: string };
export type Proposal = {
  action: 'create-request';
  target: 'workshop';
  payload: Input;
  revision: number;
};
export type State = {
  version: 1;
  requestId: string;
  revision: number;
  input: Input;
  proposal: Proposal | null;
  approval: string | null;
  attempt: number;
  outcome: 'idle' | 'unknown' | 'completed' | 'escalated';
  receipt: { id: string; fingerprint: string } | null;
  vault: { generation: number; active: boolean };
  evidence: string[];
};
export type Action =
  | { type: 'edit'; input: Input }
  | { [K in keyof Input]: { type: 'edit-field'; field: K; value: Input[K] } }[keyof Input]
  | { type: 'propose' }
  | { type: 'approve' }
  | { type: 'execute'; timeout?: boolean }
  | { type: 'check-receipt' }
  | { type: 'cancel' }
  | { type: 'rotate' }
  | { type: 'revoke' }
  | { type: 'vault-access'; workflow: string; generation: number };
export function initial(requestId: string): State {
  return {
    version: VERSION,
    requestId,
    revision: 0,
    input: { destination: '', quantity: 0, instruction: 'Create the workshop request' },
    proposal: null,
    approval: null,
    attempt: 0,
    outcome: 'idle',
    receipt: null,
    vault: { generation: 1, active: true },
    evidence: []
  };
}
export function validate(input: Input): string[] {
  const errors: string[] = [];
  if (!['Intake desk', 'Receipt shelf'].includes(input.destination))
    errors.push('Choose an allowed destination.');
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 5)
    errors.push('Quantity must be a whole number from 1 to 5.');
  if (input.instruction !== 'Create the workshop request')
    errors.push('This instruction is outside the approved workflow.');
  return errors;
}
export const fingerprint = (proposal: Proposal): string => JSON.stringify(proposal);
function record(s: State, evidence: string): State {
  return { ...s, evidence: [...s.evidence, evidence].slice(-100) };
}
export function reduce(state: State, action: Action): State {
  let s = structuredClone(state);
  switch (action.type) {
    case 'edit-field':
    case 'edit':
      // Resolve uncertain attempts before changing their request identity.
      if (s.outcome === 'unknown') return record(s, 'Resolve the unknown result before editing.');
      s = {
        ...s,
        input: action.type === 'edit-field'
          ? { ...s.input, [action.field]: action.value }
          : { ...action.input },
        revision: s.revision + 1,
        proposal: null,
        approval: null,
        attempt: 0,
        outcome: 'idle',
        receipt: null
      };
      return s;
    case 'propose':
      if (s.outcome !== 'idle') return s;
      if (validate(s.input).length)
        return record(s, 'Invalid input rejected; no execution attempt created.');
      return {
        ...s,
        proposal: {
          action: 'create-request',
          target: 'workshop',
          payload: { ...s.input },
          revision: s.revision
        },
        approval: null
      };
    case 'approve':
      if (
        !s.proposal ||
        validate(s.input).length ||
        s.proposal.revision !== s.revision ||
        JSON.stringify(s.proposal.payload) !== JSON.stringify(s.input)
      )
        return s;
      return { ...s, approval: fingerprint(s.proposal) };
    case 'execute': {
      if (s.outcome !== 'idle' || s.receipt) return s;
      if (
        !s.proposal ||
        validate(s.input).length ||
        s.proposal.revision !== s.revision ||
        JSON.stringify(s.proposal.payload) !== JSON.stringify(s.input) ||
        s.approval !== fingerprint(s.proposal)
      )
        return record(s, 'Execution blocked: approve this exact proposal first.');
      if (s.attempt >= 2) return { ...s, outcome: 'escalated' };
      // One deterministic controlled record per request revision in this simulation.
      s.receipt = { id: `${s.requestId}:${s.revision}`, fingerprint: s.approval };
      s.attempt += 1;
      s.outcome = action.timeout ? 'unknown' : 'completed';
      return record(
        s,
        action.timeout
          ? 'Outcome unknown: check the receipt before retrying.'
          : 'One controlled request recorded.'
      );
    }
    case 'check-receipt':
      if (s.outcome !== 'unknown') return s;
      if (s.receipt)
        return record(
          { ...s, outcome: 'completed' },
          'Receipt reconciled; duplicate execution avoided.'
        );
      return record(
        { ...s, outcome: 'escalated' },
        'No reliable receipt: escalate; do not assume failure.'
      );
    case 'cancel':
      return s.outcome === 'idle' ? { ...s, proposal: null, approval: null } : s;
    case 'rotate':
      return record(
        { ...s, vault: { generation: s.vault.generation + 1, active: true } },
        'Dummy credential rotated: the old generation is denied.'
      );
    case 'revoke':
      return record({ ...s, vault: { ...s.vault, active: false } }, 'Dummy credential revoked.');
    case 'vault-access':
      return record(
        s,
        s.vault.active && action.generation === s.vault.generation && action.workflow === 'workshop'
          ? 'Dummy vault allowed the workshop workflow.'
          : 'Dummy vault denied access.'
      );
  }
}
/** Parse only states generated by this version, rejecting inconsistent authority. */
export function restore(raw: string): State | null {
  try {
    const s = JSON.parse(raw) as State;
    if (
      s.version !== VERSION ||
      typeof s.requestId !== 'string' ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(s.requestId) ||
      !Number.isSafeInteger(s.revision) ||
      s.revision < 0 ||
      !Number.isInteger(s.attempt) ||
      s.attempt < 0 ||
      s.attempt > 2 ||
      !s.input ||
      typeof s.input.destination !== 'string' ||
      typeof s.input.instruction !== 'string' ||
      typeof s.input.quantity !== 'number' ||
      !['idle', 'unknown', 'completed', 'escalated'].includes(s.outcome) ||
      !s.vault ||
      !Number.isInteger(s.vault.generation) ||
      s.vault.generation < 1 ||
      typeof s.vault.active !== 'boolean' ||
      !Array.isArray(s.evidence) ||
      !s.evidence.every((e) => typeof e === 'string')
    )
      return null;
    if (
      s.proposal &&
      (s.proposal.action !== 'create-request' ||
        s.proposal.target !== 'workshop' ||
        s.proposal.revision !== s.revision ||
        JSON.stringify(s.proposal.payload) !== JSON.stringify(s.input) ||
        validate(s.input).length)
    )
      return null;
    if (s.approval !== null && (!s.proposal || s.approval !== fingerprint(s.proposal))) return null;
    if (
      s.receipt &&
      (!s.proposal ||
        s.receipt.id !== `${s.requestId}:${s.revision}` ||
        s.receipt.fingerprint !== fingerprint(s.proposal))
    )
      return null;
    if (['unknown', 'completed'].includes(s.outcome) && !s.receipt) return null;
    return s;
  } catch {
    return null;
  }
}
