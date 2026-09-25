export const intakePaths = [
  {
    value: 'learn',
    title: 'Learn & build',
    description: 'Find a technique. Put it to work.',
    image: 'practice'
  },
  {
    value: 'create',
    title: 'Share your practice',
    description: 'Teach something you have figured out.',
    image: 'card'
  },
  {
    value: 'both',
    title: 'A bit of both',
    description: 'Good work travels in both directions.',
    image: 'exchange'
  }
] as const;
export type IntakeIntent = (typeof intakePaths)[number]['value'];
export type IntakeValues = {
  intent: string;
  display_name: string;
  email: string;
  practice: string;
  work_url: string;
  referral: string;
  consent: string;
};
export const emptyIntake: IntakeValues = {
  intent: '',
  display_name: '',
  email: '',
  practice: '',
  work_url: '',
  referral: '',
  consent: ''
};
export const intakeConsent = 'invitation-intake-2026-09-23';
