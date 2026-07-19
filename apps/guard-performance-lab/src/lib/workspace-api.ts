import { z, ZodError } from 'zod';
import { labService, type LabService } from './server/lab-service.js';
import { isPlayerScope, type GuardAccessScope } from './server/scope.js';
import { capturedFilmAnalysisSchema } from './film.js';

const evidenceValues = z.enum(['emerging', 'usable', 'repeatable']);
const receiptSchema = z.object({
  date: z.string().min(1),
  session: z.string().min(1).optional(),
  strength: z.string().trim().min(1),
  nextFocus: z.string().trim().min(1),
  playerWords: z.string().trim().min(1),
  evidence: z.object({ scan: evidenceValues, angle: evidenceValues, security: evidenceValues, finish: evidenceValues, explain: evidenceValues }).optional()
});
const artifactSchema = z.object({
  kind: z.enum(['stat-line', 'video-highlight', 'rules-source', 'coach-observation']),
  title: z.string().trim().min(1), sourceLabel: z.string().trim().min(1), sourceUrl: z.string().url().optional(),
  level: z.enum(['youth', 'high-school', 'college', 'nba', 'general']), jurisdiction: z.string().optional(), observation: z.string().trim().min(1)
});
const engagementSchema = z.object({
  stage: z.enum(['prepare', 'connect', 'baseline', 'advantage', 'help', 'misdirection', 'live', 'receipt']),
  status: z.enum(['planned', 'active', 'paused', 'completed']),
  source: z.enum(['system', 'coach', 'player']),
  note: z.string().trim().min(1).max(800)
});
const playerProfileSchema = z.object({
  age: z.number().int().min(5).max(99).nullable().optional(),
  gender: z.enum(['male', 'female', 'nonbinary', 'self-described']).nullable().optional(),
  primaryPosition: z.enum(['guard', 'wing', 'post']).nullable().optional(),
  preferredName: z.string().trim().max(100).optional(),
  dominantHand: z.enum(['left', 'right', 'both']).nullable().optional(),
  height: z.string().trim().max(40).optional(),
  goals: z.string().trim().max(800).optional(),
  experienceLevel: z.string().trim().max(120).optional(),
  jurisdiction: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(800).optional()
});
const filmCorrectionDraftSchema = z.object({
  timeMs: z.number().int().nonnegative(),
  trackId: z.string().min(1).optional(),
  court: z.tuple([z.number().min(0).max(94), z.number().min(0).max(50)]).nullable(),
  targetStatus: z.enum(['resolved', 'unresolved', 'out-of-frame', 'inactive']).optional(),
  reason: z.string().trim().min(1).max(800)
});

export const workspaceCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('select-player'), playerId: z.string().min(1) }),
  z.object({ action: z.literal('create-player'), name: z.string().trim().min(1).max(100), profile: playerProfileSchema.optional() }),
  z.object({ action: z.literal('update-player-profile'), playerId: z.string().min(1), profile: playerProfileSchema }),
  z.object({ action: z.literal('save-receipt'), playerId: z.string().min(1), receipt: receiptSchema }),
  z.object({ action: z.literal('register-evidence'), playerId: z.string().min(1), evidence: artifactSchema }),
  z.object({ action: z.literal('record-engagement'), playerId: z.string().min(1), engagement: engagementSchema }),
  z.object({ action: z.literal('attach-film-analysis'), playerId: z.string().min(1), title: z.string().trim().min(1).max(160), analysis: capturedFilmAnalysisSchema }),
  z.object({ action: z.literal('correct-film-analysis'), playerId: z.string().min(1), analysisId: z.string().min(1), correction: filmCorrectionDraftSchema })
]);
export type WorkspaceCommand = z.infer<typeof workspaceCommandSchema>;

export async function workspaceCommandResponse(
  request: Request,
  service: LabService = labService,
  scope: GuardAccessScope = { role: 'operator' }
): Promise<Response> {
  try {
    const command = workspaceCommandSchema.parse(await request.json());
    if (isPlayerScope(scope)) {
      if (command.action === 'create-player' || command.action === 'select-player' || command.action === 'attach-film-analysis' || command.action === 'correct-film-analysis') {
        return Response.json({ ok: false, error: 'Player access cannot manage player profiles or analysis revisions.' }, { status: 403 });
      }
      if (command.playerId !== scope.playerId) {
        return Response.json({ ok: false, error: 'The requested operation is outside the assigned player scope.' }, { status: 403 });
      }
    }
    const result = command.action === 'select-player' ? await service.selectPlayer(command.playerId)
      : command.action === 'create-player' ? await service.createPlayer(command.name, command.profile)
      : command.action === 'update-player-profile' ? await service.updatePlayerProfile(command.playerId, command.profile)
      : command.action === 'save-receipt' ? await service.saveReceipt(command.playerId, command.receipt)
      : command.action === 'register-evidence' ? await service.registerEvidence(command.playerId, command.evidence)
      : command.action === 'record-engagement' ? await service.recordEngagement(command.playerId, command.engagement)
      : command.action === 'attach-film-analysis' ? await service.attachFilmAnalysis(command.playerId, command.title, command.analysis)
      : await service.correctFilmAnalysis(command.playerId, command.analysisId, command.correction);
    return Response.json(isPlayerScope(scope) ? await service.getPlayerWorkspace(scope.playerId) : result);
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ ok: false, error: 'Invalid workspace command.', issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, { status: 400 });
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Workspace command failed.' }, { status: 409 });
  }
}
