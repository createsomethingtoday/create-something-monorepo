import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import Ajv2020 from 'ajv/dist/2020.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const contractRoot = join(packageRoot, 'contracts', 'business-digital-thread', 'v1');
const examplesRoot = join(contractRoot, 'examples');
const schemaPath = join(contractRoot, 'schema.json');
const verifierSpecPath = join(contractRoot, 'verifier-spec.json');
const performanceBaselinePath = join(contractRoot, 'performance-baseline.json');
const HASH_ZERO = '0'.repeat(64);
const HASH_ONE = '1'.repeat(64);

const args = new Set(process.argv.slice(2));
const writeMode = args.has('--write');
const benchmarkMode = args.has('--benchmark');

function digest(value) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

function instant(value) {
  return new Date(value).toISOString().replace('.000Z', 'Z');
}

function addUtcMonths(value, months) {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return instant(date);
}

function id(kind, key) {
  return `bdt:cs:${kind}:${key}`;
}

function revisionId(kind, key, revision = 1) {
  return `bdtr:cs:${kind}:${key}:r${revision}`;
}

function source(key) {
  return {
    provider: 'contract-prototype',
    externalId: key,
    observedAt: '2020-01-01T00:00:00Z',
    adapterId: 'adapter.contract-prototype.v1',
    artifactRef:
      'packages/database-layer/contracts/business-digital-thread/v1/examples/lifecycle-slice.json',
    evidenceRefs: ['CRE-1401']
  };
}

function record(kind, key, title, payload, options = {}) {
  const revision = options.revision ?? 1;
  return {
    id: id(kind, key),
    revisionId: revisionId(kind, key, revision),
    tenantId: 'tenant:create-something',
    kind,
    title,
    validTime: options.validTime ?? { from: '2016-01-01T00:00:00Z', to: null },
    recordedTime: options.recordedTime ?? { from: '2020-01-01T00:00:00Z', to: null },
    ...(options.supersedesRevisionId ? { supersedesRevisionId: options.supersedesRevisionId } : {}),
    ...(options.correctsRevisionId ? { correctsRevisionId: options.correctsRevisionId } : {}),
    source: source(`${kind}:${key}:r${revision}`),
    payload,
    integrity: {
      algorithm: 'sha256',
      contentHash: digest({ kind, key, revision, payload }),
      ...(revision > 1
        ? { previousRevisionHash: digest({ kind, key, revision: revision - 1 }) }
        : {})
    }
  };
}

function link(type, key, subjectId, objectId, relationshipClass = 'traceability', options = {}) {
  const revision = options.revision ?? 1;
  return {
    id: `bdtl:cs:${type}:${key}`,
    revisionId: `bdtlr:cs:${type}:${key}:r${revision}`,
    tenantId: 'tenant:create-something',
    relationshipClass,
    type,
    subjectId,
    objectId,
    role: options.role ?? type,
    scope: options.scope ?? 'business-thread-v1',
    ...(options.authorityGrantId ? { authorityGrantId: options.authorityGrantId } : {}),
    validTime: options.validTime ?? { from: '2016-01-01T00:00:00Z', to: null },
    recordedTime: options.recordedTime ?? { from: '2020-01-01T00:00:00Z', to: null },
    source: source(`link:${type}:${key}:r${revision}`),
    integrity: {
      algorithm: 'sha256',
      contentHash: digest({ type, key, revision, subjectId, objectId })
    }
  };
}

