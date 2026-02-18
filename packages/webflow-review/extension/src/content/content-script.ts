// Content Script - Injected into Webflow Designer pages

console.log('[Webflow Review] Content script loaded');

const WEBFLOW_IO_SUFFIX = '.webflow.io';

// Detect which mode we're running in
const isDesigner =
  window.location.hostname === 'webflow.com' &&
  window.location.pathname.startsWith('/design/');
const isPreview = window.location.hostname === 'preview.webflow.com';
const isPublished =
  window.location.hostname.endsWith(WEBFLOW_IO_SUFFIX) &&
  window.location.hostname.length > WEBFLOW_IO_SUFFIX.length;

if (isDesigner) {
  console.log('[Webflow Review] Running in Designer mode');
} else if (isPreview) {
  console.log('[Webflow Review] Running in Preview mode');
} else if (isPublished) {
  console.log('[Webflow Review] Running in Published mode');
}

// Extract project ID from URL
function extractProjectId(): string {
  if (isDesigner) {
    // Designer URL: https://webflow.com/design/project-slug
    const match = window.location.pathname.match(/\/design\/([^\/]+)/);
    return match?.[1] || 'unknown';
  } else if (isPreview) {
    // Preview URL: https://preview.webflow.com/preview/project-slug?preview=token
    const match = window.location.pathname.match(/\/preview\/([^\/]+)/);
    return match?.[1] || 'unknown';
  } else if (isPublished) {
    // Published URL: https://project-slug.webflow.io/...
    return window.location.hostname.slice(0, -WEBFLOW_IO_SUFFIX.length) || 'unknown';
  }
  return 'unknown';
}

// Get current page URL (for review)
function getCurrentPageUrl(): string {
  return window.location.href;
}

type SnippetToolResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

async function callSnippetTool(
  tool: string,
  input: unknown,
  opts?: { timeoutMs?: number }
): Promise<SnippetToolResult> {
  const id = crypto.randomUUID();
  const timeoutMs = opts?.timeoutMs ?? 1500;

  return await new Promise((resolve) => {
    let done = false;

    const finish = (value: SnippetToolResult) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(value);
    };

    const timer = window.setTimeout(() => {
      finish({ ok: false, error: 'snippet_timeout' });
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as any;
      if (!data || data.__wf_review_snippet_v1 !== true) return;
      if (data.type !== 'tool_result') return;
      if (data.id !== id) return;

      if (data.ok) {
        finish({ ok: true, result: data.result });
      } else {
        finish({ ok: false, error: typeof data.error === 'string' ? data.error : 'tool_error' });
      }
    };

    window.addEventListener('message', onMessage);
    window.postMessage(
      { __wf_review_snippet_v1: true, type: 'call_tool', id, tool, input },
      '*'
    );
  });
}

async function runSnippetAudit(): Promise<
  | { success: true; ix2?: unknown; ix3?: unknown }
  | { success: false; error: string }
> {
  const [ix2, ix3] = await Promise.all([
    callSnippetTool('audit_ix2', {}, { timeoutMs: 2000 }),
    callSnippetTool('audit_ix3', {}, { timeoutMs: 2000 }),
  ]);

  if (!ix2.ok && !ix3.ok) {
    // Most likely: snippet not installed, or tool names differ.
    return { success: false, error: ix2.error || ix3.error || 'snippet_unavailable' };
  }

  return {
    success: true,
    ...(ix2.ok ? { ix2: ix2.result } : {}),
    ...(ix3.ok ? { ix3: ix3.result } : {}),
  };
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageUrl') {
    const projectId = extractProjectId();
    const url = getCurrentPageUrl();

    sendResponse({
      url,
      projectId,
      isDesigner,
      isPreview,
      isPublished,
    });
    return true;
  }

  if (message.action === 'highlightElement') {
    highlightElement(message.selector, message.severity);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'clearHighlights') {
    clearAllHighlights();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'runSnippetAudit') {
    runSnippetAudit()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  }

  return false;
});

// Highlight element with issue
function highlightElement(selector: string, severity: 'critical' | 'warning' | 'info') {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      console.warn(`[Webflow Review] Element not found: ${selector}`);
      return;
    }

    // Remove existing highlights
    element.classList.remove(
      'webflow-review-critical',
      'webflow-review-warning',
      'webflow-review-info'
    );

    // Add highlight class
    element.classList.add(`webflow-review-${severity}`);

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Flash effect
    element.animate([
      { opacity: 1 },
      { opacity: 0.5 },
      { opacity: 1 },
      { opacity: 0.5 },
      { opacity: 1 },
    ], {
      duration: 1000,
      iterations: 1,
    });
  } catch (error) {
    console.error('[Webflow Review] Failed to highlight element:', error);
  }
}

// Clear all highlights
function clearAllHighlights() {
  const elements = document.querySelectorAll(
    '.webflow-review-critical, .webflow-review-warning, .webflow-review-info'
  );

  elements.forEach((el) => {
    el.classList.remove(
      'webflow-review-critical',
      'webflow-review-warning',
      'webflow-review-info'
    );
  });
}

// Inject CSS for highlights
function injectHighlightStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .webflow-review-critical {
      outline: 3px solid #ef4444 !important;
      outline-offset: 2px !important;
      position: relative !important;
    }

    .webflow-review-warning {
      outline: 3px solid #f59e0b !important;
      outline-offset: 2px !important;
      position: relative !important;
    }

    .webflow-review-info {
      outline: 3px solid #3b82f6 !important;
      outline-offset: 2px !important;
      position: relative !important;
    }

    .webflow-review-critical::after,
    .webflow-review-warning::after,
    .webflow-review-info::after {
      content: '';
      position: absolute;
      top: -8px;
      right: -8px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      color: white;
      z-index: 9999;
    }

    .webflow-review-critical::after {
      background: #ef4444;
      content: '!';
    }

    .webflow-review-warning::after {
      background: #f59e0b;
      content: '⚠';
    }

    .webflow-review-info::after {
      background: #3b82f6;
      content: 'i';
    }
  `;
  document.head.appendChild(style);
}

// Initialize
injectHighlightStyles();

// Send ready signal
chrome.runtime.sendMessage({
  action: 'contentScriptReady',
  projectId: extractProjectId(),
  url: getCurrentPageUrl(),
});
