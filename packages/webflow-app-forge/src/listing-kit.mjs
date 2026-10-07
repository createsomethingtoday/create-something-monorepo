// `wf-forge listing <listing.json>`: check Marketplace listing copy, assets,
// and URLs before they reach the submission form.
//
// Rules come from two places:
// - The submission form's own libraries (vendored under src/vendor/form-rules,
//   see VENDOR.json). Those were calibrated against approved and rejected live
//   listings, so a warning here is a warning the form will raise.
// - Published listing specs that the form checks in the browser (pixel
//   dimensions) or does not check at all (feature count, long-description
//   length, Designer Extension capability).
//
// listing.json shape: see `wf-forge listing --example`.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { imageDimensions } from './lib/images.mjs';
import { finding } from './lib/report.mjs';
import { requirementsForCheck } from './lib/registry.mjs';
import { scanListingCopy } from './vendor/form-rules/contentGuidelines.js';
import { scanSubmissionGuidance } from './vendor/form-rules/submissionGuidance.js';
import { scanUrlGuidance } from './vendor/form-rules/urlGuidance.js';
import { getProductionUrlError } from './vendor/form-rules/productionUrls.js';
import { MARKETPLACE_APP_CATEGORIES, MAX_MARKETPLACE_APP_CATEGORIES, findInvalidMarketplaceAppCategories } from './vendor/form-rules/marketplaceCategories.js';
import { APP_ICON_MAX_BYTES, APP_ICON_REQUIRED_SIZE, getAppIconDimensionError } from './vendor/form-rules/appIconSpec.js';

export const LIMITS = {
  appName: 30,
  shortDescription: 100,
  longDescription: 10000,
  features: 5,
  screenshotsMin: 3,
  screenshotsRecommended: 4,
  screenshotsMax: 5,
  screenshotWidth: 1280,
  screenshotHeight: 846,
};

export const EXAMPLE_LISTING = {
  appName: 'Section Namer',
  appCapabilities: 'Designer Extension',
  clientId: '',
  creatorName: 'Acme Studio',
  shortDescription: 'Name every section on the page in one pass, from the Designer.',
  longDescription:
    'Section Namer reads the sections on the current page and lets you give each one a clear name without leaving the Designer.\n\n## What it does\n\n- Lists every section on the page\n- Renames a section in one click\n- Shows which sections still carry a default name\n\nNothing changes until you click Apply.',
  features: ['Lists every section on the page', 'One-click rename', 'Flags default names'],
  categories: ['Design', 'Utilities'],
  paymentType: ['Free'],
  pricingNotes: '',
  websiteUrl: 'https://sectionnamer.example.com',
  documentationUrl: 'https://sectionnamer.example.com/docs',
  privacyPolicyUrl: 'https://sectionnamer.example.com/privacy',
  termsUrl: 'https://sectionnamer.example.com/terms',
  supportEmail: 'support@sectionnamer.example.com',
  supportUrl: '',
  demoVideoUrl: 'https://www.loom.com/share/00000000000000000000000000000000',
  promoVideoUrl: '',
  testingSiteUrl: 'https://section-namer-review.webflow.io',
  accessCredentials: 'No account needed. The App works on any site once installed.',
  developerNotes: 'Designer Extension only. No Data API calls, no analytics, no external requests.',
  icon: { path: './assets/icon.png', altText: 'Section Namer logomark: three stacked bars' },
  screenshots: [
    { path: './assets/screenshot-1.png', altText: 'Section Namer panel listing five sections on the home page' },
    { path: './assets/screenshot-2.png', altText: 'Renaming the hero section inline' },
    { path: './assets/screenshot-3.png', altText: 'Default-named sections flagged in yellow' },
  ],
};

