// Advisory (non-blocking) checks that cross-reference URL inputs against the
// rest of the submission and the documented hosting expectations:
// - promo video: hosted on YouTube (listing docs)
// - demo video: Loom, YouTube, or Google Drive (submission docs); must be a
//   streamable page, not a file download, and must not be a repeat of the
//   install / website / docs URL
// - install URL: client_id and scope params should agree with the form's
//   Client ID and selected scopes; a webflow.com authorize link needs the
//   OAuth params the docs show
// - listing URLs: each must point at its own content (privacy vs terms vs
//   website) and must not carry Webflow's name in the hostname

const PROMO_VIDEO_HOSTS = ['youtube.com', 'youtu.be'];
const DEMO_VIDEO_HOSTS = ['loom.com', 'youtube.com', 'youtu.be', 'drive.google.com'];
// webflow.services hosts Webflow Cloud apps; it is not a borrowed mark.
const WEBFLOW_OWNED_HOSTS = ['webflow.com', 'webflow.io', 'webflow-ext.com', 'webflow.services'];

const VIDEO_FILE_EXTENSION = /\.(mov|mp4|m4v|webm|mkv|avi|zip|rar|7z)$/i;

const LISTING_URL_LABELS = {
  appWebsiteUrl: 'Website URL',
  appDocumentationUrl: 'Documentation URL',
  appPrivacyPolicyUrl: 'Privacy Policy URL',
  appTermsUrl: 'Terms and Conditions URL',
  appSupportUrl: 'Support URL',
  appInstallUrl: 'Install URL',
};

function parseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function hostMatches(hostname, allowedHosts) {
  const host = String(hostname || '').toLowerCase();
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

// Comparable form of a URL: lowercase host, no www, no trailing slash, no hash.
function canonicalUrl(parsed) {
  if (!parsed) {
    return '';
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${host}${path}${parsed.search}`;
}

function normalizeScopeIds(appScopes) {
  if (!Array.isArray(appScopes)) {
    return [];
  }
  return appScopes
    .map((scope) => {
      if (typeof scope === 'string') {
        return scope.split(':')[0].trim().toLowerCase();
      }
      return String(scope?.id || '').trim().toLowerCase();
    })
    .filter(Boolean);
}

function isFileDownload(parsed) {
  const dl = parsed.searchParams.get('dl');
  if (dl === '1' || dl === 'true') {
    return true;
  }
  // Dropbox share links (/s/, /scl/) render a player unless dl=1, even when
  // the path ends in .mp4 — approved submissions use them routinely.
  if (hostMatches(parsed.hostname, ['dropbox.com']) && /^\/(s|scl|sh)\//.test(parsed.pathname)) {
    return false;
  }
  if (VIDEO_FILE_EXTENSION.test(parsed.pathname)) {
    return true;
  }
  if (parsed.searchParams.get('download') !== null || parsed.searchParams.get('export') === 'download') {
    return true;
  }
  return /\/(download|raw)\b/i.test(parsed.pathname);
}

export function scanUrlGuidance({
  appVideoUrl = '',
  appDemoVideoUrl = '',
  appInstallUrl = '',
  appWebsiteUrl = '',
  appDocumentationUrl = '',
  appPrivacyPolicyUrl = '',
  appTermsUrl = '',
  appSupportUrl = '',
  clientId = '',
  appScopes = [],
} = {}) {
  const warnings = [];

  const promoUrl = parseUrl(appVideoUrl);
  if (promoUrl && !hostMatches(promoUrl.hostname, PROMO_VIDEO_HOSTS)) {
    warnings.push({
      id: 'promo-video-host',
      category: 'video-host',
      title: 'Promo videos should be hosted on YouTube.',
      message: 'The listing docs ask for promo videos (1-2 minutes) hosted on YouTube. Videos on other hosts may not display on your listing.',
      fields: ['appVideoUrl'],
    });
  }

  const installUrl = parseUrl(appInstallUrl);
  const websiteUrl = parseUrl(appWebsiteUrl);
  const documentationUrl = parseUrl(appDocumentationUrl);
  const privacyUrl = parseUrl(appPrivacyPolicyUrl);
  const termsUrl = parseUrl(appTermsUrl);
  const supportUrl = parseUrl(appSupportUrl);

  const demoUrl = parseUrl(appDemoVideoUrl);
  if (demoUrl) {
    const demoCanonical = canonicalUrl(demoUrl);
    const repeated = [
      ['appInstallUrl', installUrl],
      ['appWebsiteUrl', websiteUrl],
      ['appDocumentationUrl', documentationUrl],
    ].find(([, other]) => other && canonicalUrl(other) === demoCanonical);

    if (repeated) {
      warnings.push({
        id: 'demo-video-duplicate-url',
        category: 'demo-video',
        title: `The demo video URL is the same as your ${LISTING_URL_LABELS[repeated[0]]}.`,
        message: 'Reviewers need a recorded walkthrough (2-5 minutes) of installation, setup, and core functionality. Submitting the install page or website in place of a video is a common reason reviews are returned. Record the demo and link the recording here.',
        fields: ['appDemoVideoUrl'],
      });
    } else if (isFileDownload(demoUrl)) {
      warnings.push({
        id: 'demo-video-file-download',
        category: 'demo-video',
        title: 'The demo video link looks like a file download.',
        message: 'Reviewers need a link that plays in the browser. Direct .mov/.mp4 downloads and archive files are returned. Upload the recording to Loom, an unlisted YouTube video, or Google Drive with link-sharing on, and paste the share link.',
        fields: ['appDemoVideoUrl'],
      });
    } else if (!hostMatches(demoUrl.hostname, DEMO_VIDEO_HOSTS)) {
      warnings.push({
        id: 'demo-video-host',
        category: 'video-host',
        title: 'Demo videos should be on Loom, YouTube, or Google Drive.',
        message: 'The submission docs ask for the demo video (2-5 minutes, English or English subtitles) via a Loom private link, an unlisted or private YouTube video, or a Google Drive shared link.',
        fields: ['appDemoVideoUrl'],
      });
    }
  }

  if (installUrl) {
    const installClientId = String(installUrl.searchParams.get('client_id') || '').trim();
    const formClientId = String(clientId || '').trim();

    if (installClientId && formClientId && installClientId.toLowerCase() !== formClientId.toLowerCase()) {
      warnings.push({
        id: 'install-url-client-id',
        category: 'install-url',
        title: 'Install URL client_id does not match the Client ID above.',
        message: 'The client_id in your install URL differs from the OAuth Client ID entered in this form. Reviews are keyed to the Client ID, so a mismatch usually means the install URL points at a different app registration.',
        fields: ['appInstallUrl'],
      });
    }

    const scopeParam = String(installUrl.searchParams.get('scope') || '').trim();
    if (scopeParam) {
      const requestedScopes = scopeParam
        .split(/[\s+,]+/)
        .map((scope) => scope.split(':')[0].trim().toLowerCase())
        .filter(Boolean);
      const selectedScopeIds = new Set(normalizeScopeIds(appScopes));
      const unselected = [...new Set(requestedScopes.filter((scope) => !selectedScopeIds.has(scope)))];

      if (selectedScopeIds.size > 0 && unselected.length > 0) {
        warnings.push({
          id: 'install-url-scope-mismatch',
          category: 'install-url',
          title: 'Install URL requests scopes not selected in this form.',
          message: `The install URL requests ${unselected.join(', ')}, which ${unselected.length === 1 ? 'is' : 'are'} not in the scopes selected above. Requested scopes should match what the app is configured and reviewed to use.`,
          fields: ['appInstallUrl'],
          matches: unselected,
        });
      }
    }

    // A direct-to-OAuth install link on webflow.com must carry the params the
    // docs show; without them Webflow renders an error page instead of the
    // consent screen ("install URL leads to a broken page").
    const isAuthorizeLink = hostMatches(installUrl.hostname, ['webflow.com'])
      && /\/oauth\/authorize\/?$/i.test(installUrl.pathname);
    if (isAuthorizeLink) {
      // scope is omitted by working install links (it falls back to the
      // app's configured scopes), so only the two params Webflow rejects
      // without are checked.
      const missing = [];
      if (!installClientId) missing.push('client_id');
      if (installUrl.searchParams.get('response_type') !== 'code') missing.push('response_type=code');
      if (missing.length > 0) {
        warnings.push({
          id: 'install-url-authorize-params',
          category: 'install-url',
          title: 'The webflow.com authorize link is missing OAuth parameters.',
          message: `A direct-to-OAuth install URL needs client_id and response_type=code. This one is missing ${missing.join(', ')}, so it will open an error page instead of the consent screen. Copy the full install URL from your app's settings.`,
          fields: ['appInstallUrl'],
          matches: missing,
        });
      }
    }
  }

  // Listing URLs: hostnames that borrow the Webflow name read as affiliation.
  const brandedFields = [
    ['appWebsiteUrl', websiteUrl],
    ['appDocumentationUrl', documentationUrl],
    ['appPrivacyPolicyUrl', privacyUrl],
    ['appTermsUrl', termsUrl],
    ['appSupportUrl', supportUrl],
    ['appInstallUrl', installUrl],
  ].filter(([, parsed]) => parsed
    && /webflow/i.test(parsed.hostname)
    && !hostMatches(parsed.hostname, WEBFLOW_OWNED_HOSTS));
  if (brandedFields.length > 0) {
    warnings.push({
      id: 'webflow-marks-domain',
      category: 'webflow-marks',
      title: 'A listing URL uses the Webflow name in its domain.',
      message: `${brandedFields.map(([field]) => LISTING_URL_LABELS[field]).join(', ')} ${brandedFields.length === 1 ? 'is' : 'are'} on a domain containing "webflow". Domains that borrow the Webflow name imply affiliation and are returned as a trademark issue. Host the app on your own product domain.`,
      fields: brandedFields.map(([field]) => field),
    });
  }

  // Privacy, terms, docs, and website must each resolve to their own content.
  const duplicates = [];
  const privacyCanonical = canonicalUrl(privacyUrl);
  const termsCanonical = canonicalUrl(termsUrl);
  const websiteCanonical = canonicalUrl(websiteUrl);
  const docsCanonical = canonicalUrl(documentationUrl);

  // Privacy == terms is deliberately not flagged: a combined legal page is
  // common among approved apps (26 of 185 in the 2026-09 calibration).
  if (docsCanonical && websiteCanonical && docsCanonical === websiteCanonical) {
    duplicates.push({ fields: ['appDocumentationUrl'], text: 'the Documentation URL is the same as the Website URL' });
  }
  for (const [field, canonical, label] of [
    ['appPrivacyPolicyUrl', privacyCanonical, 'Privacy Policy'],
    ['appTermsUrl', termsCanonical, 'Terms and Conditions'],
  ]) {
    if (canonical && websiteCanonical && canonical === websiteCanonical) {
      duplicates.push({ fields: [field], text: `the ${label} URL is just the website home page` });
    }
  }
  if (duplicates.length > 0) {
    warnings.push({
      id: 'duplicate-listing-urls',
      category: 'listing-links',
      title: 'Each listing URL must point at its own content.',
      message: `Reviewers open every link and return submissions where ${duplicates.map((entry) => entry.text).join('; ')}. Link the specific legal pages and documentation that explains how to install, configure, and use the app.`,
      fields: [...new Set(duplicates.flatMap((entry) => entry.fields))],
    });
  }

  return warnings;
}
