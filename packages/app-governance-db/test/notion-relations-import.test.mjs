import assert from 'node:assert/strict';
import test from 'node:test';

import {
  connectorExportsToNotionRows,
  extractRelationsFromNotionRows,
  normalizeNotionId,
} from '../scripts/sync-notion-relations.mjs';

test('Notion relation extraction normalizes page ids and orients client ownership', () => {
  assert.equal(normalizeNotionId('359fa874-0b15-8167-99c3-d05f8b892ea3'), '359fa8740b15816799c3d05f8b892ea3');

  const sourceRecords = [
    {
      id: 1,
      external_id: '359fa8740b15816799c3d05f8b892ea3',
      title: 'Cato Supply Inc.',
      canonical_type: 'client',
      source_external_id: 'clients-db',
    },
    {
      id: 2,
      external_id: '359fa8740b1581058193e9cfbc5f2f6e',
      title: 'Cato Supply - Webflow Insights CMS build',
      canonical_type: 'workflow',
      source_external_id: 'engagements-db',
    },
    {
      id: 3,
      external_id: '35ffa8740b158119ba7c9f421eb8754d',
      title: 'Timeline Health Agent',
      canonical_type: 'agent',
      source_external_id: 'agents-db',
    },
  ];

  const rows = [
    {
      id: '359fa874-0b15-8105-8193-e9cfbc5f2f6e',
      properties: {
        Name: { title: [{ plain_text: 'Cato Supply - Webflow Insights CMS build' }] },
        Client: { relation: [{ id: '359fa874-0b15-8167-99c3-d05f8b892ea3' }] },
        Agent: { relation: [{ id: '35ffa874-0b15-8119-ba7c-9f421eb8754d' }] },
      },
    },
  ];

  const extracted = extractRelationsFromNotionRows(rows, sourceRecords);

  assert.equal(extracted.missing_source_ids.length, 0);
  assert.equal(extracted.missing_target_ids.length, 0);
  assert.equal(extracted.relations.length, 2);
  assert.deepEqual(
    extracted.relations.map((relation) => ({
      source: relation.source_record_external_id,
      target: relation.target_record_external_id,
      kind: relation.relation_kind,
      evidence: relation.evidence_kind,
      confidence: relation.confidence,
    })),
    [
      {
        source: '359fa8740b15816799c3d05f8b892ea3',
        target: '359fa8740b1581058193e9cfbc5f2f6e',
        kind: 'owns',
        evidence: 'imported',
        confidence: 1,
      },
      {
        source: '359fa8740b1581058193e9cfbc5f2f6e',
        target: '35ffa8740b158119ba7c9f421eb8754d',
        kind: 'references',
        evidence: 'imported',
        confidence: 1,
      },
    ],
  );
  assert.match(extracted.relations[0].reason, /Notion relation property "Client"/);
});

test('Notion relation extraction accepts connector SQL rows with relation URL arrays', () => {
  assert.equal(
    normalizeNotionId('https://app.notion.com/p/359fa8740b1581058193e9cfbc5f2f6e'),
    '359fa8740b1581058193e9cfbc5f2f6e',
  );

  const sourceRecords = [
    {
      id: 1,
      external_id: '359fa8740b15816799c3d05f8b892ea3',
      title: 'Cato Supply Inc.',
      canonical_type: 'client',
      source_external_id: 'clients-db',
    },
    {
      id: 2,
      external_id: '359fa8740b1581058193e9cfbc5f2f6e',
      title: 'Cato Supply - Webflow Insights CMS build',
      canonical_type: 'workflow',
      source_external_id: 'engagements-db',
    },
    {
      id: 3,
      external_id: '35ffa8740b15810fa635ef2a25940568',
      title: 'Cato Insights CMS handoff and collection pages',
      canonical_type: 'deliverable',
      source_external_id: 'deliverables-db',
    },
  ];

  const rows = [
    {
      url: 'https://app.notion.com/359fa8740b1581058193e9cfbc5f2f6e',
      Name: 'Cato Supply - Webflow Insights CMS build',
      Client: '["https://app.notion.com/359fa8740b15816799c3d05f8b892ea3"]',
      Deliverables: '["https://app.notion.com/35ffa8740b15810fa635ef2a25940568"]',
    },
  ];

  const extracted = extractRelationsFromNotionRows(rows, sourceRecords);

  assert.equal(extracted.missing_source_ids.length, 0);
  assert.equal(extracted.missing_target_ids.length, 0);
  assert.deepEqual(
    extracted.relations.map((relation) => ({
      source: relation.source_record_external_id,
      target: relation.target_record_external_id,
      kind: relation.relation_kind,
      evidence: relation.evidence_kind,
    })),
    [
      {
        source: '359fa8740b15816799c3d05f8b892ea3',
        target: '359fa8740b1581058193e9cfbc5f2f6e',
        kind: 'owns',
        evidence: 'imported',
      },
      {
        source: '359fa8740b1581058193e9cfbc5f2f6e',
        target: '35ffa8740b15810fa635ef2a25940568',
        kind: 'corresponds_to',
        evidence: 'imported',
      },
    ],
  );
});

test('connector export normalization scopes SQL array parsing to relation properties', () => {
  const sourceRecords = [
    {
      id: 1,
      external_id: '359fa8740b15816799c3d05f8b892ea3',
      title: 'Cato Supply Inc.',
      canonical_type: 'client',
      source_external_id: 'clients-db',
    },
    {
      id: 2,
      external_id: '359fa8740b1581058193e9cfbc5f2f6e',
      title: 'Cato Supply - Webflow Insights CMS build',
      canonical_type: 'workflow',
      source_external_id: 'engagements-db',
    },
    {
      id: 3,
      external_id: 'not-a-page-user-id',
      title: 'Should not become a relation',
      canonical_type: 'unknown',
      source_external_id: 'users',
    },
  ];

  const rows = connectorExportsToNotionRows({
    connector_exports: [
      {
        name: 'Engagements',
        data_source_id: 'collection://d3873b66-762c-4f3a-bd9e-97267f58faf5',
        relation_properties: ['Client'],
        rows: [
          {
            url: 'https://app.notion.com/359fa8740b1581058193e9cfbc5f2f6e',
            Name: 'Cato Supply - Webflow Insights CMS build',
            Owner: '["not-a-page-user-id"]',
            Client: '["https://app.notion.com/359fa8740b15816799c3d05f8b892ea3"]',
          },
        ],
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].__relation_properties, ['Client']);
  assert.equal(rows[0].__source_external_id, 'd3873b66-762c-4f3a-bd9e-97267f58faf5');

  const extracted = extractRelationsFromNotionRows(rows, sourceRecords);

  assert.equal(extracted.missing_target_ids.length, 0);
  assert.equal(extracted.relations.length, 1);
  assert.deepEqual(
    extracted.relations.map((relation) => ({
      source: relation.source_record_external_id,
      target: relation.target_record_external_id,
      kind: relation.relation_kind,
    })),
    [
      {
        source: '359fa8740b15816799c3d05f8b892ea3',
        target: '359fa8740b1581058193e9cfbc5f2f6e',
        kind: 'owns',
      },
    ],
  );
});
