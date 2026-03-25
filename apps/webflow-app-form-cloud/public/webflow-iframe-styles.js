/**
 * Webflow Iframe Style Inheritance Helper
 * Include this script on your Webflow page to enable style inheritance for embedded forms
 */

(function() {
  // Function to get computed styles from the parent page
  function getParentStyles() {
    const computedStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);

    // Extract key style properties with better fallbacks
    const styles = {
      fontFamily: bodyStyle.fontFamily || computedStyle.fontFamily || 'system-ui, -apple-system, sans-serif',
      fontSize: bodyStyle.fontSize || computedStyle.fontSize || '16px',
      color: bodyStyle.color || computedStyle.color || '#333333',
      backgroundColor: bodyStyle.backgroundColor || computedStyle.backgroundColor || '#ffffff',
      lineHeight: bodyStyle.lineHeight || computedStyle.lineHeight || '1.5'
    };

    // Extract CSS custom properties (variables) from :root
    const cssVariables = {};
    const rootStyles = window.getComputedStyle(document.documentElement);

    // Get all CSS custom properties from the root element
    for (let i = 0; i < rootStyles.length; i++) {
      const property = rootStyles[i];
      if (property.startsWith('--')) {
        cssVariables[property] = rootStyles.getPropertyValue(property);
      }
    }

    return { ...styles, cssVariables };
  }

  // Function to send styles to iframe
  function sendStylesToIframe(iframe) {
    if (!iframe || !iframe.contentWindow) return;

    try {
      const styles = getParentStyles();
      iframe.contentWindow.postMessage({
        type: 'PARENT_STYLES',
        styles: styles,
        source: 'webflow-parent'
      }, '*');
    } catch (error) {
      // Cross-origin or iframe not ready - expected in some contexts
    }
  }

  // Listen for messages from iframes
  window.addEventListener('message', function(event) {
    // Handle style requests
    if (event.data.type === 'REQUEST_STYLES' && event.data.source === 'webflow-form-app') {
      // Find the iframe that sent the request
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.contentWindow === event.source) {
          sendStylesToIframe(iframe);
        }
      });
    }

    // Handle resize requests
    if (event.data.type === 'RESIZE_IFRAME' && event.data.source === 'webflow-form-app') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.contentWindow === event.source) {
          // Set the iframe height to match content
          iframe.style.height = event.data.height + 'px';
          iframe.style.overflow = 'hidden';

          // Remove scrolling and border
          iframe.setAttribute('scrolling', 'no');
          iframe.style.border = 'none';
          iframe.style.outline = 'none';

        }
      });
    }
  });

  // Auto-detect Webflow form iframes and send styles on load
  function initializeIframeStyles() {
    const iframes = document.querySelectorAll('iframe[src*="webflow-form"]');

    iframes.forEach(iframe => {
      iframe.addEventListener('load', function() {
        // Remove border immediately
        iframe.style.border = 'none';
        iframe.style.outline = 'none';
        iframe.setAttribute('scrolling', 'no');

        // Wait a moment for the iframe content to fully load
        setTimeout(() => {
          sendStylesToIframe(iframe);
        }, 500);
      });

      // If iframe is already loaded, remove border and send styles immediately
      if (iframe.contentWindow) {
        iframe.style.border = 'none';
        iframe.style.outline = 'none';
        iframe.setAttribute('scrolling', 'no');

        setTimeout(() => {
          sendStylesToIframe(iframe);
        }, 500);
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIframeStyles);
  } else {
    initializeIframeStyles();
  }

  // Re-initialize when new iframes are added (for dynamic content)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          if (node.tagName === 'IFRAME' && node.src && node.src.includes('webflow-form')) {
            // Remove border immediately
            node.style.border = 'none';
            node.style.outline = 'none';
            node.setAttribute('scrolling', 'no');

            node.addEventListener('load', function() {
              setTimeout(() => {
                sendStylesToIframe(node);
              }, 500);
            });
          }
          // Also check for iframes added as children
          const childIframes = node.querySelectorAll && node.querySelectorAll('iframe[src*="webflow-form"]');
          if (childIframes) {
            childIframes.forEach(iframe => {
              // Remove border immediately
              iframe.style.border = 'none';
              iframe.style.outline = 'none';
              iframe.setAttribute('scrolling', 'no');

              iframe.addEventListener('load', function() {
                setTimeout(() => {
                  sendStylesToIframe(iframe);
                }, 500);
              });
            });
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Expose global function for manual style sending
  window.sendWebflowStylesToIframe = function(iframeSelector) {
    const iframe = document.querySelector(iframeSelector);
    if (iframe) {
      sendStylesToIframe(iframe);
    }
  };

  // Auto-refresh styles when window is resized (in case of responsive changes)
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      const iframes = document.querySelectorAll('iframe[src*="webflow-form"]');
      iframes.forEach(iframe => {
        sendStylesToIframe(iframe);
      });
    }, 300);
  });

})();