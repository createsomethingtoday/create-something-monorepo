import {
  verifyIdentityToken,
  getTokenFromRequest,
  type IdentityVerificationConfig,
} from "@create-something/canon/auth/server";
import { type D1, type Member, requireValue } from "./common";
export function membershipBoundary(
  db: D1,
  verification: IdentityVerificationConfig,
  now = () => Math.floor(Date.now() / 1000),
) {
  const issued = new WeakSet<object>();
  async function accepts(p: Member) {
    if (!p || !issued.has(p) || p.expiresAt <= now()) return false;
    const row = await db
      .withSession("first-primary")
      .prepare(
        "SELECT subject,revision FROM collaboration_members WHERE project=? AND issuer=? AND email=? AND active=1",
      )
      .bind(p.project, p.issuer, p.email)
      .first<{ subject: string; revision: number }>();
    return row?.subject === p.subject && row.revision === p.revision;
  }
  return {
    accepts,
    async resolve(request: Request, project: string): Promise<Member> {
      const token = getTokenFromRequest(request);
      requireValue(
        token && token.length <= 8192 && token.split(".").length === 3,
        "identity_required",
        401,
      );
      let algorithm;
      try {
        algorithm = JSON.parse(
          atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")),
        ).alg;
      } catch {}
      requireValue(algorithm === "ES256", "identity_required", 401);
      const identity = await verifyIdentityToken(token, {
        ...verification,
        now,
      });
      const c = identity?.claims;
      requireValue(
        identity &&
          c &&
          c.kind === "identity_access_token" &&
          c.session_version === 2 &&
          c.email_verified === true &&
          typeof c.sub === "string" &&
          typeof c.email === "string" &&
          Number.isFinite(c.iat) &&
          Number.isFinite(c.exp) &&
          c.iat <= now() &&
          c.exp > now() &&
          c.exp - c.iat <= 900,
        "identity_required",
        401,
      );
      const email = c.email.toLowerCase();
      const issuer = c.iss as string;
      const session = db.withSession("first-primary");
      // First verified login may bind only a preapproved exact-address slot. No INSERT,
      // no unbinding on email changes, no token role/tenant claim, no domain matching.
      await session
        .prepare(
          "UPDATE collaboration_members SET subject=?,revision=revision+1 WHERE project=? AND issuer=? AND email=? AND active=1 AND subject IS NULL",
        )
        .bind(c.sub, project, issuer, email)
        .run();
      const row = await session
        .prepare(
          "SELECT subject,revision FROM collaboration_members WHERE project=? AND issuer=? AND email=? AND active=1",
        )
        .bind(project, issuer, email)
        .first<{ subject: string; revision: number }>();
      requireValue(row?.subject === c.sub, "project_membership_required", 403);
      const p = Object.freeze({
        project,
        issuer,
        subject: c.sub,
        email,
        revision: row.revision,
        expiresAt: c.exp,
      });
      issued.add(p);
      return p;
    },
  };
}
