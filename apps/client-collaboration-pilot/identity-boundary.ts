import {
  getTokenFromRequest,
  verifyIdentityToken,
  type IdentityVerificationConfig,
} from "@create-something/canon/auth/server";

type Membership = {
  active: boolean;
  role: "member" | "reviewer" | "contributor";
};
type Principal = Readonly<{
  tenant: string;
  subject: string;
  role: Membership["role"];
  channel: "review-ui";
  issuer: string;
  expiresAt: number;
}>;
/** Server construction only. No request may choose issuer, audience, tenant or membership lookup. */
export function createReviewerBoundary({
  verification,
  tenant,
  membership,
  now = () => Math.floor(Date.now() / 1000),
}: {
  verification: IdentityVerificationConfig;
  tenant: string;
  membership: (
    issuer: string,
    subject: string,
    tenant: string,
  ) => Membership | null;
  now?: () => number;
}) {
  const issued = new WeakSet<object>();
  const valid = (p: Principal) => {
    if (!p || !issued.has(p) || p.expiresAt <= now()) return false;
    const current = membership(p.issuer, p.subject, tenant);
    return Boolean(
      current?.active && current.role === p.role && p.tenant === tenant,
    );
  };
  return {
    accepts: valid,
    async resolve(request: Request): Promise<Principal | null> {
      const token = getTokenFromRequest(request);
      if (!token || token.length > 8192 || token.split(".").length !== 3)
        return null;
      // Identity's published algorithm; reject algorithm substitution before Canon.
      try {
        if (
          JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString())
            .alg !== "ES256"
        )
          return null;
      } catch {
        return null;
      }
      const identity = await verifyIdentityToken(token, {
        ...verification,
        now,
      });
      if (!identity) return null;
      const claims = identity.claims;
      if (
        typeof claims.iat !== "number" ||
        typeof claims.exp !== "number" ||
        claims.exp - claims.iat > 900 ||
        claims.iat > now() ||
        claims.exp <= claims.iat
      )
        return null;
      const access = membership(identity.issuer, identity.subject, tenant);
      if (
        !access?.active ||
        !["member", "reviewer", "contributor"].includes(access.role)
      )
        return null;
      // Ignore token/body/header role and tenant claims. Application policy owns them.
      const principal = Object.freeze({
        tenant,
        subject: identity.subject,
        issuer: identity.issuer,
        role: access.role,
        channel: "review-ui" as const,
        expiresAt: claims.exp,
      });
      issued.add(principal);
      return principal;
    },
  };
}
