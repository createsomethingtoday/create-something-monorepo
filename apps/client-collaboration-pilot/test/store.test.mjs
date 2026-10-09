import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore, principals as p, invoke, digest } from "../store.mjs";
const setup = (t) => {
  const dir = mkdtempSync(join(tmpdir(), "collab-test-"));
  const path = join(dir, "test.sqlite");
  const store = openStore(path);
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { store, path };
};
const anchor = (s) => {
  const c = s.context(p.agent);
  return {
    page: c.source.page,
    component: c.source.component,
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
};
let n = 0;
const request = () => `request-${++n}`;
function propose(s, after = "A clearer headline.") {
  const a = anchor(s);
  const f = s.feedback(p.agent, {
    ...a,
    text: "Make outcomes clearer.",
    requestId: request(),
  });
  return s.propose(p.agent, {
    ...a,
    feedbackId: f.id,
    replacement: after,
    reason: "Clear outcome",
    requestId: request(),
  });
}
const review = (s, q, decision = "approved") =>
  s.review(p.reviewer, {
    id: q.id,
    digest: q.digest,
    decision,
    requestId: request(),
  });
const promote = (s, q, id = request()) =>
  s.promote(p.reviewer, { id: q.id, digest: q.digest, requestId: id });

test("durable full flow and rejection keep feedback separate from source", (t) => {
  const { store: s, path } = setup(t);
  const q = propose(s);
  assert.equal(s.context(p.agent).source.version, 1);
  review(s, q);
  promote(s, q);
  const rejected = propose(s, "Another headline.");
  review(s, rejected, "rejected");
  assert.throws(() => promote(s, rejected), /approval_required/);
  const reopened = openStore(path);
  assert.equal(reopened.context(p.reviewer).source.version, 2);
  assert.equal(reopened.context(p.reviewer).outbox.length, 1);
  assert.equal(reopened.context(p.reviewer).feedback.length, 2);
  reopened.close();
});
test("tool call cannot approve, escalate role, or change arbitrary fields", (t) => {
  const { store: s } = setup(t);
  const q = propose(s);
  assert.throws(
    () => invoke(s, p.agent, "proposal.review", {}),
    /unknown_tool/,
  );
  assert.throws(() => s.review(p.agent, { id: q.id }), /reviewer_required/);
  assert.throws(() => s.context({ ...p.reviewer }), /unauthorized/);
  assert.throws(
    () => invoke(s, p.agent, "proposal.create", { role: "reviewer" }),
    /unknown_argument/,
  );
  assert.throws(() => promote(s, q), /approval_required/);
});
test("tenant isolation covers reads, approval, feedback and proposal references", (t) => {
  const { store: s } = setup(t);
  const q = propose(s);
  assert.equal(s.context(p.other).proposals.length, 0);
  assert.throws(
    () =>
      s.review(p.other, {
        id: q.id,
        digest: q.digest,
        decision: "approved",
        requestId: request(),
      }),
    /not_found/,
  );
  assert.throws(
    () =>
      s.propose(p.other, {
        ...anchor(s),
        feedbackId: q.content.feedbackId,
        replacement: "Tenant crossing",
        reason: "test",
        requestId: request(),
      }),
    /feedback_anchor_mismatch/,
  );
});
test("idempotent replay survives restart and rejects key reuse with different content", (t) => {
  const { store: s, path } = setup(t);
  const a = { ...anchor(s), text: "Original note", requestId: "repeat" };
  const f = s.feedback(p.agent, a);
  assert.deepEqual(s.feedback(p.agent, a), f);
  assert.throws(
    () => s.feedback(p.agent, { ...a, text: "Different note" }),
    /idempotency_conflict/,
  );
  const reopened = openStore(path);
  assert.deepEqual(reopened.feedback(p.agent, a), f);
  assert.equal(reopened.context(p.agent).receipts.length, 1);
  reopened.close();
});
test("approval binds digest; concurrent approved proposals cannot overwrite promoted source", (t) => {
  const { store: s, path } = setup(t);
  const a = propose(s, "First change");
  const b = propose(s, "Second change");
  assert.throws(
    () =>
      s.review(p.reviewer, {
        id: a.id,
        digest: digest("tampered"),
        decision: "approved",
        requestId: request(),
      }),
    /content_mismatch/,
  );
  review(s, a);
  review(s, b);
  const concurrent = openStore(path);
  const id = request();
  const result = promote(s, a, id);
  assert.deepEqual(promote(concurrent, a, id), result);
  assert.throws(() => promote(concurrent, b), /stale_or_unknown_anchor/);
  assert.equal(s.context(p.reviewer).outbox.length, 1);
  concurrent.close();
});
test("stale feedback, edited proposal content, invalid anchors and oversized changes fail closed", (t) => {
  const { store: s } = setup(t);
  const old = anchor(s);
  const q = propose(s);
  q.content.after = "Mutating a returned object does not edit persistence";
  assert.notEqual(
    s.context(p.agent).proposals[0].content.after,
    q.content.after,
  );
  review(s, q);
  promote(s, q);
  assert.throws(
    () =>
      s.feedback(p.agent, { ...old, text: "Late note", requestId: request() }),
    /stale_or_unknown_anchor/,
  );
  assert.throws(
    () =>
      s.feedback(p.agent, {
        ...anchor(s),
        component: "script",
        text: "bad",
        requestId: request(),
      }),
    /stale_or_unknown_anchor/,
  );
  assert.throws(() => propose(s, "x".repeat(161)), /invalid_input/);
});
test("transaction failure rolls back proposal, receipt and replay; same request can recover", (t) => {
  const { store: s, path } = setup(t);
  let fail = true;
  const broken = openStore(path, {
    beforeCommit: () => {
      if (fail) throw Error("simulated disk failure");
    },
  });
  const a = { ...anchor(s), text: "Recoverable note", requestId: "recovery" };
  assert.throws(() => broken.feedback(p.agent, a), /simulated disk failure/);
  assert.equal(s.context(p.agent).feedback.length, 0);
  assert.equal(s.context(p.agent).receipts.length, 0);
  fail = false;
  broken.feedback(p.agent, a);
  assert.equal(s.context(p.agent).feedback.length, 1);
  broken.close();
});
test("stale pending proposal can be rejected but cannot be approved", (t) => {
  const { store: s } = setup(t);
  const a = propose(s, "First");
  const b = propose(s, "Second");
  review(s, a);
  promote(s, a);
  assert.throws(() => review(s, b), /stale_or_unknown_anchor/);
  assert.equal(review(s, b, "rejected").status, "rejected");
});