function buildLifecycleExample() {
  const businessId = id('business', 'create-something');
  const orgId = id('party', 'create-something-org');
  const ownerId = id('party', 'operator-old');
  const ownerNewId = id('party', 'operator-new');
  const vendorOldId = id('party', 'vendor-old');
  const vendorNewId = id('party', 'vendor-new');
  const agentOldId = id('party', 'agent-model-old');
  const agentNewId = id('party', 'agent-model-new');
  const toolOldId = id('party', 'tool-old');
  const toolNewId = id('party', 'tool-new');
  const initiativeId = id('initiative', 'business-thread');
  const policyId = id('policy', 'governance');
  const grantId = id('authority_grant', 'operator-approval');
  const intentId = id('intent', 'durable-business');
  const requirementId = id('requirement', 'historical-reconstruction');
  const interfaceId = id('interface', 'substrate-adapter');
  const decisionId = id('decision', 'bitemporal-contract');
  const riskId = id('risk', 'future-leakage');
  const workProductId = id('work_product', 'canonical-module');
  const baselineId = id('baseline', 'v1-approved');
  const verificationId = id('verification', 'contract-check');
  const operationId = id('operation', 'local-dogfood');
  const receiptId = id('receipt', 'local-dogfood-proof');
  const releaseId = id('release', 'local-v1');
  const incidentId = id('incident', 'future-leak-detected');
  const retentionId = id('retention_policy', 'operator-selected');
  const dataProductId = id('data_product', 'thread-export');
  const legalHoldId = id('legal_hold', 'example-hold');
  const dispositionId = id('disposition', 'example-derived-proof');
  const migrationId = id('migration', 'v0-to-v1');
  const lessonId = id('lesson', 'require-known-at');
  const changeId = id('change', 'apply-known-at');

  const records = [
    record('business', 'create-something', 'CREATE SOMETHING', {
      canonicalName: 'CREATE SOMETHING',
      lifecycleState: 'active',
      aliases: ['CREATE SOMETHING LLC']
    }),
    record('party', 'create-something-org', 'CREATE SOMETHING organization', {
      partyType: 'organization',
      displayName: 'CREATE SOMETHING',
      lifecycleState: 'active',
      externalReferences: []
    }),
    record('party', 'operator-old', 'Original operator', {
      partyType: 'person',
      displayName: 'Original operator',
      lifecycleState: 'replaced',
      externalReferences: []
    }),
    record('party', 'operator-new', 'Successor operator', {
      partyType: 'person',
      displayName: 'Successor operator',
      lifecycleState: 'active',
      externalReferences: []
    }),
    record('party', 'vendor-old', 'Original vendor', {
      partyType: 'vendor',
      displayName: 'Original vendor',
      lifecycleState: 'replaced',
      externalReferences: []
    }),
    record('party', 'vendor-new', 'Successor vendor', {
      partyType: 'vendor',
      displayName: 'Successor vendor',
      lifecycleState: 'active',
      externalReferences: []
    }),
    record('party', 'agent-model-old', 'Original agent model', {
      partyType: 'agent',
      displayName: 'Original agent model',
      lifecycleState: 'replaced',
      externalReferences: []
    }),
    record('party', 'agent-model-new', 'Successor agent model', {
      partyType: 'agent',
      displayName: 'Successor agent model',
      lifecycleState: 'active',
      externalReferences: []
    }),
    record('party', 'tool-old', 'Original domain tool', {
      partyType: 'tool',
      displayName: 'Original domain tool',
      lifecycleState: 'replaced',
      externalReferences: []
    }),
    record('party', 'tool-new', 'Successor domain tool', {
      partyType: 'tool',
      displayName: 'Successor domain tool',
      lifecycleState: 'active',
      externalReferences: []
    }),
    record('initiative', 'business-thread', 'Business Digital Thread program', {
      initiativeType: 'program',
      businessId,
      ownerPartyId: ownerNewId,
      state: 'active'
    }),
    record('policy', 'governance', 'Business thread governance policy', {
      policyType: 'authority',
      statement: 'Explicit scoped grants govern changes.',
      ownerPartyId: orgId,
      approvalAuthorityId: ownerId,
      state: 'approved'
    }),
    record(
      'authority_grant',
      'operator-approval',
      'Original approval grant',
      {
        subjectId: ownerId,
        representedPartyId: orgId,
        capabilities: ['baseline.approve'],
        objectScope: {
          recordIds: [baselineId],
          recordKinds: ['baseline'],
          selector: `id == ${baselineId}`
        },
        issuedById: orgId,
        policyRevisionId: revisionId('policy', 'governance'),
        delegable: false,
        status: 'active'
      },
      {
        validTime: { from: '2018-01-01T00:00:00Z', to: '2020-06-01T00:00:00Z' },
        recordedTime: { from: '2018-01-01T00:00:00Z', to: null }
      }
    ),
    record(
      'authority_grant',
      'operator-approval',
      'Revoked approval grant',
      {
        subjectId: ownerId,
        representedPartyId: orgId,
        capabilities: ['baseline.approve'],
        objectScope: {
          recordIds: [baselineId],
          recordKinds: ['baseline'],
          selector: `id == ${baselineId}`
        },
        issuedById: orgId,
        policyRevisionId: revisionId('policy', 'governance'),
        delegable: false,
        status: 'revoked',
        revokedAt: '2020-06-01T00:00:00Z',
        revocationReason: 'Responsibility transferred.'
      },
      {
        revision: 2,
        validTime: { from: '2020-06-01T00:00:00Z', to: '2021-01-01T00:00:00Z' },
        recordedTime: { from: '2020-06-01T00:00:00Z', to: null },
        supersedesRevisionId: revisionId('authority_grant', 'operator-approval')
      }
    ),
    record('intent', 'durable-business', 'Preserve durable business context', {
      statement: 'Preserve business context through organizational and tool replacement.',
      successMeasures: ['Historical reconstruction', 'Bidirectional proof'],
      ownerPartyId: orgId,
      state: 'approved'
    }),
    record('requirement', 'historical-reconstruction', 'Historical reconstruction requirement', {
      statement: 'The system shall reconstruct valid and known state without future leakage.',
      requirementType: 'functional',
      priority: 'must',
      ownerPartyId: ownerNewId,
      verificationMethod: 'test',
      state: 'verified'
    }),
    record('interface', 'substrate-adapter', 'Substrate adapter interface', {
      providerId: toolNewId,
      consumerId: initiativeId,
      direction: 'bidirectional',
      protocol: 'JSON',
      schemaRef: 'flow.business-digital-thread.v1',
      version: '1.0.0',
      compatibilityWindow: { from: '2020-01-01T00:00:00Z', to: null },
      constraints: ['Loss must be explicit', 'Tenant scope required'],
      approvalMode: 'bilateral',
      state: 'approved'
    }),
    record('decision', 'bitemporal-contract', 'Adopt bitemporal contract', {
      question: 'How should history be represented?',
      intendedOutcome: 'Prevent future-state leakage.',
      authorityGrantId: grantId,
      alternatives: [
        {
          id: 'present-only',
          summary: 'Timestamp current topology',
          assessment: 'Cannot reconstruct knowledge state.'
        },
        {
          id: 'bitemporal',
          summary: 'Use valid and recorded intervals',
          assessment: 'Preserves effective and known state.'
        }
      ],
      criteria: ['Historical fidelity', 'Replaceable adapters'],
      assumptions: ['UTC timestamps'],
      uncertainty: 'Storage implementation is deferred.',
      recommendation: 'Use bitemporal immutable revisions.',
      disposition: 'Accepted for v1.',
      rationale: 'It is the smallest model that prevents future leakage.',
      state: 'approved'
    }),
    record('risk', 'future-leakage', 'Future-state leakage risk', {
      statement: 'A historical view could use knowledge recorded later.',
      likelihood: 'medium',
      consequence: 'high',
      ownerPartyId: ownerNewId,
      mitigation: 'Require validAt and knownAt in every query.',
      state: 'mitigated'
    }),
    record('work_product', 'canonical-module', 'Canonical semantic module', {
      workProductType: 'code',
      artifactRef: 'packages/database-layer/src/business-digital-thread.ts',
      ownerPartyId: ownerNewId,
      state: 'accepted'
    }),
    record('baseline', 'v1-approved', 'Approved v1 baseline', {
      baselineType: 'business',
      memberRevisionIds: [
        revisionId('intent', 'durable-business'),
        revisionId('requirement', 'historical-reconstruction'),
        revisionId('interface', 'substrate-adapter'),
        revisionId('decision', 'bitemporal-contract'),
        revisionId('work_product', 'canonical-module'),
        revisionId('policy', 'governance')
      ],
      approvalGrantIds: [grantId],
      approvedAt: '2020-05-01T00:00:00Z',
      state: 'approved'
    }),
    record('verification', 'contract-check', 'Contract verification', {
      verificationType: 'verification',
      requirementIds: [requirementId],
      baselineId,
      method: 'test',
      outcome: 'pass',
      evidenceRefs: ['pnpm business-thread:verify'],
      executedAt: '2020-05-02T00:00:00Z'
    }),
    record('operation', 'local-dogfood', 'Local dogfood operation', {
      operationType: 'run',
      baselineId,
      authorityGrantId: grantId,
      startedAt: '2020-05-03T00:00:00Z',
      completedAt: '2020-05-03T01:00:00Z',
      outcome: 'succeeded'
    }),
    record('receipt', 'local-dogfood-proof', 'Local dogfood proof receipt', {
      receiptType: 'verification',
      actorId: ownerId,
      authorityGrantId: grantId,
      policyRevisionId: revisionId('policy', 'governance'),
      inputHash: HASH_ZERO,
      action: 'Run local dogfood verifier.',
      verifier: 'business-thread:verify',
      outcome: 'succeeded',
      evidenceRefs: ['local://verification-report'],
      recoveryOrDisposition: 'Re-run from clean export.'
    }),
    record('release', 'local-v1', 'Local v1 release', {
      baselineId,
      environment: 'local-dogfood',
      releasedAt: '2020-05-03T01:00:00Z',
      operationIds: [operationId],
      receiptIds: [receiptId],
      state: 'released'
    }),
    record('incident', 'future-leak-detected', 'Future-state leakage detected', {
      severity: 'high',
      detectedAt: '2020-05-04T00:00:00Z',
      affectedRecordIds: [requirementId, verificationId],
      containment: 'Blocked historical projection.',
      recovery: 'Required explicit knownAt.',
      state: 'closed'
    }),
    record('retention_policy', 'operator-selected', 'Operator-selected retention mechanism', {
      retentionClass: 'operator_selected_example',
      allowedOutcomes: [
        'retain',
        'archive',
        'redact',
        'delete',
        'tombstone',
        'preserve_derived_proof'
      ],
      defaultOutcome: 'archive',
      authorityPartyId: orgId,
      policyBasisRef: 'operator-approval-required',
      reviewAt: '2021-01-01T00:00:00Z'
    }),
    record('data_product', 'thread-export', 'Business thread export', {
      ownerPartyId: orgId,
      classification: 'internal',
      schemaRef: 'flow.business-digital-thread.v1',
      format: 'application/json',
      authoritativeCopyRef: 'substrate://business-thread/create-something',
      accessPolicyRevisionId: revisionId('policy', 'governance'),
      retentionPolicyId: retentionId,
      successorId: toolNewId,
      legacyReaderRef: 'adapter.business-thread.v0-reader'
    }),
    record('legal_hold', 'example-hold', 'Example legal hold', {
      targetRecordIds: [dataProductId],
      issuedById: orgId,
      authorityGrantId: grantId,
      reason: 'Exercise conflict handling without choosing production policy.',
      state: 'active'
    }),
    record('disposition', 'example-derived-proof', 'Preserve non-revealing derived proof', {
      targetRecordIds: [dataProductId],
      outcome: 'preserve_derived_proof',
      policyRevisionId: revisionId('policy', 'governance'),
      authorityGrantId: grantId,
      legalHoldIds: [legalHoldId],
      executedAt: '2020-05-05T00:00:00Z',
      derivedProof: { preserved: true, nonRevealingHash: HASH_ONE, containsRawContent: false }
    }),
    record('migration', 'v0-to-v1', 'Legacy v0 to v1 migration', {
      fromSchemaVersion: 'flow.business-digital-thread.v0',
      toSchemaVersion: 'flow.business-digital-thread.v1',
      transformId: 'business-thread-v0-to-v1',
      inputHash: HASH_ZERO,
      outputHash: HASH_ONE,
      counts: { read: 3, written: 3, redacted: 0, deleted: 0, unmapped: 0 },
      losses: [],
      receiptId
    }),
    record('lesson', 'require-known-at', 'Require explicit knowledge time', {
      sourceRecordIds: [incidentId, receiptId],
      lifecycleState: 'effectiveness_reviewed',
      statement: 'Historical queries must require knownAt to prevent future evidence leakage.',
      reviewAuthorityId: ownerNewId,
      disseminationTargetIds: [initiativeId, policyId],
      applicationTargetIds: [changeId, requirementId],
      effectivenessVerificationId: verificationId
    }),
    record('change', 'apply-known-at', 'Apply explicit knownAt requirement', {
      targetRecordIds: [requirementId, interfaceId],
      proposedById: ownerNewId,
      authorityGrantId: grantId,
      rationale: 'Apply the future-leakage lesson.',
      impact: {
        affectedRecordIds: [requirementId, interfaceId, workProductId],
        ownerPartyIds: [ownerNewId],
        requiredVerificationIds: [verificationId],
        riskIds: [riskId],
        downstreamEvidenceIds: [receiptId],
        unresolvedApprovalIds: [],
        migration: 'No stored-data migration for prototype.',
        rollback: 'Restore prior adapter contract.'
      },
      state: 'implemented'
    })
  ];

  const links = [
    link('contains', 'business-initiative', businessId, initiativeId, 'governance'),
    link('owned_by', 'initiative-owner', initiativeId, ownerNewId, 'governance'),
    link('assigned_to', 'owner-org', ownerId, orgId, 'participant'),
    link('decomposes', 'intent-requirement', intentId, requirementId),
    link('constrained_by', 'requirement-interface', requirementId, interfaceId),
    link('decided_by', 'interface-decision', interfaceId, decisionId),
    link('included_in_baseline', 'decision-baseline', decisionId, baselineId, 'governance'),
    link('implements', 'work-product-baseline', workProductId, baselineId),
    link('evidenced_by', 'work-product-verification', workProductId, verificationId, 'provenance'),
    link('verifies', 'verification-requirement', verificationId, requirementId),
    link('evidenced_by', 'operation-verification', operationId, verificationId, 'provenance'),
    link('evidenced_by', 'operation-receipt', operationId, receiptId, 'provenance'),
    link('learned_from', 'lesson-receipt', lessonId, receiptId, 'provenance'),
    link('learned_from', 'lesson-incident', lessonId, incidentId, 'provenance'),
    link('applied_to', 'lesson-change', lessonId, changeId),
    link('changes', 'change-requirement', changeId, requirementId, 'governance'),
    link('impacts', 'change-interface', changeId, interfaceId),
    link('governed_by', 'data-retention', dataProductId, retentionId, 'governance'),
    link('held_by', 'data-hold', dataProductId, legalHoldId, 'governance'),
    link('disposed_by', 'data-disposition', dataProductId, dispositionId, 'governance'),
    link('migrated_from', 'migration-data', dataProductId, migrationId, 'provenance'),
    link('replaces', 'person-replacement', ownerNewId, ownerId, 'lifecycle'),
    link('replaces', 'vendor-replacement', vendorNewId, vendorOldId, 'lifecycle'),
    link('replaces', 'agent-replacement', agentNewId, agentOldId, 'lifecycle'),
    link('replaces', 'tool-replacement', toolNewId, toolOldId, 'lifecycle')
  ];

  return {
    schemaVersion: 'flow.business-digital-thread.v1',
    threadId: id('thread', 'create-something'),
    tenantId: 'tenant:create-something',
    businessId,
    recordedAt: '2020-06-01T00:00:00Z',
    records,
    links,
    provenance: {
      inputMode: 'deterministic_fixture',
      generator: 'verify-business-digital-thread-contract.mjs',
      generatorVersion: '1.0.0',
      authoritativeInputs: []
    },
    exportManifest: {
      manifestVersion: 'flow.business-digital-thread.export.v1',
      exportedAt: '2020-06-01T00:00:00Z',
      sourceThreadId: id('thread', 'create-something'),
      recordRevisionCount: records.length,
      linkRevisionCount: links.length,
      adapters: [
        {
          adapterId: 'adapter.contract-prototype.v1',
          version: '1.0.0',
          sourceNamespace: 'contract-prototype',
          supportedSchemaRange: 'flow.business-digital-thread.v1',
          lossPolicy: 'lossless',
          replacementStrategy:
            'Replace adapter while preserving canonical IDs and emit a migration receipt.'
        }
      ],
      semanticQuerySet: 'bdt-semantic-oracle-v1',
      canonicalDigest: digest({
        records: records.map((item) => item.revisionId),
        links: links.map((item) => item.revisionId)
      })
    },
    integrity: {
      algorithm: 'sha256',
      canonicalization: 'JCS-RFC8785',
      recordsRootHash: digest(records.map((item) => item.integrity.contentHash)),
      linksRootHash: digest(links.map((item) => item.integrity.contentHash)),
      semanticDigest: digest({ baselineId, requirementId, verificationId, lessonId, changeId })
    }
  };
}

