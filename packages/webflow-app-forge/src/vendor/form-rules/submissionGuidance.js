// Advisory (non-blocking) cross-field checks derived from the reasons the
// review team actually sends back submissions — pricing not disclosed, broad
// or undisclosed scopes, review access that expires or is paywalled, and
// listing assets that fail the accessibility bar. Each rule names the
// published guideline it reflects so the message can point developers at it.
//
// Same contract as contentGuidelines / urlGuidance: returns an array of
// { id, category, title, message, fields } and never throws on odd input.

const PRICING_PATTERNS = [
  /\$\s?\d/,
  /\b\d+\s?(usd|eur|gbp)\b/i,
  /\b(per|a|each)\s+(month|year|seat|user|site)\b/i,
  /\b(monthly|annual|yearly)\b/i,
  /\bsubscription\b/i,
  /\bpricing\b/i,
  /\bprice[sd]?\b/i,
  /\bfree\s+(plan|tier|forever|to\s+use)\b/i,
  /\b(paid|pro|premium|business|enterprise|starter)\s+(plan|tier)\b/i,
  /\bcredits?\b/i,
  /\bfree\s+trial\b/i,
  /\bin-app\s+purchase/i,
];

const PAID_SIGNAL_PATTERNS = [
  /\$\s?\d/,
  /\b\d+\s?(usd|eur|gbp)\b/i,
  /\b(per|a|each)\s+(month|year|seat)\b/i,
  /\bsubscriptions?\b/i,
  /\bbilled\b/i,
  /\bupgrade\s+to\b/i,
  /\b(paid|pro|premium|business|enterprise)\s+(plan|tier)\b/i,
  /\bfree\s+(plan|tier|trial)\b/i,
  /\/pricing\b/i,
];

// Words that show the listing tells users the app applies code to their site
// (custom_code:write is only allowed when that is a disclosed feature).
const CODE_DISCLOSURE_PATTERNS = [
  /\bscripts?\b/i,
  /\bcustom\s+code\b/i,
  /\bembed(?:s|ded)?\b/i,
  /\bsnippet\b/i,
  /\b(?:adds?|inject(?:s|ed)?|installs?|places?)\s+(?:a\s+|the\s+)?(?:tracking\s+|loader\s+)?(?:code|script|tag|pixel|widget)\b/i,
  /\bhead\s+code\b/i,
  /\bwidget\b/i,
  /\bpixel\b/i,
];

const UNINSTALL_PATTERNS = [
  /\buninstall/i,
  /\bremov(?:e|es|ed|al)\b/i,
  /\bdisconnect/i,
  /\bclean(?:s|ed)?\s*up\b/i,
];

const PUBLISH_PATTERNS = [
  /\bpublish/i,
  /\bsite\s+settings?\b/i,
  /\bdomain/i,
];

const CREDENTIALS_NA_PATTERN = /^\s*(n\/?a|none|not\s+applicable|no\s+credentials?(\s+needed|\s+required)?)\.?\s*$/i;

const CREDENTIALS_TRIAL_PATTERNS = [
  /\btrial\b/i,
  /\bexpires?\b/i,
  /\bvalid\s+(for|until)\b/i,
  /\b\d+[-\s]?day\b/i,
  /\btemporar/i,
];

const CREDENTIALS_PAYWALL_PATTERNS = [
  /\b(add|enter)\s+(a\s+)?(credit\s+card|payment)/i,
  /\bsubscribe\b/i,
  /\bpurchase\b/i,
  /\bcheckout\b/i,
  /\bupgrade\s+(the\s+)?(account|plan)\b/i,
];

// "Connect your Instagram account" style copy is excluded: that is the
// user's third-party account, not a login to the app itself.
const ACCOUNT_REQUIRED_PATTERNS = [
  /\b(sign|log)\s*(in|up)\b/i,
  /\bcreate\s+an?\s+account\b/i,
  /\bapi\s+key\b/i,
];

