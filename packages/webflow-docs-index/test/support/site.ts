/** A small copy of the docs site: an llms.txt tree and Markdown pages, served by a fake fetch. */
const ORIGIN = 'https://developers.webflow.com';
const NOTE = '> For clean Markdown of any page, append .md to the page URL.\n\n';

const GUIDELINES = [
  '# Marketplace Guidelines',
  '',
  'Rules for Apps in the Marketplace.',
  '',
  '## Token security',
  '',
  '1. Store OAuth tokens in secure, server-side storage. Tokens must never be stored in browser local storage.',
  '',
  '## Advertising',
  '',
  '1. Do not display ads to users.',
].join('\n');

export function defaultPages(): Record<string, string> {
  return {
    '/llms.txt': [
      `- [Apps](${ORIGIN}/apps/llms.txt): Build apps`,
      `- [Data API](${ORIGIN}/data/llms.txt)`,
      `- [Designer API](${ORIGIN}/designer/llms.txt)`,
    ].join('\n'),
    '/apps/llms.txt': `- [Marketplace Guidelines](${ORIGIN}/apps/docs/marketplace-guidelines.md)`,
    '/data/llms.txt': [
      `- [Scopes](${ORIGIN}/data/v2.0.0/reference/scopes.md)`,
      `- [Guidelines (beta copy)](${ORIGIN}/data/v2.0.0-beta/apps/docs/marketplace-guidelines.md)`,
      `- [Branches](${ORIGIN}/data/v2.0.0-beta/reference/branches.md)`,
      `- [Old guidelines](${ORIGIN}/data/v1.0.0/apps/docs/marketplace-guidelines.md)`,
    ].join('\n'),
    '/designer/llms.txt': `- [Resize the extension](${ORIGIN}/designer/reference/resize-extension.md)`,
    '/apps/docs/marketplace-guidelines.md': `> This page is for Apps.\n\n${NOTE}${GUIDELINES}`,
    '/data/v2.0.0-beta/apps/docs/marketplace-guidelines.md': `> This page is for Data API, version v2 Beta.\n\n${NOTE}${GUIDELINES}`,
    '/data/v1.0.0/apps/docs/marketplace-guidelines.md': `${NOTE}${GUIDELINES}`,
    '/data/v2.0.0/reference/scopes.md': `${NOTE}# Scopes\n\n| Resource | Scopes |\n| --- | --- |\n| Custom Code | \`custom_code:read\`, \`custom_code:write\` |\n| Sites | \`sites:read\`, \`sites:write\` |`,
    '/data/v2.0.0-beta/reference/branches.md': `${NOTE}# Branches\n\nBeta only endpoint for branch merge.`,
    '/designer/reference/resize-extension.md': `${NOTE}# Resize the extension\n\n## \`webflow.setExtensionSize(size)\`\n\nSet the size of the Extension UI. Custom size max: 1200x800.`,
  };
}

export function docsSite(pages: Record<string, string> = defaultPages()) {
  const requests: string[] = [];
  const fetchFn = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requests.push(url.pathname);
    const body = url.origin === ORIGIN ? pages[url.pathname] : undefined;
    return body === undefined ? new Response('not found', { status: 404 }) : new Response(body, { status: 200 });
  }) as typeof fetch;
  return { pages, requests, fetchFn };
}
