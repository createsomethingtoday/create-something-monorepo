// Content Script - Injected into Webflow Designer pages

console.log('[Webflow Review] Content script loaded');

// Detect if we're in Webflow Designer
const isDesigner = window.location.href.includes('webflow.com/design/');
const isPreview = window.location.href.includes('preview.webflow.com');

if (isDesigner) {
  console.log('[Webflow Review] Running in Designer mode');
} else if (isPreview) {
  console.log('[Webflow Review] Running in Preview mode');
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
  }
  return 'unknown';
}

// Get current page URL (for review)
function getCurrentPageUrl(): string {
  return window.location.href;
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
