import type { PresenceAction, PresenceCard } from '@create-something/codex-presence';

import { actionable, type PresenceView } from './screens';

export type SelectionDecision =
  | { kind: 'view'; view: PresenceView; pendingAction?: PresenceAction }
  | { kind: 'begin_voice'; action: PresenceAction }
  | { kind: 'finish_voice' }
  | { kind: 'send'; action: PresenceAction; confirmed: boolean; text?: string }
  | { kind: 'error'; message: string }
  | { kind: 'noop' };

export function resolveSelection(input: {
  view: PresenceView;
  card?: PresenceCard;
  actionIndex: number;
  pendingAction: PresenceAction | null;
  voiceText: string;
}): SelectionDecision {
  const { view, card, actionIndex, pendingAction, voiceText } = input;

  if (view === 'recording') return { kind: 'finish_voice' };
  if (view === 'overview') return card ? { kind: 'view', view: 'detail' } : { kind: 'noop' };
  if (view === 'detail') return card ? { kind: 'view', view: 'actions' } : { kind: 'noop' };

  if (view === 'actions') {
    if (!card) return { kind: 'noop' };
    const action = actionable(card.actions)[actionIndex];
    if (!action) return { kind: 'noop' };
    if (action.type === 'follow_up' || action.type === 'answer') return { kind: 'begin_voice', action };
    if (action.requiresConfirmation) return { kind: 'view', view: 'confirm', pendingAction: action };
    return { kind: 'send', action, confirmed: false };
  }

  if (view === 'confirm') {
    return pendingAction
      ? { kind: 'send', action: pendingAction, confirmed: true }
      : { kind: 'error', message: 'The pending action is no longer available.' };
  }

  if (view === 'voice_review') {
    if (!card || !voiceText) return { kind: 'noop' };
    const type = card.state === 'needs_input' ? 'answer' : 'follow_up';
    const action = card.actions.find((candidate) => candidate.type === type);
    return action
      ? { kind: 'send', action, confirmed: false, text: voiceText }
      : { kind: 'error', message: 'This task cannot accept voice input in its current state.' };
  }

  if (view === 'receipt' || view === 'error') return { kind: 'view', view: 'overview' };
  return { kind: 'noop' };
}
