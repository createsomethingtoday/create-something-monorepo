// Approved project roster; this file does not create Identity users or live grants.
export const MAVERICK_PROJECT = Object.freeze({
  project: "maverickx",
  repository: "create-something-monorepo:maverick",
  issuer: "https://id.createsomething.space",
  audience: "client-workspace",
  members: Object.freeze([
    "vanessa.ortiz@maverickx.com",
    "estefania.fernandez@maverickx.com",
    "rajat.sehgal@maverickenergy.com",
  ]),
  // Identity D1 SELECT verified 2026-10-09, changes=0, rows_written=0.
  // Token service maps users.id -> sub. This is an identifier, not a credential.
  productionApprover: Object.freeze({
    issuer: "https://id.createsomething.space",
    subject: "b8adb839-ddbb-4747-968e-7668687cf140",
  }),
});