const PLACEHOLDER_NAME_PATTERNS = [
  /^\[?\s*workspace\s*\]?$/i,
  /^\[?\s*(my|new|untitled|default)\s+workspace\s*\]?$/i,
  /^(my|test|demo|sample|new|untitled)\s+(app|company|team|workspace)$/i,
  /^(test|demo|sample|untitled|placeholder|tbd|todo|n\/a)$/i,
  /^\[.*\]$/,
];

const ELEVATED_SCOPE_IDS = new Set(['custom-code', 'workspace']);
const BROAD_SCOPE_THRESHOLD = 7;
const MIN_ALT_TEXT_LENGTH = 5;

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function joinText(...parts) {
  return parts
    .map((part) => (Array.isArray(part) ? part.join('\n') : part))
    .map(stripHtml)
    .filter(Boolean)
    .join('\n');
}

function anyMatch(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeScopes(appScopes) {
  if (!Array.isArray(appScopes)) {
    return [];
  }
  return appScopes
    .map((scope) => {
      if (typeof scope === 'string') {
        const [id, access] = scope.split(':');
        return { id: String(id || '').trim().toLowerCase(), access: String(access || '').trim().toLowerCase() };
      }
      return {
        id: String(scope?.id || '').trim().toLowerCase(),
        access: String(scope?.access || '').trim().toLowerCase(),
      };
    })
    .filter((scope) => scope.id);
}

function isWriteAccess(access) {
  return access === 'read-write' || access === 'write';
}

function normalizePaymentTypes(paymentType) {
  const values = Array.isArray(paymentType) ? paymentType : [paymentType];
  return new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean));
}

