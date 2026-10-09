import {
  BoundaryError,
  exactKeys,
  hash,
  requireValue,
  text,
  type Member,
} from "./common";
import { persistence } from "./persistence";
import {
  candidateManifest,
  mapVersion,
  type Observation,
  type PreviewTarget,
} from "./version";
export function collaborationService(options: {
  store: ReturnType<typeof persistence>;
  project: string;
  repository: string;
  target: PreviewTarget;
  readObservation: () => Promise<Observation>;
  productionApprover?: { issuer: string; subject: string };
  now?: () => number;
}) {
  const { store, project, repository, target } = options;
  const now = options.now ?? Date.now;
  async function current() {
    const observation = await options.readObservation();
    return {
      observation,
      version: await mapVersion(
        observation,
        { project, repository, target },
        now(),
      ),
    };
  }
  function projectMember(p: Member) {
    requireValue(p.project === project, "project_membership_required", 403);
  }
  function proposal(s: any, id: unknown) {
    const q = s.proposals.find((q: any) => q.id === id);
    requireValue(q, "proposal_unavailable", 404);
    return q;
  }
  const query = async (p: Member) => {
    projectMember(p);
    const [{ state }, { version }] = await Promise.all([
      store.load(p),
      current(),
    ]);
    return {
      project,
      version,
      feedback: state.feedback,
      proposals: state.proposals,
      jobs: state.jobs,
      receipts: state.receipts,
    };
  };
  async function anchored(args: Record<string, unknown>) {
    const c = await current();
    requireValue(args.versionHash === c.version.hash, "stale_version");
    return c;
  }
  return {
    query,
    async feedback(p: Member, a: Record<string, unknown>) {
      projectMember(p);
      exactKeys(a, ["requestId", "versionHash", "text"]);
      text(a.text, 1000);
      return store.mutate(p, "feedback.add", a, async (s) => {
        const { version } = await anchored(a);
        const f = {
          id: crypto.randomUUID(),
          versionHash: version.hash,
          page: "/",
          component: "hero.headline",
          text: a.text,
        };
        s.feedback.push(f);
        return f;
      });
    },
    async requestAgent(p: Member, a: Record<string, unknown>) {
      projectMember(p);
      exactKeys(a, ["requestId", "versionHash", "feedbackId"]);
      return store.mutate(p, "agent.request", a, async (s) => {
        const { version } = await anchored(a);
        requireValue(
          s.feedback.some(
            (f) => f.id === a.feedbackId && f.versionHash === version.hash,
          ),
          "feedback_unavailable",
        );
        const task = {
          id: crypto.randomUUID(),
          kind: "agent-proposal",
          owner: p.subject,
          issuer: p.issuer,
          feedbackId: a.feedbackId,
          versionHash: version.hash,
          status: "requested",
          maxProposals: 1,
          expiresAt: now() + 15 * 60 * 1000,
        };
        s.jobs.push(task);
        return task;
      });
    },
    async connectAgent(p: Member, a: Record<string, unknown>) {
      projectMember(p);
      exactKeys(a, ["requestId", "taskId", "tokenHash"]);
      requireValue(typeof a.tokenHash === 'string' && /^[a-f0-9]{64}$/.test(a.tokenHash), 'invalid_grant', 400);
      // The human client generates 256 random bits; only its hash is persisted.
      return store.mutate(p, 'agent.connect', a, async s => {
        const task = s.jobs.find(j => j.kind === 'agent-proposal' && j.id === a.taskId);
        requireValue(task && task.owner === p.subject && task.issuer === p.issuer &&
          task.status === 'requested' && task.expiresAt > now(), 'agent_task_unavailable', 403);
        requireValue(!task.grant && !s.jobs.some(j => j.grant?.hash === a.tokenHash), 'agent_already_connected');
        task.grant = { hash: a.tokenHash, audience: target.origin + '/api/collaboration/mcp',
          email: p.email, revision: p.revision, expiresAt: Math.min(task.expiresAt, p.expiresAt * 1000) };
        return { id: task.id, expiresAt: task.grant.expiresAt, resource: task.grant.audience,
          scopes: ['context:read', 'proposal:create'] };
      });
    },
    // Internal operator adapter only. A live remote grant/transport is deliberately
    // not configured. Models receive these two tools, never human review methods.
    agentTools(owner: Member, taskId: string) {
      return {
        readContext: async () => {
          const c = await query(owner);
          const task = c.jobs.find(
            (j) => j.id === taskId && j.kind === "agent-proposal",
          );
          requireValue(
            task &&
              task.owner === owner.subject &&
              task.issuer === owner.issuer &&
              task.expiresAt > now(),
            "agent_task_unavailable",
            403,
          );
          return {
            project,
            version: c.version,
            task,
            feedback: c.feedback.find((f) => f.id === task.feedbackId),
            untrustedFeedback: true,
          };
        },
        propose: async (a: Record<string, unknown>) => {
          projectMember(owner);
          exactKeys(a, ["requestId", "versionHash", "replacement", "reason"]);
          text(a.replacement, 160);
          text(a.reason, 1000);
          return store.mutate(
            owner,
            "proposal.create",
            a,
            async (s) => {
              const { version, observation } = await anchored(a);
              const task = s.jobs.find(
                (j) => j.id === taskId && j.kind === "agent-proposal",
              );
              requireValue(
                task &&
                  task.owner === owner.subject &&
                  task.issuer === owner.issuer &&
                  task.status === "requested" &&
                  task.expiresAt > now() &&
                  task.versionHash === version.hash,
                "agent_task_unavailable",
                403,
              );
              const candidate = await candidateManifest(
                observation.previewPublication ? observation.rawKV : observation.sourceRaw,
                a.replacement as string,
              );
              const content = {
                project,
                taskId,
                base: version,
                feedbackId: task.feedbackId,
                before: version.text,
                after: a.replacement,
                reason: a.reason,
                candidate,
              };
              const q = {
                id: crypto.randomUUID(),
                digest: await hash(content),
                content,
                status: "proposed",
                review: null,
              };
              s.proposals.push(q);
              task.status = "proposed";
              task.proposalId = q.id;
              return q;
            },
            "agent:" + taskId,
          );
        },
      };
    },
    async review(p: Member, a: Record<string, unknown>) {
      projectMember(p);
      exactKeys(a, ["requestId", "id", "digest", "decision"]);
      requireValue(
        a.decision === "approved" || a.decision === "rejected",
        "invalid_decision",
        400,
      );
      return store.mutate(p, "proposal.review", a, async (s) => {
        const q = proposal(s, a.id);
        requireValue(
          q.digest === a.digest && q.status === "proposed",
          "proposal_changed",
        );
        if (a.decision === "approved") {
          const { version } = await current();
          requireValue(q.content.base.hash === version.hash, "stale_version");
        }
        q.status = a.decision;
        q.review = {
          email: p.email,
          revision: p.revision,
          issuer: p.issuer,
          subject: p.subject,
          digest: q.digest,
          at: now(),
        };
        return q;
      });
    },
    async requestPreview(p: Member, a: Record<string, unknown>) {
      projectMember(p);
      exactKeys(a, ["requestId", "id", "digest", "targetHash"]);
      return store.mutate(p, "preview.request", a, async (s) => {
        const q = proposal(s, a.id);
        requireValue(
          q.status === "approved" &&
            q.digest === a.digest &&
            q.review?.digest === q.digest,
          "review_required",
          403,
        );
        const { version } = await current();
        requireValue(q.content.base.hash === version.hash, "stale_version");
        requireValue(
          a.targetHash === (await hash(target)),
          "destination_changed",
        );
        requireValue(
          !s.jobs.some((j) => j.kind === "preview" && j.proposalId === q.id),
          "preview_already_requested",
        );
        const job = {
          id: crypto.randomUUID(),
          kind: "preview",
          project,
          proposalId: q.id,
          digest: q.digest,
          base: version,
          candidate: q.content.candidate,
          destination: structuredClone(target),
          targetHash: a.targetHash,
          status: "awaiting-executor",
          execution: "not-executed",
          requestedBy: {
            issuer: p.issuer,
            subject: p.subject,
            email: p.email,
            revision: p.revision,
          },
        };
        s.jobs.push(job);
        return job;
      });
    },
    // Trusted operator receipt ingestion, not an HTTP/client/MCP tool. Does not
    // deploy or mutate Git/KV. The future executor must reconcile unknown outcomes
    // by job ID before retry; this method only verifies its observed result.
    async recordPreview(
      p: Member,
      a: { requestId: string; jobId: string },
      observed: Observation,
    ) {
      projectMember(p);
      return store.mutate(
        p,
        "preview.verify",
        { ...a, observationHash: await hash(observed) },
        async (s) => {
          const j = s.jobs.find(
            (j) => j.id === a.jobId && j.kind === "preview",
          );
          requireValue(
            j && j.status === "awaiting-executor",
            "preview_job_unavailable",
          );
          const q = proposal(s, j.proposalId);
          requireValue(
            q.status === "approved" && q.digest === j.digest,
            "review_changed",
          );
          const version = await mapVersion(
            observed,
            { project, repository, target: j.destination },
            now(),
          );
          requireValue(
            version.sourceContentHash === j.candidate.contentHash &&
              version.kvContentHash === j.candidate.contentHash,
            "preview_content_mismatch",
          );
          requireValue(
            version.sourceCommit !== j.base.sourceCommit,
            "preview_commit_required",
          );
          j.status = "verified";
          j.execution = "operator-reported";
          j.evidence = {
            version,
            hash: await hash(version),
            verifiedAt: now(),
          };
          return j;
        },
      );
    },
    async approveProduction(p: Member, a: Record<string, unknown>) {
      projectMember(p);
      exactKeys(a, ["requestId", "jobId", "evidenceHash"]);
      const micah = options.productionApprover;
      requireValue(
        micah && p.issuer === micah.issuer && p.subject === micah.subject,
        "micah_production_approval_required",
        403,
      );
      return store.mutate(p, "production.approve", a, async (s) => {
        const j = s.jobs.find((j) => j.id === a.jobId && j.kind === "preview");
        requireValue(
          j?.status === "verified" && j.evidence.hash === a.evidenceHash,
          "verified_preview_required",
        );
        const { version } = await current();
        requireValue(version.hash === j.evidence.version.hash, "stale_version");
        // No production target is configured: retain a review decision only.
        // It cannot be consumed as a production deployment capability.
        const approval = {
          id: crypto.randomUUID(),
          kind: "production-content-review",
          evidenceHash: a.evidenceHash,
          sourceCommit: version.sourceCommit,
          issuer: p.issuer,
          subject: p.subject,
          execution: "not-authorized",
        };
        s.jobs.push(approval);
        return approval;
      });
    },
  };
}
