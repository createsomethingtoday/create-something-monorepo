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
    expect(statusFor(report, 'voice')).toBe('implemented');
    expect(statusFor(report, 'glasses')).toBe('implemented');
    expect(entryFor(report, 'voice').templateIds).toContain('template.chat-decision-brief');
    expect(entryFor(report, 'glasses').templateIds).toContain('template.glasses-routing-hud');
    expect(entryFor(report, 'voice').evidenceSurfaceIds).toContain(
      'agency-atlas-voice-routing-summary:canon-overlay/copy-rules.md'
    );
    expect(entryFor(report, 'glasses').evidenceSurfaceIds).toContain(
      'agency-atlas-glasses-routing-hud:canon-overlay/surface-policy.md'
    );
    expect(report.summary).toMatchObject({
      totalModalities: 5,
      implemented: 5,
      templated: 0,
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
    expect(rendered).toContain('Status: `implemented`');
    expect(rendered).toContain('## glasses');
    expect(rendered).toContain('agency-atlas-glasses-routing-hud:canon-overlay/surface-policy.md');
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