function buildInvalidExamples(validExample) {
  return {
    'invalid-present-only.json': {
      schemaVersion: 'flow.topology.current.v1',
      generatedAt: '2026-07-23T18:00:00Z',
      nodes: [{ id: 'current-node', updatedAt: '2026-07-23T18:00:00Z' }],
      edges: []
    },
    'invalid-untyped-audit-log.json': {
      schemaVersion: 'flow.business-digital-thread.v1',
      threadId: validExample.threadId,
      tenantId: validExample.tenantId,
      businessId: validExample.businessId,
      recordedAt: validExample.recordedAt,
      records: [
        {
          id: 'bdt:cs:event:approved',
          revisionId: 'bdtr:cs:event:approved:r1',
          tenantId: validExample.tenantId,
          kind: 'event',
          title: 'Something was approved',
          validTime: { from: validExample.recordedAt, to: null },
          recordedTime: { from: validExample.recordedAt, to: null },
          source: source('untyped-event'),
          payload: { data: { arbitrary: true } },
          integrity: { algorithm: 'sha256', contentHash: HASH_ZERO }
        }
      ],
      links: [],
      provenance: validExample.provenance,
      exportManifest: {
        ...validExample.exportManifest,
        recordRevisionCount: 1,
        linkRevisionCount: 0
      },
      integrity: validExample.integrity
    },
    'invalid-hand-authored-success.json': {
      ...validExample,
      provenance: {
        inputMode: 'authoritative',
        generator: '',
        generatorVersion: '1.0.0',
        authoritativeInputs: []
      },
      exportManifest: {
        ...validExample.exportManifest,
        semanticQuerySet: '',
        canonicalDigest: HASH_ZERO
      }
    }
  };
}

