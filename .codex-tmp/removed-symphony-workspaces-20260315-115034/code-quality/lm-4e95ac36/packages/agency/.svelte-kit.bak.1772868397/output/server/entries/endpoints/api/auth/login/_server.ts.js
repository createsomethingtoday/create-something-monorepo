import { json, redirect } from "@sveltejs/kit";
import { g as getAuth0Config, a as generateAuthState, s as setAuth0StateCookies, b as buildAuth0AuthorizeUrl } from "../../../../../chunks/auth0.js";
import { g as getDomainConfig } from "../../../../../chunks/handlers.js";
const GET = async ({ url, cookies, platform, request }) => {
  const config = getAuth0Config(platform?.env);
  if (!config) {
    return json({ error: "Auth0 is not configured" }, { status: 503 });
  }
  const state = generateAuthState();
  const redirectTo = url.searchParams.get("redirect") || "/";
  const screenHint = url.searchParams.get("screen_hint") === "signup" ? "signup" : "login";
  const domainConfig = getDomainConfig(platform?.env?.ENVIRONMENT);
  const callbackUrl = resolveAuth0RedirectUri(request.url, platform?.env);
  setAuth0StateCookies(cookies, {
    state,
    redirectTo,
    isProduction: domainConfig.isProduction,
    domain: domainConfig.domain
  });
  redirect(
    302,
    buildAuth0AuthorizeUrl({
      config,
      redirectUri: callbackUrl,
      state,
      screenHint
    })
  );
};
function resolveAuth0RedirectUri(requestUrl, env) {
  const explicit = env?.AUTH0_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return new URL("/auth/callback", requestUrl).toString();
}
const POST = async () => {
  return json(
    { error: "Email/password login has been replaced by Auth0. Use GET /api/auth/login." },
    { status: 405 }
  );
};
export {
  GET,
  POST
};
