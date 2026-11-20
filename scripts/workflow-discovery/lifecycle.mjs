import { createHash } from 'node:crypto';
const MAX = 4096;
const PATTERNS = ['contract-reconciliation', 'release-evidence', 'package-validation'];
const SHA = /^sha256:[a-f0-9]{64}$/;
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])])
        )
      : v;
export const definitionDigest = (value) =>
  `sha256:${createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')}`;
const fail = () => {
  throw new Error('lifecycle_invalid_binding_or_schema');
};
function object(value, keys, optional = []) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    keys.some((k) => !Object.hasOwn(value, k)) ||
    Object.keys(value).some((k) => ![...keys, ...optional].includes(k))
  )
    fail();
}
const id = (value) => typeof value === 'string' && value.length > 0 && value.length <= 256;
const date = (value) =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const path = (value) =>
  id(value) &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  !value.split('/').some((p) => p === '' || p === '.' || p === '..');
function review(value) {
  object(value, [
    'candidateId',
    'sourceSha256',
    'definitionSha256',
    'policySha256',
    'decision',
    'reviewedBy',
    'reviewedAt'
  ]);
  if (
    !id(value.candidateId) ||
    ![value.sourceSha256, value.definitionSha256, value.policySha256].every((v) => SHA.test(v)) ||
    !['approved', 'rejected'].includes(value.decision) ||
    !id(value.reviewedBy) ||
    !date(value.reviewedAt)
  )
    fail();
}
function registration(value) {
  object(value, [
    'candidateId',
    'sourceSha256',
    'definitionSha256',
    'policySha256',
    'registrationId'
  ]);
  if (
    !id(value.candidateId) ||
    !id(value.registrationId) ||
    ![value.sourceSha256, value.definitionSha256, value.policySha256].every((v) => SHA.test(v))
  )
    fail();
}
const matches = (a, b) =>
  a.candidateId === b.candidateId &&
  a.sourceSha256 === b.sourceSha256 &&
  a.definitionSha256 === b.definitionSha256;
const version = (entry) =>
  definitionDigest([entry.candidateId, entry.sourceSha256, entry.definitionSha256]);
