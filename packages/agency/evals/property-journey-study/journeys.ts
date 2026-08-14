import { marketingPagePortfolio, type MarketingPageEntry } from '../../src/lib/data/marketingPages.ts';

export type PropertyJourney = {
  id: string;
  label: string;
  paths: string[];
  routes: MarketingPageEntry[];
  terminalIntent: 'map_intent';
};

const journeyDefinitions = [
  {
    id: 'core-spine',
    label: 'Agency core spine',
    paths: ['/', '/services', '/map'],
    terminalIntent: 'map_intent' as const
  }
] as const;

function activeRoute(path: string): MarketingPageEntry {
  const route = marketingPagePortfolio.find((entry) => entry.path === path && entry.decision === 'index');
  if (!route) throw new Error(`Expected active marketing route for ${path}`);
  return route;
}

export const propertyJourneys: PropertyJourney[] = journeyDefinitions.map((definition) => ({
  ...definition,
  paths: [...definition.paths],
  routes: definition.paths.map(activeRoute)
}));

export function resolvePropertyJourney(id: string): PropertyJourney {
  const journey = propertyJourneys.find((candidate) => candidate.id === id);
  if (!journey) throw new Error(`Unknown property journey: ${id}`);
  return journey;
}
