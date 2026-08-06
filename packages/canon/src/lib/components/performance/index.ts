export { default as PerformanceLabBand } from './PerformanceLabBand.svelte';
export type { PerformanceLabMetric, PerformanceLabTone } from './PerformanceLabBand.svelte';
export { default as PerformanceFieldStudy } from './PerformanceFieldStudy.svelte';
export type {
  PerformanceFieldStudyMetric,
  PerformanceFieldStudyMode,
  PerformanceFieldStudyProps,
  PerformanceFieldStudyProof,
  PerformanceFieldStudySide,
  PerformanceFieldStudyStage
} from './PerformanceFieldStudy.svelte';
export { default as PerformanceFieldSequence } from './PerformanceFieldSequence.svelte';
export type {
  PerformanceFieldSequenceItem,
  PerformanceFieldSequenceLayout
} from './PerformanceFieldSequence.svelte';
export { default as PerformanceCampaignOpening } from './PerformanceCampaignOpening.svelte';
export { default as PerformancePaperStudioCanvas } from './PerformancePaperStudioCanvas.svelte';
export type {
  PerformanceCampaignMedia,
  PerformanceCampaignOpeningArtifactLayer,
  PerformanceCampaignOpeningMode,
  PerformanceCampaignProof,
  PerformanceCampaignVideo
} from './PerformanceCampaignOpening.svelte';
export type {
  PerformanceLegacyWaterCondition,
  PerformanceMaterialCondition,
  PerformanceMediaStudy,
  PerformanceMediaVideo,
  PerformancePaperCondition,
  PerformanceWaterCondition
} from './media/types';
export {
  paperCanonSheetMedia,
  paperLearningSequenceMedia,
  paperPressureHandoffMedia,
  paperPrototypeScoreMedia,
  paperResearchTraceMedia,
  performancePaperStudies
} from './media/paper-studies';
export type {
  PerformancePaperCameraFrame,
  PerformancePaperProperty,
  PerformancePaperShot,
  PerformancePaperStage
} from './media/paper-studio';
export {
  getPerformancePaperShot,
  performancePaperShots,
  performancePaperStudioTokens
} from './media/paper-studio';
export { default as PerformanceThesisConditions } from './PerformanceThesisConditions.svelte';
export type {
  PerformanceCondition,
  PerformanceConditionTone,
  PerformanceThesisMode
} from './PerformanceThesisConditions.svelte';
export { default as PerformanceContrastChapter } from './PerformanceContrastChapter.svelte';
export type {
  PerformanceContrastMode,
  PerformanceIntervention
} from './PerformanceContrastChapter.svelte';
export { default as PerformanceEvidenceIndex } from './PerformanceEvidenceIndex.svelte';
export type {
  PerformanceEvidenceItem,
  PerformanceEvidenceState
} from './PerformanceEvidenceIndex.svelte';
export { default as PerformanceConversionHandoff } from './PerformanceConversionHandoff.svelte';
export type {
  PerformanceHandoffArtifactPlacement,
  PerformanceHandoff,
  PerformanceHandoffStep,
  PerformanceHandoffState
} from './PerformanceConversionHandoff.svelte';
export { default as PerformanceNarrativeStage } from './PerformanceNarrativeStage.svelte';
export type {
  PerformanceNarrativeAction,
  PerformanceNarrativeScene,
  PerformanceNarrativeTone
} from './PerformanceNarrativeStage.svelte';
export { performancePageArchetypeBudgets, validatePerformancePageContract } from './page-contract';
export type {
  PerformancePageArchetype,
  PerformancePageChapter,
  PerformancePageChapterRole,
  PerformancePageContract,
  PerformancePageContractValidation,
  PerformancePageRegistryGroup,
  PerformancePageRolloutStatus,
  PerformancePageTechnicalExclusionKind
} from './page-contract';

