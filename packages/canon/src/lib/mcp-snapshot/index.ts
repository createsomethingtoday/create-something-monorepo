import { getCanonOverlayCatalog } from '../overlays/index.js';
import { buildCanonProjectOverlayTemplateFilePack } from '../overlays/project-template/index.js';
import {
  buildCanonOverlayCandidatePromotionApprovalRecords,
  buildCanonOverlayCandidatePromotionPlans,
  buildCanonOverlayCandidatePromotionReadinessReports,
  buildCanonOverlayCandidateQueue,
  buildCanonOverlayCandidateReviewPackets,
  buildCanonOverlayIntakeInventory
} from '../overlays/intake.js';
import {
  CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES,
  getCanonRegistryManifest
} from '../registry/index.js';
import type {
  CanonOverlayCandidatePromotionApprovalRecordCollection,
  CanonOverlayCandidatePromotionPlanCollection,
  CanonOverlayCandidatePromotionReadinessReportCollection,
  CanonOverlayCandidateQueue,
  CanonOverlayCandidateReviewPacketCollection,
  CanonOverlayCatalog,
  CanonProjectOverlayInventory,
  CanonRegistryManifest
} from '../registry/schema.js';
import type { CanonPublicExportClassificationRule } from '../registry/public-export-classification.js';
import type { CanonProjectOverlayTemplateFilePack } from '../overlays/project-template/index.js';

export type CanonMcpSnapshotOptions = {
  rootDir: string;
  rootLabel?: string;
  searchRoots?: string[];
};

export type CanonMcpSnapshot = {
  registryManifest: CanonRegistryManifest;
  publicExportClassificationRules: CanonPublicExportClassificationRule[];
  overlayCatalog: CanonOverlayCatalog;
  overlayTemplateFilePack: CanonProjectOverlayTemplateFilePack;
  overlayIntakeInventory: CanonProjectOverlayInventory;
  overlayCandidateQueue: CanonOverlayCandidateQueue;
  overlayCandidateReviewPackets: CanonOverlayCandidateReviewPacketCollection;
  overlayCandidatePromotionPlans: CanonOverlayCandidatePromotionPlanCollection;
  overlayCandidatePromotionReadinessReports: CanonOverlayCandidatePromotionReadinessReportCollection;
  overlayCandidatePromotionApprovalRecords: CanonOverlayCandidatePromotionApprovalRecordCollection;
};

export async function buildCanonMcpSnapshot(
  options: CanonMcpSnapshotOptions
): Promise<CanonMcpSnapshot> {
  const overlayIntakeInventory = await buildCanonOverlayIntakeInventory({
    rootDir: options.rootDir,
    rootLabel: options.rootLabel,
    searchRoots: options.searchRoots
  });
  const overlayCandidateQueue = buildCanonOverlayCandidateQueue(overlayIntakeInventory);
  const overlayCandidateReviewPackets =
    buildCanonOverlayCandidateReviewPackets(overlayCandidateQueue);
  const overlayCandidatePromotionPlans = buildCanonOverlayCandidatePromotionPlans(
    overlayCandidateReviewPackets
  );
  const overlayCandidatePromotionReadinessReports =
    buildCanonOverlayCandidatePromotionReadinessReports(overlayCandidatePromotionPlans);
  const overlayCandidatePromotionApprovalRecords =
    buildCanonOverlayCandidatePromotionApprovalRecords(overlayCandidatePromotionReadinessReports);

  return {
    registryManifest: getCanonRegistryManifest(),
    publicExportClassificationRules: CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES,
    overlayCatalog: getCanonOverlayCatalog(),
    overlayTemplateFilePack: buildCanonProjectOverlayTemplateFilePack(),
    overlayIntakeInventory,
    overlayCandidateQueue,
    overlayCandidateReviewPackets,
    overlayCandidatePromotionPlans,
    overlayCandidatePromotionReadinessReports,
    overlayCandidatePromotionApprovalRecords
  };
}
