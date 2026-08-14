import { resolvePropertyJourney } from './journeys.ts';

const args = process.argv.slice(2);
const journeyIndex = args.indexOf('--journey');
if (journeyIndex === -1 || !args[journeyIndex + 1]) {
  throw new Error('Usage: node --import tsx print-journey.mjs --journey core-spine');
}

const journey = resolvePropertyJourney(args[journeyIndex + 1]);
console.log(JSON.stringify({
  schema_version: 'agency.property-journey-manifest.v1',
  journey_id: journey.id,
  label: journey.label,
  paths: journey.paths,
  terminal_intent: journey.terminalIntent,
  routes: journey.routes.map((route) => ({
    path: route.path,
    audience: route.audience,
    intent: route.intent,
    primary_action: route.primaryAction,
    required_terms: route.requiredTerms,
    required_links: route.requiredLinks
  }))
}, null, 2));
