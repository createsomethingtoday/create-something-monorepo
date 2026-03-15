const IDENTITY_API = "https://id.createsomething.space";
async function identityRequest(endpoint, options = {}) {
  const { method = "POST", body, accessToken } = options;
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  try {
    const response = await fetch(`${IDENTITY_API}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const errorResult = await response.json();
      return {
        success: false,
        error: errorResult.error || "Request failed",
        status: response.status
      };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
      status: 0
    };
  }
}
const identityClient = {
  /**
   * Login with email and password
   *
   * @example
   * const result = await identityClient.login({ email, password });
   * if (result.success) {
   *   const { access_token, refresh_token, user } = result.data;
   * }
   */
  async login(request) {
    return identityRequest("/v1/auth/login", {
      body: request
    });
  },
  /**
   * Register a new user
   *
   * @example
   * const result = await identityClient.signup({
   *   email,
   *   password,
   *   name: 'John Doe',
   *   source: 'io'
   * });
   */
  async signup(request) {
    return identityRequest("/v1/auth/register", {
      body: request
    });
  },
  /**
   * Request a magic login link
   *
   * @example
   * const result = await identityClient.magicLogin({ email, source: 'space' });
   * if (result.success) {
   *   // Email sent
   * }
   */
  async magicLogin(request) {
    return identityRequest("/v1/auth/magic-login", {
      body: request
    });
  },
  /**
   * Request a magic signup link
   */
  async magicSignup(request) {
    return identityRequest("/v1/auth/magic-signup", {
      body: request
    });
  },
  /**
   * Verify a magic link token
   *
   * @example
   * const result = await identityClient.verifyMagicLink({ token });
   * if (result.success) {
   *   setSessionCookies(cookies, result.data);
   * }
   */
  async verifyMagicLink(request) {
    return identityRequest("/v1/auth/verify-magic-link", {
      body: request
    });
  },
  /**
   * Generate a cross-domain authentication token
   *
   * @example
   * const result = await identityClient.generateCrossDomainToken({
   *   target: 'space',
   *   accessToken: session.accessToken
   * });
   */
  async generateCrossDomainToken(request) {
    return identityRequest("/v1/auth/cross-domain/generate", {
      body: { target: request.target },
      accessToken: request.accessToken
    });
  },
  /**
   * Exchange a cross-domain token for session tokens
   */
  async exchangeCrossDomainToken(request) {
    return identityRequest("/v1/auth/cross-domain/exchange", {
      body: request
    });
  },
  /**
   * Refresh an access token
   */
  async refreshToken(request) {
    return identityRequest("/v1/auth/refresh", {
      body: { refresh_token: request.refreshToken }
    });
  },
  /**
   * Logout and invalidate tokens
   */
  async logout(accessToken) {
    return identityRequest("/v1/auth/logout", {
      accessToken
    });
  }
};
function getIdentityErrorMessage(result, defaultMessage) {
  const errorMap = {
    "Invalid credentials": "Invalid email or password",
    "User not found": "No account found with this email",
    "Email already exists": "An account with this email already exists",
    "Invalid token": "This link has expired or is invalid",
    "Token expired": "This link has expired. Please request a new one."
  };
  return result.error && errorMap[result.error] || result.error || defaultMessage;
}
export {
  getIdentityErrorMessage as g,
  identityClient as i
};
