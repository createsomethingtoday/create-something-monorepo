export type GuardAccessScope =
  | { role: 'operator' }
  | { role: 'player'; playerId: string };

export function isPlayerScope(scope: GuardAccessScope): scope is Extract<GuardAccessScope, { role: 'player' }> {
  return scope.role === 'player';
}
