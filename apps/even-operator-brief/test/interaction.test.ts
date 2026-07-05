import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventSourceType, OsEventTypeList } from '@evenrealities/even_hub_sdk';

import {
  inputSourceFromEventSource,
  resolveOperatorInteraction
} from '../src/interaction';

describe('operator interaction routing', () => {
  it('distinguishes R1 ring input from glasses input', () => {
    assert.equal(inputSourceFromEventSource(EventSourceType.TOUCH_EVENT_FROM_RING), 'ring');
    assert.equal(inputSourceFromEventSource(EventSourceType.TOUCH_EVENT_FROM_GLASSES_L), 'glasses');
    assert.equal(inputSourceFromEventSource(EventSourceType.TOUCH_EVENT_FROM_GLASSES_R), 'glasses');
    assert.equal(inputSourceFromEventSource(undefined), 'unknown');
  });

  it('keeps glasses double-click as the exit affordance', () => {
    assert.deepEqual(
      resolveOperatorInteraction({
        eventType: OsEventTypeList.DOUBLE_CLICK_EVENT,
        inputSource: 'glasses',
        viewMode: 'queue'
      }),
      { kind: 'exit' }
    );
  });

  it('uses R1 double-click as a safe claim shortcut instead of exiting', () => {
    assert.deepEqual(
      resolveOperatorInteraction({
        eventType: OsEventTypeList.DOUBLE_CLICK_EVENT,
        inputSource: 'ring',
        viewMode: 'queue'
      }),
      { kind: 'set-view', viewMode: 'claim' }
    );

    assert.deepEqual(
      resolveOperatorInteraction({
        eventType: OsEventTypeList.DOUBLE_CLICK_EVENT,
        inputSource: 'ring',
        viewMode: 'claim'
      }),
      { kind: 'set-view', viewMode: 'detail' }
    );
  });

  it('preserves existing click, scroll, and foreground behavior', () => {
    assert.deepEqual(
      resolveOperatorInteraction({
        eventType: OsEventTypeList.CLICK_EVENT,
        inputSource: 'ring',
        viewMode: 'detail'
      }),
      { kind: 'tap' }
    );
    assert.deepEqual(
      resolveOperatorInteraction({
        eventType: OsEventTypeList.SCROLL_TOP_EVENT,
        inputSource: 'ring',
        viewMode: 'queue'
      }),
      { kind: 'move', delta: -1 }
    );
    assert.deepEqual(
      resolveOperatorInteraction({
        eventType: OsEventTypeList.FOREGROUND_ENTER_EVENT,
        inputSource: 'unknown',
        viewMode: 'queue'
      }),
      { kind: 'refresh-silent' }
    );
  });
});
