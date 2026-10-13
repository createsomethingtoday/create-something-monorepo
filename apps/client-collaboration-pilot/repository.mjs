import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  realpathSync,
  lstatSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { deploymentVersion } from "./deployment-version.mjs";

const FILE = "content/home.json";
const REF = "refs/heads/review";
const sha = (text) => createHash("sha256").update(text).digest("hex");
const fail = (code) => {
  throw new Error(code);
};
// This adapter accepts operator-owned roots only. No tool argument selects a root,
// path, ref, environment, command, or tenant. Repositories are synthetic and bare.
export function repository(
  root,
  tenant,
  {
    afterCommit = () => {},
    beforeRefUpdate = () => {},
    readDeployment,
    now,
  } = {},
) {
  root = resolve(root);
  const git = (args, input, extraEnv = {}, raw = false) => {
    const output = execFileSync("git", ["--git-dir", root, ...args], {
      input,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 5000,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_AUTHOR_NAME: "Synthetic reviewer",
        GIT_AUTHOR_EMAIL: "reviewer@example.invalid",
        GIT_COMMITTER_NAME: "Local collaboration adapter",
        GIT_COMMITTER_EMAIL: "adapter@example.invalid",
        ...extraEnv,
      },
    });
    return raw ? output : output.trim();
  };
  const safe = () => {
    if (lstatSync(root).isSymbolicLink() || realpathSync(root) !== root)
      fail("repository_symlink_rejected");
    if (git(["rev-parse", "--is-bare-repository"]) !== "true")
      fail("bare_fixture_required");
    if (
      git(["config", "--get", "collaboration.synthetic"]) !== "true" ||
      git(["config", "--get", "collaboration.tenant"]) !== tenant
    )
      fail("repository_tenant_mismatch");
  };
  function writeCommit(base, content, message) {
    const dir = mkdtempSync(join(root, "index-"));
    try {
      const env = { GIT_INDEX_FILE: join(dir, "index") };
      git(
        base ? ["read-tree", base] : ["read-tree", "--empty"],
        undefined,
        env,
      );
      const blob = git(["hash-object", "-w", "--stdin"], content);
      git(
        ["update-index", "--add", "--cacheinfo", `100644,${blob},${FILE}`],
        undefined,
        env,
      );
      const tree = git(["write-tree"], undefined, env);
      return git(
        ["commit-tree", tree, ...(base ? ["-p", base] : [])],
        message + "\n",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  function snapshot() {
    safe();
    const commit = git(["rev-parse", REF]);
    if (!git(["ls-tree", commit, "--", FILE]).startsWith("100644 blob "))
      fail("repository_file_mode_rejected");
    const raw = git(["show", `${commit}:${FILE}`], undefined, {}, true);
    const data = JSON.parse(raw);
    if (typeof data.hero?.title !== "string")
      fail("invalid_repository_content");
    const source = {
      page: "/",
      component: "hero.headline",
      sourcePath: FILE,
      version: Number(git(["rev-list", "--count", commit])),
      text: data.hero.title,
      subtitle: data.hero.subtitle,
      baseCommit: commit,
      contentHash: sha(raw),
      repoKey: `synthetic:${tenant}`,
    };
    return readDeployment
      ? deploymentVersion(source, readDeployment(), tenant, now)
      : source;
  }
  function receiptFor(proposal) {
    safe();
    const history = git(["log", "-200", "--format=%H%x00%B%x00", REF]).split(
      "\0",
    );
    for (let i = 0; i + 1 < history.length; i += 2) {
      const commit = history[i].trim();
      let receipt;
      try {
        receipt = JSON.parse(history[i + 1]);
      } catch {
        continue;
      }
      if (receipt.proposalId === proposal.id) {
        if (receipt.digest !== proposal.digest || receipt.tenant !== tenant)
          fail("repository_replay_conflict");
        return { ...receipt, commit };
      }
    }
    return null;
  }
  return {
    root,
    initialize() {
      if (existsSync(root)) {
        safe();
        return snapshot();
      }
      mkdirSync(root, { recursive: true });
      git(["init", "--bare", "--initial-branch=review"]);
      git(["config", "collaboration.synthetic", "true"]);
      git(["config", "collaboration.tenant", tenant]);
      const initial =
        JSON.stringify(
          {
            hero: {
              title: "Chemistry That Outperforms",
              subtitle: "More oil. More metals. Smarter chemistry.",
            },
            synthetic: true,
          },
          null,
          2,
        ) + "\n";
      const commit = writeCommit(
        null,
        initial,
        "Synthetic MaverickX source fixture",
      );
      git(["update-ref", REF, commit, "0".repeat(40)]);
      return snapshot();
    },
    snapshot,
    receiptFor,
    apply(proposal, reviewer) {
      safe();
      const prior = receiptFor(proposal);
      if (prior) return prior;
      const c = proposal.content;
      const current = snapshot();
      if (
        current.mappingReady === false ||
        JSON.stringify(c.deploymentVersion) !==
          JSON.stringify(current.deploymentVersion)
      )
        fail("deployment_drift");
      if (
        c.repoKey !== `synthetic:${tenant}` ||
        c.sourcePath !== FILE ||
        c.page !== "/" ||
        c.component !== "hero.headline"
      )
        fail("repository_scope_rejected");
      if (
        c.baseCommit !== current.baseCommit ||
        c.contentHash !== current.contentHash ||
        c.before !== current.text
      )
        fail("repository_stale");
      if (
        typeof c.after !== "string" ||
        !c.after.trim() ||
        c.after.length > 160
      )
        fail("repository_content_rejected");
      const data = JSON.parse(git(["show", `${current.baseCommit}:${FILE}`]));
      data.hero.title = c.after;
      const raw = JSON.stringify(data, null, 2) + "\n";
      const receipt = {
        id: proposal.id,
        proposalId: proposal.id,
        tenant,
        digest: proposal.digest,
        baseCommit: c.baseCommit,
        baseHash: c.baseHash,
        contentHash: c.contentHash,
        ...(c.deploymentVersion
          ? { deploymentVersion: c.deploymentVersion }
          : {}),
        resultHash: sha(raw),
        sourcePath: FILE,
        before: c.before,
        after: c.after,
        review: proposal.review,
        appliedBy: reviewer.subject,
        disposition: "local-git-commit-only",
        deployment: "not-authorized",
      };
      const commit = writeCommit(
        current.baseCommit,
        raw,
        JSON.stringify(receipt),
      );
      // Atomic compare-and-swap. A failed ref update leaves only unreachable objects.
      // Unique temporary indexes need no application lock that could survive a crash.
      beforeRefUpdate();
      if (
        readDeployment &&
        JSON.stringify(snapshot().deploymentVersion) !==
          JSON.stringify(c.deploymentVersion)
      )
        fail("deployment_drift");
      git(["update-ref", REF, commit, current.baseCommit]);
      afterCommit();
      return { ...receipt, commit };
    },
  };
}
