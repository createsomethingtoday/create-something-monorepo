export type AirtableAutomationChanges = Record<string, unknown> | string;

const STATUS_EMOJI_PREFIX = /^\d[\uFE0F]?[\u20E3]?/u;
const STATUS_EMOJI_MARKERS = /🆕|📅|🚀|☠️|❌/gu;

const AIRTABLE_AUTOMATION_PAYLOAD_FIELDS = new Set([
  'ℹ️Description (Short)',
  'ℹ️Description (Long).html',
  'fld43LxLHMZb2yF7F',
  'fldzKxNCXcgCnEwxu',
  'fldneaPyoRXBAVtS1'
]);
const AIRTABLE_AUTOMATION_TRIGGER_TEXT_FIELDS = new Set(['ℹ️Description (Short)']);
const AIRTABLE_AUTOMATION_TRIGGER_IMAGE_FIELDS = new Set([
  'fld43LxLHMZb2yF7F',
  'fldzKxNCXcgCnEwxu'
]);

interface AirtableImageChange {
  added?: unknown[];
}

function normalizeAssetStatusForAutomation(status: string): string {
  return status.replace(STATUS_EMOJI_PREFIX, '').replace(STATUS_EMOJI_MARKERS, '').trim();
}

function hasAddedImages(change: unknown): boolean {
  if (!change || typeof change !== 'object') return false;

  const added = (change as AirtableImageChange).added;
  return Array.isArray(added) && added.length > 0;
}

export function extractAirtableAutomationChanges(
  changes: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(changes).filter(([fieldName]) => AIRTABLE_AUTOMATION_PAYLOAD_FIELDS.has(fieldName))
  );
}

// Restores the narrower v1 Airtable automation gate:
// only submitted/published-style assets with specific field changes should fan out.
export function wouldTriggerAirtableAutomation(
  assetStatus: string,
  changes: AirtableAutomationChanges
): boolean {
  if (normalizeAssetStatusForAutomation(assetStatus) === 'Upcoming') {
    return false;
  }

  if (typeof changes === 'string') {
    return changes.trim().length > 0;
  }

  const entries = Object.entries(extractAirtableAutomationChanges(changes));
  if (entries.length === 0) {
    return false;
  }

  return entries.some(([fieldName, change]) => {
    if (AIRTABLE_AUTOMATION_TRIGGER_TEXT_FIELDS.has(fieldName)) {
      return true;
    }

    if (AIRTABLE_AUTOMATION_TRIGGER_IMAGE_FIELDS.has(fieldName)) {
      return hasAddedImages(change);
    }

    return false;
  });
}
