import {
  BoundaryError,
  hash,
  requireValue,
  text,
  type D1,
  type Member,
} from "./common";
export type State = {
  publication?: any;
  feedback: any[];
  proposals: any[];
  jobs: any[];
  receipts: any[];
  replay: Record<string, { fingerprint: string; result: any }>;
};
// One bounded aggregate per pilot project: CAS + membership predicate commit together.
// No network side effect occurs inside the optimistic mutation callback.
export function persistence(
  db: D1,
  accepts: (p: Member) => Promise<boolean>,
  now = () => Math.floor(Date.now() / 1000),
) {
  async function load(p: Member) {
    requireValue(await accepts(p), "project_membership_required", 403);
    const row = await db
      .withSession("first-primary")
      .prepare("SELECT revision,state FROM collaboration_projects WHERE id=?")
      .bind(p.project)
      .first<{ revision: number; state: string }>();
    requireValue(row, "project_unavailable", 404);
    return { revision: row.revision, state: JSON.parse(row.state) as State };
  }
  return {
    load,
    async mutate(
      p: Member,
      action: string,
      args: Record<string, unknown>,
      apply: (state: State) => Promise<any>,
      scope = "human",
      reviewers?: (state: State) => Pick<Member, "issuer" | "subject" | "email" | "revision">[],
    ) {
      text(args.requestId, 100);
      const fingerprint = await hash({ action, args });
      const key = await hash([p.issuer, p.subject, scope, args.requestId]);
      const { revision, state } = await load(p);
      const prior = state.replay[key];
      if (prior) {
        requireValue(prior.fingerprint === fingerprint, "idempotency_conflict");
        return prior.result;
      }
      requireValue(
        state.receipts.length < 200,
        "project_capacity_reached",
        429,
      );
      const result = await apply(state);
      state.receipts.push({
        action,
        subject: p.subject,
        scope,
        resultId: result.id,
        at: now(),
      });
      state.replay[key] = { fingerprint, result };
      const guards = reviewers?.(state) ?? [];
      requireValue(guards.length <= 2, "too_many_commit_guards");
      const [guard = p, requester = p] = guards;
      const serialized = JSON.stringify(state);
      requireValue(
        new TextEncoder().encode(serialized).byteLength <= 512000,
        "project_capacity_reached",
        429,
      );
      const write = await db
        .prepare(
          `UPDATE collaboration_projects SET state=?,revision=revision+1 WHERE id=? AND revision=? AND ? > ? AND EXISTS (SELECT 1 FROM collaboration_members WHERE project=? AND issuer=? AND subject=? AND email=? AND revision=? AND active=1) AND EXISTS (SELECT 1 FROM collaboration_members WHERE project=? AND issuer=? AND subject=? AND email=? AND revision=? AND active=1) AND EXISTS (SELECT 1 FROM collaboration_members WHERE project=? AND issuer=? AND subject=? AND email=? AND revision=? AND active=1)`,
        )
        .bind(
          serialized,
          p.project,
          revision,
          p.expiresAt,
          now(),
          p.project,
          p.issuer,
          p.subject,
          p.email,
          p.revision,
          p.project, guard.issuer, guard.subject, guard.email, guard.revision,
          p.project, requester.issuer, requester.subject, requester.email, requester.revision,
        )
        .run();
      if (write.meta.changes !== 1) {
        const again = await load(p);
        const replay = again.state.replay[key];
        if (replay) {
          requireValue(
            replay.fingerprint === fingerprint,
            "idempotency_conflict",
          );
          return replay.result;
        }
        throw new BoundaryError("concurrent_change_retry_same_request");
      }
      return result;
    },
  };
}
