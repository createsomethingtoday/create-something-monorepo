/**
 * Webflow Apps Admin - Background Service Worker
 * 
 * Handles extension lifecycle and message passing.
 */

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Webflow Apps Admin installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUDIT_COMPLETE') {
    // Store results
    chrome.storage.local.set({ 
      lastAuditResults: message.data,
      lastAuditTime: new Date().toISOString()
    });
    
    // Update badge
    const dupeCount = message.data?.duplicates?.clientId?.length || 0;
    if (dupeCount > 0) {
      chrome.action.setBadgeText({ text: String(dupeCount) });
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    } else {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#16a34a' });
    }
    
    sendResponse({ success: true });
  }
  
  return true; // Keep channel open for async response
});
