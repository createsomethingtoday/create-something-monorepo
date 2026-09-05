export type MarketingScheduleItem = {
  weekOf: string;
  theme: string;
  readerQuestion: string;
  source: string;
  evidence: string;
  channels: string[];
  state: 'evidence review' | 'production';
};

export const marketingCadence = [
  { day: 'Tuesday', channel: 'LinkedIn', purpose: 'One practical lesson from verified work.' },
  {
    day: 'Thursday',
    channel: 'LinkedIn',
    purpose: 'The artifact, receipt, or boundary behind the lesson.'
  },
  {
    day: 'Alternate Thursdays',
    channel: 'YouTube',
    purpose: 'A complete 5–8 minute workflow walkthrough.'
  },
  {
    day: 'Friday',
    channel: 'X / Instagram',
    purpose: 'A technical adaptation or an existing demonstration clip.'
  },
  {
    day: 'Up to twice monthly',
    channel: 'Email',
    purpose: 'A validated field note in the existing CREATE SOMETHING archive.'
  }
] as const;

export const marketingSchedule: MarketingScheduleItem[] = [
  {
    weekOf: 'September 7, 2026',
    theme: 'Inspectable canvas changes',
    readerQuestion: 'Can an operator see what an agent changed?',
    source: 'Draw semantic composition and scoped production tools',
    evidence: 'Public-safe canvas walkthrough with one bounded change',
    channels: ['LinkedIn', 'YouTube', 'X', 'Instagram'],
    state: 'evidence review'
  },
  {
    weekOf: 'September 14, 2026',
    theme: 'Verification before claims',
    readerQuestion: 'How do you check a code claim before repeating it?',
    source: 'Ground calibration and release verification',
    evidence: 'One reproducible check with the exact result and limit',
    channels: ['LinkedIn', 'X'],
    state: 'evidence review'
  },
  {
    weekOf: 'September 21, 2026',
    theme: 'A receipt must name the state',
    readerQuestion: 'Does done mean prepared, approved, executed, or verified?',
    source: 'Workflow receipt history and the existing field note',
    evidence: 'Synthetic workflow from request through wait, stop, and receipt',
    channels: ['LinkedIn', 'YouTube', 'Email', 'X'],
    state: 'evidence review'
  },
  {
    weekOf: 'September 28, 2026',
    theme: 'The next operator needs a usable handoff',
    readerQuestion: 'What should remain when the agent leaves?',
    source: 'Atlas/Substrate operating loop and Agent Foundation handoff',
    evidence: 'Public-safe map with owner, boundary, proof, and recovery',
    channels: ['LinkedIn', 'X', 'Instagram'],
    state: 'evidence review'
  }
];

export const marketingEvidenceRules = [
  'Git establishes what changed; a merge does not establish live behavior.',
  'The agent wiki helps locate the operating lesson; its source artifacts remain authoritative.',
  'CTX can explain earlier reasoning; current source, tests, and live behavior gate the claim.',
  'Every public example names what the evidence proves and what remains unknown.',
  'Client-private records and access changes do not become public stories.'
] as const;
