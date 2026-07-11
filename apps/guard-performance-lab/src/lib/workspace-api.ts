import { z, ZodError } from 'zod';
import { labService, type LabService } from './server/lab-service.js';

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

export const workspaceCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('select-player'), playerId: z.string().min(1) }),
  z.object({ action: z.literal('create-player'), name: z.string().trim().min(1).max(100) }),
  z.object({ action: z.literal('save-receipt'), playerId: z.string().min(1), receipt: receiptSchema }),
  z.object({ action: z.literal('register-evidence'), playerId: z.string().min(1), evidence: artifactSchema }),
  z.object({ action: z.literal('record-engagement'), playerId: z.string().min(1), engagement: engagementSchema })
]);
export type WorkspaceCommand = z.infer<typeof workspaceCommandSchema>;

export async function workspaceCommandResponse(request: Request, service: LabService = labService): Promise<Response> {
  try {
    const command = workspaceCommandSchema.parse(await request.json());
    const result = command.action === 'select-player' ? await service.selectPlayer(command.playerId)
      : command.action === 'create-player' ? await service.createPlayer(command.name)
      : command.action === 'save-receipt' ? await service.saveReceipt(command.playerId, command.receipt)
      : command.action === 'register-evidence' ? await service.registerEvidence(command.playerId, command.evidence)
      : await service.recordEngagement(command.playerId, command.engagement);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ ok: false, error: 'Invalid workspace command.', issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, { status: 400 });
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Workspace command failed.' }, { status: 409 });
  }
}
