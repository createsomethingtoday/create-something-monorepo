/**
 * Marketplace custom-code policy shared by the Webflow Way Validator,
 * submission preflight, and the published-site validation Worker.
 *
 * Policy source: Webflow Marketplace template submission guidelines.
 * Keep changes versioned because persisted Validator results bind to this value.
 */
export const CUSTOM_CODE_POLICY_VERSION = 'marketplace-custom-code.v1';

export const CUSTOM_CODE_POLICY_IDS = Object.freeze({
  EXTERNAL_LIBRARY_NOT_ALLOWED: 'custom-code.external-library-not-allowed',
  INLINE_SCRIPT_NOT_ALLOWED: 'custom-code.inline-script-not-allowed',
  APPROVED_GSAP: 'custom-code.approved-gsap',
  VALIDATOR_REVIEW_BRIDGE: 'validator-review-bridge',
  WEBFLOW_PLATFORM_SCRIPT: 'custom-code.webflow-platform-script',
  NON_EXECUTABLE_SCRIPT_DATA: 'custom-code.non-executable-script-data'
});

const VALIDATOR_REVIEW_BRIDGE_URL =
  'https://validation-worker.createsomething.workers.dev/app-validator/snippet/review.js';

const EXECUTABLE_SCRIPT_TYPES = new Set([
  '',
  'application/ecmascript',
  'application/javascript',
  'module',
  'text/ecmascript',
  'text/javascript'
]);

function resolveScriptUrl(source, pageUrl) {
  try {
    return new URL(source, pageUrl).href;
  } catch {
    return source;
  }
}

function isWebflowRuntimeUrl(url, pageUrl) {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;

  if (
    hostname === 'ajax.googleapis.com' &&
    /^\/ajax\/libs\/webfont\/[^/]+\/webfont\.js$/i.test(pathname)
  ) {
    return true;
  }

  if (
    hostname === 'd3e54v103j8qbb.cloudfront.net' &&
    /^\/js\/jquery-[\d.]+\.min(?:\.[a-f0-9]+)?\.js$/i.test(pathname)
  ) {
    return true;
  }

  if (
    (hostname === 'cdn.prod.website-files.com' || hostname === 'assets-global.website-files.com') &&
    /^\/[a-f0-9]{24}\/js\/webflow(?:\.schunk)?(?:\.[a-z0-9_-]+)+\.js$/i.test(pathname)
  ) {
    return true;
  }

  try {
    const published = new URL(pageUrl);
    return (
      url.origin === published.origin &&
      /^\/js\/webflow(?:\.schunk)?(?:\.[a-z0-9_-]+)+\.js$/i.test(pathname)
    );
  } catch {
    return false;
  }
}

function isApprovedGsapUrl(url) {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname;
  if (/\/ScrollSmoother(?:\.min)?\.js$/i.test(pathname)) return false;

  if (
    hostname === 'cdn.prod.website-files.com' &&
    /^\/gsap\/\d+(?:\.\d+){1,2}\/[a-z0-9_-]+(?:\.min)?\.js$/i.test(pathname)
  ) {
    return true;
  }

  if (
    hostname === 'cdnjs.cloudflare.com' &&
    /^\/ajax\/libs\/gsap\/\d+(?:\.\d+){1,2}\/[a-z0-9_-]+(?:\.min)?\.js$/i.test(pathname)
  ) {
    return true;
  }

  if (
    hostname === 'cdn.jsdelivr.net' &&
    /^\/npm\/gsap@[^/]+\/dist\/[a-z0-9_-]+(?:\.min)?\.js$/i.test(pathname)
  ) {
    return true;
  }

  if (
    hostname === 'unpkg.com' &&
    /^\/gsap@[^/]+\/dist\/[a-z0-9_-]+(?:\.min)?\.js$/i.test(pathname)
  ) {
    return true;
  }

  return (
    hostname === 'assets.codepen.io' &&
    /^\/assets\/common\/gsap(?:\/\d+(?:\.\d+){1,2})?\/[a-z0-9_-]+(?:\.min)?\.js$/i.test(pathname)
  );
}

