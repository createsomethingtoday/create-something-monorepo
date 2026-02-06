/**
 * Performance Metrics Script
 * 
 * Extracts performance timing data and resource metrics.
 */

export const performanceScript = `
(() => {
  const timing = performance.timing || {};
  const entries = performance.getEntriesByType('resource') || [];
  
  // Calculate timing metrics
  const loadTime = timing.loadEventEnd - timing.navigationStart;
  const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
  
  // Get paint timings
  const paintEntries = performance.getEntriesByType('paint') || [];
  const firstPaint = paintEntries.find(e => e.name === 'first-paint')?.startTime || null;
  const firstContentfulPaint = paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || null;
  
  // Get LCP if available
  let largestContentfulPaint = null;
  try {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint') || [];
    if (lcpEntries.length > 0) {
      largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
    }
  } catch {
    // LCP not available
  }
  
  // Categorize resources
  const resourcesByType = {};
  let totalTransferSize = 0;
  
  entries.forEach(entry => {
    const type = entry.initiatorType || 'other';
    
    if (!resourcesByType[type]) {
      resourcesByType[type] = { count: 0, size: 0 };
    }
    
    resourcesByType[type].count++;
    resourcesByType[type].size += entry.transferSize || 0;
    totalTransferSize += entry.transferSize || 0;
  });
  
  // Webflow-specific resources
  let webflowScriptSize = 0;
  let interactionsScriptSize = 0;
  let customCodeSize = 0;
  
  entries.forEach(entry => {
    const url = entry.name.toLowerCase();
    const size = entry.transferSize || 0;
    
    if (url.includes('webflow') && url.endsWith('.js')) {
      webflowScriptSize += size;
    }
    if (url.includes('ix') || url.includes('interaction')) {
      interactionsScriptSize += size;
    }
    // Custom code is usually inline, but external custom scripts
    if (url.includes('custom') || url.includes('global')) {
      customCodeSize += size;
    }
  });
  
  // Count inline scripts
  const inlineScripts = document.querySelectorAll('script:not([src])');
  inlineScripts.forEach(script => {
    const content = script.textContent || '';
    customCodeSize += new Blob([content]).size;
  });
  
  return {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    loadTime: loadTime > 0 ? loadTime : null,
    domContentLoaded: domContentLoaded > 0 ? domContentLoaded : null,
    firstPaint,
    firstContentfulPaint,
    largestContentfulPaint,
    totalRequests: entries.length,
    totalTransferSize,
    resourcesByType,
    webflowScriptSize,
    interactionsScriptSize,
    customCodeSize
  };
})()
`;
