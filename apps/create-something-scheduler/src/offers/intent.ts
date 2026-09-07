export const SCHEDULER_OFFER_INTENTS = ['compiler-integration', 'agent-foundation'] as const;

export type SchedulerOfferIntent = (typeof SCHEDULER_OFFER_INTENTS)[number];

export function normalizeSchedulerOfferIntent(
  intent: string | null | undefined
): SchedulerOfferIntent | null {
  return SCHEDULER_OFFER_INTENTS.find((candidate) => candidate === intent) ?? null;
}
