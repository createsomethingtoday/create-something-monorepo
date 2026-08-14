import { z } from 'zod';

const cleanString = (max: number) => z.string().trim().min(1).max(max);
const scenePatch = z
  .object({
    label: cleanString(80).optional(),
    heading: cleanString(240).optional(),
    explanation: cleanString(4_000).optional(),
    takeaway: cleanString(160).optional(),
    layout: z
      .enum(['statement', 'split', 'capabilities', 'image', 'code', 'map', 'decision', 'branches', 'demo', 'proof'])
      .optional(),
    notes: z.string().max(8_000).optional(),
    focusNodeIds: z.array(cleanString(160)).max(50).optional(),
    motionCue: z
      .enum(['signal-reveal', 'module-focus', 'handoff-trace', 'decision-gate', 'recovery-loop', 'proof-stamp', 'none'])
      .optional(),
    callout: z
      .object({ label: cleanString(80), value: cleanString(240), detail: cleanString(4_000) })
      .optional(),
    code: z
      .object({
        filename: cleanString(160),
        language: z.enum(['json', 'typescript']),
        content: cleanString(16_000)
      })
      .optional()
  })
  .strict();

export const arcCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_scene'), afterSceneId: z.string().optional(), routeId: z.string().optional() }),
  z.object({ type: z.literal('duplicate_scene'), sceneId: cleanString(160) }),
  z.object({ type: z.literal('remove_scene'), sceneId: cleanString(160) }),
  z.object({ type: z.literal('reorder_scene'), sceneId: cleanString(160), toIndex: z.number().int().min(0).max(500), routeId: z.string().optional() }),
  z.object({ type: z.literal('patch_scene'), sceneId: cleanString(160), patch: scenePatch }),
  z.object({ type: z.literal('set_scene_lock'), sceneId: cleanString(160), locked: z.boolean() }),
  z.object({ type: z.literal('set_scene_hidden'), sceneId: cleanString(160), hidden: z.boolean() }),
  z.object({
    type: z.literal('propose_scene_patch'),
    sceneId: cleanString(160),
    kind: z.enum(['copy', 'layout', 'motion', 'map-focus', 'image', 'speaker-notes']),
    summary: cleanString(500),
    patch: scenePatch,
    model: cleanString(160),
    prompt: cleanString(4_000)
  }),
  z.object({ type: z.literal('decide_scene_proposal'), proposalId: cleanString(200), decision: z.enum(['accepted', 'rejected']) }),
  z.object({ type: z.literal('add_comment'), sceneId: z.string().optional(), body: cleanString(2_000) }),
  z.object({ type: z.literal('resolve_comment'), commentId: cleanString(200) }),
  z.object({ type: z.literal('request_review') }),
  z.object({ type: z.literal('approve'), reason: cleanString(1_000) }),
  z.object({ type: z.literal('reject'), reason: cleanString(1_000) }),
  z.object({ type: z.literal('publish') }),
  z.object({ type: z.literal('archive') }),
  z.object({ type: z.literal('recover') })
]);
