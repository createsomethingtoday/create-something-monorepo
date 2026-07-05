import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCanonOverlayIntakeInventory } from '../overlays/intake.js';
import { CANON_REGISTRY_MANIFEST } from '../registry/index.js';
import { buildCanonModalityReadinessReport, renderCanonModalityReadinessReport } from './index.js';

const REPO_ROOT = join(process.cwd(), '..', '..');

describe('Canon modality readiness', () => {
  it('separates implemented project evidence from templated modality coverage', async () => {
    const overlayInventory = await buildCanonOverlayIntakeInventory({
      rootDir: REPO_ROOT,
      rootLabel: '<repo-root>',
      searchRoots: ['packages/agency']
    });

    const report = buildCanonModalityReadinessReport({
      registryManifest: CANON_REGISTRY_MANIFEST,
      overlayInventory
    });

    expect(report.sourceOfTruth).toBe('@create-something/canon/modality-readiness');
    expect(report.modalities.map((entry) => entry.modality)).toEqual([
      'web',
      'chat',
      'app',
      'voice',
      'glasses'
    ]);
    expect(statusFor(report, 'web')).toBe('implemented');
    expect(statusFor(report, 'chat')).toBe('implemented');
    expect(statusFor(report, 'app')).toBe('implemented');
    expect(statusFor(report, 'voice')).toBe('templated');
    expect(statusFor(report, 'glasses')).toBe('templated');
    expect(entryFor(report, 'voice').templateIds).toContain('template.chat-decision-brief');
    expect(entryFor(report, 'glasses').templateIds).toContain('template.glasses-routing-hud');
    expect(entryFor(report, 'voice').evidenceSurfaceCount).toBe(0);
    expect(entryFor(report, 'glasses').evidenceSurfaceCount).toBe(0);
    expect(report.summary).toMatchObject({
      totalModalities: 5,
      implemented: 3,
      templated: 2,
      gaps: 0
    });
  });

  it('renders the modality readiness report for agent handoff', async () => {
    const overlayInventory = await buildCanonOverlayIntakeInventory({
      rootDir: REPO_ROOT,
      rootLabel: '<repo-root>',
      searchRoots: ['packages/agency']
    });
    const report = buildCanonModalityReadinessReport({
      registryManifest: CANON_REGISTRY_MANIFEST,
      overlayInventory
    });
    const rendered = renderCanonModalityReadinessReport(report);

    expect(rendered).toContain('# Canon Modality Readiness');
    expect(rendered).toContain('## voice');
    expect(rendered).toContain('Status: `templated`');
    expect(rendered).toContain('## glasses');
    expect(rendered).toContain('project-overlay surface evidence');
  });
});

function entryFor(
  report: ReturnType<typeof buildCanonModalityReadinessReport>,
  modality: 'web' | 'chat' | 'app' | 'voice' | 'glasses'
) {
  const entry = report.modalities.find((candidate) => candidate.modality === modality);
  if (!entry) throw new Error(`Missing ${modality} readiness entry`);
  return entry;
}

function statusFor(
  report: ReturnType<typeof buildCanonModalityReadinessReport>,
  modality: 'web' | 'chat' | 'app' | 'voice' | 'glasses'
) {
  return entryFor(report, modality).status;
}
