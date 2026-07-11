export type EvidenceStatus = 'measured' | 'derived' | 'unmeasured';

export type TemplateReviewFieldReport = {
  slug: 'template-review';
  title: string;
  dek: string;
  hypothesis: string;
  evidence: {
    selectedCases: number;
    usableCases: number;
    screenshots: number;
    reviewerBuckets: number;
    externalWrites: number;
    status: EvidenceStatus;
  };
  limits: {
    expectedExceptionalCases: number;
    missedExceptionalCases: number;
    escalationRate: number;
    promotionStatus: 'blocked';
    status: EvidenceStatus;
    reason: string;
  };
  savings: {
    status: 'unmeasured';
    statement: string;
    formula: string;
    instrumentation: string[];
  };
  sources: Array<{
    label: string;
    artifact: string;
    date: string;
  }>;
};

export const templateReviewFieldReport: TemplateReviewFieldReport = {
  slug: 'template-review',
  title: 'Prepare the evidence. Keep the judgment human.',
  dek:
    'A field report from a governed template-review workflow: objective checks run in bounded lanes, evidence arrives in one packet, and reviewers retain every consequential decision.',
  hypothesis:
    'Precomputing objective evidence before reviewer judgment can increase review capacity while qualitative decisions and risky writes remain human-owned.',
  evidence: {
    selectedCases: 50,
    usableCases: 49,
    screenshots: 98,
    reviewerBuckets: 8,
    externalWrites: 0,
    status: 'measured'
  },
  limits: {
    expectedExceptionalCases: 2,
    missedExceptionalCases: 2,
    escalationRate: 0.625,
    promotionStatus: 'blocked',
    status: 'measured',
    reason:
      'The evidence collector was useful, but the broader reviewer was not promoted after it missed both historical exceptional examples.'
  },
  savings: {
    status: 'unmeasured',
    statement:
      'The workflow demonstrates evidence capacity. Reviewer active-time savings still require a before-and-after pilot measurement.',
    formula:
      'eligible submissions × (manual objective-check minutes − reviewer verification minutes)',
    instrumentation: [
      'Capture active minutes spent on objective checks before assisted review.',
      'Capture reviewer verification minutes after the evidence packet is available.',
      'Compare matched submission types and report the sample size with the result.',
      'Track false positives, missed objective issues, escalations, and reviewer overrides beside time.'
    ]
  },
  sources: [
    {
      label: 'Balanced 50-case multimodal calibration',
      artifact: 'balanced-50-multimodal-calibration-2026-05-27.md',
      date: 'May 27, 2026'
    },
    {
      label: 'Eight-case multimodal shadow evaluation',
      artifact: 'multimodal-8case-shadow-eval-2026-05-27.md',
      date: 'May 27, 2026'
    },
    {
      label: 'Submission quality loop report',
      artifact: '2026-06-05-submission-quality-loop-report.md',
      date: 'June 5, 2026'
    }
  ]
};

export function getTemplateReviewEvidenceYield(report: TemplateReviewFieldReport): number {
  return Math.round((report.evidence.usableCases / report.evidence.selectedCases) * 100);
}
