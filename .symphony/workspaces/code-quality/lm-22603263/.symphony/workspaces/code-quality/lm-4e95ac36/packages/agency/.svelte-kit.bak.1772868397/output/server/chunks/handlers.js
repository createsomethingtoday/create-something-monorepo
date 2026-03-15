import { redirect, json } from "@sveltejs/kit";
import { c as setSessionCookies, d as getSessionCookies, g as getAuth0Config } from "./auth0.js";
import { c as createLogger } from "./logger.js";
import { i as identityClient } from "./identity-client.js";
const logger = createLogger("CrossDomainExchange");
async function exchangeCrossDomainToken(params) {
  const { token, cookies, domain, isProduction, propertyLabel, redirectTo = "/account" } = params;
  logger.info("Cross-domain exchange starting", {
    propertyLabel,
    hasToken: !!token,
    redirectTo
  });
  if (!token) {
    logger.warn("No token provided", { propertyLabel });
    throw redirect(302, "/login?error=invalid_token");
  }
  const result = await identityClient.exchangeCrossDomainToken({ token });
  if (!result.success) {
    const errorResult = result;
    logger.warn("Token exchange failed", { propertyLabel, error: errorResult.error });
    const errorMsg = encodeURIComponent(errorResult.error || "exchange_failed");
    throw redirect(302, `/login?error=${errorMsg}`);
  }
  logger.info("Token exchanged successfully", {
    propertyLabel,
    userId: result.data.user?.id
  });
  setSessionCookies(cookies, {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    domain
  }, isProduction);
  logger.info("Redirecting to destination", { propertyLabel, redirectTo });
  throw redirect(302, redirectTo);
}
function getDomainConfig(environment) {
  const isProduction = environment === "production";
  const domain = isProduction ? ".createsomething.agency" : void 0;
  return { isProduction, domain };
}
const TARGET_DOMAINS = {
  ltd: "https://createsomething.ltd",
  io: "https://createsomething.io",
  space: "https://createsomething.space",
  agency: "https://createsomething.agency",
  lms: "https://learn.createsomething.space"
};
const PROPERTY_DOMAINS = {
  ltd: ".createsomething.ltd",
  io: ".createsomething.io",
  space: ".createsomething.space",
  agency: ".createsomething.agency",
  lms: ".createsomething.space"
};
function createCrossDomainHandler(options) {
  return async ({ url, cookies }) => {
    const target = url.searchParams.get("target");
    const redirectPath = url.searchParams.get("redirect") || "/account";
    if (!target || !TARGET_DOMAINS[target]) {
      return json({ error: "Invalid target property" }, { status: 400 });
    }
    const session = getSessionCookies(cookies);
    if (!session.accessToken) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }
    const result = await options.identityClient.generateCrossDomainToken({
      target,
      accessToken: session.accessToken
    });
    if (!result.success) {
      const errorMsg = options.getIdentityErrorMessage ? options.getIdentityErrorMessage(result, "Token generation failed") : result.error || "Token generation failed";
      return json({ error: errorMsg }, { status: result.status || 500 });
    }
    const targetUrl = new URL("/auth/cross-domain", TARGET_DOMAINS[target]);
    targetUrl.searchParams.set("token", result.data.token);
    targetUrl.searchParams.set("redirect", redirectPath);
    return new Response(null, {
      status: 302,
      headers: { Location: targetUrl.toString() }
    });
  };
}
function createCrossDomainPageLoader(options) {
  const propertyLabel = `.${options.property}`;
  const productionDomain = PROPERTY_DOMAINS[options.property];
  return async ({ url, cookies, platform }) => {
    const token = url.searchParams.get("token");
    const redirectTo = url.searchParams.get("redirect") || "/account";
    const isProduction = platform?.env?.ENVIRONMENT === "production";
    const domain = isProduction ? productionDomain : void 0;
    await exchangeCrossDomainToken({
      token: token || "",
      cookies,
      domain: domain || "",
      isProduction: isProduction ?? true,
      propertyLabel,
      redirectTo
    });
  };
}
function createAccountPageLoader() {
  return async ({ parent, cookies }) => {
    const { user } = await parent();
    if (!user) {
      redirect(302, "/login?redirect=/account");
    }
    let analytics = null;
    if (!user.analytics_opt_out) {
      try {
        const accessToken = cookies.get("cs_access_token");
        const response = await fetch("https://createsomething.io/api/user/analytics/aggregate?days=30", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
        });
        if (response.ok) {
          analytics = await response.json();
        }
      } catch (err) {
        console.warn("Failed to fetch user analytics:", err);
      }
    }
    return { user, analytics };
  };
}
function createLoginPageLoader(options) {
  const productionDomain = PROPERTY_DOMAINS[options.property];
  return async ({ url, cookies, platform }) => {
    const { createSessionManager } = await import("./session.js");
    const authProvider = getAuth0Config(platform?.env);
    const session = createSessionManager(cookies, {
      isProduction: platform?.env?.ENVIRONMENT === "production",
      domain: productionDomain,
      authProvider: authProvider ?? void 0
    });
    const user = await session.getUser();
    if (user) {
      const redirectTo = url.searchParams.get("redirect") || "/";
      redirect(302, redirectTo);
    }
    return {
      redirectTo: url.searchParams.get("redirect") || "/",
      error: url.searchParams.get("error") || null
    };
  };
}
function createLayoutServerLoader(options) {
  const productionDomain = PROPERTY_DOMAINS[options.property];
  return async ({ url, cookies, platform }) => {
    const { createSessionManager } = await import("./session.js");
    const authProvider = getAuth0Config(platform?.env);
    const session = createSessionManager(cookies, {
      isProduction: platform?.env?.ENVIRONMENT === "production",
      domain: productionDomain,
      authProvider: authProvider ?? void 0
    });
    const user = await session.getUser();
    return {
      pathname: url.pathname,
      user
    };
  };
}
export {
  createLayoutServerLoader as a,
  createAccountPageLoader as b,
  createCrossDomainHandler as c,
  createCrossDomainPageLoader as d,
  createLoginPageLoader as e,
  getDomainConfig as g
};