function intervalContains(intervalValue, timestamp) {
  const value = Date.parse(timestamp);
  return (
    Date.parse(intervalValue.from) <= value &&
    (intervalValue.to === null || value < Date.parse(intervalValue.to))
  );
}

function validateIntervals(items) {
  for (const item of items) {
    for (const key of ['validTime', 'recordedTime']) {
      const intervalValue = item[key];
      assert.ok(
        Date.parse(intervalValue.from) <
          (intervalValue.to === null ? Infinity : Date.parse(intervalValue.to)),
        `${item.revisionId} has invalid ${key}`
      );
    }
  }
}

function validateSemanticExample(example, verifierSpec) {
  assert.equal(example.exportManifest.recordRevisionCount, example.records.length);
  assert.equal(example.exportManifest.linkRevisionCount, example.links.length);
  assert.ok(
    example.records.some((item) => item.id === example.businessId && item.kind === 'business')
  );

  const recordRevisionIds = new Set();
  const linkRevisionIds = new Set();
  const canonicalIds = new Set(example.records.map((item) => item.id));
  for (const item of example.records) {
    assert.equal(item.tenantId, example.tenantId, `${item.revisionId} crosses tenant boundary`);
    assert.ok(
      !recordRevisionIds.has(item.revisionId),
      `duplicate record revision ${item.revisionId}`
    );
    recordRevisionIds.add(item.revisionId);
  }
  for (const item of example.links) {
    assert.equal(item.tenantId, example.tenantId, `${item.revisionId} crosses tenant boundary`);
    assert.ok(!linkRevisionIds.has(item.revisionId), `duplicate link revision ${item.revisionId}`);
    linkRevisionIds.add(item.revisionId);
    assert.ok(canonicalIds.has(item.subjectId), `missing link subject ${item.subjectId}`);
    assert.ok(canonicalIds.has(item.objectId), `missing link object ${item.objectId}`);
  }
  validateIntervals([...example.records, ...example.links]);

  const kinds = new Set(example.records.map((item) => item.kind));
  assert.deepEqual(
    [...verifierSpec.fixture.requiredLifecycleFamilies].filter((kind) => !kinds.has(kind)),
    []
  );

  const linkPairs = new Set(example.links.map((item) => `${item.subjectId}|${item.objectId}`));
  const chainKeys = [
    ['intent', 'durable-business', 'requirement', 'historical-reconstruction'],
    ['requirement', 'historical-reconstruction', 'interface', 'substrate-adapter'],
    ['interface', 'substrate-adapter', 'decision', 'bitemporal-contract'],
    ['decision', 'bitemporal-contract', 'baseline', 'v1-approved'],
    ['work_product', 'canonical-module', 'baseline', 'v1-approved'],
    ['work_product', 'canonical-module', 'verification', 'contract-check'],
    ['operation', 'local-dogfood', 'receipt', 'local-dogfood-proof'],
    ['lesson', 'require-known-at', 'change', 'apply-known-at']
  ];
  for (const [subjectKind, subjectKey, objectKind, objectKey] of chainKeys) {
    assert.ok(
      linkPairs.has(`${id(subjectKind, subjectKey)}|${id(objectKind, objectKey)}`),
      `missing trace link ${subjectKind}:${subjectKey} -> ${objectKind}:${objectKey}`
    );
  }

  const replacementTypes = new Set(
    example.links
      .filter((item) => item.type === 'replaces')
      .map((item) => {
        const subject = example.records.find((recordItem) => recordItem.id === item.subjectId);
        return subject?.payload.partyType === 'agent'
          ? 'agent_model'
          : subject?.payload.partyType === 'tool'
            ? 'domain_tool'
            : subject?.payload.partyType;
      })
  );
  assert.deepEqual(
    verifierSpec.fixture.requiredReplacementCases.filter((kind) => !replacementTypes.has(kind)),
    []
  );

  const grants = example.records.filter(
    (item) =>
      item.kind === 'authority_grant' && item.id === id('authority_grant', 'operator-approval')
  );
  assert.equal(grants.length, 2);
  assert.equal(
    grants.find((item) => intervalContains(item.validTime, '2019-01-01T00:00:00Z'))?.payload.status,
    'active'
  );
  assert.equal(
    grants.find((item) => intervalContains(item.validTime, '2020-07-01T00:00:00Z'))?.payload.status,
    'revoked'
  );

  const disposition = example.records.find((item) => item.kind === 'disposition');
  assert.equal(disposition.payload.derivedProof.containsRawContent, false);
  const migration = example.records.find((item) => item.kind === 'migration');
  assert.equal(
    migration.payload.counts.read,
    migration.payload.counts.written +
      migration.payload.counts.deleted +
      migration.payload.counts.unmapped
  );
  const lesson = example.records.find((item) => item.kind === 'lesson');
  assert.equal(lesson.payload.lifecycleState, 'effectiveness_reviewed');
}

