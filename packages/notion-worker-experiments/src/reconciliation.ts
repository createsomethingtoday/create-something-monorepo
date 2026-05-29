export type LinearIssueSnapshot = {
  id?: string;
  identifier: string;
  title: string;
  url: string;
  status: string;
  statusType: string;
  updated?: string | null;
  labels?: string[];
  project?: string | null;
};

export type NotionTaskSnapshot = {
  action: string;
  status: string;
  source?: string | null;
  linearIssueUrl?: string | null;
  reviewed?: boolean;
};

export type NotionDeliverableSnapshot = {
  name: string;
  status: string;
  evidenceCount: number;
  owner?: string | null;
};

export type NotionEngagementSnapshot = {
  name: string;
  status: string;
  taskCount: number;
  lastPmReview?: string | null;
};

export type AgencyOpsSnapshot = {
  linearIssues: LinearIssueSnapshot[];
  notionTasks: NotionTaskSnapshot[];
  deliverables: NotionDeliverableSnapshot[];
  engagements: NotionEngagementSnapshot[];
};

export type AgencyOpsReconciliationOptions = {
  now?: Date;
  staleReviewDays?: number;
};

export type AgencyOpsFindingSeverity = 'review' | 'warning';

export type AgencyOpsFinding = {
  severity: AgencyOpsFindingSeverity;
  kind:
    | 'task-linear-missing'
    | 'task-linear-status-drift'
    | 'linear-pm-reference-missing'
    | 'deliverable-evidence-missing'
    | 'engagement-review-stale'
    | 'engagement-actions-missing';
  title: string;
  detail: string;
  suggestedAction: string;
  references: string[];
};

const COMPLETE_TASK_STATUSES = new Set(['done', 'canceled', 'cancelled']);
const COMPLETE_LINEAR_STATUS_TYPES = new Set(['completed', 'canceled']);
const ACTIVE_LINEAR_STATUS_TYPES = new Set(['started', 'unstarted']);
const ACTIVE_DELIVERABLE_STATUSES = new Set(['building', 'review']);
const ACTIVE_ENGAGEMENT_STATUS = 'active';
const DEFAULT_STALE_REVIEW_DAYS = 7;

export function reconcileAgencyOpsSnapshot(
  snapshot: AgencyOpsSnapshot,
  options: AgencyOpsReconciliationOptions = {}
): AgencyOpsFinding[] {
  const now = options.now ?? new Date();
  const staleReviewDays = options.staleReviewDays ?? DEFAULT_STALE_REVIEW_DAYS;
  const linearByUrl = new Map(snapshot.linearIssues.map((issue) => [normalizeUrl(issue.url), issue]));
  const referencedLinearUrls = new Set<string>();
  const findings: AgencyOpsFinding[] = [];

  for (const task of snapshot.notionTasks) {
    const linearIssueUrl = task.linearIssueUrl ? normalizeUrl(task.linearIssueUrl) : null;
    if (linearIssueUrl) {
      referencedLinearUrls.add(linearIssueUrl);
      const issue = linearByUrl.get(linearIssueUrl);
      if (!issue) {
        findings.push({
          severity: 'warning',
          kind: 'task-linear-missing',
          title: `Notion task references a Linear issue outside the mirror: ${task.action}`,
          detail: `Task status is ${task.status}; referenced Linear URL was not present in the current Linear Issues read model.`,
          suggestedAction:
            'Confirm the URL is correct and that the synced Linear Issues mirror includes the issue before using this task for PM status.',
          references: [task.action, task.linearIssueUrl ?? '']
        });
        continue;
      }

      if (isTaskOpen(task.status) && isLinearComplete(issue.statusType)) {
        findings.push({
          severity: 'review',
          kind: 'task-linear-status-drift',
          title: `Notion task is open but Linear is closed: ${task.action}`,
          detail: `Linear ${issue.identifier} is ${issue.status} (${issue.statusType}), while the Notion task is ${task.status}.`,
          suggestedAction:
            'Review whether the PM task should be marked Done/Canceled or whether a new Linear issue is needed.',
          references: [task.action, issue.url]
        });
      }

      if (!isTaskOpen(task.status) && !isLinearComplete(issue.statusType)) {
        findings.push({
          severity: 'review',
          kind: 'task-linear-status-drift',
          title: `Notion task is closed but Linear is still active: ${task.action}`,
          detail: `Linear ${issue.identifier} is ${issue.status} (${issue.statusType}), while the Notion task is ${task.status}.`,
          suggestedAction:
            'Review whether the PM task was closed early or whether Linear needs an updated evidence comment/status.',
          references: [task.action, issue.url]
        });
      }
    } else if (task.source?.toLowerCase() === 'linear') {
      findings.push({
        severity: 'review',
        kind: 'task-linear-missing',
        title: `Linear-sourced Notion task has no Linear URL: ${task.action}`,
        detail: `Task status is ${task.status}; source is Linear but no Linear issue URL is attached.`,
        suggestedAction: 'Attach the Linear issue URL or change the task source if this is PM-only work.',
        references: [task.action]
      });
    }
  }

  for (const issue of snapshot.linearIssues) {
    if (!isLinearPmRelevant(issue)) continue;
    if (referencedLinearUrls.has(normalizeUrl(issue.url))) continue;
    if (isLinearComplete(issue.statusType)) continue;
    if (!isLinearActive(issue.statusType)) continue;

    findings.push({
      severity: 'review',
      kind: 'linear-pm-reference-missing',
      title: `PM-relevant Linear issue is not referenced from Notion: ${issue.identifier}`,
      detail: `${issue.title} is ${issue.status} (${issue.statusType}) but has no matching Notion task reference in the snapshot.`,
      suggestedAction:
        'Create or link a Notion PM task only if this issue affects client communication, delivery status, or operator follow-up.',
      references: [issue.url]
    });
  }

  for (const deliverable of snapshot.deliverables) {
    if (!ACTIVE_DELIVERABLE_STATUSES.has(deliverable.status.toLowerCase())) continue;
    if (deliverable.evidenceCount > 0) continue;

    findings.push({
      severity: 'warning',
      kind: 'deliverable-evidence-missing',
      title: `Active deliverable has no evidence: ${deliverable.name}`,
      detail: `Deliverable status is ${deliverable.status}; evidence count is 0.`,
      suggestedAction:
        'Add evidence before using this deliverable in a client update, or move the deliverable to Review/historical if it was generated from old data.',
      references: [deliverable.name]
    });
  }

  for (const engagement of snapshot.engagements) {
    if (engagement.status.toLowerCase() !== ACTIVE_ENGAGEMENT_STATUS) continue;

    if (engagement.taskCount === 0) {
      findings.push({
        severity: 'review',
        kind: 'engagement-actions-missing',
        title: `Active engagement has no current PM actions: ${engagement.name}`,
        detail: 'The engagement is Active, but no Notion Tasks / Actions are linked in the snapshot.',
        suggestedAction:
          'Confirm whether the engagement is truly active; if yes, add the next PM action, otherwise move it to Review/Paused/Complete.',
        references: [engagement.name]
      });
    }

    if (!engagement.lastPmReview || isStaleReview(engagement.lastPmReview, now, staleReviewDays)) {
      findings.push({
        severity: 'warning',
        kind: 'engagement-review-stale',
        title: `Active engagement needs PM review: ${engagement.name}`,
        detail: engagement.lastPmReview
          ? `Last PM review was ${engagement.lastPmReview}; stale threshold is ${staleReviewDays} days.`
          : 'Last PM review is empty.',
        suggestedAction: 'Run the weekly client review and set a fresh Last PM review date.',
        references: [engagement.name]
      });
    }
  }

  return findings;
}

