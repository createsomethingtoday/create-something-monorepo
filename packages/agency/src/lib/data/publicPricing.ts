export const PUBLIC_PRICING = {
  membership: { monthlyUsd: 900, label: '$900/month', terms: 'Cancel anytime' },
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
