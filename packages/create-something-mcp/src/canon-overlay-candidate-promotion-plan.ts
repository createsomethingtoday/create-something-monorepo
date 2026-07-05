import {
  findCanonOverlayCandidatePromotionPlan,
  renderCanonOverlayCandidatePromotionPlan as renderCanonOverlayCandidatePromotionPlanMarkdown
} from '@create-something/canon/overlays/intake';
import { CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS } from './content/generated/canon-overlay-candidate-promotion-plans.js';

export type CanonOverlayCandidatePromotionPlan = Parameters<
  typeof renderCanonOverlayCandidatePromotionPlanMarkdown
>[0];

function promotionPlans(): CanonOverlayCandidatePromotionPlan[] {
  return CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS.entries as unknown as CanonOverlayCandidatePromotionPlan[];
}

export function listCanonOverlayCandidatePromotionPlanIds(): string[] {
  return promotionPlans().map((plan) => plan.intakeId);
}

export function getCanonOverlayCandidatePromotionPlan(
  intakeId: string
): CanonOverlayCandidatePromotionPlan | undefined {
  return findCanonOverlayCandidatePromotionPlan(
    { ...CANON_OVERLAY_CANDIDATE_PROMOTION_PLANS, entries: promotionPlans() },
    intakeId
  );
}

export function renderCanonOverlayCandidatePromotionPlan(
  plan: CanonOverlayCandidatePromotionPlan
): string {
  return renderCanonOverlayCandidatePromotionPlanMarkdown(plan);
}
