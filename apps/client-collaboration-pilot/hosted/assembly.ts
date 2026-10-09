import { membershipBoundary } from "./identity";
import { persistence } from "./persistence";
import { collaborationService } from "./service";
import { httpBoundary } from "./http";
import { MAVERICK_PROJECT } from "./project";
import type { D1 } from "./common";
import type { Observation, PreviewTarget } from "./version";
// Compose inside an explicitly selected existing Worker route. No env discovery,
// default public route, new Worker, provider API key or broad account token.
export function assembleCollaboration({
  db,
  origin,
  target,
  readObservation,
}: {
  db: D1;
  origin: string;
  target: PreviewTarget;
  readObservation: () => Promise<Observation>;
}) {
  const identity = membershipBoundary(db, {
    issuer: MAVERICK_PROJECT.issuer,
    audience: MAVERICK_PROJECT.audience,
    jwksUrl: MAVERICK_PROJECT.issuer + "/.well-known/jwks.json",
  });
  const service = collaborationService({
    store: persistence(db, identity.accepts),
    project: MAVERICK_PROJECT.project,
    repository: MAVERICK_PROJECT.repository,
    target,
    readObservation,
    productionApprover: MAVERICK_PROJECT.productionApprover,
  });
  return {
    http: httpBoundary({
      origin,
      project: MAVERICK_PROJECT.project,
      identity,
      service,
    }),
    identity,
    service,
  };
}
