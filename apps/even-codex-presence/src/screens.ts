import type { PresenceAction, PresenceCard } from '@create-something/codex-presence';

export type PresenceView =
  | 'overview'
  | 'detail'
  | 'actions'
  | 'confirm'
  | 'recording'
  | 'voice_review'
  | 'receipt'
  | 'error';

export function overviewScreen(cards: PresenceCard[], selected: number): string {
  if (cards.length === 0) return ['CODEX PRESENCE', '', 'No visible tasks', '', 'Waiting for Codex...', '', 'Ring 2x  speak'].join('\n');
  const card = cards[clamp(selected, cards.length)]!;
  return lines([
    `CODEX  ${clamp(selected, cards.length) + 1}/${cards.length}`,
    stateLabel(card),
    truncate(card.task, 34),
    '',
    truncate(card.summary, 42),
    '',
    '↑↓ choose   • open',
    'Ring 2x  speak'
  ]);
}

export function detailScreen(card: PresenceCard): string {
  return lines([
    stateLabel(card),
    truncate(card.task, 38),
    '',
    truncate(card.summary, 84),
    '',
    truncate(card.reason, 72),
    '',
    '• actions   Ring 2x back'
  ]);
}

export function actionsScreen(card: PresenceCard, selected: number): string {
  const actions = actionable(card.actions);
  return lines([
    'CHOOSE ACTION',
    truncate(card.task, 34),
    '',
    ...actions.slice(0, 4).map((action, index) => `${index === clamp(selected, actions.length) ? '›' : ' '} ${action.label}${action.requiresConfirmation ? ' !' : ''}`),
    '',
    '↑↓ choose   • select'
  ]);
}

export function confirmScreen(action: PresenceAction): string {
  return lines([
    'CONFIRM',
    '',
    `${action.label}?`,
    action.risk === 'restricted' ? 'This grants a Codex request.' : 'This changes the active task.',
    '',
    '• confirm',
    'Ring 2x  cancel'
  ]);
}

export function voiceScreen(mode: 'recording' | 'review', text = ''): string {
  if (mode === 'recording') return lines(['SPEAK TO CODEX', '', 'Listening...', '', '• or Ring 2x when done', '', 'Glasses 2x cancel']);
  return lines(['REVIEW VOICE', '', truncate(text || 'No speech detected.', 126), '', '• send', 'Ring 2x  cancel']);
}

export function messageScreen(title: string, message: string): string {
  return lines([title.toUpperCase(), '', truncate(message, 150), '', '• back']);
}

export function actionable(actions: PresenceAction[]): PresenceAction[] {
  return actions.filter((action) => action.type !== 'inspect' && action.type !== 'open_detail');
}

export function stateLabel(card: PresenceCard): string {
  const marker = card.attention === 'urgent' ? '!' : card.attention === 'decision' ? '?' : card.state === 'working' ? '●' : '○';
  return `${marker} ${card.state.replace('_', ' ').toUpperCase()}`;
}

function lines(values: string[]): string {
  return values.slice(0, 9).join('\n');
}

function truncate(value: string, maximum: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= maximum ? clean : `${clean.slice(0, maximum - 1)}…`;
}

function clamp(index: number, length: number): number {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}
