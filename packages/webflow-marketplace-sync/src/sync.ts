import { createRecord, findByWebflowRecordId, updateRecord } from './airtable';
import { logEvent } from './db';
import { diffRow, fieldsFromDiffs, mapItemToRow } from './mapping';
import type { AirtableRecord, Env, WebflowItem } from './types';

export function isLiveWriteMode(env: Env): boolean {
  return env.WRITE_MODE === 'live';
}

export interface UpsertResult {
  action: 'created' | 'updated' | 'noop' | 'shadow-create' | 'shadow-update';
  recordId?: string;
  changedFields?: string[];
}

/**
 * Upsert a Webflow item into the Airtable sync-log table, keyed on Webflow Record ID.
 *
 * Coexistence-safe: while the Whalesync leg is still active it may create the row
 * first (or concurrently); we re-check before creating and prefer update over create.
 * The downstream Airtable automation ("CMS Record Creation Trigger") fires on record
 * creation regardless of which client created the row.
 */
export async function upsertItem(
  env: Env,
  item: WebflowItem,
  triggerType: string,
  prefetched?: AirtableRecord[],
): Promise<UpsertResult> {
  const expected = mapItemToRow(item);
  const existing = prefetched ?? (await findByWebflowRecordId(env, item.id));

  if (existing.length === 0) {
    if (!isLiveWriteMode(env)) {
      await logEvent(env, { triggerType, itemId: item.id, action: 'shadow-create', detail: JSON.stringify(expected) });
      return { action: 'shadow-create' };
    }
    const record = await createRecord(env, expected as unknown as Record<string, unknown>);
    await logEvent(env, { triggerType, itemId: item.id, action: 'created', detail: record.id });
    return { action: 'created', recordId: record.id };
  }

  // Duplicates (e.g. a Whalesync race) — update the oldest row, leave the rest for the reconciler to report.
  const target = existing[0];
  const diffs = diffRow(expected, target);
  if (diffs.length === 0) {
    // Sweeps skip noop logging (hundreds per run); webhook noops are the soak-period
    // evidence that deliveries arrive and the mapping agrees with Whalesync.
    if (triggerType !== 'sweep' && triggerType !== 'full-scan') {
      await logEvent(env, { triggerType, itemId: item.id, action: 'noop', detail: target.id });
    }
    return { action: 'noop', recordId: target.id };
  }
  const changedFields = diffs.map((d) => d.field);
  if (!isLiveWriteMode(env)) {
    await logEvent(env, {
      triggerType,
      itemId: item.id,
      action: 'shadow-update',
      detail: JSON.stringify({ recordId: target.id, fields: fieldsFromDiffs(expected, diffs) }),
    });
    return { action: 'shadow-update', recordId: target.id, changedFields };
  }
  await updateRecord(env, target.id, fieldsFromDiffs(expected, diffs));
  await logEvent(env, { triggerType, itemId: item.id, action: 'updated', detail: changedFields.join(',') });
  return { action: 'updated', recordId: target.id, changedFields };
}
