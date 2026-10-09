import { hash, requireValue, type D1 } from "./common";
import { mapVersion, type PreviewTarget, type Version } from "./version";
type Job = {
  id: string;
  project: string;
  kind: string;
  status: string;
  digest: string;
  proposalId: string;
  base: Version;
  candidate: { raw: string; contentHash: string };
  destination: PreviewTarget;
  targetHash: string;
  requestedBy: {
    issuer: string;
    subject: string;
    email: string;
    revision: number;
  };
};
type Result = {
  jobId: string;
  project: string;
  targetHash: string;
  parentCommit: string;
  commit: string;
  manifestHash: string;
  deploymentId: string;
  deploymentCommit: string;
  kvKey: string;
  kvContentHash: string;
  ready: boolean;
};
export type PublisherPorts = {
  // Must return authoritative current deployed/base version. No input URLs.
  currentBase: () => Promise<{ hash: string; sourceCommit: string }>;
  // Must reconcile by stable job ID before any create. Immutable assets only;
  // must never repoint a public alias or mutate content:home here.
  prepare: (job: Readonly<Job>, key: string) => Promise<void>;
  // Read independently from trusted provider/Git/KV adapters, not a client receipt.
  inspect: (job: Readonly<Job>, key: string) => Promise<Result>;
  readContent: (key: string) => Promise<string | null>;
};
/** Execute one bounded attempt. No retries, polling, leases, provider credentials
 * or alarms. Concurrent/unknown attempts reuse one immutable job identity; only
 * the D1 publication-pointer CAS makes an outcome visible. */
