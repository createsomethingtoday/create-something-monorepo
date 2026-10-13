// Production-URL validation for listing and integration URLs.
//
// Marketplace listings must point at production surfaces. Hosting previews,
// default platform subdomains, tunnels, localhost, and dev/staging subdomains
// are rejected. Matching is hostname-based on purpose: a path that happens to
// contain "dev", or a custom domain served through Cloudflare, is fine.
//
// Deliberate carve-outs:
// - The testing-site field is never run through this check (it must be a
//   webflow.io staging URL and has its own validator).
// - Install URLs may live on webflow.com (OAuth authorize links); pass
//   { allowWebflowCom: true } for that field only.
// - The .dev TLD is allowed: it is a real production TLD.

const BLOCKED_HOST_SUFFIXES = [
  'webflow.io',
  'webflow-ext.com',
  'vercel.app',
  'now.sh',
  'pages.dev',
  'workers.dev',
  'trycloudflare.com',
  'netlify.app',
  'ngrok.io',
  'ngrok-free.app',
  'ngrok.app',
  'ngrok.dev',
  'loca.lt',
  'local',
  'localhost',
  'internal',
];

const WEBFLOW_COM_SUFFIX = 'webflow.com';

// Whole hostname labels that mark a non-production host (dev.example.com,
// staging.api.example.com). Applied per dot-separated label.
const NON_PRODUCTION_LABELS = /^(dev|develop|development|stage|staging|sandbox|uat|qa|test|testing)$/i;

// Hyphen/underscore-delimited dev tokens inside a label (app-dev.example.com,
// api_staging.example.com). Narrower than the whole-label list so tokens like
// "test" inside longer product names don't false-positive.
const NON_PRODUCTION_LABEL_TOKENS = /(^|[-_])(dev|stage|staging|sandbox|uat|qa)([-_]|$)/i;

function isPrivateIpLiteral(hostname) {
  if (hostname === '0.0.0.0' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
    return true;
  }

  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  if (octets[0] === 10 || octets[0] === 127) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 169 && octets[1] === 254) return true;

  return false;
}

function hostMatchesSuffix(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

// SSRF guard for server-side URL probes: local and private targets only.
// Narrower than isBlockedHostname — probing a staging host is harmless; the
// danger is reaching internal networks.
export function isLocalOrPrivateHostname(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');

  if (!host) {
    return true;
  }

  if (isPrivateIpLiteral(host)) {
    return true;
  }

  return (
    hostMatchesSuffix(host, 'localhost')
    || hostMatchesSuffix(host, 'local')
    || hostMatchesSuffix(host, 'internal')
  );
}

export function isBlockedHostname(hostname, { allowWebflowCom = false } = {}) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');

  if (!host) {
    return true;
  }

  if (isPrivateIpLiteral(host)) {
    return true;
  }

  if (!allowWebflowCom && hostMatchesSuffix(host, WEBFLOW_COM_SUFFIX)) {
    return true;
  }

  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostMatchesSuffix(host, suffix)) {
      return true;
    }
  }

  const labels = host.split('.');
  // Never treat the TLD as a dev marker (.dev is a production TLD).
  const nonTldLabels = labels.slice(0, -1);

  return nonTldLabels.some(
    (label) => NON_PRODUCTION_LABELS.test(label) || NON_PRODUCTION_LABEL_TOKENS.test(label)
  );
}

export function getProductionUrlError(value, { fieldLabel = 'this field', allowWebflowCom = false } = {}) {
  const url = String(value || '').trim();

  if (!url) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    // Malformed URLs are handled by the field's own format validation.
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  if (isBlockedHostname(parsed.hostname, { allowWebflowCom })) {
    return `Enter a production URL for ${fieldLabel}. ${parsed.hostname} looks like a development, staging, or preview host — hosting previews (vercel.app, pages.dev, workers.dev, webflow.io), tunnels, localhost, and dev/staging subdomains aren't accepted.`;
  }

  return null;
}

// Field key → options, shared by the client form and the server runtime so the
// two can never drift.
export const PRODUCTION_URL_FIELDS = [
  { key: 'appWebsiteUrl', label: 'your app website' },
  { key: 'appDocumentationUrl', label: 'your documentation' },
  { key: 'appPrivacyPolicyUrl', label: 'your privacy policy' },
  { key: 'appSupportUrl', label: 'your support page' },
  { key: 'appTermsUrl', label: 'your terms and conditions' },
  { key: 'appInstallUrl', label: 'your install URL', allowWebflowCom: true },
];

export function getProductionUrlFieldErrors(fields = {}) {
  const errors = {};

  for (const { key, label, allowWebflowCom } of PRODUCTION_URL_FIELDS) {
    const raw = fields[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const error = getProductionUrlError(value, { fieldLabel: label, allowWebflowCom });
    if (error) {
      errors[key] = error;
    }
  }

  return errors;
}
