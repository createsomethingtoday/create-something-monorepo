const LEAD_GEN_PATTERNS = [
  /site\s+refresh/i,
  /brand\s+strategy/i,
  /reach\s+out/i,
  /contact\s+us\s+for/i,
  /hire\s+us/i,
  /our\s+agency/i,
  /get\s+expert\s+help/i,
  /book\s+(?:a\s+)?call/i,
];

const THIRD_PARTY_BRANDS = [
  'Telegram',
  'WhatsApp',
  'Google Business Profile',
  'Google',
  'Meta',
  'Instagram',
  'PayPal',
  'Venmo',
  'Apple Pay',
  'Stripe',
  'Shopify',
  'HubSpot',
  'Salesforce',
];

const BETA_PATTERNS = [
  /\bbeta\b/i,
  /\bearly\s+access\b/i,
  /\bcoming\s+soon\b/i,
  /\bwaitlist\b/i,
  /\binvite\s+only\b/i,
  /\bpreview\s+release\b/i,
];

// Internal-draft residue that reads as a non-production listing. The
// (Headline)/(Copy)/(Subhead) markers are copy-template labels that have
// shipped in real submissions.
const STAGING_LANGUAGE_PATTERNS = [
  /\bstaging\b/i,
  /\binternal\s+(use|only|review|draft)\b/i,
  /\blorem\s+ipsum\b/i,
  /\bdo\s+not\s+publish\b/i,
  /\(\s*(headline|subhead|copy)\s*\)/i,
];

// Long descriptions support Markdown but not links (listing docs). Checked on
// the raw value so <a> tags are seen before HTML stripping.
const LINK_PATTERNS = [
  /\[[^\]]*\]\(\s*(https?:|www\.)/i,
  /\bhttps?:\/\//i,
  /\bwww\.[a-z0-9-]+\.[a-z]{2,}/i,
  /<a[\s>]/i,
];

const WEBFLOW_NAME_PATTERN = /webflow/i;

// Absolute or unverifiable claims. Reviewers return copy that promises
// outcomes the implementation cannot demonstrate ("100% accurate", "never
// misses", "guaranteed rankings"). Superlatives are flagged only when framed as
// a market claim, so "the best way to ..." style phrasing is left alone.
const UNVERIFIABLE_CLAIM_PATTERNS = [
  /\b100\s?%\s+(accurate|accuracy|secure|safe|compliant|guaranteed|reliable|uptime)\b/i,
  /\bguarantee[sd]?\b/i,
  /\b(never|zero)\s+(fails?|errors?|mistakes?|downtime|misses)\b/i,
  /\b(always|perfectly)\s+(accurate|correct|works)\b/i,
  /\bfully\s+(automatic|autonomous)\b/i,
  /\b(#\s?1|number\s+one)\s+(app|tool|solution|plugin)\b/i,
  /\bthe\s+(only|first|best|most\s+\w+)\s+(?:[\w-]+\s+){0,2}(app|tool|solution|plugin|integration)\s+(for|on|in)\b/i,
  /\b(boost|increase|improve)s?\s+(your\s+)?(seo|rankings?|traffic|conversions?|sales)\s+by\s+\d+/i,
  /\b(rather\s+than|instead\s+of|without)\s+(improvising|hallucinating|guessing|making\s+things\s+up)\b/i,
  /\bwithout\s+(any\s+)?(errors|mistakes|hallucinations)\b/i,
];

// Install instructions that bypass the Custom Code API. Marketplace apps must
// deliver site code through Webflow so users can see, manage, and remove it;
// listings that tell users to paste a snippet into head/footer code are
// returned.
const MANUAL_SNIPPET_PATTERNS = [
  /\b(copy|paste|add|place|insert|put)\b[^.]{0,60}\b(snippet|script\s+tag|embed\s+code|tracking\s+code|this\s+code|the\s+code|loader)\b[^.]{0,60}\b(head|footer|body|custom\s+code|site\s+settings|page\s+settings|embed\s+element)\b/i,
  /\b(head|footer)\s+code\s+(section|settings|area)\b/i,
  /\bcustom\s+code\s+(tab|section|settings)\b[^.]{0,40}\b(paste|add|copy)\b/i,
  /\bpaste\b[^.]{0,40}\b(into|in)\s+(your|the)\s+(site|page|project)\b/i,
  /\bembed\s+element\b[^.]{0,40}\b(paste|add|copy)\b/i,
];

// Reading the published site instead of the Webflow APIs. Apps that ask for a
// site URL, crawl, or scrape Webflow-hosted pages are returned under the data
// access rules ("only use official Webflow APIs").
const PUBLISHED_SITE_READ_PATTERNS = [
  /\b(enter|paste|type|provide|input|submit)\b[^.]{0,40}\b(your|the|a)\s+(?:[\w-]+\s+){0,2}(site|website|domain|page)\s+(url|address|link|domain)\b/i,
  /\b(crawl|scrape|scrap|spider)(s|es|ing|ed)?\s+(your|the|any|each|all)?\s*(?:[\w-]+\s+){0,2}(site|website|pages?|domain)\b/i,
  /\bscan(s|ning|ned)?\s+(your|the)\s+(?:[\w-]+\s+){0,2}(site|website|pages?|domain)\b/i,
  /\b(reads?|fetch(es)?|pulls?)\s+(your|the)\s+(live|published)\s+(site|website|pages?)\b/i,
];

// A match is discounted when the preceding words negate it ("does not
// guarantee", "no need to paste", "money-back guarantee", "aren't always
// accurate"). Checked on the 40 characters before the match.
const NEGATION_BEFORE_PATTERN = /(\bno\b|\bnot\b|n't\b|\bnever\b|\bwithout\b|\bmoney[- ]back\b|\bremov\w*\s+the\s+need\b|\binstead\s+of\b|\brather\s+than\b)\s*(?:[\w'-]+\s+){0,3}$/i;

