import {
  invokeSyntheticCoordinator,
  ISOLATED_ORIGIN,
} from "../../../../../browser-invocation.mjs";
export const POST = ({ request, cookies, platform, fetch }) =>
  invokeSyntheticCoordinator(
    request,
    cookies,
    platform?.env ?? {},
    fetch,
    ISOLATED_ORIGIN,
  );
