import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCanonMcpSnapshot } from './index.js';

const REPO_ROOT = join(process.cwd(), '..', '..');

describe('Canon MCP snapshot', () => {
  it('builds the Canon snapshot bundle consumed by MCP content generation', async () => {
    const snapshot = await buildCanonMcpSnapshot({
      rootDir: REPO_ROOT,
      rootLabel: '<repo-root>',
      searchRoots: ['packages/agency']
    });

    expect(snapshot.registryManifest.sourceOfTruth).toBe('@create-something/canon/registry');
    expect(snapshot.publicExportClassificationRules.length).toBeGreaterThan(0);
    expect(snapshot.overlayCatalog.sourceOfTruth).toBe('@create-something/canon/overlays');
    expect(snapshot.overlayTemplateFilePack.sourceOfTruth).toBe(
      '@create-something/canon/overlays/project-template'
    );
    expect(snapshot.overlayIntakeInventory.sourceOfTruth).toBe(
      '@create-something/canon/overlays/intake'
    );
    expect(snapshot.overlayIntakeInventory.rootDir).toBe('<repo-root>');
    expect(snapshot.overlayCandidateQueue.entries.length).toBe(
      snapshot.overlayCandidateReviewPackets.entries.length
    );
    expect(snapshot.overlayCandidatePromotionPlans.entries.length).toBe(
      snapshot.overlayCandidatePromotionReadinessReports.entries.length
    );
    expect(snapshot.overlayCandidatePromotionReadinessReports.entries.length).toBe(
      snapshot.overlayCandidatePromotionApprovalRecords.entries.length
    );
  });
});
