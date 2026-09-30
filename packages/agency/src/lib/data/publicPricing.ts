export const PUBLIC_PRICING = {
  membership: {
    monthlyUsd: 900,
    label: 'From $900/month',
    terms: 'Cancel anytime',
    focused: {
      monthlyUsd: 900,
      label: '$900/month',
      workstreams: 1,
      checkInsPerMonth: 2,
      checkInMinutes: 30,
      remoteSessionsPerMonth: 2,
      remoteSessionMinutes: 60,
      milestonesPerMonth: 1,
      revisionRoundsPerMilestone: 1
    },
    team: {
      monthlyUsd: 2500,
      label: '$2,500/month',
      workstreams: 2,
      checkInsPerMonth: 2,
      checkInMinutes: 30,
      remoteSessionsPerMonth: 4,
      remoteSessionMinutes: 60,
      milestonesPerMonth: 2,
      revisionRoundsPerMilestone: 1
    }
  },
  publicSource: {
    amountUsd: 0,
    label: '$0 / MIT',
    license: 'MIT',
    contractUrl:
      'https://github.com/createsomethingtoday/create-something-monorepo/blob/main/PUBLIC_DISTRIBUTION.md'
  },
  map: {
    publicStarterLabel: '$0 browser-local starter',
    workspaceLabel: 'Account workspace · pricing at launch'
  },
  managedControl: {
    startingMonthlyUsd: 900,
    label: 'From $900/month',
    longLabel: 'From $900 per month after launch'
  }
} as const;
