import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EventSourceType, OsEventTypeList } from '@evenrealities/even_hub_sdk';
import type { PresenceCard } from '@create-something/codex-presence';

import { inputSource, resolveInteraction } from '../src/interaction';
import { actionsScreen, confirmScreen, overviewScreen, voiceScreen } from '../src/screens';

describe('Even G2 Codex Presence behavior', () => {
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
});

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