// Cloudflare's managed WAF in front of the submission endpoints blocks any
// request body containing "<script" (see 2026-09-11 incident). The developer
// sees an opaque 403 page and cannot submit. Warn before that happens.
const SCRIPT_TAG_PATTERN = /<\s*script\b/i;

// Major non-Latin script ranges: Greek, Cyrillic, Hebrew, Arabic, Devanagari,
// Thai, Hiragana/Katakana, CJK, Hangul. A short brand name in another script
// stays under the threshold; listing copy written in one of these scripts does not.
const NON_LATIN_SCRIPT_PATTERN = /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿऀ-ॿ฀-๿぀-ヿ一-鿿가-힯]/g;
const NON_LATIN_WARNING_THRESHOLD = 10;

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeFeatures(features) {
  if (Array.isArray(features)) {
    return features.join('\n');
  }
  return String(features || '');
}

function firstPatternMatch(patterns, fields) {
  for (const field of fields) {
    const text = field.text || '';
    const pattern = patterns.find((candidate) => candidate.test(text));
    if (pattern) {
      return field.name;
    }
  }
  return '';
}

// Like firstPatternMatch, but skips matches whose preceding words negate the
// claim. A pattern that itself starts with "without" is exempt from the
// "without" negation so "without errors" still counts.
function firstUnnegatedMatch(patterns, fields) {
  for (const field of fields) {
    const text = field.text || '';
    for (const pattern of patterns) {
      const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
      let match;
      while ((match = global.exec(text)) !== null) {
        const before = text.slice(Math.max(0, match.index - 40), match.index);
        const selfNegating = /^without/i.test(match[0]);
        if (!NEGATION_BEFORE_PATTERN.test(before) || (selfNegating && !/(\bno\b|\bnot\b|n't\b|\bnever\b)\s*(?:[\w'-]+\s+){0,3}$/i.test(before))) {
          return field.name;
        }
        if (match[0].length === 0) global.lastIndex += 1;
      }
    }
  }
  return '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findNonEnglishField(fields) {
  for (const field of fields) {
    const matches = (field.text || '').match(NON_LATIN_SCRIPT_PATTERN);
    if (matches && matches.length >= NON_LATIN_WARNING_THRESHOLD) {
      return field.name;
    }
  }
  return '';
}

function findThirdPartyBrands(fields) {
  const matches = new Set();

  for (const field of fields) {
    for (const brand of THIRD_PARTY_BRANDS) {
      const pattern = new RegExp(`\\b${escapeRegExp(brand)}\\b`, 'i');
      if (pattern.test(field.text || '')) {
        matches.add(brand);
      }
    }
  }

  return [...matches];
}

