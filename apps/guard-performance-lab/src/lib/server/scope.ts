export type GuardAccessScope =
  | { role: 'operator'; subject?: string }
  | { role: 'player'; playerId: string; subject?: string };

export function isPlayerScope(scope: GuardAccessScope): scope is Extract<GuardAccessScope, { role: 'player' }> {
  return scope.role === 'player';
}
