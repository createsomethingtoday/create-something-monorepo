/** Bounded intent parsing for the opt-in discovery surface, not a general chat parser. */
export interface PortfolioIntent {
  kind: 'portfolio';
  audience: 'all' | 'designer' | 'photographer' | 'developer' | 'studio';
  label: string;
  original_query: string;
  keywords: string | null;
  category_slugs: string[];
}
const BOILERPLATE = new Set('a an the i we want need looking for build create make me my our site sites website websites template templates portfolio portfolios please'.split(' '));
const AUDIENCES = {
  designer: { words: ['designer', 'designers', 'design'], label: 'Design portfolios', categories: ['design-portfolio'] },
  photographer: { words: ['photographer', 'photographers', 'photography', 'video'], label: 'Photography & video portfolios', categories: ['photography-and-video-portfolio'] },
  developer: { words: ['developer', 'developers'], label: 'Developer portfolios', categories: ['design-portfolio'] },
  studio: { words: ['studio', 'studios', 'agency', 'agencies'], label: 'Creative studios & agencies', categories: ['creative-agency'] },
} as const;
export function portfolioIntent(query: string | null, audience?: string | null): PortfolioIntent | undefined {
  const words: string[] = query?.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (!words.some(word => word === 'portfolio' || word === 'portfolios')) return undefined;
  // Video games are not photography/video portfolios; keep compound ambiguity literal.
  if (words.includes('video') && words.some(word => ['game', 'games', 'gaming'].includes(word))) return undefined;
  // Never silently discard a negation or interpret unsupported mixed requests.
  if (words.some(word => ['not', 'without', 'except', 'exclude'].includes(word))) return undefined;
  const detected = Object.entries(AUDIENCES).filter(([, entry]) => words.some(word => (entry.words as readonly string[]).includes(word)));
  if (!audience && detected.length > 1) return undefined;
  const selected = audience && Object.hasOwn(AUDIENCES, audience) ? audience as keyof typeof AUDIENCES : audience === 'all' ? 'all' : detected[0]?.[0] as keyof typeof AUDIENCES | undefined;
  const config = selected && selected !== 'all' ? AUDIENCES[selected] : undefined;
  const keywords = words.map(word => word === 'developers' ? 'developer' : word).filter(word => !BOILERPLATE.has(word) && !(config && selected !== 'developer' && (config.words as readonly string[]).includes(word)));
  // Developer has no dedicated catalog category; preserve it as a keyword constraint.
  if (selected === 'developer' && !keywords.some(word => ['developer', 'developers'].includes(word))) keywords.push('developer');
  return {kind:'portfolio',audience:selected || 'all',label:config?.label || 'Design and photography portfolios',original_query:query!,keywords:[...new Set(keywords)].join(' ') || null,category_slugs:config ? [...config.categories] : ['design-portfolio','photography-and-video-portfolio']};
}
