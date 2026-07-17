import { EventSourceType, OsEventTypeList } from '@evenrealities/even_hub_sdk';

import type { PresenceView } from './screens';

export type InputSource = 'ring' | 'glasses' | 'unknown';
export type PresenceInteraction =
  | { kind: 'move'; delta: -1 | 1 }
  | { kind: 'select' }
  | { kind: 'voice-toggle' }
  | { kind: 'back' }
  | { kind: 'exit' }
  | { kind: 'refresh' };

export function inputSource(eventSource: EventSourceType | undefined): InputSource {
  if (eventSource === EventSourceType.TOUCH_EVENT_FROM_RING) return 'ring';
  if (eventSource === EventSourceType.TOUCH_EVENT_FROM_GLASSES_L || eventSource === EventSourceType.TOUCH_EVENT_FROM_GLASSES_R) return 'glasses';
  return 'unknown';
}

export function resolveInteraction(input: {
  eventType: OsEventTypeList | undefined;
  source: InputSource;
  view: PresenceView;
}): PresenceInteraction | null {
  if (input.eventType === OsEventTypeList.SCROLL_TOP_EVENT) return { kind: 'move', delta: -1 };
  if (input.eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) return { kind: 'move', delta: 1 };
  if (input.eventType === OsEventTypeList.FOREGROUND_ENTER_EVENT) return { kind: 'refresh' };
  if (input.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    if (input.source === 'glasses') return { kind: 'exit' };
    if (input.source === 'ring' && (input.view === 'overview' || input.view === 'recording')) return { kind: 'voice-toggle' };
    return { kind: 'back' };
  }
  if (input.eventType === OsEventTypeList.CLICK_EVENT || input.eventType === undefined) return { kind: 'select' };
  return null;
}
