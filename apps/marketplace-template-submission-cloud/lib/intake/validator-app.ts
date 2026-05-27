const DEFAULT_VALIDATOR_WORKER_URL = 'https://validation-worker.createsomething.workers.dev';
const DEFAULT_ASSET_VALIDATOR_URL = 'https://webflow.com/templates/dashboard/assets';
const REVIEW_SNIPPET_MARKER = '__wf_review_snippet_v1';
const REVIEW_SNIPPET_PATH = '/app-validator/snippet/review.js';
const HTML_FETCH_TIMEOUT_MS = 12_000;
const WORKER_FETCH_TIMEOUT_MS = 8_000;

export type ValidatorAppPreflightPolicy = 'disabled' | 'warn' | 'enforce';

export type ValidatorAppPreflightStatus =
  | 'passed'
  | 'bridge_missing'
  | 'result_missing'
  | 'result_failed'
  | 'validator_app_unavailable'
  | 'not_required';

export type ValidatorAppPreflight = {
  required: boolean;
  policy: ValidatorAppPreflightPolicy;
  passed: boolean;
  status: ValidatorAppPreflightStatus;
  message: string;
  issues: string[];
  installUrl: string;
  bridge: {
    configObjectPresent: boolean;
    markerPresent: boolean;
    allowedScriptPresent: boolean;
    version?: string;
    reviewSurface?: string;
    siteIdPresent: boolean;
    bridgeTokenPresent: boolean;
    bridgeTokenHashPrefix?: string;
    rawBridgeTokenStored: false;
  };
  result?: {
    available: boolean;
    passed: boolean;
    submittedAt?: string;
    totalErrors: number;
    totalWarnings: number;
    passedCategories: number;
    failedCategories: number;
    totalCategories: number;
    score: number;
    artifact?: {
      persisted?: boolean;
      key?: string;
      sha256?: string;
    };
  };
};

type BridgeInspection = ValidatorAppPreflight['bridge'] & {
  siteId?: string;
  bridgeTokenSha256?: string;
};

type LatestValidatorResult = {
  status?: string;
  passed?: boolean;
  submittedAt?: string;
  summary?: {
    totalErrors?: number;
    totalWarnings?: number;
    passedCategories?: number;
    failedCategories?: number;
    totalCategories?: number;
    score?: number;
    passed?: boolean;
  };
  artifact?: {
    persisted?: boolean;
    key?: string;
    sha256?: string;
  };
};

function getValidatorWorkerUrl() {
  return (
    process.env.VALIDATOR_APP_WORKER_URL ||
    process.env.NEXT_PUBLIC_VALIDATOR_APP_WORKER_URL ||
    DEFAULT_VALIDATOR_WORKER_URL
  ).replace(/\/$/, '');
}

export function getValidatorAppInstallUrl() {
  return (
    process.env.VALIDATOR_APP_INSTALL_URL ||
    process.env.NEXT_PUBLIC_ASSET_VALIDATOR_URL ||
    DEFAULT_ASSET_VALIDATOR_URL
  ).trim();
}

export function getValidatorAppPreflightPolicy(): ValidatorAppPreflightPolicy {
  const value = (process.env.VALIDATOR_APP_PREFLIGHT_POLICY || 'enforce').trim().toLowerCase();
  return value === 'disabled' || value === 'warn' || value === 'enforce' ? value : 'enforce';
}

function emptyBridge(): ValidatorAppPreflight['bridge'] {
  return {
    configObjectPresent: false,
    markerPresent: false,
    allowedScriptPresent: false,
    siteIdPresent: false,
    bridgeTokenPresent: false,
    rawBridgeTokenStored: false
  };
}

function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fn(controller.signal).finally(() => clearTimeout(timeoutId));
}

async function fetchText(url: string, timeoutMs: number) {
  return await withTimeout(async (signal) => {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml'
      },
      signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  }, timeoutMs);
}

async function fetchJson(url: string, timeoutMs: number) {
  return await withTimeout(async (signal) => {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal
    });
    const data = (await response.json().catch(() => null)) as LatestValidatorResult | null;
    return { response, data };
  }, timeoutMs);
}

