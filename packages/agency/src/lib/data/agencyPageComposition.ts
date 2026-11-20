/** Composition follows the page's job and the image's actual framing. */
export type AgencyComposition = 'task' | 'operator' | 'study' | 'proof' | 'wide' | 'inspection' | 'collaboration';

export function agencyPageComposition(route: string, family: string, shot?: string): AgencyComposition {
  if (['/book', '/contact', '/support-brief', '/prospects'].includes(route)) return 'task';
  if (['/products/signal', '/products/decision', '/products/proof'].includes(route)) return 'operator';
  if (route.startsWith('/workflows/')) return 'study';
  if (route.startsWith('/field-reports') || route.startsWith('/proof/')) return 'proof';
  if (shot === 'wide') return 'wide';
  if (shot === 'macro') return 'inspection';
  return family === 'editorial' ? 'study' : 'collaboration';
}

export function usesCampaignFigure(route: string): boolean {
  return !['/book', '/contact', '/privacy', '/terms', '/products/signal', '/products/decision', '/products/proof'].includes(route);
}
