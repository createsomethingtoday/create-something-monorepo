const COOKIE_CONFIG = {
  /** Access token expires in 15 minutes */
  ACCESS_TOKEN_MAX_AGE: 15 * 60,
  /** Refresh token expires in 7 days */
  REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60,
  /** Cookie names */
  NAMES: {
    ACCESS_TOKEN: "cs_access_token",
    REFRESH_TOKEN: "cs_refresh_token"
  },
  /** Cookie path - available across the entire domain */
  PATH: "/",
  /** SameSite policy */
  SAME_SITE: "lax"
};
function getAccessTokenCookieOptions(isProduction, domain) {
  return {
    maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE,
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_CONFIG.SAME_SITE,
    path: COOKIE_CONFIG.PATH,
    ...domain && { domain }
  };
}
function getRefreshTokenCookieOptions(isProduction, domain) {
  return {
    maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE,
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_CONFIG.SAME_SITE,
    path: COOKIE_CONFIG.PATH,
    ...domain && { domain }
  };
}
function getClearCookieOptions(isProduction, domain) {
  return {
    maxAge: 0,
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_CONFIG.SAME_SITE,
    path: COOKIE_CONFIG.PATH,
    ...domain && { domain }
  };
}
function setSessionCookies(cookies, params, isProduction = true) {
  const { accessToken, refreshToken, domain } = params;
  if (accessToken) {
    cookies.set(COOKIE_CONFIG.NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions(isProduction, domain));
  }
  if (refreshToken) {
    cookies.set(COOKIE_CONFIG.NAMES.REFRESH_TOKEN, refreshToken, getRefreshTokenCookieOptions(isProduction, domain));
  }
}
function getSessionCookies(cookies) {
  return {
    accessToken: cookies.get(COOKIE_CONFIG.NAMES.ACCESS_TOKEN),
    refreshToken: cookies.get(COOKIE_CONFIG.NAMES.REFRESH_TOKEN)
  };
}
function clearSessionCookies(cookies, isProduction = true, domain) {
  const clearOptions = getClearCookieOptions(isProduction, domain);
  cookies.set(COOKIE_CONFIG.NAMES.ACCESS_TOKEN, "", clearOptions);
  cookies.set(COOKIE_CONFIG.NAMES.REFRESH_TOKEN, "", clearOptions);
}
function getRefreshTokenFromRequest(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader)
    return null;
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[COOKIE_CONFIG.NAMES.REFRESH_TOKEN] || null;
}
function parseCookieHeader(header) {
  const cookies = {};
  header.split(";").forEach((pair) => {
    const [name, ...valueParts] = pair.trim().split("=");
    if (name) {
      cookies[name] = valueParts.join("=");
    }
  });
  return cookies;
}
const DEFAULT_SCOPE = "openid profile email offline_access";
const DEFAULT_NAMESPACE = "https://createsomething.agency";
const STATE_COOKIE = "cs_auth_state";
const REDIRECT_COOKIE = "cs_auth_redirect";
function normalizeDomain(value) {
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}
function getAuth0Config(env) {
  if (!env?.AUTH0_DOMAIN || !env.AUTH0_CLIENT_ID)
    return null;
  const domain = normalizeDomain(env.AUTH0_DOMAIN);
  const issuer = (env.AUTH0_ISSUER_BASE_URL ?? `https://${domain}`).replace(/\/+$/, "");
  const jwksUrl = env.AUTH0_JWKS_URL ?? `${issuer}/.well-known/jwks.json`;
  return {
    type: "auth0",
    domain,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    audience: env.AUTH0_AUDIENCE,
    scope: env.AUTH0_SCOPE ?? DEFAULT_SCOPE,
    issuer,
    jwksUrl,
    claimsNamespace: (env.AUTH0_CLAIMS_NAMESPACE ?? DEFAULT_NAMESPACE).replace(/\/+$/, "")
  };
}
function buildAuth0AuthorizeUrl(params) {
  const url = new URL(`https://${params.config.domain}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.config.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.config.scope);
  url.searchParams.set("state", params.state);
  if (params.config.audience)
    url.searchParams.set("audience", params.config.audience);
  if (params.screenHint === "signup")
    url.searchParams.set("screen_hint", "signup");
  return url.toString();
}
async function exchangeAuth0Code(params) {
  if (!params.config.clientSecret) {
    throw new Error("Auth0 client secret is not configured");
  }
  const response = await fetch(`https://${params.config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: params.config.clientId,
      client_secret: params.config.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri
    })
  });
  return await response.json();
}
async function refreshAuth0Tokens(params) {
  if (!params.config.clientSecret) {
    throw new Error("Auth0 client secret is not configured");
  }
  const response = await fetch(`https://${params.config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: params.config.clientId,
      client_secret: params.config.clientSecret,
      refresh_token: params.refreshToken
    })
  });
  return await response.json();
}
async function revokeAuth0RefreshToken(params) {
  if (!params.config.clientSecret)
    return false;
  const response = await fetch(`https://${params.config.domain}/oauth/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: params.config.clientId,
      client_secret: params.config.clientSecret,
      token: params.refreshToken
    })
  });
  return response.ok;
}
function generateAuthState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function setAuth0StateCookies(cookies, params) {
  const cookieOptions = {
    httpOnly: true,
    secure: params.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
    ...params.domain ? { domain: params.domain } : {}
  };
  cookies.set(STATE_COOKIE, params.state, cookieOptions);
  cookies.set(REDIRECT_COOKIE, params.redirectTo, cookieOptions);
}
function consumeAuth0StateCookies(cookies, params) {
  const state = cookies.get(STATE_COOKIE);
  const redirectTo = cookies.get(REDIRECT_COOKIE);
  const clearOptions = {
    httpOnly: true,
    secure: params.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    ...params.domain ? { domain: params.domain } : {}
  };
  cookies.set(STATE_COOKIE, "", clearOptions);
  cookies.set(REDIRECT_COOKIE, "", clearOptions);
  return { state, redirectTo };
}
export {
  COOKIE_CONFIG as C,
  generateAuthState as a,
  buildAuth0AuthorizeUrl as b,
  setSessionCookies as c,
  getSessionCookies as d,
  clearSessionCookies as e,
  refreshAuth0Tokens as f,
  getAuth0Config as g,
  getRefreshTokenFromRequest as h,
  consumeAuth0StateCookies as i,
  exchangeAuth0Code as j,
  revokeAuth0RefreshToken as r,
  setAuth0StateCookies as s
};