export function classifyExternalScriptSource(source, pageUrl) {
  const resolvedSrc = resolveScriptUrl(source, pageUrl);
  let url;
  try {
    url = new URL(resolvedSrc);
  } catch {
    return {
      allowed: false,
      policy: CUSTOM_CODE_POLICY_IDS.EXTERNAL_LIBRARY_NOT_ALLOWED,
      message: 'External script source is invalid and is not an approved Marketplace exception.',
      resolvedSrc
    };
  }

  if (url.href === VALIDATOR_REVIEW_BRIDGE_URL) {
    return {
      allowed: true,
      policy: CUSTOM_CODE_POLICY_IDS.VALIDATOR_REVIEW_BRIDGE,
      message: 'Webflow Way Validator review bridge (allowed).',
      resolvedSrc
    };
  }

  if (isApprovedGsapUrl(url)) {
    return {
      allowed: true,
      policy: CUSTOM_CODE_POLICY_IDS.APPROVED_GSAP,
      message: 'Approved GSAP runtime (allowed).',
      resolvedSrc
    };
  }

  if (isWebflowRuntimeUrl(url, pageUrl)) {
    return {
      allowed: true,
      policy: CUSTOM_CODE_POLICY_IDS.WEBFLOW_PLATFORM_SCRIPT,
      message: 'Webflow platform runtime (allowed).',
      resolvedSrc
    };
  }

  return {
    allowed: false,
    policy: CUSTOM_CODE_POLICY_IDS.EXTERNAL_LIBRARY_NOT_ALLOWED,
    message:
      'External custom-code libraries are not allowed in Marketplace templates unless the source is an approved GSAP or Webflow platform runtime.',
    resolvedSrc
  };
}

