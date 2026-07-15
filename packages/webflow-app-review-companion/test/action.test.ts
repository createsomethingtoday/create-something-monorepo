import { describe, expect, test, vi } from 'vitest';
import { configureToolbarAction } from '../src/action';

describe('companion toolbar action', () => {
  test('uses a normal action invocation before opening the side panel', async () => {
    const setPanelBehavior = vi.fn(() => Promise.resolve());
    const openPanel = vi.fn(() => Promise.resolve());
    let onClicked: ((tab: { windowId?: number }) => void) | undefined;

    configureToolbarAction({
      setPanelBehavior,
      addOnClicked: (listener) => { onClicked = listener; },
      openPanel
    });

    expect(setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: false });
    expect(onClicked).toBeTypeOf('function');

    onClicked?.({ windowId: 17 });
    expect(openPanel).toHaveBeenCalledWith({ windowId: 17 });
  });

  test('does not try to open a panel without a browser window', () => {
    const openPanel = vi.fn(() => Promise.resolve());
    let onClicked: ((tab: { windowId?: number }) => void) | undefined;

    configureToolbarAction({
      setPanelBehavior: () => Promise.resolve(),
      addOnClicked: (listener) => { onClicked = listener; },
      openPanel
    });

    onClicked?.({});
    expect(openPanel).not.toHaveBeenCalled();
  });
});
