import type { Action, State } from './state';

/** Capture what the operator saw before waiting for the cross-tab lock. */
export function context(state: State) {
  return {
    requestId: state.requestId,
    revision: state.revision,
    authority: JSON.stringify([state.proposal, state.approval, state.outcome])
  };
}

/** Field edits rebase on fresh input; other transitions require unchanged authority. */
export function isCurrent(state: State, expected: ReturnType<typeof context>, action?: Action) {
  if (state.requestId !== expected.requestId) return false;
  if (action?.type === 'edit-field') return true;
  return state.revision === expected.revision && context(state).authority === expected.authority;
}
