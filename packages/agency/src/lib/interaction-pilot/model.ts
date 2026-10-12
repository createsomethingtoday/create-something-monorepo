export const journeyId = 'handoff-example';
export const steps = [
  { id: 'problem', label: 'Problem', title: 'Find the broken handoff.', summary: 'A form accepts a request, but the team never sees it. First, trace one synthetic request from the form to its destination.', kind: 'diagnose', recordTitle: 'What we would inspect', facts: [['Expected', 'One valid request reaches the team queue.'], ['Observed in this example', 'The form shows success; the queue has no matching record.'], ['Still unknown', 'Whether routing, permissions or delivery caused the break.']], boundary: 'Diagnosis comes before a proposed change. No system is connected here.' },
  { id: 'approval', label: 'Approval', title: 'Agree the change before building.', summary: 'The team owner reviews a bounded proposal: repair the handoff, check one agreed example, and keep a recovery path.', kind: 'approve', recordTitle: 'Illustrative scope record', facts: [['Owner', 'The team owner decides whether the proposed change may proceed.'], ['Proposed work', 'Repair one form-to-queue handoff and document its configuration.'], ['Outside the scope', 'A new CRM, broader automation and production incident response.']], boundary: 'Inspecting this example does not approve work or grant an agent authority.' },
  { id: 'check', label: 'Check', title: 'Check the failure case, too.', summary: 'A working success message is not enough. Compare the destination record with the request, then check how an invalid request is handled.', kind: 'verify', recordTitle: 'Illustrative acceptance checks', facts: [['Success case', 'One valid synthetic request creates one matching queue record.'], ['Failure case', 'An invalid request names the missing field and creates no queue record.'], ['Recovery', 'If the outcome is unknown, reconcile the record before trying again.']], boundary: 'These are proposed checks, not measured results or a customer success claim.' },
  { id: 'handoff', label: 'Handoff', title: 'Keep the instructions and the next step.', summary: 'The handoff connects the agreed change, checks, owner and recovery instructions. Your team can see what was done and what still needs attention.', kind: 'handoff', recordTitle: 'Illustrative handoff contents', facts: [['Keep', 'The agreed deliverable, configuration notes and acceptance checks.'], ['Know', 'Who owns the workflow and how to recover or ask for help.'], ['Next decision', 'Review the scope for the next improvement; launch is agreed separately.']], boundary: 'Prepare the fixed sample below to see a complete local handoff. Nothing is sent or booked.' }
] as const;
export const destinations = { inbox: 'Team inbox', queue: 'Review queue' } as const;
export type Destination = keyof typeof destinations;
export interface SampleDraft { version: 1; destination: Destination | ''; reviewed: boolean; completed: boolean }
export const emptyDraft = (): SampleDraft => ({ version: 1, destination: '', reviewed: false, completed: false });
export const storageKey = 'agency-handoff-example-v1';
export function parseDraft(value: unknown): SampleDraft {
  if (!value || typeof value !== 'object') return emptyDraft();
  const data = value as Partial<SampleDraft>;
  if (data.version !== 1 || !['', 'inbox', 'queue'].includes(data.destination ?? '') || typeof data.reviewed !== 'boolean') return emptyDraft();
  const destination = data.destination ?? '';
  return { version: 1, destination, reviewed: data.reviewed, completed: data.completed === true && !!destination && data.reviewed };
}
export function completeSample(draft: SampleDraft): { draft: SampleDraft; error: string } {
  if (!draft.destination) return { draft, error: 'Choose a destination for the synthetic request.' };
  if (!draft.reviewed) return { draft, error: 'Review the sample scope before creating its handoff.' };
  return { draft: { ...draft, completed: true }, error: '' };
}
