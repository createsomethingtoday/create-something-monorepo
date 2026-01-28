/**
 * Shared utilities for Webflow Apps Admin
 */

export * from './types';

/**
 * Configuration for the audit tool
 */
export const AUDIT_CONFIG = {
  RATE_LIMIT_MS: 500,
  LOAD_MORE_WAIT_MS: 1500,
  SELECTORS: {
    LOAD_MORE: '[data-automation-id="collection-list-load-more"]',
    APP_LINK: 'a[href^="/apps/detail/"]',
    CLIENT_ID: '#clientId',
    WORKSPACE_ID: '#workspaceId',
    APP_NAME: '#name',
    EDIT_BUTTON: 'a[data-automation-id="edit-app-button"]'
  }
} as const;

/**
 * Check if a Client ID appears to be a placeholder/test ID
 */
export function isPlaceholderClientId(clientId: string): boolean {
  // Known placeholder IDs from audit
  const KNOWN_PLACEHOLDERS = [
    'bf25dd81aaeb3a926deb42e1a984f19d0e9483120b440c90724d2722cea7a3d8'
  ];
  
  return KNOWN_PLACEHOLDERS.includes(clientId);
}

/**
 * Format a Client ID for display (truncated)
 */
export function formatClientId(clientId: string, length = 16): string {
  if (!clientId) return 'N/A';
  if (clientId.length <= length) return clientId;
  return `${clientId.substring(0, length)}...`;
}
