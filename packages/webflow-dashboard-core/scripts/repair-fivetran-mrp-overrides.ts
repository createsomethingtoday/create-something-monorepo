import Airtable from 'airtable';

const ASSETS_TABLE = 'tblRwzpWoLgE9MrUm';
const MRP_OVERRIDE_FIELD = '👀ℹ️MRP ID (Override)';
const NAME_FIELD = 'Name';
const STATUS_FIELD = '🚀Marketplace Status';
const PURCHASES_FIELD = '📋 Cumulative Purchases';
const REVENUE_FIELD = '📋 Cumulative Revenue';

interface AssetRow {
  id: string;
  name: string;
  status: string;
  mrpOverride: string;
  cumulativePurchases: number;
  cumulativeRevenue: number;
}

interface RepairDecision {
  key: string;
  keep: AssetRow | null;
  clear: AssetRow[];
  reason: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.join(',');
  return String(value ?? '').trim();
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isArchivedName(row: AssetRow): boolean {
  return /\barchived\b/i.test(row.name);
}

function isNonCanonical(row: AssetRow): boolean {
  const status = row.status.toLowerCase();
  return isArchivedName(row) || status.includes('delisted') || status.includes('rejected');
}

function isCurrentCandidate(row: AssetRow): boolean {
  if (isArchivedName(row)) return false;
  const status = row.status.toLowerCase();
  return status.includes('published') || status.includes('scheduled') || status.includes('upcoming');
}

function hasBuyerSignal(row: AssetRow): boolean {
  return row.cumulativePurchases > 0 || row.cumulativeRevenue > 0;
}

function decideRepair(key: string, rows: AssetRow[]): RepairDecision | null {
  const current = rows.filter(isCurrentCandidate);

  if (current.length === 1) {
    return {
      key,
      keep: current[0],
      clear: rows.filter((row) => row.id !== current[0].id),
      reason: 'single_current_candidate'
    };
  }

  const buyerSignal = rows.filter((row) => isCurrentCandidate(row) && hasBuyerSignal(row));
  if (buyerSignal.length === 1) {
    return {
      key,
      keep: buyerSignal[0],
      clear: rows.filter((row) => row.id !== buyerSignal[0].id),
      reason: 'single_current_buyer_signal'
    };
  }

  const nonArchived = rows.filter((row) => !isArchivedName(row));
  if (current.length === 0 && nonArchived.length === 1) {
    return {
      key,
      keep: nonArchived[0],
      clear: rows.filter((row) => row.id !== nonArchived[0].id),
      reason: 'single_non_archived_non_current'
    };
  }

  const allNonCanonical = rows.every(isNonCanonical);
  if (allNonCanonical && nonArchived.length === 0) {
    return {
      key,
      keep: null,
      clear: rows,
      reason: 'all_noncanonical'
    };
  }

  return null;
}

async function updateInBatches(
  table: Airtable.Table<Airtable.FieldSet>,
  rows: AssetRow[]
): Promise<void> {
  const batchSize = 10;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await table.update(
      batch.map((row) => ({
        id: row.id,
        fields: {
          [MRP_OVERRIDE_FIELD]: ''
        }
      }))
    );
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  const base = new Airtable({ apiKey: requireEnv('AIRTABLE_API_KEY') }).base(
    requireEnv('AIRTABLE_BASE_ID')
  );
  const table = base(ASSETS_TABLE);

  const records = await table
    .select({
      fields: [NAME_FIELD, STATUS_FIELD, MRP_OVERRIDE_FIELD, PURCHASES_FIELD, REVENUE_FIELD]
    })
    .all();

  const groups = new Map<string, AssetRow[]>();
  for (const record of records) {
    const mrpOverride = asText(record.fields[MRP_OVERRIDE_FIELD]);
    if (!mrpOverride) continue;

    const row: AssetRow = {
      id: record.id,
      name: asText(record.fields[NAME_FIELD]),
      status: asText(record.fields[STATUS_FIELD]),
      mrpOverride,
      cumulativePurchases: asNumber(record.fields[PURCHASES_FIELD]),
      cumulativeRevenue: asNumber(record.fields[REVENUE_FIELD])
    };

    groups.set(mrpOverride, [...(groups.get(mrpOverride) ?? []), row]);
  }

  const duplicateGroups = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  const repairable: RepairDecision[] = [];
  const ambiguous: Array<{ key: string; rows: AssetRow[] }> = [];

  for (const [key, rows] of duplicateGroups) {
    const decision = decideRepair(key, rows);
    if (decision && decision.clear.length > 0) {
      repairable.push(decision);
    } else {
      ambiguous.push({ key, rows });
    }
  }

  const rowsToClear = repairable.flatMap((decision) => decision.clear);

  if (apply && rowsToClear.length > 0) {
    await updateInBatches(table, rowsToClear);
  }

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        checkedAt: new Date().toISOString(),
        duplicateKeyCount: duplicateGroups.length,
        duplicateRecordCount: duplicateGroups.reduce((sum, [, rows]) => sum + rows.length, 0),
        repairableGroupCount: repairable.length,
        clearRecordCount: rowsToClear.length,
        ambiguousGroupCount: ambiguous.length,
        applied: apply,
        repairable: repairable.map((decision) => ({
          key: decision.key,
          reason: decision.reason,
          keep: decision.keep
            ? {
                id: decision.keep.id,
                name: decision.keep.name,
                status: decision.keep.status,
                cumulativePurchases: decision.keep.cumulativePurchases
              }
            : null,
          clear: decision.clear.map((row) => ({
            id: row.id,
            name: row.name,
            status: row.status,
            cumulativePurchases: row.cumulativePurchases
          }))
        })),
        ambiguous: ambiguous.map((group) => ({
          key: group.key,
          rows: group.rows.map((row) => ({
            id: row.id,
            name: row.name,
            status: row.status,
            cumulativePurchases: row.cumulativePurchases
          }))
        }))
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
