import {
  findCanonOverlayCandidatePromotionReadinessReport,
  renderCanonOverlayCandidatePromotionReadinessReport as renderCanonOverlayCandidatePromotionReadinessReportMarkdown
} from '@create-something/canon/overlays/intake';
import { CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS } from './content/generated/canon-overlay-candidate-promotion-readiness-reports.js';

export type CanonOverlayCandidatePromotionReadinessReport = Parameters<
  typeof renderCanonOverlayCandidatePromotionReadinessReportMarkdown
>[0];

function readinessReports(): CanonOverlayCandidatePromotionReadinessReport[] {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS.entries as unknown as CanonOverlayCandidatePromotionReadinessReport[];
}

export function listCanonOverlayCandidatePromotionReadinessReportIds(): string[] {
  return readinessReports().map((report) => report.intakeId);
}

export function getCanonOverlayCandidatePromotionReadinessReport(
  intakeId: string
): CanonOverlayCandidatePromotionReadinessReport | undefined {
  return findCanonOverlayCandidatePromotionReadinessReport(
    { ...CANON_OVERLAY_CANDIDATE_PROMOTION_READINESS_REPORTS, entries: readinessReports() },
    intakeId
  );
}

export function renderCanonOverlayCandidatePromotionReadinessReport(
  report: CanonOverlayCandidatePromotionReadinessReport
): string {
  return renderCanonOverlayCandidatePromotionReadinessReportMarkdown(report);
}