function buildScaleProbe(verifierSpec) {
  const started = performance.now();
  const relationships = [];
  const start = verifierSpec.fixture.start;
  const perMonth = [
    ['person', 100, 'assigned_to'],
    ['contractor', 63, 'contracted_to'],
    ['agent', 37, 'operated_by'],
    ['vendor', 25, 'supplier_to'],
    ['organizational_unit', 25, 'part_of']
  ];

  for (let month = 0; month < verifierSpec.fixture.months; month += 1) {
    let ordinal = 0;
    for (const [partyType, count, type] of perMonth) {
      for (let index = 0; index < count; index += 1) {
        const startAt = addUtcMonths(start, month);
        relationships.push({
          id: `bdtl:cs:${type}:m${String(month).padStart(3, '0')}-${String(ordinal).padStart(3, '0')}`,
          partyType,
          type,
          startAt,
          endAt: addUtcMonths(startAt, verifierSpec.fixture.relationshipDurationMonths)
        });
        ordinal += 1;
      }
    }
  }
  const generationMs = performance.now() - started;

  const indexStarted = performance.now();
  const byType = new Map();
  const byStart = new Map();
  for (const relationship of relationships) {
    byType.set(relationship.partyType, (byType.get(relationship.partyType) ?? 0) + 1);
    const entries = byStart.get(relationship.startAt) ?? [];
    entries.push(relationship.id);
    byStart.set(relationship.startAt, entries);
  }
  const buildIndexesMs = performance.now() - indexStarted;

  const asOfStarted = performance.now();
  const monthlyCounts = [];
  for (let month = 0; month < verifierSpec.fixture.months; month += 1) {
    const timestamp = addUtcMonths(start, month);
    const value = Date.parse(timestamp);
    monthlyCounts.push(
      relationships.reduce(
        (count, relationship) =>
          Date.parse(relationship.startAt) <= value && value < Date.parse(relationship.endAt)
            ? count + 1
            : count,
        0
      )
    );
  }
  const evaluate120AsOfCountsMs = performance.now() - asOfStarted;

  const jsonStarted = performance.now();
  const encoded = JSON.stringify(relationships);
  const decoded = JSON.parse(encoded);
  const jsonEncodeDecodeMs = performance.now() - jsonStarted;

  const semanticDigest = digest(relationships.map((item) => item.id).join('\n'));
  return {
    relationships,
    decodedCount: decoded.length,
    byType: Object.fromEntries(
      [...byType.entries()].sort(([left], [right]) => left.localeCompare(right))
    ),
    startBucketCount: byStart.size,
    monthlyCounts,
    semanticDigest,
    timings: { generationMs, buildIndexesMs, evaluate120AsOfCountsMs, jsonEncodeDecodeMs }
  };
}

