import type { Action, State } from './state';

/** Capture what the operator saw before waiting for the cross-tab lock. */
export function context(state: State) {
  return {
    requestId: state.requestId,
    revision: state.revision,
    authorityRevision: state.authorityRevision,
    vault: JSON.stringify(state.vault),
    authority: JSON.stringify([state.proposal, state.approval, state.outcome])
  };
}

/** Field edits rebase on fresh input; other transitions require unchanged authority. */
export function isCurrent(state: State, expected: ReturnType<typeof context>, action?: Action) {
  if (state.requestId !== expected.requestId ||
      state.authorityRevision !== expected.authorityRevision) return false;
  if (action && ['rotate', 'revoke', 'vault-access'].includes(action.type) &&
      JSON.stringify(state.vault) !== expected.vault) return false;
  if (action?.type === 'edit-field') return true;
  return state.revision === expected.revision && context(state).authority === expected.authority;
}

/** Persist the checkbox's desired value, even when several tabs choose it together. */
export function setProvider(current: string[], name: string, checked: boolean): string[] {
  return checked
    ? current.includes(name) ? current : [...current, name]
    : current.filter((provider) => provider !== name);
}