export function formatAgencyOpsFindingsMarkdown(findings: AgencyOpsFinding[]): string {
  if (!findings.length) {
    return 'No Agency Ops reconciliation findings.';
  }

  return findings
    .map((finding, index) =>
      [
        `${index + 1}. [${finding.severity}] ${finding.title}`,
        `   Kind: ${finding.kind}`,
        `   Detail: ${finding.detail}`,
        `   Suggested action: ${finding.suggestedAction}`,
        `   References: ${finding.references.filter(Boolean).join(', ')}`
      ].join('\n')
    )
    .join('\n\n');
}

export function sampleAgencyOpsSnapshot(): AgencyOpsSnapshot {
  return {
    linearIssues: [
      {
        identifier: 'CRE-360',
        title: 'Create Notion Worker sync for Linear data',
        url: 'https://linear.app/createsomething/issue/CRE-360/create-notion-worker-sync-for-linear-data',
        status: 'Done',
        statusType: 'completed',
        labels: ['linear-coordination']
      },
      {
        identifier: 'CRE-436',
        title: 'Add Agency Ops Notion and Linear reconciliation layer',
        url: 'https://linear.app/createsomething/issue/CRE-436/add-agency-ops-notion-and-linear-reconciliation-layer',
        status: 'In Progress',
        statusType: 'started',
        labels: ['linear-coordination']
      }
    ],
    notionTasks: [
      {
        action: 'Refresh Linear Issues cockpit placement',
        status: 'Next',
        source: 'Linear',
        linearIssueUrl:
          'https://linear.app/createsomething/issue/CRE-360/create-notion-worker-sync-for-linear-data'
      },
      {
        action: 'Create PM-only Cato CMS handoff',
        status: 'Next',
        source: 'Client'
      }
    ],
    deliverables: [
      {
        name: 'Agency Ops reconciliation dry run',
        status: 'Review',
        evidenceCount: 0
      }
    ],
    engagements: [
      {
        name: 'Imported Outerfields PCN row',
        status: 'Active',
        taskCount: 0,
        lastPmReview: null
      }
    ]
  };
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isTaskOpen(status: string): boolean {
  return !COMPLETE_TASK_STATUSES.has(status.toLowerCase());
}

function isLinearComplete(statusType: string): boolean {
  return COMPLETE_LINEAR_STATUS_TYPES.has(statusType.toLowerCase());
}

function isLinearActive(statusType: string): boolean {
  return ACTIVE_LINEAR_STATUS_TYPES.has(statusType.toLowerCase());
}

function isLinearPmRelevant(issue: LinearIssueSnapshot): boolean {
  const labels = new Set((issue.labels ?? []).map(normalizeTag));
  const project = normalizeTag(issue.project ?? '');

  if (project === 'client delivery' || project === 'create something agent coordination') {
    return true;
  }

  return [
    'client',
    'client delivery',
    'handoff',
    'linear coordination',
    'linear-coordination',
    'meeting',
    'pm'
  ].some((tag) => labels.has(tag));
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isStaleReview(reviewDate: string, now: Date, staleReviewDays: number): boolean {
  const timestamp = Date.parse(reviewDate);
  if (Number.isNaN(timestamp)) return true;

  const ageMs = now.getTime() - timestamp;
  return ageMs > staleReviewDays * 24 * 60 * 60 * 1000;
}
