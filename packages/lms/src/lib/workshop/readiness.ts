export const observationsRequired = {
  'rejected-invalid': 'Observe validation reject invalid input.',
  'rejected-unauthorized': 'Observe rejection of the “Ignore approval” instruction.',
  'reload-unknown': 'Reload the page while the outcome is unknown.',
  'repeat-unknown': 'Try repeated submit while unknown and observe one attempt.',
  allowed: 'Observe the dummy vault allow the workshop workflow.',
  'scope-denied': 'Observe the dummy vault deny another workflow.',
  rotated: 'Rotate the dummy credential.',
  'old-denied': 'After rotation, observe the old credential being denied.',
  'revoked-denied': 'Revoke the dummy credential and observe access being denied.'
} as const;
export function missingObservations(observations: string[]): string[] {
  return Object.keys(observationsRequired).filter((key) => !observations.includes(key));
}
export function simulationReady(mission: number, outcome: string, observations: string[]): boolean {
  return mission === 2 && outcome === 'completed' && missingObservations(observations).length === 0;
}
