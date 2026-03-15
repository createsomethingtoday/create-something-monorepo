import { randomUUID } from 'node:crypto';

function resolveConfigValue(configValue, envName) {
  if (typeof configValue === 'string' && configValue.trim().length > 0) {
    return configValue.trim();
  }

  if (typeof envName !== 'string' || envName.trim().length === 0) {
    return undefined;
  }

  const envValue = process.env[envName.trim()];
  return typeof envValue === 'string' && envValue.trim().length > 0 ? envValue.trim() : undefined;
}

function parsePrompt(prompt) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return {
      ok: false,
      error: 'Prompt must be a JSON string containing { "method": "...", "params": { ... } }.',
    };
  }

  try {
    const parsed = JSON.parse(prompt);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Prompt JSON must be an object.' };
    }

    if (typeof parsed.method !== 'string' || parsed.method.trim().length === 0) {
      return { ok: false, error: 'Prompt JSON must include a non-empty "method" string.' };
    }

    return {
      ok: true,
      value: {
        id: typeof parsed.id === 'string' && parsed.id.trim().length > 0 ? parsed.id : `promptfoo-${randomUUID()}`,
        jsonrpc: '2.0',
        method: parsed.method,
        params: parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params) ? parsed.params : {},
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function safeJsonParse(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildHeaders(config, hubApiToken, sessionToken) {
  const headers = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    ...(config.headers && typeof config.headers === 'object' ? config.headers : {}),
  };

  if (hubApiToken) {
    headers.Authorization = `Bearer ${hubApiToken}`;
  }

  if (sessionToken) {
    headers['X-MCP-Session-Token'] = sessionToken;
  }

  return headers;
}

export default class HubRpcProvider {
  constructor(options = {}) {
    this.providerId = options.label || options.id || 'hub-rpc-provider';
    this.config = options.config || {};
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context) {
    const hubUrl = resolveConfigValue(this.config.hubUrl, this.config.hubUrlEnv || 'PROMPTFOO_HUB_URL');
    const hubApiToken = resolveConfigValue(
      this.config.hubApiToken,
      this.config.hubApiTokenEnv || 'PROMPTFOO_HUB_API_TOKEN',
    );
    const sessionToken = resolveConfigValue(
      this.config.sessionToken,
      this.config.sessionTokenEnv || 'PROMPTFOO_HUB_SESSION_TOKEN',
    );
    const requireSessionToken = this.config.requireSessionToken === true;
    const timeoutMs = Number(this.config.timeoutMs ?? process.env.PROMPTFOO_HUB_TIMEOUT_MS ?? 15_000);
    const parsedPrompt = parsePrompt(prompt);

    if (!hubUrl) {
      return {
        output: {
          skipped: true,
          reason: 'Set PROMPTFOO_HUB_URL to the Hub /mcp endpoint before running live Promptfoo checks.',
          providerId: this.providerId,
        },
      };
    }

    if (requireSessionToken && !sessionToken) {
      return {
        output: {
          skipped: true,
          reason: 'Set PROMPTFOO_HUB_SESSION_TOKEN to exercise session-required Hub checks.',
          providerId: this.providerId,
        },
      };
    }

    if (!parsedPrompt.ok) {
      return {
        output: {
          skipped: false,
          ok: false,
          status: null,
          durationMs: 0,
          providerId: this.providerId,
          error: parsedPrompt.error,
          rawPrompt: prompt,
        },
        error: parsedPrompt.error,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 15_000);
    const startedAt = Date.now();

    try {
      const response = await fetch(hubUrl, {
        method: 'POST',
        headers: buildHeaders(this.config, hubApiToken, sessionToken),
        body: JSON.stringify(parsedPrompt.value),
        signal: controller.signal,
      });

      const text = await response.text();
      const json = safeJsonParse(text);

      return {
        output: {
          skipped: false,
          ok: response.ok,
          status: response.status,
          durationMs: Date.now() - startedAt,
          providerId: this.providerId,
          request: parsedPrompt.value,
          body: json,
          text,
          auth: {
            hasHubApiToken: Boolean(hubApiToken),
            hasSessionToken: Boolean(sessionToken),
          },
        },
        metadata: {
          status: response.status,
          durationMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        output: {
          skipped: false,
          ok: false,
          status: null,
          durationMs: Date.now() - startedAt,
          providerId: this.providerId,
          request: parsedPrompt.value,
          error: message,
        },
        error: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
