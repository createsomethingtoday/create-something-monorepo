/**
 * Webflow Apps Admin - Extension Popup
 * 
 * TODO: Implement extension functionality
 * For now, this is a placeholder that directs users to the console script.
 */

document.addEventListener('DOMContentLoaded', () => {
  const runAuditBtn = document.getElementById('runAudit');
  const viewResultsBtn = document.getElementById('viewResults');
  const downloadReportBtn = document.getElementById('downloadReport');
  const statusEl = document.getElementById('status');
  
  function showStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('error', isError);
    statusEl.classList.add('visible');
  }
  
  runAuditBtn.addEventListener('click', async () => {
    // Check if we're on the right page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('webflow.com/apps')) {
      showStatus('Please navigate to webflow.com/apps first', true);
      return;
    }
    
    showStatus('Opening DevTools console with audit script...');
    
    // For now, inject a message directing to console
    // TODO: Implement full script injection
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        console.log('%c🔧 Webflow Admin Tools', 'font-size: 18px; font-weight: bold;');
        console.log('To run the Client ID audit, paste the script from:');
        console.log('packages/webflow-admin-tools/src/console/client-id-audit.js');
        alert('Check the browser console for instructions.');
      }
    });
  });
  
  // Check for stored results
  chrome.storage.local.get(['lastAuditResults'], (result) => {
    if (result.lastAuditResults) {
      viewResultsBtn.disabled = false;
      downloadReportBtn.disabled = false;
    }
  });
});
