/** Public campaign IDs only. Never put recipient IDs or tokens in campaign URLs. */
export const NEWSLETTER_CAMPAIGNS = [
  '2026-09-01-the-interface-is-becoming-executable',
  '2026-09-03-the-receipt-must-name-the-state',
  '2026-09-08-test-the-checker'
] as const;

export function newsletterMetadata(url: URL): Record<string, string> | undefined {
  const campaign = url.searchParams.get('utm_campaign');
  if (url.pathname.startsWith('/admin') || url.searchParams.get('utm_source') !== 'newsletter' ||
      url.searchParams.get('utm_medium') !== 'email' ||
      !NEWSLETTER_CAMPAIGNS.some((id) => id === campaign)) return undefined;
  return { newsletterCampaign: campaign!, newsletterMeasurement: 'first-party-v1' };
}
