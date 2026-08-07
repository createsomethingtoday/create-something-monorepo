import { findByWebflowRecordIds, listAllRecords } from './airtable';
import { finishRun, insertFindings, logEvent, startRun } from './db';
import { diffRow, isMalformedUniqueId, mapItemToRow } from './mapping';
import { upsertItem } from './sync';
import type { AirtableRecord, Env, Finding, WebflowItem } from './types';
import { listItems } from './webflow';

/**
 * Sweep: backstop for missed webhooks. Pages the Templates collection by
 * lastUpdated desc inside the window (capped at SWEEP_MAX_ITEMS — Whalesync's
 * own pushes bump lastUpdated broadly, so the window can hold thousands),
 * batch-fetches the matching Airtable rows, and upserts only the mismatches.
 */
export async function runSweep(env: Env): Promise<{ runId: number; scanned: number; findings: number; healed: number }> {
  const runId = await startRun(env, 'sweep');
  const windowHours = Number(env.SWEEP_WINDOW_HOURS) || 72;
  const maxItems = Number(env.SWEEP_MAX_ITEMS) || 500;
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  let scanned = 0;
  let findingsCount = 0;
  let healed = 0;
  const findings: Finding[] = [];
  try {
    let capped = false;
    const items = await listItems(env, {
      sortBy: 'lastUpdated',
      sortOrder: 'desc',
      shouldStop: (item) => {
        if (Date.parse(item.lastUpdated) < cutoff) return true;
        if (scanned >= maxItems) {
          capped = true;
          return true;
        }
        scanned += 1;
        return false;
      },
    });
    const rowsByItemId = await findByWebflowRecordIds(env, items.map((item) => item.id));
    if (capped) {
      // Silent caps read as full coverage — record that the window overflowed.
      await logEvent(env, { triggerType: 'sweep', itemId: '-', action: 'ignored', detail: `window exceeded SWEEP_MAX_ITEMS=${maxItems}` });
    }
    for (const item of items) {
      const result = await upsertItem(env, item, 'sweep', rowsByItemId.get(item.id) ?? []);
      if (result.action === 'noop') continue;
      findingsCount += 1;
      const healedNow = result.action === 'created' || result.action === 'updated';
      if (healedNow) healed += 1;
      findings.push({
        kind: result.action.includes('create') ? 'missing_row' : 'field_drift',
        itemId: item.id,
        airtableRecordId: result.recordId,
        field: result.changedFields?.join(','),
        healed: healedNow,
      });
    }
    await insertFindings(env, runId, findings);
    await finishRun(env, runId, { itemsScanned: scanned, rowsScanned: 0, findings: findingsCount, healed });
  } catch (error) {
    await finishRun(env, runId, {
      itemsScanned: scanned,
      rowsScanned: 0,
      findings: findingsCount,
      healed,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  return { runId, scanned, findings: findingsCount, healed };
}

/**
 * Full drift scan: enumerates every Webflow item and every Airtable sync-log row.
 *
 * Report-only for everything except sync-log heal (missing_row/field_drift) in live mode.
 * Airtable→Webflow content drift is deliberately NOT auto-healed: drift there is
 * bidirectional (see repo memory: creator edits live in Airtable, some live fixes exist
 * only in Webflow) — bulk-pushing either side over the other loses real data.
 */
export async function runFullScan(env: Env): Promise<{ runId: number; summary: Record<string, number> }> {
  const runId = await startRun(env, 'full');
  let items: WebflowItem[] = [];
  let rows: AirtableRecord[] = [];
  const findings: Finding[] = [];
  let healed = 0;
  try {
    items = await listItems(env, { pageDelayMs: 1100 });
    rows = await listAllRecords(env);

    const rowsByItemId = new Map<string, AirtableRecord[]>();
    for (const row of rows) {
      const itemId = String(row.fields['Webflow Record ID'] ?? '').trim();
      if (!itemId) continue;
      const bucket = rowsByItemId.get(itemId) ?? [];
      bucket.push(row);
      rowsByItemId.set(itemId, bucket);
    }
    const itemIds = new Set(items.map((item) => item.id));

    for (const item of items) {
      const expected = mapItemToRow(item);

      // Ticket class: malformed unique-id 404s the checkout/use-for-free CTA.
      if (isMalformedUniqueId(expected['MRP ID'])) {
        findings.push({ kind: 'malformed_unique_id', itemId: item.id, webflowValue: expected['MRP ID'] });
      }

      // Whalesync-health signal: the Airtable→Webflow row never landed for this item.
      if (item.lastPublished && item.fieldData?.['sync-last-updated'] == null) {
        findings.push({ kind: 'never_synced', itemId: item.id, webflowValue: expected.Slug });
      }

      const bucket = rowsByItemId.get(item.id) ?? [];
      if (bucket.length === 0) {
        const result = await upsertItem(env, item, 'full-scan', bucket);
        const healedNow = result.action === 'created';
        if (healedNow) healed += 1;
        findings.push({ kind: 'missing_row', itemId: item.id, healed: healedNow });
        continue;
      }
      const diffs = diffRow(expected, bucket[0]);
      // WF Last Updated drifts constantly between scans; only meaningful alongside other drift.
      const materialDiffs = diffs.filter((d) => d.field !== 'WF Last Updated');
      if (materialDiffs.length > 0) {
        const result = await upsertItem(env, item, 'full-scan', bucket);
        const healedNow = result.action === 'updated';
        if (healedNow) healed += 1;
        for (const diff of materialDiffs) {
          findings.push({
            kind: 'field_drift',
            itemId: item.id,
            airtableRecordId: bucket[0].id,
            field: diff.field,
            webflowValue: diff.webflowValue,
            airtableValue: diff.airtableValue,
            healed: healedNow,
          });
        }
      }
      // Duplicate rows for one item: report extras (never auto-delete).
      for (const extra of bucket.slice(1)) {
        findings.push({ kind: 'orphan_row', itemId: item.id, airtableRecordId: extra.id, airtableValue: 'duplicate row for item' });
      }
    }

    // Rows pointing at items that no longer exist (deleted templates). Report-only.
    for (const [itemId, bucket] of rowsByItemId) {
      if (itemIds.has(itemId)) continue;
      for (const row of bucket) {
        findings.push({ kind: 'orphan_row', itemId, airtableRecordId: row.id, airtableValue: 'item not found in Webflow' });
      }
    }

    await insertFindings(env, runId, capPerKind(findings, 500));
    await finishRun(env, runId, { itemsScanned: items.length, rowsScanned: rows.length, findings: findings.length, healed });
  } catch (error) {
    await finishRun(env, runId, {
      itemsScanned: items.length,
      rowsScanned: rows.length,
      findings: findings.length,
      healed,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const summary: Record<string, number> = {};
  for (const finding of findings) summary[finding.kind] = (summary[finding.kind] ?? 0) + 1;
  await notifySlack(env, runId, items.length, rows.length, summary, healed);
  return { runId, summary };
}

/**
 * Cap stored finding rows per kind so bulk classes (never_synced is ~11k rows —
 * essentially the whole collection lacks a Whalesync push timestamp) don't grow
 * D1 by thousands of rows per daily run. Run summaries keep the full counts.
 */
export function capPerKind(findings: Finding[], max: number): Finding[] {
  const seen = new Map<string, number>();
  return findings.filter((finding) => {
    const count = seen.get(finding.kind) ?? 0;
    if (count >= max) return false;
    seen.set(finding.kind, count + 1);
    return true;
  });
}

async function notifySlack(
  env: Env,
  runId: number,
  itemsScanned: number,
  rowsScanned: number,
  summary: Record<string, number>,
  healed: number,
): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) return;
  const lines = Object.entries(summary)
    .sort(([, a], [, b]) => b - a)
    .map(([kind, count]) => `• ${kind}: ${count}`);
  const text = [
    `Marketplace CMS sync — full drift scan #${runId} (${env.WRITE_MODE} mode)`,
    `Scanned ${itemsScanned} Webflow items / ${rowsScanned} Airtable rows. Healed: ${healed}.`,
    lines.length > 0 ? lines.join('\n') : 'No drift found.',
  ].join('\n');
  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Slack is best-effort; the report endpoint and D1 remain the source of truth.
  }
}
