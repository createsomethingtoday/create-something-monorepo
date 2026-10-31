/** Small, router-independent location contract. Content and persistence remain with the owner. */
export interface JourneyLocation { stepId: string; detail: boolean }

export function journeyFragment(id: string, location: JourneyLocation): string {
  return `#${id}-${location.stepId}${location.detail ? '-detail' : ''}`;
}

export function readJourneyLocation(id: string, steps: readonly string[], hash: string): JourneyLocation {
  for (const stepId of steps) {
    if (hash === journeyFragment(id, { stepId, detail: true })) return { stepId, detail: true };
    if (hash === journeyFragment(id, { stepId, detail: false })) return { stepId, detail: false };
  }
  return { stepId: steps[0] ?? '', detail: false };
}
