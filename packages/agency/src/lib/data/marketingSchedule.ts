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

// Announce a cycle only after the editorial owner reviews its evidence and exact content.
export const marketingEditorialStatus = {
  title: 'The next publishing schedule is not yet announced.',
  detail:
    'The September dates were review plans, not publication or email-send confirmations. Read the published archive and current field reports while the next selection awaits evidence review.'
} as const;

export const marketingEvidenceRules = [
  'Git establishes what changed; a merge does not establish live behavior.',
  'The agent wiki helps locate the operating lesson; its source artifacts remain authoritative.',
  'CTX can explain earlier reasoning; current source, tests, and live behavior gate the claim.',
  'Every public example names what the evidence proves and what remains unknown.',
  'Client-private records and access changes do not become public stories.'
] as const;