export function scanSubmissionGuidance({
  appName = '',
  paymentType = [],
  appPreviewDescription = '',
  appDetailDescription = '',
  appFeaturesOverview = [],
  appDeveloperNotes = '',
  appScopes = [],
  scopeJustification = '',
  appAccessCredentials = '',
  appScreenshotAltTexts = [],
  creatorName = '',
} = {}) {
  const warnings = [];

  const listingText = joinText(appPreviewDescription, appDetailDescription, appFeaturesOverview);
  const listingAndNotes = joinText(listingText, appDeveloperNotes);
  const payment = normalizePaymentTypes(paymentType);
  const scopes = normalizeScopes(appScopes);
  const scopeIds = new Set(scopes.map((scope) => scope.id));
  const justification = String(scopeJustification || '').trim();

  // --- Pricing (guidelines: Monetization; submitting: document pricing) ---
  // Many approved paid apps keep prices on their website, so this only fires
  // when there is also nothing for the reviewer in Additional Notes.
  const notesText = stripHtml(appDeveloperNotes);
  if (payment.has('paid') && listingText && !notesText && !anyMatch(PRICING_PATTERNS, listingAndNotes)) {
    warnings.push({
      id: 'pricing-undisclosed',
      category: 'pricing',
      title: 'Tell reviewers how the paid tier works.',
      message: 'You marked the app as Paid, but neither the listing nor Additional Notes describe what costs money. Reviews are returned when the required plan, price, or credit limits are unclear. Add a short pricing summary to Additional Notes (plans, what is gated, and how the reviewer account is unlocked).',
      fields: ['paymentType', 'appDeveloperNotes'],
    });
  }

  if (payment.has('free') && !payment.has('paid') && anyMatch(PAID_SIGNAL_PATTERNS, listingText)) {
    warnings.push({
      id: 'pricing-mismatch',
      category: 'pricing',
      title: 'Listing mentions paid plans but the app is marked Free only.',
      message: 'The description refers to prices, subscriptions, upgrades, or a trial. Reviewers check that the payment type matches the copy: mark the app Paid (or Free and Paid) if any functionality costs money, or remove the paid language. A trial alone does not qualify as Free.',
      fields: ['paymentType', 'appDetailDescription'],
    });
  }

  // --- Scopes (guidelines: Scopes and least privilege, App-delivered code) ---
  if (scopeIds.has('custom-code') && listingText && !anyMatch(CODE_DISCLOSURE_PATTERNS, listingText)) {
    warnings.push({
      id: 'scope-custom-code-disclosure',
      category: 'scopes',
      title: 'Custom Code access requires the listing to disclose the code your app applies.',
      message: 'You request the Custom Code scope, but the listing does not mention any script, embed, or code the app adds to users\' sites. The guidelines require the listing to state what code the app applies, what it does, where it runs, and why. Add that disclosure, or remove the scope if the app does not apply code.',
      fields: ['appScopes', 'appDetailDescription'],
    });
  }

  if (scopeIds.has('custom-code') && listingText && !anyMatch(UNINSTALL_PATTERNS, listingAndNotes)) {
    warnings.push({
      id: 'scope-custom-code-uninstall',
      category: 'scopes',
      title: 'Explain how applied code is removed on uninstall.',
      message: 'Apps that apply code to a site must remove it when the user uninstalls or disconnects. Reviewers return submissions where this is not described or not demonstrated. Describe the uninstall behavior in the listing or Additional Notes, and show it in the demo video.',
      fields: ['appScopes', 'appDeveloperNotes'],
    });
  }

  if (scopeIds.has('workspace') && !justification) {
    warnings.push({
      id: 'scope-workspace-justification',
      category: 'scopes',
      title: 'Workspace scopes need a justification.',
      message: 'Workspace-level scopes are only approved when site-level access is not sufficient. Explain which feature needs Workspace access and which endpoints it calls in the scope justification field.',
      fields: ['appScopes', 'scopeJustification'],
    });
  }

  const sitesScope = scopes.find((scope) => scope.id === 'sites');
  if (sitesScope && isWriteAccess(sitesScope.access) && listingText && !anyMatch(PUBLISH_PATTERNS, listingAndNotes)) {
    warnings.push({
      id: 'scope-sites-write',
      category: 'scopes',
      title: 'Sites write access is usually only needed to publish.',
      message: 'You request read and write access to Sites, but the listing does not mention publishing or changing site settings. If the app only reads site data, choose read-only. If it publishes on the user\'s behalf, say so in the listing and justify it.',
      fields: ['appScopes'],
    });
  }

  if (scopes.length >= BROAD_SCOPE_THRESHOLD && !justification) {
    warnings.push({
      id: 'scope-broad-set',
      category: 'scopes',
      title: `You request ${scopes.length} scopes. Map each one to a feature.`,
      message: 'Every scope must be required by a feature and invoked by a documented API endpoint the app calls. Broad scope sets are returned when that mapping is missing. Use the scope justification field to list each scope, the feature that needs it, and the endpoint it calls — and drop scopes the app does not use.',
      fields: ['appScopes', 'scopeJustification'],
    });
  } else if (scopes.some((scope) => ELEVATED_SCOPE_IDS.has(scope.id) || (isWriteAccess(scope.access) && scope.id !== 'cms')) && !justification && scopes.length > 0) {
    warnings.push({
      id: 'scope-justification-suggested',
      category: 'scopes',
      title: 'Add a scope-to-feature map to speed up review.',
      message: 'Reviewers ask for a scope-to-feature-to-endpoint mapping when write or elevated scopes are requested. Providing it up front in the scope justification field avoids a round trip.',
      fields: ['appScopes', 'scopeJustification'],
    });
  }

  // --- Review access (submitting: Grant Webflow access; guidelines: Submission Prep) ---
  const credentials = String(appAccessCredentials || '').trim();
  if (credentials) {
    if (CREDENTIALS_NA_PATTERN.test(credentials)) {
      if (payment.has('paid') || anyMatch(ACCOUNT_REQUIRED_PATTERNS, listingText)) {
        warnings.push({
          id: 'credentials-na-but-account',
          category: 'review-access',
          title: 'Credentials say N/A, but the app appears to need an account or paid plan.',
          message: 'Reviewers will not sign up, enter payment details, or complete a checkout. If users sign in to your service or any feature is paid, provide a standing account with every tier unlocked, or explain in Additional Notes why no login is needed.',
          fields: ['appAccessCredentials'],
        });
      }
    } else {
      if (anyMatch(CREDENTIALS_TRIAL_PATTERNS, credentials)) {
        warnings.push({
          id: 'credentials-trial',
          category: 'review-access',
          title: 'Review access must not expire.',
          message: 'The credentials mention a trial or expiry. Reviews are returned when the reviewer account\'s trial ends mid-review. Provide standing access that stays unlocked until the review completes.',
          fields: ['appAccessCredentials'],
        });
      }
      if (anyMatch(CREDENTIALS_PAYWALL_PATTERNS, credentials)) {
        warnings.push({
          id: 'credentials-paywall',
          category: 'review-access',
          title: 'Reviewers will not pay, subscribe, or enter a card.',
          message: 'The credentials ask the reviewer to subscribe, purchase, or add payment details. Provide an account that already has the highest tier unlocked, a 100% promo code applied in advance, or a sandbox plan.',
          fields: ['appAccessCredentials'],
        });
      }
    }
  }

  // --- Listing assets (listing: alt text; guidelines: Accessibility) ---
  const altTexts = (Array.isArray(appScreenshotAltTexts) ? appScreenshotAltTexts : [])
    .map((text) => String(text || '').trim())
    .filter(Boolean);
  const normalizedAppName = String(appName || '').trim().toLowerCase();
  const normalizedAltTexts = altTexts.map((text) => text.toLowerCase());
  const duplicateAltText = new Set(normalizedAltTexts).size < normalizedAltTexts.length;
  const altTextIsAppName = normalizedAppName && normalizedAltTexts.some((text) => text === normalizedAppName);
  const altTextTooShort = altTexts.some((text) => text.length < MIN_ALT_TEXT_LENGTH);

  if (altTexts.length > 0 && (duplicateAltText || altTextIsAppName || altTextTooShort)) {
    const reasons = [];
    if (duplicateAltText) reasons.push('two or more screenshots share the same alt text');
    if (altTextIsAppName) reasons.push('alt text repeats the app name');
    if (altTextTooShort) reasons.push('alt text is too short to describe the image');
    warnings.push({
      id: 'screenshot-alt-text-quality',
      category: 'listing-assets',
      title: 'Screenshot alt text must describe each image.',
      message: `Reviewers return listings where ${reasons.join(', ')}. Write a sentence per screenshot describing what the image shows (for example, "Settings panel with field mapping between CMS and calendar").`,
      fields: ['appScreenshotAltTexts'],
    });
  }

  // --- Publisher identity (listing: publisher branding; guidelines: Branding) ---
  const creator = String(creatorName || '').trim();
  if (creator && anyMatch(PLACEHOLDER_NAME_PATTERNS, creator)) {
    warnings.push({
      id: 'placeholder-creator-name',
      category: 'branding',
      title: 'Creator name looks like a placeholder.',
      message: 'The publisher name shown on the listing must be your real name or company. Default workspace names and placeholders like "[workspace]" or "My App" are returned in review. Also rename your Developer Workspace and add its icon, since both appear on the listing.',
      fields: ['creatorName'],
    });
  }

  return warnings;
}

export const SUBMISSION_GUIDANCE_WARNING_IDS = [
  'pricing-undisclosed',
  'pricing-mismatch',
  'scope-custom-code-disclosure',
  'scope-custom-code-uninstall',
  'scope-workspace-justification',
  'scope-sites-write',
  'scope-broad-set',
  'scope-justification-suggested',
  'credentials-na-but-account',
  'credentials-trial',
  'credentials-paywall',
  'screenshot-alt-text-quality',
  'placeholder-creator-name',
];
