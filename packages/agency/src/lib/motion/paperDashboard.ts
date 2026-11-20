export type WorkStatus = 'review' | 'active' | 'done';
export type WorkItem = {
  id: string;
  title: string;
  project: string;
  owner: string;
  initials: string;
  status: WorkStatus;
  priority: string;
  context: string;
  recommendation: string;
};
export const sampleWork: readonly WorkItem[] = [
  {
    id: '041',
    title: 'Refresh the client welcome',
    project: 'Client experience',
    owner: 'Maya Chen',
    initials: 'MC',
    status: 'review',
    priority: 'High',
    context:
      'The welcome email still points to the old onboarding guide. Maya owns client communications; the new guide is ready for review.',
    recommendation:
      'Replace the outdated link and simplify the first step. Maya reviews the copy before anything reaches a client.'
  },
  {
    id: '042',
    title: 'Connect the intake handoff',
    project: 'Operations',
    owner: 'Eli Brooks',
    initials: 'EB',
    status: 'active',
    priority: 'Normal',
    context:
      'New requests need one owner. The routing rules are agreed and a test connection is being built.',
    recommendation:
      'Test the routing with sample requests, then bring the results to Eli before enabling the connection.'
  },
  {
    id: '043',
    title: 'Review the monthly report',
    project: 'Reporting',
    owner: 'Maya Chen',
    initials: 'MC',
    status: 'review',
    priority: 'Normal',
    context: 'The sample report is assembled. Two source totals need a human check before sharing.',
    recommendation:
      'Compare the totals with the source sheet. Approval records the review locally; it does not send the report.'
  },
  {
    id: '044',
    title: 'Prepare the release checklist',
    project: 'Website',
    owner: 'Noah Patel',
    initials: 'NP',
    status: 'active',
    priority: 'Normal',
    context:
      'The preview is ready. Keyboard, mobile and rollback checks are part of the agreed release checklist.',
    recommendation:
      'Complete the preview checks and collect Noah’s release decision before deployment.'
  },
  {
    id: '045',
    title: 'Tidy the project archive',
    project: 'Operations',
    owner: 'Eli Brooks',
    initials: 'EB',
    status: 'done',
    priority: 'Normal',
    context:
      'The sample archive has been grouped by project and checked against the retention rules.',
    recommendation:
      'Review complete. This example records the outcome without touching any connected files.'
  }
];
export function createDashboardState() {
  return {
    items: sampleWork.map((item) => ({ ...item })),
    selected: '041',
    query: '',
    filter: 'all',
    approvals: [] as string[]
  };
}
export type DashboardState = ReturnType<typeof createDashboardState>;
export function visibleWork(state: DashboardState) {
  const query = state.query.trim().toLowerCase();
  return state.items.filter(
    (item) =>
      (state.filter === 'all' || item.status === state.filter) &&
      `${item.title} ${item.project} ${item.owner} ${item.id}`.toLowerCase().includes(query)
  );
}
export function approveWork(state: DashboardState): boolean {
  const item = state.items.find((item) => item.id === state.selected);
  if (!item || item.status !== 'review') return false;
  item.status = 'done';
  state.approvals.unshift(item.id);
  return true;
}
export function workCounts(state: DashboardState) {
  return {
    review: state.items.filter((i) => i.status === 'review').length,
    active: state.items.filter((i) => i.status === 'active').length,
    done: state.items.filter((i) => i.status === 'done').length
  };
}
