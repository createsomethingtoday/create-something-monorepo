import { EventSourceType, OsEventTypeList } from '@evenrealities/even_hub_sdk';

export type ViewMode = 'queue' | 'detail' | 'claim' | 'message';

export type OperatorInputSource = 'ring' | 'glasses' | 'unknown';

export type OperatorInteraction =
  | { kind: 'exit' }
  | { kind: 'move'; delta: -1 | 1 }
  | { kind: 'refresh-silent' }
  | { kind: 'tap' }
  | { kind: 'set-view'; viewMode: ViewMode };

export function inputSourceFromEventSource(eventSource: EventSourceType | undefined): OperatorInputSource {
  if (eventSource === EventSourceType.TOUCH_EVENT_FROM_RING) return 'ring';
  if (
    eventSource === EventSourceType.TOUCH_EVENT_FROM_GLASSES_L ||
    eventSource === EventSourceType.TOUCH_EVENT_FROM_GLASSES_R
  ) {
    return 'glasses';
  }
  return 'unknown';
}

export function resolveOperatorInteraction(input: {
  eventType: OsEventTypeList | undefined;
  inputSource: OperatorInputSource;
  viewMode: ViewMode;
}): OperatorInteraction | null {
  const { eventType, inputSource, viewMode } = input;

  if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    if (inputSource === 'ring') {
      return viewMode === 'claim' || viewMode === 'message'
        ? { kind: 'set-view', viewMode: 'detail' }
        : { kind: 'set-view', viewMode: 'claim' };
    }

    return { kind: 'exit' };
  }

  if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
    return { kind: 'move', delta: -1 };
  }

  if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
    return { kind: 'move', delta: 1 };
  }

  if (eventType === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
    return { kind: 'refresh-silent' };
  }

  if (eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined) {
    return { kind: 'tap' };
  }

  return null;
}
