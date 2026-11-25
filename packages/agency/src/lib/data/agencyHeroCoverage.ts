import { commercialPageTreatments } from './agencyPreviewCommercial';
import { productPageTreatments } from './agencyPreviewProducts';
import { editorialPageTreatments } from './agencyPreviewEditorial';
import { deprecatedRedirects } from './deprecatedRoutes';
import { agencyInvitationScene, agencyWelcomeScene } from './canonAgencyScenes';

export interface AgencyHero {
  route: string;
  selector: string;
  src: string;
  mobileSrc: string;
  owner: 'route' | 'coverage';
}

// Coverage is independent of navigation, indexing and palette policy: those
// policies deliberately exclude some legal and archived public pages.
export const agencyHeroExclusions = [
  /^\/privacy$/, // The privacy policy uses a text-only legal opening.
  /^\/(?:account|admin|dashboard|login|logout|auth|mcp-access|delivery|api|prospects)(?:\/|$)/,
  /^\/map\/(?:workspace|subscribe|share)(?:\/|$)/,
  /^\/canon-preview(?:\/|$)/ // Development-only component fixture, never a published page.
];
export const agencyHeroRedirects = [...Object.keys(deprecatedRedirects), '/experiments/[slug]'];
const isRedirect = (path: string) => agencyHeroRedirects.some(route => path === route || path.startsWith(route + '/'));

// Preserve the newer route-owned backgrounds already released on main.
// These public introductions lack a background scene, including frames whose
// native scene is disabled. Never duplicate a rendered native scene or homepage.
const coverageRoutes = new Set([
  '/map', '/scopefield', '/basketball-systems-lab', '/dental-ai-agents',
  '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation',
  '/case-studies/webflow-marketplace', '/case-studies/webflow-marketplace/[study]'
]);
// Explicit ownership, not a default inferred from navigation metadata. Adding a
// route/heroSelector alone must not silently satisfy the coverage test.
const routeOwnedRoutes = new Set([
  '/services', '/agent-foundation', '/agent-readiness', '/airtable-workflow-consulting',
  '/dfw-tech-support', '/for-service-providers', '/use-cases/business', '/use-cases/enterprise',
  '/about', '/methodology', '/practice', '/stack', '/partners', '/cloudflare',
  '/products', '/products/decision', '/products/ground', '/products/loom', '/products/proof', '/products/signal',
  '/control', '/workflow-compiler-integration', '/proof/marketplace-workflow', '/technical-review',
  '/field-reports', '/field-reports/template-review', '/field-reports/upstream-contributions',
  '/workflows', '/workflows/[slug]', '/arcs', '/arc/[slug]', '/arc/app-review-governance',
  '/experiments', '/dispatch', '/contact', '/book', '/support-brief', '/security',
  '/terms', '/bearer-token-policy', '/openai-dots'
]);
function artwork(route: string) {
  return { src: '/agency/editorial/connected-tools-1280.webp', mobileSrc: '/agency/editorial/connected-tools-640.webp' };
}

const treatments = [...commercialPageTreatments, ...productPageTreatments, ...editorialPageTreatments];
// Target only the intro, not the legal body, booking form or working application.
const additional = [
  { route: '/contact', selector: '.inquiry-intro' },
  { route: '/book', selector: '.booking-entry,.agent-booking__intro' },
  { route: '/support-brief', selector: '.brief-workspace > header' },
  ...['/security', '/terms', '/bearer-token-policy'].map(route => ({
    route, selector: '.clear-page-section--hero .clear-page-section__copy'
  })),
  { route: '/dental-ai-agents', selector: '.dental-opening' },
  { route: '/openai-dots', selector: '.openai-dots #intro' },
  { route: '/case-studies/webflow-marketplace', selector: '.case-opening' },
  { route: '/case-studies/webflow-marketplace/[study]', selector: '.case-opening' }
];

export const agencyHeroes: AgencyHero[] = [
  {
    route: '/canon', selector: '.character-portrait', owner: 'route',
    src: '/images/canon-agency-v1/body-r41.webp', mobileSrc: '/images/canon-agency-v1/body-r41.webp'
  },
  ...treatments.filter(item => item.heroSelector && !isRedirect(item.route) && (coverageRoutes.has(item.route) || routeOwnedRoutes.has(item.route))).map(item => ({
    route: item.route,
    selector: item.route === '/products/ground' ? '.ground-hero'
      : item.route === '/basketball-systems-lab' ? '.performance-system-hero'
      : item.heroSelector.includes('.clear-page-section--hero')
        ? `${item.heroSelector} .clear-page-section__copy` : item.heroSelector,
    ...artwork(item.route),
    owner: coverageRoutes.has(item.route) ? 'coverage' as const : 'route' as const
  })),
  ...additional.map(item => ({ ...item, ...artwork(item.route), owner: coverageRoutes.has(item.route) ? 'coverage' as const : 'route' as const }))
];

export function getAgencyHeroCoverage(pathname: string): AgencyHero | undefined {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (agencyHeroExclusions.some(pattern => pattern.test(path)) || isRedirect(path)) return undefined;
  return agencyHeroes.find(item => item.route === path)
    ?? agencyHeroes.find(item => item.route.includes('[')
      && item.route.split('/').length === path.split('/').length
      && item.route.split('/').every((part, i) => part.startsWith('[') || part === path.split('/')[i]));
}

export function getAgencyHero(pathname: string): AgencyHero | undefined {
  const hero = getAgencyHeroCoverage(pathname);
  return hero?.owner === 'coverage' ? hero : undefined;
}

export function agencyHeroDisposition(path: string): 'background' | 'route-owned' | 'home-owned' | 'excluded' | 'redirect' | 'missing' {
  if (path === '/') return 'home-owned';
  if (agencyHeroExclusions.some(pattern => pattern.test(path))) return 'excluded';
  if (isRedirect(path)) return 'redirect';
  const hero = getAgencyHeroCoverage(path);
  return hero ? hero.owner === 'coverage' ? 'background' : 'route-owned' : 'missing';
}
