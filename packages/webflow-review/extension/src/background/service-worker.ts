// Background Service Worker - Handles API communication and side panel

import type { ReviewPageRequest, ReviewPageResponse } from '../../../shared/types';

// Configuration
const API_BASE_URL = 'https://webflow-review-orchestrator.YOUR_SUBDOMAIN.workers.dev';

// Install listener
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Webflow Review] Extension installed');
});

// Action click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Check if we're on a Webflow page
  if (!tab.url?.includes('webflow.com') && !tab.url?.includes('webflow.io')) {
    console.log('[Webflow Review] Not on a Webflow page');
    return;
  }

  // Open side panel
  await chrome.sidePanel.open({ tabId: tab.id });

  // Send message to content script to get page URL
  chrome.tabs.sendMessage(tab.id, { action: 'getPageUrl' });
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startReview') {
    handleStartReview(message.url, message.projectId)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.action === 'getSettings') {
    handleGetSettings()
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  if (message.action === 'saveSettings') {
    handleSaveSettings(message.settings)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  }

  return false;
});

// Start review
async function handleStartReview(url: string, projectId: string) {
  try {
    // Get settings
    const settings = await getSettings();
    const apiUrl = settings.apiUrl || API_BASE_URL;

    // Make API request
    const request: ReviewPageRequest = {
      url,
      checks: settings.enabledChecks || ['seo', 'links'],
    };

    const response = await fetch(`${apiUrl}/api/review/page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey && { 'X-API-Key': settings.apiKey }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result: ReviewPageResponse = await response.json();

    return {
      success: true,
      findings: result.findings,
      score: result.score,
      duration: result.duration,
    };
  } catch (error) {
    console.error('[Webflow Review] Review failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get settings from storage
async function handleGetSettings() {
  return await getSettings();
}

async function getSettings() {
  const result = await chrome.storage.sync.get([
    'apiUrl',
    'apiKey',
    'enabledChecks',
    'autoReview',
  ]);

  return {
    apiUrl: result.apiUrl || API_BASE_URL,
    apiKey: result.apiKey || '',
    enabledChecks: result.enabledChecks || ['seo', 'links'],
    autoReview: result.autoReview !== false, // Default true
  };
}

// Save settings to storage
async function handleSaveSettings(settings: any) {
  await chrome.storage.sync.set(settings);
  return { success: true };
}

// Tab update listener - auto-review if enabled
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url?.includes('webflow.com')) return;

  // Check if auto-review is enabled
  const settings = await getSettings();
  if (!settings.autoReview) return;

  // Get page URL from content script
  chrome.tabs.sendMessage(tabId, { action: 'getPageUrl' }, (response) => {
    if (response?.url) {
      handleStartReview(response.url, 'auto')
        .then((result) => {
          // Send result to side panel if open
          chrome.runtime.sendMessage({
            action: 'reviewComplete',
            result,
          });
        });
    }
  });
});
