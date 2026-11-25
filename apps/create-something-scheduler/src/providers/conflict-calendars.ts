// Conflict coverage is a scheduling requirement, independent of Google UI selection.
export const requiredConflictCalendarIds = ['micah@createsomething.io', 'mj@halfdozen.co'] as const;
export function conflictCalendarIds(...groups: string[][]): string[] {
  return [...new Set([...groups.flat(), ...requiredConflictCalendarIds])];
}
