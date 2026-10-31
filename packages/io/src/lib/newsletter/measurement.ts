/** Public campaign IDs only. Never put recipient IDs or tokens in campaign URLs. */
export const NEWSLETTER_CAMPAIGNS = [
  '2026-09-01-the-interface-is-becoming-executable',
  '2026-09-03-the-receipt-must-name-the-state',
  '2026-09-08-test-the-checker'
] as const;

const SOCIAL_CAMPAIGN_PATHS = new Set([
  '/newsletters',
  '/newsletters/2026-09-01-the-interface-is-becoming-executable'
]);

export function newsletterMetadata(url: URL): Record<string, string> | undefined {
  const campaign = url.searchParams.get('utm_campaign');
  const source = url.searchParams.get('utm_source');
  const medium = url.searchParams.get('utm_medium');
  if (url.pathname.startsWith('/admin')) return undefined;

  if (source === 'newsletter' && medium === 'email' &&
      NEWSLETTER_CAMPAIGNS.some((id) => id === campaign)) {
    // Preserve existing email attribution, including its scope beyond the archive.
    // Underscores keep the date from resembling a phone number to ingestion redaction.
    return { newsletterCampaign: campaign!.replaceAll('-', '_'), newsletterMeasurement: 'first-party-v1' };
  }

  // Attribute only this campaign's published destinations, not unknown article slugs or 404s.
  // Never copy arbitrary UTM content or identifiers.
  if (!SOCIAL_CAMPAIGN_PATHS.has(url.pathname.replace(/\/$/, '')) ||
      (source !== 'linkedin' && source !== 'substack') || medium !== 'social' ||
      campaign !== 'field-notes-20260928' ||
      ['utm_source', 'utm_medium', 'utm_campaign'].some((key) => url.searchParams.getAll(key).length !== 1)) {
    return undefined;
  }

  // Separate marker keeps social landings out of the existing email engagement report.
  return {
    newsletterCampaign: campaign.replaceAll('-', '_'),
    newsletterSource: source,
    newsletterMedium: medium,
    newsletterMeasurement: 'first-party-social-v1'
  };
}
