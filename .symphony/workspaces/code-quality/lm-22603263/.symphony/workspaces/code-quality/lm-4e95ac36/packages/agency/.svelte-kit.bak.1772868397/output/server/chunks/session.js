import { g as getAuth0Config, d as getSessionCookies, e as clearSessionCookies, c as setSessionCookies, r as revokeAuth0RefreshToken, f as refreshAuth0Tokens, C as COOKIE_CONFIG, h as getRefreshTokenFromRequest } from "./auth0.js";
const SESSION_CONFIG = {
  /** Refresh access token when it has less than 2 minutes remaining */
  REFRESH_THRESHOLD_SECONDS: 2 * 60,
  /** Identity worker endpoint */
  IDENTITY_ENDPOINT: "https://id.createsomething.space",
  /** JWKS cache TTL in seconds */
  JWKS_CACHE_TTL: 3600
};
function decodeJWT(token) {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64)
      return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}
function isTokenExpired(token, thresholdSeconds = 0) {
  const payload = decodeJWT(token);
  if (!payload)
    return true;
  const now = Math.floor(Date.now() / 1e3);
  return payload.exp <= now + thresholdSeconds;
}
function needsRefresh(token) {
  return isTokenExpired(token, SESSION_CONFIG.REFRESH_THRESHOLD_SECONDS);
}
function getUserFromToken(token) {
  const payload = decodeJWT(token);
  if (!payload)
    return null;
  const source = extractSource(payload);
  const tier = extractTier(payload);
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email)
    return null;
  return {
    id: payload.sub,
    email,
    tier,
    source
  };
}
function extractTier(payload) {
  if (payload.tier === "free" || payload.tier === "pro" || payload.tier === "agency") {
    return payload.tier;
  }
  for (const [key, value] of Object.entries(payload)) {
    if (key.endsWith("/tier") && (value === "free" || value === "pro" || value === "agency")) {
      return value;
    }
  }
  return "free";
}
function extractSource(payload) {
  if (payload.source === "workway" || payload.source === "templates" || payload.source === "io" || payload.source === "space" || payload.source === "lms") {
    return payload.source;
  }
  return "space";
}
async function refreshTokens(refreshToken, authProvider) {
  if (authProvider?.type === "auth0") {
    try {
      const tokenResponse = await refreshAuth0Tokens({
        config: authProvider,
        refreshToken
      });
      if (!tokenResponse.id_token || !tokenResponse.refresh_token) {
        return {
          success: false,
          error: tokenResponse.error_description || tokenResponse.error || "refresh_failed"
        };
      }
      return {
        success: true,
        tokens: {
          access_token: tokenResponse.id_token,
          refresh_token: tokenResponse.refresh_token,
          token_type: "Bearer",
          expires_in: tokenResponse.expires_in ?? COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "network_error"
      };
    }
  }
  try {
    const response = await fetch(`${SESSION_CONFIG.IDENTITY_ENDPOINT}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "unknown" }));
      return {
        success: false,
        error: error.error || "refresh_failed"
      };
    }
    const tokens = await response.json();
    return {
      success: true,
      tokens
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "network_error"
    };
  }
}
async function revokeSession(refreshToken, authProvider) {
  if (authProvider?.type === "auth0") {
    return revokeAuth0RefreshToken({
      config: authProvider,
      refreshToken
    });
  }
  try {
    const response = await fetch(`${SESSION_CONFIG.IDENTITY_ENDPOINT}/v1/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    return response.ok;
  } catch {
    return false;
  }
}
function createSessionManager(cookies, options = {}) {
  const { isProduction = true, domain, onAnalyticsEvent, authProvider } = options;
  return {
    /**
     * Get current user from session, refreshing if needed
     */
    async getUser() {
      const session = getSessionCookies(cookies);
      if (!session.accessToken && !session.refreshToken) {
        return null;
      }
      if (session.accessToken && !isTokenExpired(session.accessToken)) {
        return getUserFromToken(session.accessToken);
      }
      if (session.refreshToken) {
        const refreshed = await this.refresh();
        if (refreshed) {
          const newSession = getSessionCookies(cookies);
          return newSession.accessToken ? getUserFromToken(newSession.accessToken) : null;
        }
      }
      onAnalyticsEvent?.({
        action: "auth_session_expired",
        metadata: {
          had_access_token: !!session.accessToken,
          had_refresh_token: !!session.refreshToken
        }
      });
      return null;
    },
    /**
     * Get session state with expiration info
     */
    getState() {
      const session = getSessionCookies(cookies);
      if (!session.accessToken) {
        return {
          user: null,
          expiresAt: null,
          isAuthenticated: false
        };
      }
      const payload = decodeJWT(session.accessToken);
      return {
        user: payload ? {
          id: payload.sub,
          email: payload.email,
          tier: payload.tier,
          source: payload.source
        } : null,
        expiresAt: payload?.exp ?? null,
        isAuthenticated: !!payload && !isTokenExpired(session.accessToken)
      };
    },
    /**
     * Check if tokens need refresh
     */
    needsRefresh() {
      const session = getSessionCookies(cookies);
      if (!session.accessToken)
        return false;
      return needsRefresh(session.accessToken);
    },
    /**
     * Refresh tokens if needed, returns true if successful
     */
    async refresh() {
      const session = getSessionCookies(cookies);
      if (!session.refreshToken)
        return false;
      const result = await refreshTokens(session.refreshToken, authProvider);
      if (result.success && result.tokens) {
        setSessionCookies(cookies, {
          accessToken: result.tokens.access_token,
          refreshToken: result.tokens.refresh_token,
          domain
        }, isProduction);
        onAnalyticsEvent?.({
          action: "auth_token_refresh",
          metadata: {
            expires_in: result.tokens.expires_in
          }
        });
        return true;
      }
      return false;
    },
    /**
     * Set tokens after login
     */
    setTokens(tokens) {
      setSessionCookies(cookies, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        domain
      }, isProduction);
      const user = getUserFromToken(tokens.access_token);
      onAnalyticsEvent?.({
        action: "auth_login_complete",
        metadata: {
          user_id: user?.id,
          tier: user?.tier
        }
      });
    },
    /**
     * Clear session (logout)
     */
    async logout() {
      const session = getSessionCookies(cookies);
      let sessionDurationMinutes;
      if (session.accessToken) {
        const payload = decodeJWT(session.accessToken);
        if (payload) {
          const now = Math.floor(Date.now() / 1e3);
          sessionDurationMinutes = Math.round((now - payload.iat) / 60);
        }
      }
      if (session.refreshToken) {
        await revokeSession(session.refreshToken, authProvider);
      }
      clearSessionCookies(cookies, isProduction, domain);
      onAnalyticsEvent?.({
        action: "auth_logout",
        metadata: {
          session_duration_minutes: sessionDurationMinutes
        }
      });
    }
  };
}
function createAuthHooks(config = {}) {
  const { protectedPaths = [], loginPath = "/login", includeRedirect = true, isProduction = true, domain, onAnalyticsEvent } = config;
  return async ({ event, resolve }) => {
    const { cookies, url, locals } = event;
    const platformEnv = event.platform?.env;
    const authProvider = getAuth0Config(platformEnv);
    const sessionManager = createSessionManager(cookies, {
      isProduction,
      domain,
      onAnalyticsEvent,
      authProvider: authProvider ?? void 0
    });
    const user = await sessionManager.getUser();
    locals.user = user;
    const isProtected = protectedPaths.some((path) => url.pathname.startsWith(path));
    if (isProtected && !user) {
      const redirectParam = includeRedirect ? `?redirect=${encodeURIComponent(url.pathname)}` : "";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${loginPath}${redirectParam}`
        }
      });
    }
    return resolve(event);
  };
}
function getDomainFromHostname(hostname, isProduction) {
  if (!isProduction) {
    return void 0;
  }
  const match = hostname.match(/createsomething\.(space|io|agency|ltd|lms)$/);
  if (match) {
    return `.createsomething.${match[1]}`;
  }
  return void 0;
}
async function handleLogout(request, cookies, platform) {
  try {
    const isProduction = platform?.env?.ENVIRONMENT === "production";
    const url = new URL(request.url);
    const domain = getDomainFromHostname(url.hostname, isProduction);
    const authProvider = getAuth0Config(platform?.env);
    const refreshToken = getRefreshTokenFromRequest(request);
    if (refreshToken) {
      await revokeSession(refreshToken, authProvider);
    }
    clearSessionCookies(cookies, isProduction ?? true, domain);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Logout error:", error);
    return new Response(JSON.stringify({ error: "Logout failed" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
export {
  SESSION_CONFIG,
  createAuthHooks,
  createSessionManager,
  decodeJWT,
  getUserFromToken,
  handleLogout,
  isTokenExpired,
  needsRefresh,
  refreshTokens,
  revokeSession
};
