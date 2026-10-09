import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { openRuntime } from "../runtime.mjs";
import { principals as p } from "../store.mjs";
import { repository } from "../repository.mjs";
import { fileURLToPath } from "node:url";
const setup = (t, options = {}) => {
  const home = mkdtempSync(join(tmpdir(), "collab-repository-"));
  const runtime = openRuntime(home, options);
  t.after(() => {
    runtime.store.close();
    rmSync(home, { recursive: true, force: true });
  });
  return { ...runtime, home };
};
let sequence = 0;
const id = () => `repo-test-${++sequence}`;
export function propose(store, after = "Chemistry for measurable outcomes.") {
  const c = store.context(p.agent);
  const a = {
    page: "/",
    component: "hero.headline",
    baseVersion: c.source.version,
    baseHash: c.sourceHash,
  };
  const f = store.feedback(p.agent, {
    ...a,
    requestId: id(),
    text: "Make the outcome precise.",
  });
  return store.propose(p.agent, {
    ...a,
    requestId: id(),
    feedbackId: f.id,
    replacement: after,
    reason: "Clearer outcome.",
  });
}
const review = (s, q) =>
  s.review(p.reviewer, {
    requestId: id(),
    id: q.id,
    digest: q.digest,
    decision: "approved",
  });
const apply = (s, q, requestId = id()) =>
  s.promote(p.reviewer, { requestId, id: q.id, digest: q.digest });

test("approved proposal becomes exact source Git commit, preserving other fields; replay survives reopen", (t) => {
  const { store: s, repositories: r, home } = setup(t);
  const initial = r.maverickx.snapshot();
  const q = propose(s);
  assert.equal(q.content.baseCommit, initial.baseCommit);
  assert.equal(q.content.contentHash, initial.contentHash);
  assert.throws(() => apply(s, q), /approval_required/);
  review(s, q);
  const requestId = id();
  const result = apply(s, q, requestId);
  assert.equal(result.deployment, "not-authorized");
  assert.notEqual(result.commit, initial.baseCommit);
  const blob = JSON.parse(
    execFileSync(
      "git",
      [
        "--git-dir",
        r.maverickx.root,
        "show",
        `${result.commit}:content/home.json`,
      ],
      { encoding: "utf8" },
    ),
  );
  assert.equal(blob.hero.title, q.content.after);
  assert.equal(blob.hero.subtitle, "More oil. More metals. Smarter chemistry.");
  assert.equal(r["other-client"].snapshot().text, initial.text);
  const reopened = openRuntime(home);
  assert.deepEqual(apply(reopened.store, q, requestId), result);
  assert.equal(reopened.repositories.maverickx.snapshot().version, 2);
  reopened.store.close();
});
test("stale competing approved edit and foreign tenant cannot apply; strict path rejects traversal", (t) => {
  const { store: s, repositories: r } = setup(t);
  const a = propose(s, "First");
  const b = propose(s, "Second");
  review(s, a);
  review(s, b);
  apply(s, a);
  assert.throws(() => apply(s, b), /stale_or_unknown_anchor/);
  assert.throws(
    () => s.promote(p.other, { requestId: id(), id: b.id, digest: b.digest }),
    /not_found/,
  );
  assert.throws(
    () =>
      r.maverickx.apply(
        {
          ...b,
          content: { ...b.content, sourcePath: "../other-client.git/config" },
        },
        p.reviewer,
      ),
    /repository_scope_rejected/,
  );
  assert.throws(
    () => r["other-client"].apply(b, p.reviewer),
    /repository_scope_rejected/,
  );
});
test("Git commit/SQLite failure recovers once without applying source twice", (t) => {
  let fail = false;
  const { store: s, repositories: r } = setup(t, {
    beforeCommit: (action) => {
      if (fail && action === "proposal.promote")
        throw Error("simulated SQLite failure");
    },
  });
  const q = propose(s);
  review(s, q);
  fail = true;
  const requestId = id();
  assert.throws(() => apply(s, q, requestId), /simulated SQLite failure/);
  assert.equal(r.maverickx.snapshot().version, 2);
  assert.equal(s.context(p.reviewer).proposals[0].status, "approved");
  assert.equal(
    s.context(p.reviewer).proposals[0].recoveryReceipt.commit,
    r.maverickx.snapshot().baseCommit,
  );
  fail = false;
  const result = apply(s, q, requestId);
  assert.equal(result.commit, r.maverickx.snapshot().baseCommit);
  assert.equal(r.maverickx.snapshot().version, 2);
  assert.equal(s.context(p.reviewer).outbox.length, 1);
});
test("post-commit interruption recovers without application lock; symlink root is rejected", (t) => {
  let fail = true;
  const {
    store: s,
    repositories: r,
    home,
  } = setup(t, {
    repositoryOptions: {
      afterCommit: () => {
        if (fail) throw Error("simulated response loss");
      },
    },
  });
  const q = propose(s);
  review(s, q);
  assert.throws(() => apply(s, q), /simulated response loss/);
  fail = false;
  apply(s, q);
  assert.equal(r.maverickx.snapshot().version, 2);
  const link = join(home, "alias.git");
  symlinkSync(r.maverickx.root, link);
  assert.throws(
    () => repository(link, "maverickx").snapshot(),
    /repository_symlink_rejected/,
  );
});
test("atomic ref CAS rejects an overlapping source application", (t) => {
  const { store: s, repositories: r } = setup(t);
  const a = propose(s, "First");
  const b = propose(s, "Second");
  review(s, a);
  review(s, b);
  const approved = s.context(p.reviewer).proposals;
  const racing = repository(r.maverickx.root, "maverickx", {
    beforeRefUpdate: () => r.maverickx.apply(approved[1], p.reviewer),
  });
  assert.throws(() => racing.apply(approved[0], p.reviewer));
  assert.equal(r.maverickx.snapshot().text, "Second");
  assert.equal(r.maverickx.snapshot().version, 2);
});
test("actual process death after Git commit releases SQLite and leaves recoverable receipt", (t) => {
  const { store: s, repositories: r, home } = setup(t);
  const q = propose(s);
  review(s, q);
  const runtimeUrl = new URL("../runtime.mjs", import.meta.url).href;
  const storeUrl = new URL("../store.mjs", import.meta.url).href;
  const code = `import {openRuntime} from ${JSON.stringify(runtimeUrl)};import {principals} from ${JSON.stringify(storeUrl)};const {store}=openRuntime(process.argv[1],{repositoryOptions:{afterCommit:()=>process.kill(process.pid,'SIGKILL')}});store.promote(principals.reviewer,JSON.parse(process.argv[2]));`;
  const request = { id: q.id, digest: q.digest, requestId: id() };
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        ["--input-type=module", "-e", code, home, JSON.stringify(request)],
        { timeout: 15000, stdio: "pipe" },
      ),
    (e) => e.signal === "SIGKILL",
  );
  assert.equal(
    s.context(p.reviewer).proposals[0].recoveryReceipt.commit,
    r.maverickx.snapshot().baseCommit,
  );
  apply(s, q, request.requestId);
  assert.equal(r.maverickx.snapshot().version, 2);
  assert.equal(s.context(p.reviewer).outbox.length, 1);
});
