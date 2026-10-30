import { planTranscript, TRANSCRIPT_FORMAT, type TranscriptPlan } from './indexed-transcript';
import { PAGE_FORMAT, LEGACY_PAGE_FORMAT } from './page-transcript';
import type { ParsedTranscript } from './types';

/** Page-readable shape is the publication default, not an implicit migration.
 * Routine unchanged checks preserve the persisted projection's exact format.
 * Explicit replay or changed source takes the default through existing gates.
 */
export async function publicationPlan(
  parsed: ParsedTranscript, projection: { version: string; phase: string } | null, explicitReplay: boolean,
): Promise<TranscriptPlan> {
  const next = await planTranscript(parsed, PAGE_FORMAT);
  if (!explicitReplay && projection) {
    if (!['writing', 'complete'].includes(projection.phase)) throw Error('Unknown projection phase; publication withheld');
    if (projection.version === next.version) return next;
    for (const format of [TRANSCRIPT_FORMAT, LEGACY_PAGE_FORMAT]) {
      const prior = await planTranscript(parsed, format);
      if (projection.version === prior.version) return prior;
    }
  }
  return next;
}