export function runListingKit(listingPath) {
  const path = resolve(listingPath);
  const base = dirname(path);
  const listing = JSON.parse(readFileSync(path, 'utf8'));
  const findings = [];

  const str = (v) => (v == null ? '' : String(v));
  const name = str(listing.appName).trim();
  const short = str(listing.shortDescription).trim();
  const long = str(listing.longDescription).trim();
  const features = Array.isArray(listing.features) ? listing.features.map(str).filter(Boolean) : [];

  // --- capability
  findings.push(
    listing.appCapabilities === 'Designer Extension'
      ? finding('listing:capability', 'pass', 'required', 'App capability is Designer Extension')
      : finding('listing:capability', 'fail', 'required', `App capability is "${str(listing.appCapabilities) || 'unset'}"`, 'This tool covers Designer Extension-only Apps. A Data Client or Hybrid registration brings OAuth scopes, an Install URL, backend auth, and uninstall cleanup into review.')
  );

  // --- name
  const nameProblems = [];
  if (!name) nameProblems.push('App name is empty');
  if (name.length > LIMITS.appName) nameProblems.push(`App name is ${name.length} characters (limit ${LIMITS.appName})`);
  if (/webflow/i.test(name)) nameProblems.push('App name uses the Webflow mark');
  findings.push(nameProblems.length ? finding('listing:name', 'fail', 'required', 'App name needs work', '', nameProblems) : finding('listing:name', 'pass', 'required', `App name "${name}" (${name.length}/${LIMITS.appName})`));

  // --- short
  const shortProblems = [];
  if (!short) shortProblems.push('Short description is empty');
  if (short.length > LIMITS.shortDescription) shortProblems.push(`Short description is ${short.length} characters (limit ${LIMITS.shortDescription})`);
  findings.push(shortProblems.length ? finding('listing:short', 'fail', 'required', 'Short description needs work', '', shortProblems) : finding('listing:short', 'pass', 'required', `Short description ${short.length}/${LIMITS.shortDescription}`));

  // --- long
  const longProblems = [];
  if (!long) longProblems.push('Long description is empty');
  if (long.length > LIMITS.longDescription) longProblems.push(`Long description is ${long.length} characters (limit ${LIMITS.longDescription})`);
  if (long && long.length < 200) longProblems.push(`Long description is ${long.length} characters; reviewers return vague listings. Say specifically what the App does and for whom.`);
  findings.push(longProblems.length ? finding('listing:long', 'fail', 'required', 'Long description needs work', '', longProblems) : finding('listing:long', 'pass', 'required', `Long description ${long.length}/${LIMITS.longDescription}`));

  // --- features
  findings.push(
    features.length > LIMITS.features
      ? finding('listing:features', 'fail', 'required', `${features.length} features listed (limit ${LIMITS.features})`)
      : finding('listing:features', 'pass', 'required', `${features.length} features listed (limit ${LIMITS.features})`)
  );

  // --- categories
  const categories = Array.isArray(listing.categories) ? listing.categories.map(str) : listing.categories ? [str(listing.categories)] : [];
  const invalid = findInvalidMarketplaceAppCategories(categories);
  const catProblems = [];
  if (categories.length === 0) catProblems.push('No category selected');
  if (categories.length > MAX_MARKETPLACE_APP_CATEGORIES) catProblems.push(`${categories.length} categories (the form accepts ${MAX_MARKETPLACE_APP_CATEGORIES})`);
  if (invalid.length) catProblems.push(`Not in the published list: ${invalid.join(', ')}. Valid: ${MARKETPLACE_APP_CATEGORIES.join(', ')}`);
  findings.push(catProblems.length ? finding('listing:categories', 'fail', 'required', 'Categories need work', '', catProblems) : finding('listing:categories', 'pass', 'required', `Categories: ${categories.join(', ')}`));

  // --- copy (form rules)
  const copyWarnings = scanListingCopy({
    appName: name,
    appPreviewDescription: short,
    appDetailDescription: long,
    appFeaturesOverview: features,
    appWebsiteUrl: str(listing.websiteUrl),
    appSupportEmail: str(listing.supportEmail),
  });
  const englishWarnings = copyWarnings.filter((w) => w.id === 'non-english-listing');
  const otherCopyWarnings = copyWarnings.filter((w) => w.id !== 'non-english-listing');
  findings.push(
    otherCopyWarnings.length === 0
      ? finding('listing:copy', 'pass', 'required', 'Listing copy passes the form\'s content rules')
      : finding('listing:copy', 'fail', 'required', 'Listing copy would be flagged by the form', 'These are the submission form\'s own content rules.', otherCopyWarnings.map((w) => `${w.id}: ${w.message}`))
  );
  if (englishWarnings.length) {
    findings.push(finding('listing:copy', 'fail', 'suggested', 'Listing copy may not be in English', '', englishWarnings.map((w) => w.message)));
  }

  // --- submission guidance (pricing, credentials, alt text, creator)
  const screenshots = Array.isArray(listing.screenshots) ? listing.screenshots : [];
  const guidance = scanSubmissionGuidance({
    appName: name,
    paymentType: listing.paymentType || [],
    appPreviewDescription: short,
    appDetailDescription: long,
    appFeaturesOverview: features,
    appDeveloperNotes: [str(listing.developerNotes), str(listing.pricingNotes)].filter(Boolean).join('\n\n'),
    appScopes: [],
    scopeJustification: '',
    appAccessCredentials: str(listing.accessCredentials),
    appScreenshotAltTexts: screenshots.map((s) => str(s?.altText)),
    creatorName: str(listing.creatorName),
  });
  const pricing = guidance.filter((w) => w.category === 'pricing');
  const creator = guidance.filter((w) => w.id === 'placeholder-creator-name');
  const credentials = guidance.filter((w) => w.id.startsWith('credentials-'));
  const altQuality = guidance.filter((w) => w.id === 'screenshot-alt-text-quality');
  findings.push(pricing.length ? finding('listing:pricing', 'fail', 'required', 'Pricing disclosure needs work', '', pricing.map((w) => w.message)) : finding('listing:pricing', 'pass', 'required', `Pricing: ${(Array.isArray(listing.paymentType) ? listing.paymentType : [listing.paymentType]).filter(Boolean).join(', ') || 'unset'}`));
  findings.push(creator.length || !str(listing.creatorName).trim() ? finding('listing:creator', 'fail', 'required', 'Creator name is missing or a placeholder', '', creator.map((w) => w.message)) : finding('listing:creator', 'pass', 'required', `Creator: ${listing.creatorName}`));
  if (credentials.length) findings.push(finding('listing:demo-access', 'warn', 'required', 'Reviewer access notes may be incomplete', '', credentials.map((w) => w.message)));

  // --- URLs
  const urlFields = [
    ['websiteUrl', 'listing:website', 'Website URL'],
    ['documentationUrl', 'listing:docs', 'Documentation URL'],
    ['privacyPolicyUrl', 'listing:legal-urls', 'Privacy policy URL'],
    ['termsUrl', 'listing:legal-urls', 'Terms of service URL'],
  ];
  const legalProblems = [];
  for (const [field, check, label] of urlFields) {
    const value = str(listing[field]).trim();
    const problems = [];
    if (!value) problems.push(`${label} is empty`);
    else {
      if (!/^https:\/\//i.test(value)) problems.push(`${label} must use https`);
      const prod = getProductionUrlError(value, { fieldLabel: label });
      if (prod) problems.push(prod);
    }
    if (check === 'listing:legal-urls') legalProblems.push(...problems);
    else findings.push(problems.length ? finding(check, 'fail', 'required', `${label} needs work`, '', problems) : finding(check, 'pass', 'required', `${label}: ${value}`));
  }
  const privacy = str(listing.privacyPolicyUrl).trim();
  const terms = str(listing.termsUrl).trim();
  findings.push(legalProblems.length ? finding('listing:legal-urls', 'fail', 'required', 'Legal URLs need work', '', legalProblems) : finding('listing:legal-urls', 'pass', 'required', 'Privacy policy and terms URLs are HTTPS production URLs'));
  if (privacy && terms && canonical(privacy) === canonical(terms)) {
    findings.push(finding('listing:legal-urls', 'fail', 'suggested', 'Privacy policy and terms point at the same page', 'Approved apps do share one legal page, so this is a suggestion. Distinct pages make the privacy disclosure easier to verify.'));
  }

  const urlGuidance = scanUrlGuidance({
    appVideoUrl: str(listing.promoVideoUrl),
    appDemoVideoUrl: str(listing.demoVideoUrl),
    appInstallUrl: '',
    appWebsiteUrl: str(listing.websiteUrl),
    appDocumentationUrl: str(listing.documentationUrl),
    appPrivacyPolicyUrl: privacy,
    appTermsUrl: terms,
    appSupportUrl: str(listing.supportUrl),
    clientId: str(listing.clientId),
    appScopes: [],
  });
  const demoWarnings = urlGuidance.filter((w) => /video/.test(w.id) || /video/.test(w.category || ''));
  const otherUrlWarnings = urlGuidance.filter((w) => !demoWarnings.includes(w));
  const demo = str(listing.demoVideoUrl).trim();
  if (!demo) findings.push(finding('listing:demo-video', 'fail', 'required', 'Demo video URL is empty', 'Reviewers need a 2 to 5 minute walkthrough from install to usage, in English or with English subtitles, on a private Loom, unlisted YouTube, or Drive link.'));
  else if (demoWarnings.length) findings.push(finding('listing:demo-video', 'fail', 'required', 'Demo video link would be flagged by the form', '', demoWarnings.map((w) => w.message)));
  else findings.push(finding('listing:demo-video', 'pass', 'required', 'Demo video link accepted. Length and content are a human gate.'));
  if (otherUrlWarnings.length) findings.push(finding('listing:website', 'warn', 'required', 'URL guidance from the form', '', otherUrlWarnings.map((w) => `${w.id}: ${w.message}`)));

  // --- support email
  const email = str(listing.supportEmail).trim();
  const emailProblems = [];
  if (!email) emailProblems.push('Support email is empty');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailProblems.push(`"${email}" is not a valid email`);
  if (copyWarnings.some((w) => w.id === 'webflow-marks-support-email')) emailProblems.push('Support email uses the Webflow mark');
  findings.push(emailProblems.length ? finding('listing:support', 'fail', 'required', 'Support email needs work', '', emailProblems) : finding('listing:support', 'pass', 'required', `Support email: ${email}`));

  // --- testing site
  const testing = str(listing.testingSiteUrl).trim();
  let testingHost = '';
  try {
    testingHost = new URL(testing).hostname;
  } catch {
    testingHost = '';
  }
  findings.push(
    testing && /\.webflow\.io$/i.test(testingHost)
      ? finding('listing:testing-site', 'pass', 'required', `Testing site: ${testing}. Confirm the App is installed there (human gate).`)
      : finding('listing:testing-site', 'fail', 'required', 'Testing site must be a published .webflow.io URL', 'Every submission needs a published testing site with the App installed.')
  );

  // --- icon
  const icon = listing.icon || {};
  const iconProblems = [];
  const iconPath = icon.path ? resolve(base, icon.path) : '';
  if (!iconPath || !existsSync(iconPath)) iconProblems.push(`Icon file not found: ${icon.path || '(unset)'}`);
  else {
    const buf = readFileSync(iconPath);
    const dims = imageDimensions(buf);
    if (dims.format !== 'png') iconProblems.push(`Icon must be a PNG (got ${dims.format})`);
    if (buf.length > APP_ICON_MAX_BYTES) iconProblems.push(`Icon is ${Math.ceil(buf.length / 1024)} KB (limit ${APP_ICON_MAX_BYTES / 1024} KB)`);
    const dimError = getAppIconDimensionError(dims.width, dims.height);
    if (dimError) iconProblems.push(dimError);
  }
  if (!str(icon.altText).trim()) iconProblems.push('Icon alt text is empty');
  findings.push(iconProblems.length ? finding('listing:icon', 'fail', 'required', 'App icon needs work', '', iconProblems) : finding('listing:icon', 'pass', 'required', `Icon is a ${APP_ICON_REQUIRED_SIZE}x${APP_ICON_REQUIRED_SIZE} PNG under ${APP_ICON_MAX_BYTES / 1024} KB with alt text. Confirm it is a logomark, not a text logotype (human gate).`));

  // --- screenshots
  const shotProblems = [];
  if (screenshots.length < LIMITS.screenshotsMin) shotProblems.push(`${screenshots.length} screenshots (need ${LIMITS.screenshotsMin} to ${LIMITS.screenshotsMax})`);
  if (screenshots.length > LIMITS.screenshotsMax) shotProblems.push(`${screenshots.length} screenshots (limit ${LIMITS.screenshotsMax})`);
  screenshots.forEach((shot, i) => {
    const p = shot?.path ? resolve(base, shot.path) : '';
    if (!p || !existsSync(p)) {
      shotProblems.push(`Screenshot ${i + 1} not found: ${shot?.path || '(unset)'}`);
      return;
    }
    const dims = imageDimensions(readFileSync(p));
    if (!['png', 'jpeg'].includes(dims.format)) shotProblems.push(`Screenshot ${i + 1} must be PNG or JPEG`);
    else if (dims.width !== LIMITS.screenshotWidth || dims.height !== LIMITS.screenshotHeight) shotProblems.push(`Screenshot ${i + 1} is ${dims.width}x${dims.height} (need ${LIMITS.screenshotWidth}x${LIMITS.screenshotHeight})`);
    if (!str(shot.altText).trim()) shotProblems.push(`Screenshot ${i + 1} has no alt text`);
  });
  for (const w of altQuality) shotProblems.push(w.message);
  if (shotProblems.length) findings.push(finding('listing:screenshots', 'fail', 'required', 'Screenshots need work', '', shotProblems));
  else {
    const note = screenshots.length < LIMITS.screenshotsRecommended ? ` The listing doc recommends at least ${LIMITS.screenshotsRecommended}.` : '';
    findings.push(finding('listing:screenshots', screenshots.length < LIMITS.screenshotsRecommended ? 'warn' : 'pass', 'required', `${screenshots.length} screenshots at ${LIMITS.screenshotWidth}x${LIMITS.screenshotHeight} with alt text.${note}`));
  }

  for (const f of findings) f.requirements = requirementsForCheck(f.check).map((r) => r.id);
  return { path, listing, findings };
}

function canonical(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function fileSizeKb(path) {
  return Math.ceil(statSync(path).size / 1024);
}

export { join };
