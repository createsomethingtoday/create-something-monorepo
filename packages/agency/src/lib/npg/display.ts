// Plain text plus validated links. Model output never becomes HTML.
export function safeLink(raw: string): string | null {
  try {
    const url = new URL(raw, 'https://createsomething.agency');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      /(?:api.?key|token|secret|authorization|password)/i.test(url.search)
    )
      return null;
    if (
      url.pathname === '/mcp' ||
      url.pathname.startsWith('/mcp/') ||
      url.hostname === 'api.openai.com'
    )
      return null;
    if (
      url.origin === 'https://createsomething.agency' &&
      ['/delivery/abundance/sourcing.csv', '/delivery/abundance/travel.csv'].includes(url.pathname)
    )
      return url.pathname + url.search;
    if (!raw.startsWith('https://')) return null;
    return url.href;
  } catch {
    return null;
  }
}
export function linkParts(text: string): Array<{ text: string; href?: string }> {
  const parts: Array<{ text: string; href?: string }> = [];
  const pattern =
    /\[([^\]\n]+)\]\((https:\/\/[^\s)]+|\/delivery\/abundance\/[^\s)]+)\)|(https:\/\/[^\s<>\]]+)/g;
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > at) parts.push({ text: text.slice(at, match.index) });
    const raw = (match[2] || match[3]).replace(/[.,;]+$/, '');
    const href = safeLink(raw);
    parts.push({ text: match[1] || raw, ...(href ? { href } : {}) });
    at = match.index! + match[0].length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
}
export function sourceLinks(data: unknown): string[] {
  const found = new Set<string>();
  function walk(v: unknown) {
    if (typeof v === 'string') {
      const href = safeLink(v);
      if (href) found.add(href);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  }
  walk(data);
  return [...found].slice(0, 50);
}
export type NpgView = {
  id: string;
  version: number;
  status: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string }>;
  sources: Array<{ tool: string; data: unknown }>;
  pending: null | {
    id: string;
    tool: string;
    arguments: unknown;
    review: unknown;
    expiresAt: number;
  };
};
