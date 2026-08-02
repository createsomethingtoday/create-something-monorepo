export interface NurseStarterPrompt {
  label: string;
  message: string;
}

export const nurseStarterPrompts = [
  {
    label: 'ICU nights in Dallas',
    message: "I'm an ICU traveler looking for nights in Dallas."
  },
  {
    label: 'ER days near Phoenix',
    message: "I'm an ER traveler looking for day shifts near Phoenix."
  },
  {
    label: 'Compact license, open to Texas',
    message: "I have a compact license and I'm open to travel roles in Texas."
  }
] as const satisfies readonly NurseStarterPrompt[];
