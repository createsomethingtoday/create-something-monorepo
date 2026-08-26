import process from 'node:process';

import {
  ASSET_COMPATIBILITY_ALIASES,
  CONFIRMED_ASSET_FIELDS,
  CONFIRMED_RELEASE_FIELDS,
  CONFIRMED_VERSION_FIELDS,
  CONFIRMED_WRITE_FIELD_IDS,
  DEFAULT_AIRTABLE_BASE_ID,
  FEATURED_ASSET_FIELDS,
  FEATURED_ASSET_FIELD_IDS,
  FEATURED_VOTE_FIELDS,
  FEATURED_VOTING_STATE_FIELDS,
  METRICS_ASSET_FIELD_IDS,
  TABLE_IDS,
} from '../src/schema.js';

type AirtableField = {
  id: string;
  name: string;
};

type AirtableTable = {
  id: string;
  name: string;
  fields: AirtableField[];
};

type AuditCheck = {
  label: string;
  missing: Array<[string, string]>;
};

function envOrThrow(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function diffFieldNames(label: string, expected: Record<string, string>, fields: AirtableField[]): AuditCheck {
  const liveNames = new Set(fields.map((field) => field.name));
  return {
    label,
    missing: Object.entries(expected).filter(([, fieldName]) => !liveNames.has(fieldName)),
  };
}

function diffFieldIds(label: string, expected: Record<string, string>, fields: AirtableField[]): AuditCheck {
  const liveIds = new Set(fields.map((field) => field.id));
  return {
    label,
    missing: Object.entries(expected).filter(([, fieldId]) => !liveIds.has(fieldId)),
  };
}

async function main() {
  const apiKey = envOrThrow('AIRTABLE_API_KEY');
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID;

  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable metadata request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { tables?: AirtableTable[] };
  const tables = new Map((data.tables ?? []).map((table) => [table.name, table]));

  const assetTable = tables.get('👛Assets');
  const versionTable = tables.get('🖌️Asset Versions');
  const releaseTable = tables.get('🚀Asset Releases');
  const votingStateTable = tables.get('🏗️Asset Voting State');
  const reviewerVotesTable = tables.get('🗳️Reviewer Votes');

  if (!assetTable || !versionTable || !releaseTable || !votingStateTable || !reviewerVotesTable) {
    throw new Error(
      `Missing expected tables. Found assets=${Boolean(assetTable)} versions=${Boolean(versionTable)} releases=${Boolean(releaseTable)} votingState=${Boolean(votingStateTable)} reviewerVotes=${Boolean(reviewerVotesTable)}`,
    );
  }

  const checks: AuditCheck[] = [
    diffFieldNames('assets.confirmed', CONFIRMED_ASSET_FIELDS, assetTable.fields),
    diffFieldNames('assets.compatibilityAliases', ASSET_COMPATIBILITY_ALIASES, assetTable.fields),
    diffFieldNames('versions.confirmed', CONFIRMED_VERSION_FIELDS, versionTable.fields),
    diffFieldNames('releases.confirmed', CONFIRMED_RELEASE_FIELDS, releaseTable.fields),
    diffFieldIds('assets.metricsFieldIds', METRICS_ASSET_FIELD_IDS, assetTable.fields),
    diffFieldNames('featured.assets', FEATURED_ASSET_FIELDS, assetTable.fields),
    diffFieldIds('featured.assetFieldIds', FEATURED_ASSET_FIELD_IDS, assetTable.fields),
    diffFieldNames('featured.votingState', FEATURED_VOTING_STATE_FIELDS, votingStateTable.fields),
    diffFieldNames('featured.votes', FEATURED_VOTE_FIELDS, reviewerVotesTable.fields),
    {
      label: 'writeFieldIds',
      missing: [
        ...Object.entries(CONFIRMED_WRITE_FIELD_IDS.assets)
          .filter(([, id]) => !assetTable.fields.some((field) => field.id === id))
          .map(([key, id]) => [`assets.${key}`, id] as [string, string]),
        ...Object.entries(CONFIRMED_WRITE_FIELD_IDS.versions)
          .filter(([, id]) => !versionTable.fields.some((field) => field.id === id))
          .map(([key, id]) => [`versions.${key}`, id] as [string, string]),
      ],
    },
  ];

  const tableIdDrift = Object.entries({
    assets: assetTable.id,
    assetVersions: versionTable.id,
    assetReleases: releaseTable.id,
    assetVotingState: votingStateTable.id,
    reviewerVotes: reviewerVotesTable.id,
  }).filter(([key, id]) => TABLE_IDS[key as keyof typeof TABLE_IDS] !== id);

  const result = {
    ok: checks.every((check) => check.missing.length === 0) && tableIdDrift.length === 0,
    baseId,
    tables: {
      configured: TABLE_IDS,
      live: {
        assets: assetTable.id,
        assetVersions: versionTable.id,
        assetReleases: releaseTable.id,
        assetVotingState: votingStateTable.id,
        reviewerVotes: reviewerVotesTable.id,
      },
    },
    checks,
    tableIdDrift,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
