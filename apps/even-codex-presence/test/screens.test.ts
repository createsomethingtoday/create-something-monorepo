import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EventSourceType, OsEventTypeList } from '@evenrealities/even_hub_sdk';
import type { PresenceCard } from '@create-something/codex-presence';

import { inputSource, resolveInteraction } from '../src/interaction';
import { resolveSelection } from '../src/selection';
import { actionsScreen, confirmScreen, overviewScreen, voiceScreen } from '../src/screens';

describe('Even G2 Codex Relay behavior', () => {
  it('renders a quiet, bounded overview and decision-first action list', () => {
    const output = overviewScreen([card], 0);
    assert.equal(output.split('\n').length <= 9, true);
    assert.match(output, /● WORKING/);
    assert.match(output, /Ring 2x  speak/);
    const actions = actionsScreen(card, 1);
    assert.match(actions, /› Stop !/);
    assert.match(confirmScreen(card.actions[2]!), /CONFIRM/);
    assert.match(voiceScreen('recording'), /• or Ring 2x when done/);
  });

  it('gives the ring voice/back semantics while glasses double-click exits', () => {
    assert.equal(inputSource(EventSourceType.TOUCH_EVENT_FROM_RING), 'ring');
    assert.deepEqual(resolveInteraction({ eventType: OsEventTypeList.DOUBLE_CLICK_EVENT, source: 'ring', view: 'overview' }), { kind: 'voice-toggle' });
    assert.deepEqual(resolveInteraction({ eventType: OsEventTypeList.DOUBLE_CLICK_EVENT, source: 'ring', view: 'detail' }), { kind: 'back' });
    assert.deepEqual(resolveInteraction({ eventType: OsEventTypeList.DOUBLE_CLICK_EVENT, source: 'glasses', view: 'overview' }), { kind: 'exit' });
  });

  it('drives overview, detail, voice review, and retry through the runtime reducer', () => {
    assert.deepEqual(selection('overview'), { kind: 'view', view: 'detail' });
    assert.deepEqual(selection('detail'), { kind: 'view', view: 'actions' });
    assert.deepEqual(selection('actions'), { kind: 'begin_voice', action: card.actions[1] });
    assert.deepEqual(selection('voice_review', { voiceText: 'Continue with the recommended.' }), {
      kind: 'send', action: card.actions[1], confirmed: false, text: 'Continue with the recommended.'
    });
    assert.deepEqual(selection('error'), { kind: 'view', view: 'overview' });
    assert.deepEqual(selection('receipt'), { kind: 'view', view: 'overview' });
  });

  it('fails closed for risky confirmation and disconnected or stale decisions', () => {
    assert.deepEqual(selection('actions', { actionIndex: 1 }), {
      kind: 'view', view: 'confirm', pendingAction: card.actions[2]
    });
    assert.deepEqual(selection('confirm', { pendingAction: card.actions[2] }), {
      kind: 'send', action: card.actions[2], confirmed: true
    });
    assert.equal(selection('confirm').kind, 'error');
    assert.deepEqual(selection('overview', { card: undefined }), { kind: 'noop' });
    assert.match(overviewScreen([], 0), /No visible tasks/);
  });
});

function selection(
  view: Parameters<typeof resolveSelection>[0]['view'],
  overrides: Partial<Parameters<typeof resolveSelection>[0]> = {}
) {
  return resolveSelection({
    view,
    card,
    actionIndex: 0,
    pendingAction: null,
    voiceText: '',
    ...overrides
  });
}

const card: PresenceCard = {
  taskId: 'thread-live', task: 'Build Codex Presence', state: 'working', attention: 'quiet', operatorRequired: false,
  summary: 'Codex is working.', reason: 'A task turn is active.', observedAt: '2026-07-17T05:00:00Z', freshness: 'fresh',
  version: 'working:2026-07-17T05:00:00Z',
  source: { kind: 'codex_rollout', path: '/tmp/rollout.jsonl' },
  actions: [
    { id: 'inspect', type: 'inspect', label: 'Inspect', risk: 'safe', requiresConfirmation: false },
    { id: 'follow', type: 'follow_up', label: 'Follow up', risk: 'safe', requiresConfirmation: false },
    { id: 'stop', type: 'interrupt', label: 'Stop', risk: 'review', requiresConfirmation: true }
  ]
};
