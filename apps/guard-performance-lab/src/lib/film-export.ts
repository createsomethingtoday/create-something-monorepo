import { createHash } from 'node:crypto';
import { capturedFilmAnalysisSchema, filmCorrectionSchema } from './film.js';
import { parseAuthoritativeState } from './model.js';

export const FILM_ANALYSIS_EXPORT_PROFILE = 'guard-film-analysis-export-v1' as const;

export type FilmAnalysisExportOptions = {
  sourceSha256: string;
  revision: 1 | 2 | 3 | 4;
  analysisId?: string;
};

export function serializedJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256Text(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function exportFilmAnalysisFromWorkspace(workspaceInput: unknown, options: FilmAnalysisExportOptions) {
  const workspace = parseAuthoritativeState(JSON.stringify(workspaceInput));
  const matches = workspace.filmAnalyses.filter((record) =>
    record.source.sha256 === options.sourceSha256
    && record.analysis.revision === options.revision
    && (!options.analysisId || record.id === options.analysisId)
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one source-bound revision to export; found ${matches.length}. Supply --analysis-id when multiple immutable records match.`);
  }
  const record = matches[0]!;
  const analysis = capturedFilmAnalysisSchema.parse({
    version: record.version,
    source: record.source,
    profile: record.profile,
    analysis: record.analysis,
    frames: record.frames
  });
  const corrections = filmCorrectionSchema.array().parse(record.corrections);
  const analysisText = serializedJson(analysis);
  const correctionsText = serializedJson(corrections);
  return {
    analysis,
    corrections,
    receipt: {
      version: 1,
      profile: FILM_ANALYSIS_EXPORT_PROFILE,
      workspaceRevision: workspace.revision,
      sourceSha256: analysis.source.sha256,
      analysisId: record.id,
      playerId: record.playerId,
      analysisRevision: analysis.analysis.revision,
      analysisExecutionCount: analysis.analysis.executionCount,
      frameCount: analysis.frames.length,
      correctionCount: corrections.length,
      analysisSha256: sha256Text(analysisText),
      correctionsSha256: sha256Text(correctionsText),
      exportedFromCreatedAt: record.createdAt
    }
  };
}
