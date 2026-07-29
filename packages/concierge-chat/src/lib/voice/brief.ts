export interface VoiceApplicationBrief {
  specialty: string;
  workType?: string;
  preferredShift?: string;
  preferredLocation?: string;
  startWindow?: string;
  payPreference?: string;
  fitNotes?: string;
}

const briefRows: Array<[keyof VoiceApplicationBrief, string]> = [
  ['specialty', 'Specialty or role'],
  ['workType', 'Work type'],
  ['preferredShift', 'Preferred shift'],
  ['preferredLocation', 'Preferred location'],
  ['startWindow', 'Start window'],
  ['payPreference', 'Pay preference'],
  ['fitNotes', 'Fit notes']
];

export function getVoiceBriefRows(brief: VoiceApplicationBrief) {
  return briefRows.flatMap(([key, label]) => {
    const value = brief[key]?.trim();
    return value ? [{ key, label, value }] : [];
  });
}

export function formatVoiceBriefForApplication(brief: VoiceApplicationBrief): string {
  const lines = getVoiceBriefRows(brief).map(({ label, value }) => `- ${label}: ${value}`);

  return [
    'I used Abundance Voice Concierge to prepare this candidate-controlled application brief:',
    '',
    ...lines,
    '',
    'Please help me review and confirm these preferences before they are used for matching or recruiter review.'
  ].join('\n');
}