function validateScaleProbe(probe, verifierSpec, rssBefore) {
  assert.equal(probe.relationships.length, verifierSpec.fixture.participantRelationshipCount);
  assert.equal(
    new Set(probe.relationships.map((item) => item.id)).size,
    verifierSpec.fixture.participantRelationshipCount
  );
  assert.deepEqual(probe.byType, verifierSpec.fixture.participantDistribution);
  assert.equal(probe.startBucketCount, verifierSpec.fixture.months);
  assert.equal(probe.decodedCount, verifierSpec.fixture.participantRelationshipCount);

  for (const expected of verifierSpec.asOfOracle) {
    const at = Date.parse(expected.validAt);
    const count = probe.relationships.reduce(
      (total, relationship) =>
        Date.parse(relationship.startAt) <= at && at < Date.parse(relationship.endAt)
          ? total + 1
          : total,
      0
    );
    assert.equal(
      count,
      expected.activeParticipantRelationships,
      `as-of mismatch at ${expected.validAt}`
    );
  }

  const rssDeltaMiB = Math.max(0, process.memoryUsage().rss - rssBefore) / 1024 / 1024;
  const budgets = verifierSpec.performanceBudgets.scaleProbe;
  assert.ok(
    probe.timings.generationMs <= budgets.generateParticipantRelationshipsMs,
    'scale generation budget exceeded'
  );
  assert.ok(probe.timings.buildIndexesMs <= budgets.buildIndexesMs, 'scale index budget exceeded');
  assert.ok(
    probe.timings.evaluate120AsOfCountsMs <= budgets.evaluate120AsOfCountsMs,
    'as-of probe budget exceeded'
  );
  assert.ok(
    probe.timings.jsonEncodeDecodeMs <= budgets.jsonEncodeDecodeMs,
    'JSON round-trip budget exceeded'
  );
  assert.ok(rssDeltaMiB <= budgets.peakRssDeltaMiB, 'scale probe RSS budget exceeded');
  return rssDeltaMiB;
}

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function writeExamples(example, invalidExamples) {
  await mkdir(examplesRoot, { recursive: true });
  const allExamples = { 'lifecycle-slice.json': example, ...invalidExamples };
  for (const [name, value] of Object.entries(allExamples)) {
    await writeFile(join(examplesRoot, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }
}

async function assertExamplesCurrent(example, invalidExamples) {
  const allExamples = { 'lifecycle-slice.json': example, ...invalidExamples };
  for (const [name, expected] of Object.entries(allExamples)) {
    const actual = await loadJson(join(examplesRoot, name));
    assert.deepEqual(actual, expected, `${name} is stale; run with --write`);
  }
}

async function main() {
  const schema = await loadJson(schemaPath);
  const verifierSpec = await loadJson(verifierSpecPath);
  const performanceBaseline = await loadJson(performanceBaselinePath);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  const example = buildLifecycleExample();
  const invalidExamples = buildInvalidExamples(example);

  if (writeMode) await writeExamples(example, invalidExamples);
  else await assertExamplesCurrent(example, invalidExamples);

  assert.equal(validate(example), true, JSON.stringify(validate.errors, null, 2));
  validateSemanticExample(example, verifierSpec);
  for (const [name, invalidExample] of Object.entries(invalidExamples)) {
    assert.equal(
      validate(invalidExample),
      false,
      `${name} unexpectedly satisfied the closed schema`
    );
  }

  const rssBefore = process.memoryUsage().rss;
  const probe = buildScaleProbe(verifierSpec);
  const rssDeltaMiB = validateScaleProbe(probe, verifierSpec, rssBefore);
  assert.equal(performanceBaseline.fixtureId, verifierSpec.fixture.id);
  assert.equal(performanceBaseline.semanticDigest, probe.semanticDigest);
  assert.equal(
    performanceBaseline.counts.participantRelationships,
    verifierSpec.fixture.participantRelationshipCount
  );
  for (const [metric, budget] of Object.entries(verifierSpec.performanceBudgets.scaleProbe)) {
    assert.equal(
      performanceBaseline.summary[metric]?.budget,
      budget,
      `performance baseline budget drifted for ${metric}`
    );
  }
  const report = {
    schemaVersion: 'flow.business-digital-thread.contract-check.v1',
    contractVersion: schema.title,
    fixtureId: verifierSpec.fixture.id,
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpu: cpus()[0]?.model ?? 'unknown'
    },
    counts: {
      lifecycleRecordRevisions: example.records.length,
      lifecycleLinkRevisions: example.links.length,
      recordKinds: new Set(example.records.map((item) => item.kind)).size,
      participantRelationships: probe.relationships.length,
      months: verifierSpec.fixture.months
    },
    timingsMs: Object.fromEntries(
      Object.entries(probe.timings).map(([key, value]) => [key, Number(value.toFixed(3))])
    ),
    peakRssDeltaMiB: Number(rssDeltaMiB.toFixed(3)),
    semanticDigest: probe.semanticDigest,
    negativeCasesRejected: Object.keys(invalidExamples),
    status: 'pass'
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (benchmarkMode) return;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
