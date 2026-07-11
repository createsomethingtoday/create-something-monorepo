import { z } from 'zod';
import type { EvidenceArtifact } from './model.js';

export const stageSchema = z.enum(['prepare', 'connect', 'baseline', 'advantage', 'help', 'misdirection', 'live', 'receipt']);
export const guideInputSchema = z.object({
  stage: stageSchema.default('prepare'),
  observation: z.string().trim().max(800).default(''),
  energy: z.enum(['low', 'ready', 'high']).default('ready'),
  painSignal: z.boolean().default(false),
  defenderPicture: z.enum(['unknown', 'square', 'turned', 'behind']).default('unknown'),
  helpSource: z.enum(['unknown', 'none', 'nail', 'low-man', 'corner']).default('unknown'),
  artifacts: z.array(z.object({
    id: z.string(), kind: z.enum(['stat-line', 'video-highlight', 'rules-source', 'coach-observation']),
    title: z.string(), sourceLabel: z.string(), sourceUrl: z.string().optional(),
    level: z.enum(['youth', 'high-school', 'college', 'nba', 'general']), jurisdiction: z.string().optional(),
    observation: z.string(), capturedAt: z.string(), verification: z.enum(['unverified', 'source-linked', 'reviewed'])
  })).max(20).default([])
});
export type GuideInput = z.infer<typeof guideInputSchema>;
export type GuideOutput = {
  status: 'run' | 'review' | 'stop'; stage: GuideInput['stage']; headline: string; instruction: string;
  requestedContext: string; nextStage: GuideInput['stage']; receiptCue: string;
  evidence: { coachContext: string[]; observations: string[]; sourcedArtifacts: string[]; inferences: string[]; gaps: string[] };
};

const sequence: GuideInput['stage'][] = ['prepare', 'connect', 'baseline', 'advantage', 'help', 'misdirection', 'live', 'receipt'];

export function reviewEvidence(artifacts: EvidenceArtifact[]) {
  const sourcedArtifacts = artifacts.filter((a) => a.verification !== 'unverified' && a.sourceUrl).map((a) => `${a.title} — ${a.sourceLabel}`);
  const observations = artifacts.map((a) => a.observation).filter(Boolean);
  const gaps: string[] = [];
  if (!artifacts.some((a) => a.kind === 'coach-observation')) gaps.push('Add one current coach observation from the live session.');
  if (artifacts.some((a) => a.kind !== 'coach-observation' && !a.sourceUrl)) gaps.push('External evidence needs a source link before it can support a decision.');
  if (artifacts.some((a) => a.kind === 'video-highlight' && !a.jurisdiction)) gaps.push('Film evidence needs state or jurisdiction context.');
  return { observations, sourcedArtifacts, inferences: artifacts.length ? ['Reference evidence can suggest a picture to test; it does not rank or predict this player.'] : [], gaps };
}

export function getNextInteraction(raw: unknown): GuideOutput {
  const input = guideInputSchema.parse(raw);
  const reviewed = reviewEvidence(input.artifacts as EvidenceArtifact[]);
  const evidence = {
    ...reviewed,
    coachContext: input.observation ? [input.observation] : [],
    gaps: input.observation ? reviewed.gaps.filter((gap) => !gap.includes('coach observation')) : reviewed.gaps
  };
  if (input.painSignal) return { status: 'stop', stage: input.stage, headline: 'Stop the workout.', instruction: 'End the activity and involve a parent/guardian or qualified professional. Do not diagnose or train through pain.', requestedContext: 'Only record what was reported and what action was taken.', nextStage: input.stage, receiptCue: 'Record the stop signal and handoff without a medical conclusion.', evidence };

  const index = sequence.indexOf(input.stage);
  const nextStage = sequence[Math.min(index + 1, sequence.length - 1)]!;
  let status: GuideOutput['status'] = input.observation ? 'run' : 'review';
  let requestedContext = 'What did the player choose without prompting?';
  let headline = 'Observe before prescribing.';
  let instruction = 'Give the player the current task, then wait for one observable signal before adding a cue.';
  if (input.energy === 'high') instruction = 'Reduce coached volume. Keep one live picture and protect quality decisions.';
  if (input.stage === 'advantage') { headline = 'Create the angle before speed.'; requestedContext = 'Did the defender stay square, turn, or trail?'; instruction = input.defenderPicture === 'square' ? 'Use pace or eyes to move the chest before attacking.' : 'Win shoulder-to-hip and leave balanced.'; }
  if (input.stage === 'help') { headline = 'Read the first helper.'; requestedContext = 'Did help come from the nail, low man, corner, or nowhere?'; instruction = input.helpSource === 'nail' ? 'Stop for touch or move the ball.' : input.helpSource === 'low-man' ? 'Find the space the low man left.' : 'Scan before dribble two, then finish if no help commits.'; }
  if (input.stage === 'receipt') { status = 'review'; headline = 'Close with evidence, not a verdict.'; requestedContext = 'What can the player explain in his own words?'; instruction = 'Name one observable strength, ask for the player’s words, then set one next focus.'; }
  if (input.artifacts.length && evidence.gaps.length) requestedContext = evidence.gaps[0]!;
  return { status, stage: input.stage, headline, instruction, requestedContext, nextStage, receiptCue: 'Capture what was seen, what changed, and the next narrow cue.', evidence };
}