function validateEntry(entry) {
  object(entry, [
    'version',
    'candidateId',
    'sourcePath',
    'sourceSha256',
    'definitionSha256',
    'status',
    'firstObservedAt',
    'lastObservedAt',
    'review',
    'registration'
  ]);
  if (
    !id(entry.candidateId) ||
    !path(entry.sourcePath) ||
    ![entry.sourceSha256, entry.definitionSha256].every((v) => SHA.test(v)) ||
    entry.version !== version(entry) ||
    !['discovered', 'reviewed', 'registered', 'rejected', 'superseded'].includes(entry.status) ||
    !date(entry.firstObservedAt) ||
    !date(entry.lastObservedAt) ||
    entry.firstObservedAt > entry.lastObservedAt
  )
    fail();
  if (entry.review !== null) {
    review(entry.review);
    if (!matches(entry, entry.review) || entry.review.reviewedAt > entry.lastObservedAt) fail();
  }
  if (entry.registration !== null) {
    registration(entry.registration);
    if (
      !matches(entry, entry.registration) ||
      entry.review?.decision !== 'approved' ||
      entry.registration.policySha256 !== entry.review.policySha256
    )
      fail();
  }
  if (
    (entry.status === 'discovered' && (entry.review !== null || entry.registration !== null)) ||
    (entry.status === 'reviewed' &&
      (entry.review?.decision !== 'approved' || entry.registration !== null)) ||
    (entry.status === 'registered' && entry.registration === null) ||
    (entry.status === 'rejected' &&
      (entry.review?.decision !== 'rejected' || entry.registration !== null))
  )
    fail();
}
export function validateLifecycle(value) {
  object(value, ['schema', 'entries', 'digest']);
  if (
    value.schema !== 'workflow-discovery-lifecycle@1' ||
    !Array.isArray(value.entries) ||
    value.entries.length > MAX ||
    value.digest !== definitionDigest({ schema: value.schema, entries: value.entries })
  )
    fail();
  const seen = new Set();
  for (const entry of value.entries) {
    validateEntry(entry);
    if (seen.has(entry.version)) fail();
    seen.add(entry.version);
  }
  return structuredClone(value);
}
/** A descriptive ledger; reviews must originate in the host's reviewed policy, never this ledger. */
export function reconcileLifecycle(previous, catalog, options) {
  object(options, ['observedAt'], ['reviews', 'registration']);
  if (!date(options.observedAt)) fail();
  object(
    catalog,
    ['schema', 'candidates', 'digest'],
    [
      'authority',
      'inventoryDigest',
      'coverage',
      'history',
      'existingWorkflows',
      'deferred',
      'safety',
      'candidateIndex'
    ]
  );
  if (
    catalog.schema !== 'workflow-discovery-catalog@1' ||
    !SHA.test(catalog.digest) ||
    !Array.isArray(catalog.candidates)
  )
    fail();
  const { digest: catalogDigest, ...catalogBody } = catalog;
  if (definitionDigest(catalogBody) !== catalogDigest) fail();
  const entries =
    previous === null || previous === undefined ? [] : structuredClone(previous.entries);
  if (previous !== null && previous !== undefined) validateLifecycle(previous);
  const seen = new Set();
  for (const entry of entries) {
    validateEntry(entry);
    if (seen.has(entry.version) || entry.lastObservedAt > options.observedAt) fail();
    seen.add(entry.version);
  }
  const sources = catalog.candidateIndex ?? catalog.candidates;
  if (!Array.isArray(sources) || sources.length > MAX) fail();
  const current = new Map();
  for (const item of sources) {
    if (catalog.candidateIndex !== undefined) {
      object(item, ['id', 'pattern', 'source', 'definitionSha256']);
      object(item.source, ['path', 'sha256']);
      if (!PATTERNS.includes(item.pattern) || !SHA.test(item.definitionSha256)) fail();
    } else {
      object(
        item,
        ['id', 'source', 'definition'],
        ['pattern', 'validation', 'execution', 'authority', 'unresolved', 'historySignal']
      );
      object(item.source, ['path', 'sha256'], ['pointers']);
    }
    if (
      !id(item.id) ||
      current.has(item.id) ||
      !path(item.source.path) ||
      !SHA.test(item.source.sha256)
    )
      fail();
    const candidate = {
      candidateId: item.id,
      sourcePath: item.source.path,
      sourceSha256: item.source.sha256,
      definitionSha256: item.definitionSha256 ?? definitionDigest(item.definition)
    };
    current.set(item.id, { ...candidate, version: version(candidate) });
  }
  for (const entry of entries) {
    const candidate = current.get(entry.candidateId);
    if (!candidate || candidate.version !== entry.version) entry.status = 'superseded';
  }
  for (const candidate of current.values()) {
    let entry = entries.find((e) => e.version === candidate.version);
    if (!entry) {
      entry = {
        ...candidate,
        status: 'discovered',
        firstObservedAt: options.observedAt,
        lastObservedAt: options.observedAt,
        review: null,
        registration: null
      };
      entries.push(entry);
    } else {
      entry.lastObservedAt = options.observedAt;
      entry.status = 'discovered';
      entry.review = null;
      entry.registration = null;
    } // Stored state cannot preserve authority; reapply current host-reviewed bindings below.
  }
  if (entries.length > MAX) fail();
  const reviews = options.reviews ?? [];
  if (!Array.isArray(reviews) || reviews.length > MAX) fail();
  const reviewed = new Set();
  for (const value of reviews) {
    review(value);
    if (reviewed.has(value.candidateId) || value.reviewedAt > options.observedAt) fail();
    reviewed.add(value.candidateId);
    const candidate = current.get(value.candidateId);
    if (!candidate || !matches(candidate, value)) fail();
    const entry = entries.find((e) => e.version === candidate.version);
    entry.review = structuredClone(value);
    if (entry.registration?.policySha256 !== value.policySha256 || value.decision === 'rejected')
      entry.registration = null;
    entry.status =
      value.decision === 'rejected' ? 'rejected' : entry.registration ? 'registered' : 'reviewed';
  }
  if (options.registration !== undefined) {
    const value = options.registration;
    registration(value);
    const candidate = current.get(value.candidateId);
    if (!candidate || !matches(candidate, value)) fail();
    const entry = entries.find((e) => e.version === candidate.version);
    if (entry.review?.decision !== 'approved' || entry.review.policySha256 !== value.policySha256)
      fail();
    entry.registration = structuredClone(value);
    entry.status = 'registered';
  }
  entries.sort(
    (a, b) => a.candidateId.localeCompare(b.candidateId) || a.version.localeCompare(b.version)
  );
  for (const entry of entries) validateEntry(entry);
  const body = { schema: 'workflow-discovery-lifecycle@1', entries };
  return { ...body, digest: definitionDigest(body) };
}
/** Deterministic coverage fairness only; no outcome or model-quality claim. */
export function selectCandidates(proposals, maximum = 64) {
  if (
    !Array.isArray(proposals) ||
    proposals.length > MAX ||
    !Number.isSafeInteger(maximum) ||
    maximum < 1 ||
    maximum > 256
  )
    fail();
  const groups = new Map(PATTERNS.map((p) => [p, []]));
  for (const proposal of proposals) {
    if (!proposal || !PATTERNS.includes(proposal.pattern) || !path(proposal.source?.path)) fail();
    groups.get(proposal.pattern).push(proposal);
  }
  for (const group of groups.values())
    group.sort((a, b) => a.source.path.localeCompare(b.source.path));
  const ordered = [];
  for (let i = 0; ordered.length < proposals.length; i++)
    for (const group of groups.values()) if (group[i]) ordered.push(group[i]);
  return { selected: ordered.slice(0, maximum), deferred: ordered.slice(maximum) };
}
