interface ToolbarTab {
  windowId?: number;
}

interface ToolbarActionOptions {
  setPanelBehavior: (options: { openPanelOnActionClick: boolean }) => Promise<unknown>;
  addOnClicked: (listener: (tab: ToolbarTab) => void) => void;
  openPanel: (options: { windowId: number }) => Promise<unknown>;
}

export function configureToolbarAction({
  setPanelBehavior,
  addOnClicked,
  openPanel
}: ToolbarActionOptions): void {
  void setPanelBehavior({ openPanelOnActionClick: false });
  addOnClicked((tab) => {
    if (tab.windowId === undefined) return;
    // Keep this call inside the action listener. Chrome grants activeTab for the
    // action invocation and permits sidePanel.open from the same user gesture.
    void openPanel({ windowId: tab.windowId });
  });
}
