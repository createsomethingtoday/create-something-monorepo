import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FOLLOWUP_POLICY_VERSION, JEV_FOLLOWUP_MODEL, type FollowupLane } from '../../src/jev-followup.js';

type Split = 'development' | 'held_out';
type EvidenceKind = 'first_pass_record' | 'meeting_level_none_needed' | 'analyst_only';
type HistoricalCase = {
  id: string;
  split: Split;
  sourceMeetingUrl: string;
  historicalLane: FollowupLane;
  evidenceKind: EvidenceKind;
  historicalEvidenceUrl: string | null;
  recordPhase?: 'first_pass_recap' | 'downstream_execution';
  candidateText: string;
  requesterKind: string;
  outputLocation: string;
};
type HistoricalCorpus = {
  policyVersion: string;
  cases: HistoricalCase[];
};
type EvaluationResult = {
  id: string;
  modelLane: FollowupLane | null;
  suggested: FollowupLane | null;
  status: 'suggested' | 'needs_review';
};

function option(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  if (at < 0) return undefined;
  const value = process.argv[at + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a file path.`);
  return resolve(value);
}

const corpusPath = option('--corpus');
if (!corpusPath) throw new Error('--corpus is required.');
const developmentPath = option('--development-results');
const heldOutPath = option('--held-out-results');
if (Boolean(developmentPath) !== Boolean(heldOutPath)) {
  throw new Error('Supply both result files, or neither.');
}

const source = await readFile(corpusPath);
const corpus = JSON.parse(source.toString('utf8')) as HistoricalCorpus;
if (corpus.policyVersion !== FOLLOWUP_POLICY_VERSION || !Array.isArray(corpus.cases) || corpus.cases.length === 0) {
  throw new Error('Historical corpus must have the current policy version and nonempty cases.');
}

const lanes = new Set<FollowupLane>(['ticket', 'task', 'agent_idea', 'no_action', 'needs_review']);
const ids = new Set<string>();
const meetings = new Map<string, Split>();
for (const item of corpus.cases) {
  if (!item.id || ids.has(item.id)) throw new Error(`Missing or duplicate case ID: ${item.id}`);
  ids.add(item.id);
  if (item.split !== 'development' && item.split !== 'held_out') throw new Error(`Invalid split: ${item.id}`);
  if (!item.sourceMeetingUrl.startsWith('https://app.notion.com/p/')) throw new Error(`Invalid source: ${item.id}`);
  if (!lanes.has(item.historicalLane) || !item.candidateText?.trim() || item.candidateText.length > 4000) {
    throw new Error(`Invalid lane or candidate: ${item.id}`);
  }
  const previous = meetings.get(item.sourceMeetingUrl);
  if (previous && previous !== item.split) throw new Error(`Meeting appears in both splits: ${item.id}`);
  meetings.set(item.sourceMeetingUrl, item.split);

  if (item.evidenceKind === 'first_pass_record') {
    if (item.recordPhase !== 'first_pass_recap' || !item.historicalEvidenceUrl?.startsWith('https://app.notion.com/p/') ||
        item.historicalEvidenceUrl === item.sourceMeetingUrl ||
        item.historicalLane === 'no_action' || item.historicalLane === 'needs_review') {
      throw new Error(`First-pass record lineage is incomplete: ${item.id}`);
    }
  } else if (item.evidenceKind === 'meeting_level_none_needed') {
    if (item.historicalLane !== 'no_action' || item.historicalEvidenceUrl !== item.sourceMeetingUrl) {
      throw new Error(`Meeting-level negative has invalid lineage: ${item.id}`);
    }
  } else if (item.evidenceKind === 'analyst_only') {
    if (item.historicalEvidenceUrl !== null) throw new Error(`Analyst-only case cannot claim a historical record: ${item.id}`);
  } else {
    throw new Error(`Invalid evidence kind: ${item.id}`);
  }
}

const results = new Map<string, EvaluationResult>();
for (const [split, path] of [['development', developmentPath], ['held_out', heldOutPath]] as const) {
  if (!path) continue;
  const file = JSON.parse(await readFile(path, 'utf8')) as {
    model?: string; policyVersion?: string; results?: EvaluationResult[];
  };
  if (file.model !== JEV_FOLLOWUP_MODEL || file.policyVersion !== corpus.policyVersion || !Array.isArray(file.results)) {
    throw new Error(`Model, policy, or results mismatch for ${split}.`);
  }
  for (const result of file.results) {
    const item = corpus.cases.find((candidate) => candidate.id === result.id);
    if (!item || item.split !== split || results.has(result.id) ||
        (result.status !== 'suggested' && result.status !== 'needs_review') ||
        (result.modelLane !== null && !lanes.has(result.modelLane)) ||
        (result.suggested !== null && !lanes.has(result.suggested)) ||
        (result.status === 'suggested' && result.suggested === null) ||
        (result.status === 'needs_review' && result.suggested !== null)) {
      throw new Error(`Result does not match corpus split or lane schema: ${result.id}`);
    }
    results.set(result.id, result);
  }
  if (file.results.length !== corpus.cases.filter((item) => item.split === split).length) {
    throw new Error(`Result count does not match ${split} corpus.`);
  }
}

const explicit = corpus.cases.filter((item) => item.evidenceKind === 'first_pass_record');
function comparison(items: HistoricalCase[]) {
  const compared = items.filter((item) => results.has(item.id));
  return {
    cases: compared.length,
    rawLaneAgreements: compared.filter((item) => results.get(item.id)?.modelLane === item.historicalLane).length,
    suggestedAgreements: compared.filter((item) => results.get(item.id)?.suggested === item.historicalLane).length,
    reviewOutcomes: compared.filter((item) => results.get(item.id)?.status === 'needs_review').length,
    decisiveDisagreements: compared.filter((item) => {
      const result = results.get(item.id);
      return result?.status === 'suggested' && result.suggested !== item.historicalLane;
    }).length
  };
}
const summary = {
  policyVersion: corpus.policyVersion,
  corpusSha256: createHash('sha256').update(source).digest('hex'),
  meetingGroups: meetings.size,
  splitMeetingGroups: {
    development: new Set(corpus.cases.filter((item) => item.split === 'development').map((item) => item.sourceMeetingUrl)).size,
    heldOut: new Set(corpus.cases.filter((item) => item.split === 'held_out').map((item) => item.sourceMeetingUrl)).size
  },
  evidenceCounts: {
    firstPassRecords: explicit.length,
    meetingLevelNegatives: corpus.cases.filter((item) => item.evidenceKind === 'meeting_level_none_needed').length,
    analystOnly: corpus.cases.filter((item) => item.evidenceKind === 'analyst_only').length
  },
  explicitRecordLaneCounts: Object.fromEntries(
    [...lanes].map((lane) => [lane, explicit.filter((item) => item.historicalLane === lane).length])
  ),
  explicitRecordComparison: results.size ? comparison(explicit) : null,
  explicitRecordComparisonBySplit: results.size ? {
    development: comparison(explicit.filter((item) => item.split === 'development')),
    heldOut: comparison(explicit.filter((item) => item.split === 'held_out'))
  } : null
};

console.log(JSON.stringify(summary, null, 2));
