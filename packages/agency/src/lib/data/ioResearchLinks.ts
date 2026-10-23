/** Canonical public destinations verified against the .io archive on 2026-10-23.
 * Source: packages/io/src/lib/config/experimentCatalog.ts + fileBasedExperiments.ts.
 * Unknown legacy agency slugs go to the archive; never invent a matching article.
 */
export const IO_EXPERIMENTS_URL = 'https://createsomething.io/experiments';
export const IO_PAPERS_URL = 'https://createsomething.io/papers';
export const verifiedIoExperimentSlugs = [
  "governed-codex-model-routing",
  "webflow-analyzer-lineage",
  "ai-native-filtering",
  "ascii-renderer",
  "living-arena-gpu",
  "webflow-plagiarism-detection",
  "living-arena",
  "ic-mvp-pipeline",
  "canvas-interactivity",
  "spritz",
  "agent-operations",
  "render-preview",
  "render-studio",
  "kinetic-typography",
  "heideggerian-form-experience",
  "validation-zuhandenheit",
  "dwelling-conversion",
  "text-revelation",
  "agent-continuity",
  "template-recategorization",
  "meeting-capture",
  "awwwards-patterns",
  "diagrams",
  "hybrid-scheduling",
  "data-patterns",
  "agentic-visualization"
] as const;
const knownSlugs = new Set<string>(verifiedIoExperimentSlugs);
export function ioExperimentDestination(slug: string): string {
  return knownSlugs.has(slug) ? IO_EXPERIMENTS_URL + '/' + slug : IO_EXPERIMENTS_URL;
}