export function previewPublisher({
  db,
  project,
  target,
  ports,
}: {
  db: D1;
  project: string;
  target: PreviewTarget;
  ports: PublisherPorts;
}) {
  async function load(id: string) {
    const row = await db
      .withSession("first-primary")
      .prepare("SELECT state FROM collaboration_projects WHERE id=?")
      .bind(project)
      .first<{ state: string }>();
    requireValue(row, "project_unavailable", 404);
    const state = JSON.parse(row.state);
    const job = state.jobs.find(
      (j: Job) => j.id === id && j.kind === "preview",
    ) as Job | undefined;
    const q = state.proposals.find(
      (q: { id: string }) => q.id === job?.proposalId,
    );
    requireValue(
      job &&
        job.project === project &&
        ["awaiting-executor", "verified"].includes(job.status) &&
        q?.status === "approved" &&
        q.digest === job.digest &&
        q.review?.digest === job.digest,
      "approved_preview_required",
      403,
    );
    requireValue(
      JSON.stringify(job.destination) === JSON.stringify(target) &&
        job.targetHash === (await hash(target)),
      "destination_changed",
    );
    requireValue(
      (await hash(job.candidate.raw)) === job.candidate.contentHash,
      "candidate_tampered",
    );
    for (const actor of [job.requestedBy, q.review]) {
      requireValue(actor, "actor_required", 403);
      const allowed = await db
        .withSession("first-primary")
        .prepare(
          "SELECT 1 AS allowed FROM collaboration_members WHERE project=? AND issuer=? AND subject=? AND email=? AND revision=? AND active=1",
        )
        .bind(project, actor.issuer, actor.subject, actor.email, actor.revision)
        .first();
      requireValue(allowed, "publication_access_revoked", 403);
    }
    return { job, q };
  }
  return {
    async run(id: string) {
      const { job, q } = await load(id);
      const fingerprint = await hash({
        id: job.id,
        project: job.project,
        digest: job.digest,
        proposalId: job.proposalId,
        base: job.base,
        candidate: job.candidate,
        destination: job.destination,
        targetHash: job.targetHash,
        requestedBy: job.requestedBy,
      });
      const previous = await db
        .withSession("first-primary")
        .prepare(
          "SELECT fingerprint,status,record FROM collaboration_execution WHERE project=? AND job_id=?",
        )
        .bind(project, id)
        .first<{ fingerprint: string; status: string; record: string }>();
      if (previous) {
        requireValue(previous.fingerprint === fingerprint, "job_changed");
        if (previous.status === "published") return JSON.parse(previous.record);
        requireValue(previous.status !== "conflict", "publication_conflict");
      }
      const head = await db
        .withSession("first-primary")
        .prepare(
          "SELECT revision,record FROM collaboration_publications WHERE project=?",
        )
        .bind(project)
        .first<{ revision: number; record: string | null }>();
      requireValue(head, "publication_unconfigured");
      const expectedRevision = previous
        ? JSON.parse(previous.record).expectedRevision
        : head.revision;
      requireValue(head.revision === expectedRevision, "publication_conflict");
      if (head.record) {
        const active = JSON.parse(head.record);
        requireValue(
          active.version?.hash === job.base.hash &&
            active.commit === job.base.sourceCommit,
          "stale_publication_base",
        );
      }
      const base = await ports.currentBase();
      requireValue(
        base.hash === job.base.hash &&
          base.sourceCommit === job.base.sourceCommit,
        "stale_publication_base",
      );
      const key =
        "collaboration/" +
        project +
        "/" +
        id +
        "/" +
        job.candidate.contentHash +
        ".json";
      await db
        .prepare(
          "INSERT OR IGNORE INTO collaboration_execution(project,job_id,fingerprint,status,record) VALUES (?,?,?,'prepared',?)",
        )
        .bind(
          project,
          id,
          fingerprint,
          JSON.stringify({ expectedRevision, key }),
        )
        .run();
      const prepared = await db
        .withSession("first-primary")
        .prepare(
          "SELECT fingerprint,record,status FROM collaboration_execution WHERE project=? AND job_id=?",
        )
        .bind(project, id)
        .first<{ fingerprint: string; record: string; status: string }>();
      requireValue(prepared?.fingerprint === fingerprint, "job_changed");
      if (prepared.status === "published") return JSON.parse(prepared.record);
      requireValue(
        JSON.parse(prepared.record).expectedRevision === expectedRevision,
        "publication_conflict",
      );
      await ports.prepare(structuredClone(job), key);
      const outcome = await ports.inspect(structuredClone(job), key);
      requireValue(
        outcome.ready &&
          outcome.jobId === id &&
          outcome.project === project &&
          outcome.targetHash === job.targetHash &&
          outcome.parentCommit === job.base.sourceCommit &&
          /^[a-f0-9]{40}$/.test(outcome.commit) &&
          outcome.commit === outcome.deploymentCommit &&
          outcome.commit !== job.base.sourceCommit &&
          outcome.manifestHash === job.candidate.contentHash &&
          outcome.kvContentHash === job.candidate.contentHash &&
          outcome.kvKey === key &&
          typeof outcome.deploymentId === "string" &&
          outcome.deploymentId.length > 0,
        "executor_result_mismatch",
      );
      const raw = await ports.readContent(key);
      requireValue(
        raw !== null && (await hash(raw)) === job.candidate.contentHash,
        "immutable_content_not_ready",
      );
      const finalBase = await ports.currentBase();
      requireValue(
        finalBase.hash === job.base.hash &&
          finalBase.sourceCommit === job.base.sourceCommit,
        "stale_publication_base",
      );
      const version = await mapVersion(
        {
          project,
          repository: job.base.repository,
          path: "content/home.json",
          sourceCommit: outcome.commit,
          sourceRaw: raw,
          deploymentId: outcome.deploymentId,
          deploymentCommit: outcome.commit,
          rawKV: raw,
          contentKey: key,
          observedAt: Date.now(),
          target,
        },
        { project, repository: job.base.repository, target },
      );
      const record = {
        version,
        ...outcome,
        revision: expectedRevision + 1,
        proposalDigest: job.digest,
        baseHash: job.base.hash,
        visibility: "published",
      };
      const json = JSON.stringify(record);
      // This is the sole visibility transition. Approval, requester + reviewer
      // revocation and the expected publication revision are checked atomically.
      const results = await db.batch([
        db
          .prepare(
            `UPDATE collaboration_publications SET revision=revision+1,record=? WHERE project=? AND revision=?
          AND EXISTS (SELECT 1 FROM collaboration_members WHERE project=? AND issuer=? AND subject=? AND email=? AND revision=? AND active=1)
          AND EXISTS (SELECT 1 FROM collaboration_members WHERE project=? AND issuer=? AND subject=? AND email=? AND revision=? AND active=1)
          AND EXISTS (SELECT 1 FROM collaboration_projects p,json_each(p.state,'$.proposals') q WHERE p.id=? AND json_extract(q.value,'$.id')=? AND json_extract(q.value,'$.status')='approved' AND json_extract(q.value,'$.digest')=?)`,
          )
          .bind(
            json,
            project,
            expectedRevision,
            project,
            job.requestedBy.issuer,
            job.requestedBy.subject,
            job.requestedBy.email,
            job.requestedBy.revision,
            project,
            q.review.issuer,
            q.review.subject,
            q.review.email,
            q.review.revision,
            project,
            job.proposalId,
            job.digest,
          ),
        db
          .prepare(
            `UPDATE collaboration_execution SET status='published',record=? WHERE project=? AND job_id=? AND fingerprint=? AND EXISTS (SELECT 1 FROM collaboration_publications WHERE project=? AND record=?)`,
          )
          .bind(json, project, id, fingerprint, project, json),
      ]);
      if (results[0].meta.changes !== 1) {
        const saved = await db
          .withSession("first-primary")
          .prepare(
            "SELECT status,record FROM collaboration_execution WHERE project=? AND job_id=?",
          )
          .bind(project, id)
          .first<{ status: string; record: string }>();
        if (saved?.status === "published") return JSON.parse(saved.record);
        throw Error("publication_conflict_or_access_revoked");
      }
      return record;
    },
    async readPublished() {
      const row = await db
        .withSession("first-primary")
        .prepare(
          "SELECT record FROM collaboration_publications WHERE project=?",
        )
        .bind(project)
        .first<{ record: string | null }>();
      requireValue(row?.record, "preview_not_published", 404);
      const publication = JSON.parse(row.record) as Result;
      requireValue(
        publication.project === project &&
          publication.targetHash === (await hash(target)),
        "publication_scope_mismatch",
      );
      const raw = await ports.readContent(publication.kvKey);
      requireValue(
        raw !== null && (await hash(raw)) === publication.manifestHash,
        "preview_content_unavailable",
        503,
      );
      return { publication, raw, content: JSON.parse(raw) };
    },
  };
}
