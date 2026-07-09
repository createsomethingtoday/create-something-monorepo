export const APP_GOVERNANCE_OPERATIONAL_SOURCE_TYPES = [
  'slack_channel',
  'slack_canvas',
  'airtable',
  'webflow_admin',
  'docs_repo',
  'zendesk'
];

export const NOTION_TRANSFER_SOURCE_TYPES = ['notion_database'];

export const APP_GOVERNANCE_ALL_SOURCE_TYPES = [
  ...APP_GOVERNANCE_OPERATIONAL_SOURCE_TYPES,
  ...NOTION_TRANSFER_SOURCE_TYPES
];

export const APP_GOVERNANCE_SOURCE_TYPES = APP_GOVERNANCE_OPERATIONAL_SOURCE_TYPES;

/** @param {readonly string[]} [sourceTypes] */
export function sourceTypePlaceholders(sourceTypes = APP_GOVERNANCE_SOURCE_TYPES) {
  return sourceTypes.map(() => '?').join(', ');
}
