import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileLifecycle,
  definitionDigest,
  selectCandidates,
  validateLifecycle
} from './lifecycle.mjs';
const at = '2026-11-02T12:00:00.000Z',
  later = '2026-11-03T12:00:00.000Z';
const sha = (n) => `sha256:${n.repeat(64)}`;
const candidate = (n = 'a') => ({
  id: 'workflow.a',
  source: { path: 'packages/a/package.json', sha256: sha(n), pointers: ['/scripts/check'] },
  definition: { workflowId: 'workflow.a', version: '0.1.0' }
});
const catalog = (c) => {
  const body = {
    schema: 'workflow-discovery-catalog@1',
    authority: 'candidate_only',
    inventoryDigest: sha('b'),
    coverage: {},
    history: {},
    candidates: c,
    existingWorkflows: [],
    deferred: [],
    safety: {}
  };
  return { ...body, digest: definitionDigest(body) };
};
const review = (c) => ({
  candidateId: c.id,
  sourceSha256: c.source.sha256,
  definitionSha256: definitionDigest(c.definition),
  policySha256: sha('d'),
  decision: 'approved',
  reviewedBy: 'repository-operator',
  reviewedAt: at
});
test('lifecycle records reviewed and exact registered candidates while reusing unchanged state', () => {
  const c = candidate(),
    r = review(c),
    reg = {
      candidateId: c.id,
      sourceSha256: r.sourceSha256,
      definitionSha256: r.definitionSha256,
      policySha256: r.policySha256,
      registrationId: 'internal.validation.v1'
    };
  const first = reconcileLifecycle(null, catalog([c]), { observedAt: at });
  assert.equal(first.entries[0].status, 'discovered');
  const reviewed = reconcileLifecycle(first, catalog([c]), { reviews: [r], observedAt: at });
  assert.equal(reviewed.entries[0].status, 'reviewed');
  const registered = reconcileLifecycle(reviewed, catalog([c]), {
    reviews: [r],
    registration: reg,
    observedAt: at
  });
  assert.equal(registered.entries[0].status, 'registered');
  assert.deepEqual(
    reconcileLifecycle(registered, catalog([c]), {
      reviews: [r],
      registration: reg,
      observedAt: at
    }),
    registered
  );
  assert.throws(
    () => reconcileLifecycle(first, catalog([c]), { registration: reg, observedAt: at }),
    /lifecycle/
  );
});
test('source or definition changes supersede approval; disappeared candidates supersede too', () => {
  const c = candidate();
  const first = reconcileLifecycle(null, catalog([c]), { reviews: [review(c)], observedAt: at });
  for (const changed of [
    candidate('b'),
    { ...c, definition: { ...c.definition, version: '0.2.0' } }
  ]) {
    const next = reconcileLifecycle(first, catalog([changed]), { observedAt: later });
    assert.deepEqual(next.entries.map((x) => x.status).sort(), ['discovered', 'superseded']);
    assert.equal(next.entries.find((x) => x.status === 'discovered').review, null);
  }
  assert.equal(
    reconcileLifecycle(first, catalog([]), { observedAt: later }).entries[0].status,
    'superseded'
  );
});
test('unknown fields, duplicates, bad digests, missing policy binding and excessive records fail closed', () => {
  const c = candidate(),
    r = review(c),
    first = reconcileLifecycle(null, catalog([c]), { observedAt: at });
  for (const opts of [
    { observedAt: at, authority: 'auto' },
    { observedAt: at, reviews: [{ ...r, extra: true }] },
    { observedAt: at, reviews: [{ ...r, policySha256: 'bad' }] },
    { observedAt: at, reviews: [{ ...r, sourceSha256: sha('f') }] },
    { observedAt: at, reviews: [r, r] },
    { observedAt: 'yesterday' }
  ])
    assert.throws(() => reconcileLifecycle(first, catalog([c]), opts), /lifecycle/);
  assert.throws(
    () => reconcileLifecycle({ ...first, digest: sha('f') }, catalog([c]), { observedAt: at }),
    /lifecycle/
  );
  assert.throws(() => reconcileLifecycle(first, catalog([c, c]), { observedAt: at }), /lifecycle/);
  assert.throws(
    () =>
      reconcileLifecycle(
        null,
        catalog(Array.from({ length: 4097 }, (_, i) => ({ ...c, id: `workflow.${i}` }))),
        { observedAt: at }
      ),
    /lifecycle/
  );
  const rejected = reconcileLifecycle(null, catalog([c]), {
    reviews: [{ ...r, decision: 'rejected' }],
    observedAt: at
  });
  assert.equal(rejected.entries[0].status, 'rejected');
});
test('selection gives finite patterns fair deterministic coverage without effectiveness claims', () => {
  const entries = [
    ...Array.from({ length: 80 }, (_, i) => ({
      pattern: 'release-evidence',
      source: { path: `p/${String(i).padStart(3, '0')}` }
    })),
    { pattern: 'package-validation', source: { path: 'p/z' } },
    { pattern: 'contract-reconciliation', source: { path: 'p/a' } }
  ];
  const { selected, deferred } = selectCandidates(entries, 4);
  assert.equal(selected.length, 4);
  assert.equal(deferred.length, 78);
  assert.deepEqual(
    new Set(selected.slice(0, 3).map((x) => x.pattern)),
    new Set(['contract-reconciliation', 'release-evidence', 'package-validation'])
  );
  assert.deepEqual(selectCandidates([...entries].reverse(), 4), { selected, deferred });
  assert.throws(() => selectCandidates(entries, 0), /lifecycle/);
  assert.throws(
    () => selectCandidates([{ pattern: 'unknown', source: { path: 'p' } }], 1),
    /lifecycle/
  );
});

test('stored approvals cannot survive absent current trusted reviews and registration', () => {
  const c = candidate(),
    r = review(c);
  const reg = {
    candidateId: c.id,
    sourceSha256: r.sourceSha256,
    definitionSha256: r.definitionSha256,
    policySha256: r.policySha256,
    registrationId: 'internal'
  };
  const registered = reconcileLifecycle(null, catalog([c]), {
    observedAt: at,
    reviews: [r],
    registration: reg
  });
  assert.equal(validateLifecycle(registered).entries[0].status, 'registered');
  const cleared = reconcileLifecycle(registered, catalog([c]), { observedAt: later });
  assert.equal(cleared.entries[0].status, 'discovered');
  assert.equal(cleared.entries[0].review, null);
  assert.equal(cleared.entries[0].registration, null);
  const gone = reconcileLifecycle(registered, catalog([]), { observedAt: later });
  const restored = reconcileLifecycle(gone, catalog([c]), { observedAt: later });
  assert.equal(restored.entries[0].status, 'discovered');
  assert.equal(restored.entries[0].review, null);
});

test('candidateIndex reconciles deferred candidates and closed-schema validation rejects injected authority', () => {
  const c = candidate();
  const full = catalog([]);
  full.candidateIndex = [
    {
      id: c.id,
      pattern: 'package-validation',
      source: { path: c.source.path, sha256: c.source.sha256 },
      definitionSha256: definitionDigest(c.definition)
    }
  ];
  const { digest, ...body } = full;
  full.digest = definitionDigest(body);
  const ledger = reconcileLifecycle(null, full, { observedAt: at });
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].candidateId, c.id);
  const { digest: old, ...content } = ledger;
  content.entries[0].authority = 'execute';
  assert.throws(
    () => validateLifecycle({ ...content, digest: definitionDigest(content) }),
    /lifecycle/
  );
});