function isValidatorReviewBridgeInlineScript(script) {
  if (!/window\.__WF_REVIEW_BRIDGE\s*=/.test(script)) return false;
  if (
    !script.includes('__wf_review_snippet_v1') ||
    !/bridgeToken\s*:\s*["']wfbt_[a-f0-9]+["']/i.test(script)
  ) {
    return false;
  }

  const withoutConfig = script.replace(/window\.__WF_REVIEW_BRIDGE\s*=\s*\{[\s\S]*?\}\s*;?/, '');
  const withoutLoader = withoutConfig.replace(
    /var\s+s\s*=\s*document\.createElement\(["']script["']\)\s*;\s*s\.src\s*=\s*["'][^"']*\/app-validator\/snippet\/review\.js["']\s*;\s*document\.head\.appendChild\(s\)\s*;?/,
    ''
  );
  const hasReviewUrl =
    script.includes('/app-validator/snippet/review.js') ||
    /reviewScriptUrl\s*:\s*["'][^"']+\/app-validator\/snippet\/review\.js["']/i.test(script);

  return hasReviewUrl && withoutLoader.trim() === '';
}

function isWebflowPlatformInlineScript(script) {
  return (
    /!\s*function\s*\(\s*o\s*,\s*c\s*\)\s*\{[\s\S]*?w-mod-/i.test(script) ||
    /^\s*WebFont\.load\s*\(\s*\{[\s\S]*\}\s*\)\s*;?\s*$/.test(script) ||
    /^\s*window\.__WEBFLOW_CURRENCY_SETTINGS\s*=\s*\{[\s\S]*\}\s*;?\s*$/.test(script) ||
    /_handlePasswordPageOnload/.test(script)
  );
}

function containsApprovedGsapUsage(script) {
  return /\b(?:gsap\s*\.|GSAP\s*\.|TweenMax\s*\.|TweenLite\s*\.|TimelineMax\s*\.|TimelineLite\s*\.|ScrollTrigger\b|ScrollSmoother\b|SplitText\b|Draggable\b|MotionPathPlugin\b|Observer\b)/.test(
    script
  );
}

export function classifyInlineScript(script, attributes = '') {
  const content = String(script || '').trim();
  const typeMatch = String(attributes).match(/\btype\s*=\s*["']([^"']+)["']/i);
  const type = typeMatch?.[1]?.trim().toLowerCase() || '';

  if (!content || (!EXECUTABLE_SCRIPT_TYPES.has(type) && type !== 'application/ld+json')) {
    return {
      allowed: true,
      disposition: 'allowed',
      policy: CUSTOM_CODE_POLICY_IDS.NON_EXECUTABLE_SCRIPT_DATA,
      message: 'Non-executable script data (allowed).'
    };
  }

  if (
    type === 'application/ld+json' ||
    /\bclass\s*=\s*["'][^"']*\bw-json\b[^"']*["']/i.test(attributes)
  ) {
    return {
      allowed: true,
      disposition: 'allowed',
      policy: CUSTOM_CODE_POLICY_IDS.NON_EXECUTABLE_SCRIPT_DATA,
      message: 'Structured or Webflow component data (allowed).'
    };
  }

  if (isValidatorReviewBridgeInlineScript(content)) {
    return {
      allowed: true,
      disposition: 'allowed',
      policy: CUSTOM_CODE_POLICY_IDS.VALIDATOR_REVIEW_BRIDGE,
      message: 'Webflow Way Validator review bridge (allowed).'
    };
  }

  if (isWebflowPlatformInlineScript(content)) {
    return {
      allowed: true,
      disposition: 'allowed',
      policy: CUSTOM_CODE_POLICY_IDS.WEBFLOW_PLATFORM_SCRIPT,
      message: 'Webflow platform initialization (allowed).'
    };
  }

  if (containsApprovedGsapUsage(content)) {
    return {
      allowed: true,
      disposition: 'review-gsap',
      policy: CUSTOM_CODE_POLICY_IDS.APPROVED_GSAP,
      message: 'GSAP custom code requires the GSAP-specific validation pass.'
    };
  }

  return {
    allowed: false,
    disposition: 'rejected',
    policy: CUSTOM_CODE_POLICY_IDS.INLINE_SCRIPT_NOT_ALLOWED,
    message:
      'Inline custom JavaScript is not allowed in Marketplace templates unless it is approved GSAP code or a Webflow platform script.'
  };
}

export function extractCustomCodeSurface(html, pageUrl) {
  const externalScripts = [];
  const inlineScripts = [];
  const seenExternal = new Set();
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(String(html || ''))) !== null) {
    const attributes = match[1] || '';
    const content = (match[2] || '').trim();
    const sourceMatch = attributes.match(
      /\bsrc\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/i
    );
    if (sourceMatch) {
      const source = sourceMatch[2] || sourceMatch[3];
      const resolvedSrc = resolveScriptUrl(source, pageUrl);
      if (!seenExternal.has(resolvedSrc)) {
        seenExternal.add(resolvedSrc);
        externalScripts.push({ source, resolvedSrc, attributes });
      }
    } else if (content) {
      inlineScripts.push({ content, attributes });
    }
  }

  const dynamicSourcePattern = /\.src\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  while ((match = dynamicSourcePattern.exec(String(html || ''))) !== null) {
    const source = match[1];
    const resolvedSrc = resolveScriptUrl(source, pageUrl);
    if (!seenExternal.has(resolvedSrc)) {
      seenExternal.add(resolvedSrc);
      externalScripts.push({ source, resolvedSrc, attributes: 'dynamic-script-assignment' });
    }
  }

  return { externalScripts, inlineScripts };
}

export function analyzeCustomCodeHtml(html, pageUrl) {
  const surface = extractCustomCodeSurface(html, pageUrl);
  const findings = [];
  const allowed = [];

  surface.externalScripts.forEach((script, index) => {
    const verdict = classifyExternalScriptSource(script.source, pageUrl);
    const item = {
      kind: 'external',
      index,
      source: verdict.resolvedSrc,
      policy: verdict.policy,
      message: verdict.message
    };
    (verdict.allowed ? allowed : findings).push(item);
  });

  surface.inlineScripts.forEach((script, index) => {
    const verdict = classifyInlineScript(script.content, script.attributes);
    const item = {
      kind: 'inline',
      index,
      policy: verdict.policy,
      message: verdict.message,
      excerpt: script.content.slice(0, 200)
    };
    (verdict.allowed ? allowed : findings).push(item);
  });

  return {
    passed: findings.length === 0,
    policyVersion: CUSTOM_CODE_POLICY_VERSION,
    findings,
    allowed,
    stats: {
      externalScriptCount: surface.externalScripts.length,
      inlineScriptCount: surface.inlineScripts.length,
      rejectedScriptCount: findings.length
    }
  };
}

export function buildCustomCodeSurfaceCanonical(html, pageUrl) {
  const surface = extractCustomCodeSurface(html, pageUrl);
  const external = surface.externalScripts
    .map((script) => script.resolvedSrc)
    .sort()
    .map((source) => `external:${source}`);
  const inline = surface.inlineScripts
    .map((script) =>
      script.content
        .replace(/wfbt_[a-f0-9]+/gi, 'wfbt_[redacted]')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .sort()
    .map((content) => `inline:${content}`);

  return [`policy:${CUSTOM_CODE_POLICY_VERSION}`, ...external, ...inline].join('\n');
}

export async function createCustomCodeSurfaceHash(html, pageUrl) {
  const bytes = new TextEncoder().encode(buildCustomCodeSurfaceCanonical(html, pageUrl));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
