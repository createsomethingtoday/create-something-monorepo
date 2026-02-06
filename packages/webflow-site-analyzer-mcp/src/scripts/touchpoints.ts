/**
 * Touchpoint Extraction Script
 * 
 * Extracts all interactive elements from a page including links, buttons,
 * forms, and Webflow-specific interactions.
 * 
 * NOTE: For Webflow Designer Preview URLs, content is in #site-iframe-next.
 * The browser provider must extract from that iframe, not the main page.
 */

export const touchpointScript = `
(() => {
  // Interactive element selectors
  const interactiveSelectors = [
    'a[href]',
    'button',
    '[role="button"]',
    'input',
    'select',
    'textarea',
    'form',
    '[onclick]',
    '[data-action]',
    '[data-w-id]',              // Webflow interactions
    '[data-wf-page]',           // Webflow page links
    '.w-button',                // Webflow button class
    '.w-form',                  // Webflow forms
    '.w-nav-link',              // Webflow nav links
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const elements = document.querySelectorAll(interactiveSelectors);
  const viewportHeight = window.innerHeight;
  const warnings = [];
  let idCounter = 0;

  /**
   * Categorize element type
   */
  function categorizeElement(el) {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const classes = el.className || '';
    
    // Navigation
    if (tag === 'nav' || el.closest('nav') || classes.includes('w-nav')) {
      return 'navigation';
    }
    
    // CTA detection
    const text = (el.textContent || '').toLowerCase();
    const ctaPatterns = ['get started', 'sign up', 'subscribe', 'contact', 'book', 'schedule', 'demo', 'free trial'];
    if (ctaPatterns.some(p => text.includes(p))) {
      return 'cta';
    }
    
    // Standard types
    if (tag === 'a') return 'link';
    if (tag === 'button' || role === 'button' || classes.includes('w-button')) return 'button';
    if (tag === 'form' || classes.includes('w-form')) return 'form';
    if (['input', 'select', 'textarea'].includes(tag)) return 'input';
    
    return 'interactive';
  }

  /**
   * Generate a unique CSS selector for an element
   */
  function generateSelector(el) {
    // Try ID first
    if (el.id) {
      return '#' + CSS.escape(el.id);
    }
    
    // Try Webflow class
    const wfClass = Array.from(el.classList).find(c => c.startsWith('w-'));
    if (wfClass) {
      const elements = document.querySelectorAll('.' + CSS.escape(wfClass));
      if (elements.length === 1) {
        return '.' + CSS.escape(wfClass);
      }
    }
    
    // Build path
    const path = [];
    let current = el;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector = '#' + CSS.escape(current.id);
        path.unshift(selector);
        break;
      }
      
      // Add nth-child for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Get relevant attributes for analysis
   */
  function getRelevantAttributes(el) {
    const relevant = [
      'data-action', 'data-track', 'data-analytics',
      'aria-label', 'title', 'name', 'type', 'target',
      'data-w-id', 'data-wf-page', 'data-ix'  // Webflow attributes
    ];
    
    const attrs = {};
    relevant.forEach(attr => {
      if (el.hasAttribute(attr)) {
        attrs[attr] = el.getAttribute(attr);
      }
    });
    
    return attrs;
  }

  /**
   * Check if element is in viewport
   */
  function isInViewport(rect) {
    return rect.top < viewportHeight && rect.bottom > 0;
  }

  /**
   * Check if element is above the fold
   */
  function isAboveFold(rect) {
    return rect.top < viewportHeight;
  }

  // Process all elements
  const touchpoints = Array.from(elements).map(el => {
    const rect = el.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(el);
    
    // Skip hidden elements unless they're forms (which might be hidden initially)
    if (computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' ||
        computedStyle.opacity === '0') {
      if (el.tagName.toLowerCase() !== 'form') {
        return null;
      }
    }
    
    // Skip zero-size elements
    if (rect.width === 0 && rect.height === 0) {
      return null;
    }
    
    // Get Webflow-specific info
    const webflowClass = Array.from(el.classList || []).find(c => c.startsWith('w-'));
    const webflowInteraction = el.getAttribute('data-w-id') || el.getAttribute('data-ix');
    
    return {
      id: el.id || ('touchpoint-' + (++idCounter)),
      type: categorizeElement(el),
      tag: el.tagName.toLowerCase(),
      selector: generateSelector(el),
      text: (el.textContent || '').trim().slice(0, 200),
      href: el.href || null,
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      attributes: getRelevantAttributes(el),
      isVisible: isInViewport(rect),
      isAboveFold: isAboveFold(rect),
      zIndex: parseInt(computedStyle.zIndex) || 0,
      webflowClass: webflowClass || null,
      webflowInteraction: webflowInteraction || null
    };
  }).filter(Boolean);

  // Count by type
  const byType = touchpoints.reduce((acc, tp) => {
    acc[tp.type] = (acc[tp.type] || 0) + 1;
    return acc;
  }, {});

  // Generate warnings
  const ctaCount = touchpoints.filter(tp => tp.type === 'cta' && tp.isAboveFold).length;
  if (ctaCount === 0) {
    warnings.push('No CTA found above the fold');
  }
  
  const formsWithoutAction = touchpoints.filter(tp => 
    tp.type === 'form' && !tp.attributes['action'] && !tp.attributes['data-w-id']
  );
  if (formsWithoutAction.length > 0) {
    warnings.push('Form(s) found without action or Webflow handling');
  }
  
  const externalLinks = touchpoints.filter(tp => 
    tp.type === 'link' && tp.href && !tp.href.includes(window.location.hostname)
  );
  const noTargetBlank = externalLinks.filter(tp => tp.attributes.target !== '_blank');
  if (noTargetBlank.length > 0) {
    warnings.push('External link(s) without target="_blank": ' + noTargetBlank.length);
  }

  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    totalCount: touchpoints.length,
    byType,
    touchpoints,
    warnings
  };
})()
`;