export function scanListingCopy({
  appName = '',
  appPreviewDescription = '',
  appDetailDescription = '',
  appFeaturesOverview = [],
  appWebsiteUrl = '',
  appSupportEmail = '',
} = {}) {
  const rawDetailDescription = String(appDetailDescription || '');
  const fields = {
    appName: stripHtml(appName),
    appPreviewDescription: stripHtml(appPreviewDescription),
    appDetailDescription: stripHtml(appDetailDescription),
    appFeaturesOverview: stripHtml(normalizeFeatures(appFeaturesOverview)),
    appWebsiteUrl: stripHtml(appWebsiteUrl),
  };

  const warnings = [];

  const leadGenField = firstPatternMatch(LEAD_GEN_PATTERNS, [
    { name: 'appDetailDescription', text: fields.appDetailDescription },
    { name: 'appFeaturesOverview', text: fields.appFeaturesOverview },
    { name: 'appWebsiteUrl', text: fields.appWebsiteUrl },
  ]);
  if (leadGenField) {
    warnings.push({
      id: 'agency-lead-gen',
      category: 'agency-lead-gen',
      title: 'App listing copy may read like agency or consulting services.',
      message: 'Descriptions should explain your app functionality, not sell agency, consulting, or implementation services. This copy may be flagged in Marketplace review.',
      fields: [leadGenField],
    });
  }

  const brands = findThirdPartyBrands([
    { name: 'appName', text: fields.appName },
    { name: 'appPreviewDescription', text: fields.appPreviewDescription },
    { name: 'appDetailDescription', text: fields.appDetailDescription },
  ]);
  if (brands.length > 0) {
    warnings.push({
      id: 'third-party-brand',
      category: 'third-party-brand',
      title: 'Third-party brand usage may need a disclaimer.',
      message: `Using ${brands.join(', ')} may require permission. If your app integrates with but is not affiliated with the brand, add a clear non-affiliation disclaimer to your listing.`,
      fields: ['appName', 'appPreviewDescription', 'appDetailDescription'],
      matches: brands,
    });
  }

  const nonEnglishField = findNonEnglishField([
    { name: 'appName', text: fields.appName },
    { name: 'appPreviewDescription', text: fields.appPreviewDescription },
    { name: 'appDetailDescription', text: fields.appDetailDescription },
  ]);
  if (nonEnglishField) {
    warnings.push({
      id: 'non-english-listing',
      category: 'non-english-listing',
      title: 'Marketplace listings must be written in English.',
      message: 'Your listing content appears to be written in another language. Rewrite the listing (name, descriptions, feature list) in English. If your app\'s user experience operates in a non-English language, keep the listing in English and state which language the app operates in within your description.',
      fields: [nonEnglishField],
    });
  }

  const betaField = firstPatternMatch(BETA_PATTERNS, [
    { name: 'appName', text: fields.appName },
    { name: 'appPreviewDescription', text: fields.appPreviewDescription },
    { name: 'appDetailDescription', text: fields.appDetailDescription },
  ]);
  if (betaField) {
    warnings.push({
      id: 'beta-language',
      category: 'beta-language',
      title: 'Beta or early-access language may signal the app is not production-ready.',
      message: 'Marketplace apps should be production-ready. Remove beta, early-access, coming-soon, waitlist, invite-only, or preview-release language before submitting.',
      fields: [betaField],
    });
  }

  const stagingField = firstPatternMatch(STAGING_LANGUAGE_PATTERNS, [
    { name: 'appName', text: fields.appName },
    { name: 'appPreviewDescription', text: fields.appPreviewDescription },
    { name: 'appDetailDescription', text: fields.appDetailDescription },
    { name: 'appFeaturesOverview', text: fields.appFeaturesOverview },
  ]);
  if (stagingField) {
    warnings.push({
      id: 'staging-language',
      category: 'staging-language',
      title: 'Listing copy contains staging or internal-draft language.',
      message: 'Marketplace listings must describe the production app. Remove staging labels, internal-review notes, placeholder text, and copy-template markers like (Headline) or (Copy) before submitting.',
      fields: [stagingField],
    });
  }

  const detailHasLink = LINK_PATTERNS.some((pattern) => pattern.test(rawDetailDescription));
  if (detailHasLink) {
    warnings.push({
      id: 'long-description-links',
      category: 'long-description-links',
      title: 'Long descriptions support Markdown but not links.',
      message: 'Links do not render in the long description and may be flagged in review. Put URLs in your website, documentation, and support fields, and mention those destinations by name in the description instead.',
      fields: ['appDetailDescription'],
    });
  }

  if (WEBFLOW_NAME_PATTERN.test(fields.appName)) {
    warnings.push({
      id: 'webflow-marks-name',
      category: 'webflow-marks',
      title: 'App names may not use the Webflow name.',
      message: 'Using Webflow in your app name implies affiliation and is flagged as a trademark issue in review. Name the app after your product; the Marketplace context already tells users it works with Webflow.',
      fields: ['appName'],
    });
  }

  const claimField = firstUnnegatedMatch(UNVERIFIABLE_CLAIM_PATTERNS, [
    { name: 'appPreviewDescription', text: fields.appPreviewDescription },
    { name: 'appDetailDescription', text: fields.appDetailDescription },
    { name: 'appFeaturesOverview', text: fields.appFeaturesOverview },
  ]);
  if (claimField) {
    warnings.push({
      id: 'unverifiable-claims',
      category: 'unverifiable-claims',
      title: 'Listing copy makes a claim reviewers cannot verify.',
      message: 'Absolute promises ("100% accurate", "guaranteed", "never fails", "the only tool for") and hard numbers about outcomes are returned in review unless the implementation demonstrates them. Describe what the app does; drop the guarantee or quantify it with something the reviewer can check.',
      fields: [claimField],
    });
  }

  const manualSnippetField = firstUnnegatedMatch(MANUAL_SNIPPET_PATTERNS, [
    { name: 'appDetailDescription', text: fields.appDetailDescription },
    { name: 'appFeaturesOverview', text: fields.appFeaturesOverview },
  ]);
  if (manualSnippetField) {
    warnings.push({
      id: 'manual-snippet-install',
      category: 'manual-snippet-install',
      title: 'Listing describes a copy-and-paste code install.',
      message: 'Marketplace apps must apply site code through the Custom Code API (a Data Client or Hybrid app with the Custom Code scope) so users can see, manage, and remove it. Listings that tell users to paste a snippet into head, footer, or embed code are returned. If your app still relies on a manual paste, change the install path before submitting.',
      fields: [manualSnippetField],
    });
  }

  const publishedSiteField = firstUnnegatedMatch(PUBLISHED_SITE_READ_PATTERNS, [
    { name: 'appDetailDescription', text: fields.appDetailDescription },
    { name: 'appFeaturesOverview', text: fields.appFeaturesOverview },
  ]);
  if (publishedSiteField) {
    warnings.push({
      id: 'published-site-read',
      category: 'published-site-read',
      title: 'Listing describes reading the published site instead of using Webflow APIs.',
      message: 'Apps must read site content through the Data and Designer APIs, not by asking users for a site URL or crawling Webflow-hosted pages. Recent submissions that request a site URL or scan the live site were returned under the data access rules. If your app audits the published site, say so plainly and read everything it can through the API for the authorized site.',
      fields: [publishedSiteField],
    });
  }

  const scriptTagField = [
    { name: 'appDetailDescription', text: rawDetailDescription },
    { name: 'appPreviewDescription', text: String(appPreviewDescription || '') },
    { name: 'appFeaturesOverview', text: normalizeFeatures(appFeaturesOverview) },
  ].find((field) => SCRIPT_TAG_PATTERN.test(field.text || ''))?.name;
  if (scriptTagField) {
    warnings.push({
      id: 'script-tag-in-copy',
      category: 'script-tag-in-copy',
      title: 'Remove the literal <script> tag — submissions containing it are blocked.',
      message: 'A security filter in front of this form rejects any submission whose text contains "<script", and the failure shows as an unexplained error. Describe the tag in words (for example, "loads the widget script from app.example.com") or write it as "script tag" without angle brackets.',
      fields: [scriptTagField],
    });
  }

  const supportEmail = String(appSupportEmail || '').trim().toLowerCase();
  if (supportEmail && supportEmail.includes('webflow') && !/@webflow\.com$/.test(supportEmail)) {
    warnings.push({
      id: 'webflow-marks-support-email',
      category: 'webflow-marks',
      title: 'Support email reads like a Webflow address.',
      message: 'A support address containing "webflow" on your own domain can read as Webflow\'s official support desk. Use a neutral address on your domain and make clear in your listing who provides support.',
      fields: ['appSupportEmail'],
    });
  }

  return warnings;
}

export const CONTENT_GUIDELINE_WARNING_IDS = [
  'agency-lead-gen',
  'third-party-brand',
  'beta-language',
  'non-english-listing',
  'staging-language',
  'long-description-links',
  'webflow-marks-name',
  'webflow-marks-support-email',
  'unverifiable-claims',
  'manual-snippet-install',
  'published-site-read',
  'script-tag-in-copy',
];
