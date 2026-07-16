function snapshot() {
  const storage = (target: Storage) =>
    Array.from({ length: target.length }, (_, index) => {
      const key = target.key(index) ?? '';
      return { key: key.slice(0, 120), bytes: new TextEncoder().encode(target.getItem(key) ?? '').byteLength };
    });
  return {
    url: location.href,
    scripts: [...document.scripts].map((script) => ({
      src: script.src,
      integrity: script.integrity || null,
      crossOrigin: script.crossOrigin || null
    })),
    frames: [...document.querySelectorAll('iframe')].map((frame) => ({ src: frame.src })),
    dom: {
      elementCount: document.querySelectorAll('*').length,
      dialogCount: document.querySelectorAll('dialog,[role="dialog"]').length,
      formControlCount: document.querySelectorAll('input,textarea,select,[contenteditable="true"]').length
    },
    storage: { local: storage(localStorage), session: storage(sessionStorage) }
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'COMPANION_CAPTURE_SNAPSHOT') {
    sendResponse(snapshot());
  }
  if (message?.type === 'COMPANION_CAPTURE_MASK') {
    const existing = document.querySelector('#webflow-app-review-capture-mask');
    if (message.enabled && !existing) {
      const style = document.createElement('style');
      style.id = 'webflow-app-review-capture-mask';
      style.textContent = 'input,textarea,select,[contenteditable="true"]{color:transparent!important;text-shadow:none!important;background:#000!important;caret-color:transparent!important}';
      document.documentElement.append(style);
    } else if (!message.enabled) {
      existing?.remove();
    }
    sendResponse({ masked: Boolean(message.enabled) });
  }
});

const observer = new MutationObserver((records) => {
  let scripts = 0;
  let frames = 0;
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (!(node instanceof Element)) continue;
      scripts += node.matches('script') ? 1 : node.querySelectorAll('script').length;
      frames += node.matches('iframe') ? 1 : node.querySelectorAll('iframe').length;
    }
  }
  if (scripts || frames) {
    void chrome.runtime.sendMessage({
      type: 'COMPANION_EVENT',
      event: {
        kind: 'dom',
        at: new Date().toISOString(),
        url: location.href,
        detail: { addedScripts: scripts, addedFrames: frames }
      }
    });
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
