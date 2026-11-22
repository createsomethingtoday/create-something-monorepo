// No startup listener, timers, offscreen pages or recording in this worker.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) void chrome.tabs.create({ url: chrome.runtime.getURL(`control.html#${tab.id}`) });
});
