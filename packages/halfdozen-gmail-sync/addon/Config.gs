/**
 * Half Dozen Gmail Sync - Add-on Configuration
 *
 * Secrets are stored in Script Properties (Project Settings > Script Properties).
 * Required properties:
 *   ADDON_SECRET  - Shared secret for authenticating with the worker API
 *   TEAM_EMAILS   - Comma-separated team email addresses (for inbound/outbound detection)
 */

/**
 * Get configuration. Reads from Script Properties on first call, then caches.
 */
function getConfig() {
  var props = PropertiesService.getScriptProperties();

  return {
    WORKER_URL: 'https://halfdozen-gmail-sync-mcp.half-dozen.workers.dev',
    ADDON_SECRET: props.getProperty('ADDON_SECRET') || '',
    TEAM_EMAILS: (props.getProperty('TEAM_EMAILS') || '').split(',').map(function(e) {
      return e.trim().toLowerCase();
    }).filter(Boolean),
  };
}

/**
 * Make an authenticated request to the worker API.
 *
 * @param {string} endpoint - API path (e.g., '/api/sync')
 * @param {Object} payload - JSON body
 * @returns {Object} Parsed JSON response
 */
function workerFetch(endpoint, payload) {
  var config = getConfig();

  if (!config.ADDON_SECRET) {
    throw new Error('ADDON_SECRET not set. Go to Project Settings > Script Properties and add it.');
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + config.ADDON_SECRET,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(config.WORKER_URL + endpoint, options);
  var code = response.getResponseCode();
  var body = JSON.parse(response.getContentText());

  if (code === 401) {
    throw new Error('Unauthorized. Check that ADDON_SECRET matches the worker secret.');
  }

  if (code >= 400) {
    throw new Error(body.error || 'API error: ' + code);
  }

  return body;
}

/**
 * Determine if an email is outbound (sent by a team member).
 *
 * @param {string} fromEmail - Sender's email address
 * @returns {string} 'Outbound' or 'Inbound'
 */
function detectDirection(fromEmail) {
  var config = getConfig();
  return config.TEAM_EMAILS.indexOf(fromEmail.toLowerCase()) !== -1 ? 'Outbound' : 'Inbound';
}