function readJsStringProperty(source: string | undefined, key: string) {
  if (!source) return undefined;
  const match = source.match(new RegExp(`${key}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`));
  return match?.[2];
}

function scriptSrcs(html: string) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/gi)]
    .map((match) => match[2])
    .filter(Boolean);
}

function isAllowedReviewScriptUrl(value: string | undefined, inspectedUrl: string) {
  if (!value) return false;
  try {
    const expected = new URL(REVIEW_SNIPPET_PATH, getValidatorWorkerUrl());
    const parsed = new URL(value, inspectedUrl);
    return parsed.hostname === expected.hostname && parsed.pathname === expected.pathname;
  } catch {
    return false;
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function inspectBridge(html: string, inspectedUrl: string): Promise<BridgeInspection> {
  const objectMatch = html.match(/window\.__WF_REVIEW_BRIDGE\s*=\s*\{([\s\S]*?)\}\s*;?/);
  const objectSource = objectMatch?.[1];
  const version = readJsStringProperty(objectSource, 'version');
  const marker = readJsStringProperty(objectSource, 'marker');
  const bridgeToken = readJsStringProperty(objectSource, 'bridgeToken');
  const reviewSurface = readJsStringProperty(objectSource, 'reviewSurface');
  const reviewScriptUrl = readJsStringProperty(objectSource, 'reviewScriptUrl');
  const siteId = readJsStringProperty(objectSource, 'siteId');
  const tokenHash = bridgeToken ? await sha256Hex(bridgeToken) : undefined;
  const allowedScriptPresent =
    scriptSrcs(html).some((src) => isAllowedReviewScriptUrl(src, inspectedUrl)) ||
    isAllowedReviewScriptUrl(reviewScriptUrl, inspectedUrl);

  return {
    configObjectPresent: Boolean(objectMatch),
    markerPresent: marker === REVIEW_SNIPPET_MARKER || html.includes(REVIEW_SNIPPET_MARKER),
    allowedScriptPresent,
    version,
    reviewSurface,
    siteIdPresent: Boolean(siteId),
    bridgeTokenPresent: Boolean(bridgeToken),
    bridgeTokenHashPrefix: tokenHash?.slice(0, 12),
    rawBridgeTokenStored: false,
    siteId,
    bridgeTokenSha256: tokenHash
  };
}

function preflightFailure(params: {
  policy: ValidatorAppPreflightPolicy;
  status: ValidatorAppPreflightStatus;
  message: string;
  issues: string[];
  bridge?: ValidatorAppPreflight['bridge'];
  result?: ValidatorAppPreflight['result'];
}): ValidatorAppPreflight {
  return {
    required: params.policy === 'enforce',
    policy: params.policy,
    passed: false,
    status: params.status,
    message: params.message,
    issues: params.issues,
    installUrl: getValidatorAppInstallUrl(),
    bridge: params.bridge || emptyBridge(),
    result: params.result
  };
}

function toResult(data: LatestValidatorResult | null): NonNullable<ValidatorAppPreflight['result']> {
  const summary = data?.summary || {};
  return {
    available: Boolean(data),
    passed: data?.passed === true || summary.passed === true,
    submittedAt: data?.submittedAt,
    totalErrors: summary.totalErrors || 0,
    totalWarnings: summary.totalWarnings || 0,
    passedCategories: summary.passedCategories || 0,
    failedCategories: summary.failedCategories || 0,
    totalCategories: summary.totalCategories || 0,
    score: summary.score || 0,
    artifact: data?.artifact
  };
}

async function fetchLatestValidatorResult(bridge: BridgeInspection) {
  const latestUrl = new URL('/app-validator/submission/latest', getValidatorWorkerUrl());
  if (bridge.siteId) {
    latestUrl.searchParams.set('siteId', bridge.siteId);
  } else if (bridge.bridgeTokenSha256) {
    latestUrl.searchParams.set('bridgeTokenSha256', bridge.bridgeTokenSha256);
  } else {
    return { status: 404, data: null };
  }

  const { response, data } = await fetchJson(latestUrl.toString(), WORKER_FETCH_TIMEOUT_MS);
  return { status: response.status, data };
}

export async function runValidatorAppSubmissionPreflight(
  normalizedPublishedUrl: string,
  policy: ValidatorAppPreflightPolicy = getValidatorAppPreflightPolicy()
): Promise<ValidatorAppPreflight> {
  if (policy === 'disabled') {
    return {
      required: false,
      policy,
      passed: true,
      status: 'not_required',
      message: 'Validator app preflight is disabled for this environment.',
      issues: [],
      installUrl: getValidatorAppInstallUrl(),
      bridge: emptyBridge()
    };
  }

  let html: string;
  try {
    html = await fetchText(normalizedPublishedUrl, HTML_FETCH_TIMEOUT_MS);
  } catch (error) {
    return preflightFailure({
      policy,
      status: 'validator_app_unavailable',
      message: 'Could not confirm the Validator app bridge on the published site.',
      issues: [
        `Validator bridge check could not fetch the published site (${error instanceof Error ? error.message : 'request failed'}). Try again after publishing.`
      ]
    });
  }

  const bridge = await inspectBridge(html, normalizedPublishedUrl);
  const bridgeReady =
    bridge.configObjectPresent &&
    bridge.markerPresent &&
    bridge.allowedScriptPresent &&
    bridge.bridgeTokenPresent;

  if (!bridgeReady) {
    return preflightFailure({
      policy,
      status: 'bridge_missing',
      message: 'Run the Webflow Way Validator before submitting this template.',
      issues: [
        'The published site is missing the required Validator bridge script or allowed review script source.',
        'Use the Webflow Way Validator action in this form, or open the Asset Dashboard Validator, install or confirm the bridge, publish the site, and validate again.'
      ],
      bridge
    });
  }

  let latest: Awaited<ReturnType<typeof fetchLatestValidatorResult>>;
  try {
    latest = await fetchLatestValidatorResult(bridge);
  } catch (error) {
    return preflightFailure({
      policy,
      status: 'validator_app_unavailable',
      message: 'Could not confirm the latest Validator app result.',
      issues: [
        `Validator result lookup is temporarily unavailable (${error instanceof Error ? error.message : 'request failed'}). Try again in a minute.`
      ],
      bridge
    });
  }

  if (latest.status === 404 || !latest.data || latest.data.status === 'missing') {
    return preflightFailure({
      policy,
      status: 'result_missing',
      message: 'Run the Webflow Way Validator before submitting this template.',
      issues: [
        'The bridge is present, but no persisted Validator app result was found for this site.',
        'Use the Webflow Way Validator action in this form, or open the Asset Dashboard Validator, run validation until the report shows a 100% pass, publish, and validate again.'
      ],
      bridge
    });
  }

  if (latest.status < 200 || latest.status >= 300) {
    return preflightFailure({
      policy,
      status: 'validator_app_unavailable',
      message: 'Could not confirm the latest Validator app result.',
      issues: [`Validator result lookup returned HTTP ${latest.status}. Try again in a minute.`],
      bridge
    });
  }

  const result = toResult(latest.data);
  const resultPassed =
    result.passed &&
    result.score === 100 &&
    result.totalErrors === 0 &&
    result.failedCategories === 0 &&
    result.totalCategories > 0;

  if (!resultPassed) {
    return preflightFailure({
      policy,
      status: 'result_failed',
      message: 'The latest Webflow Way Validator run must be a 100% pass before submission.',
      issues: [
        `Latest Validator result: ${result.score}% pass, ${result.totalErrors} error${result.totalErrors === 1 ? '' : 's'}, ${result.failedCategories} failed categor${result.failedCategories === 1 ? 'y' : 'ies'}.`,
        'Fix the Validator issues in Designer, publish the site, rerun validation, and submit again after it reaches 100%.'
      ],
      bridge,
      result
    });
  }

  return {
    required: policy === 'enforce',
    policy,
    passed: true,
    status: 'passed',
    message: 'Webflow Way Validator bridge and 100% pass result confirmed.',
    issues: [],
    installUrl: getValidatorAppInstallUrl(),
    bridge,
    result
  };
}
