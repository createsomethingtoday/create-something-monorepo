import type { RequestHandler } from "./$types";
import { invokeSyntheticCoordinator } from "@create-something/goldin-coordinator/browser-invocation";

// No login, refresh, credential issuance or cookie-to-client token exchange here.
export const POST: RequestHandler = ({ request, cookies, platform, fetch }) =>
  invokeSyntheticCoordinator(request, cookies, platform?.env ?? {}, fetch);