// Preferred public names. The implementation paths and legacy Clear exports
// remain stable for downstream compatibility.
export { default as PerformancePageSection } from '../clear/ClearPageSection.svelte';
export { default as PerformanceErrorPage } from '../clear/ClearErrorPage.svelte';
export { default as PerformancePlatformHero } from '../clear/ClearPlatformHero.svelte';
export type {
  ClearPlatformHeroMeta as PerformancePlatformHeroMeta,
  ClearPlatformHeroProof as PerformancePlatformHeroProof
} from '../clear/ClearPlatformHero.svelte';
export { default as PerformanceLogoStrip } from '../clear/ClearLogoStrip.svelte';
export type { ClearLogoStripItem as PerformanceLogoStripItem } from '../clear/ClearLogoStrip.svelte';
export { default as PerformanceProofStrip } from '../clear/ClearProofStrip.svelte';
export type { ClearProofItem as PerformanceProofItem } from '../clear/ClearProofStrip.svelte';
export { default as PerformanceWorkflowMiniArtifact } from '../clear/ClearWorkflowMiniArtifact.svelte';
export type { ClearWorkflowMiniArtifactProps as PerformanceWorkflowMiniArtifactProps } from '../clear/ClearWorkflowMiniArtifact.svelte';
export { default as PerformanceStateRows } from '../clear/ClearStateRows.svelte';
export type { ClearWorkflowState as PerformanceWorkflowState } from '../clear/ClearStateRows.svelte';
export { default as PerformanceArtifactCard } from '../clear/ClearArtifactCard.svelte';
export { default as PerformanceCardGrid } from '../clear/ClearCardGrid.svelte';
export type { ClearCardItem as PerformanceCardItem } from '../clear/ClearCardGrid.svelte';
export { default as PerformanceUseCaseBand } from '../clear/ClearUseCaseBand.svelte';
export type { ClearUseCaseItem as PerformanceUseCaseItem } from '../clear/ClearUseCaseBand.svelte';
export { default as PerformanceQuoteMetricPanel } from '../clear/ClearQuoteMetricPanel.svelte';
export type { ClearQuoteMetric as PerformanceQuoteMetric } from '../clear/ClearQuoteMetricPanel.svelte';
export { default as PerformancePillarGrid } from '../clear/ClearPillarGrid.svelte';
export type {
  ClearPillarItem as PerformancePillarItem,
  ClearPillarLink as PerformancePillarLink
} from '../clear/ClearPillarGrid.svelte';
export { default as PerformanceMetadataRail } from '../clear/ClearMetadataRail.svelte';
export type {
  ClearMetadataGroup as PerformanceMetadataGroup,
  ClearMetadataItem as PerformanceMetadataItem
} from '../clear/ClearMetadataRail.svelte';
export { default as PerformanceSecurityPanel } from '../clear/ClearSecurityPanel.svelte';
export type {
  ClearSecurityItem as PerformanceSecurityItem,
  ClearSecurityLog as PerformanceSecurityLog
} from '../clear/ClearSecurityPanel.svelte';
export { default as PerformanceContentHighlights } from '../clear/ClearContentHighlights.svelte';
export type { ClearContentHighlight as PerformanceContentHighlight } from '../clear/ClearContentHighlights.svelte';
export { default as PerformanceReceiptGrid } from '../clear/ClearReceiptGrid.svelte';
export type { ClearReceipt as PerformanceReceipt } from '../clear/ClearReceiptGrid.svelte';
export { default as PerformanceCtaBand } from '../clear/ClearCtaBand.svelte';
export type {
  ClearControlState as PerformanceControlState,
  ClearCtaItem as PerformanceCtaItem
} from '../clear/ClearCtaBand.svelte';
export { default as PerformanceActionFooter } from '../clear/ClearActionFooter.svelte';
export type { ClearActionFooterItem as PerformanceActionFooterItem } from '../clear/ClearActionFooter.svelte';
export { default as PerformanceDecisionPanel } from '../clear/ClearDecisionPanel.svelte';
export type {
  ClearDecisionAction as PerformanceDecisionAction,
  ClearDecisionItem as PerformanceDecisionItem,
  ClearDecisionTone as PerformanceDecisionTone
} from '../clear/ClearDecisionPanel.svelte';
