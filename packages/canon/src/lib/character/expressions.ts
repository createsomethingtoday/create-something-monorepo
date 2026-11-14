export const expressions = ['welcome', 'attentive', 'focused', 'needs-review', 'recovery', 'handback'] as const;
export type CanonExpression = (typeof expressions)[number];
export const expressionCopy: Record<CanonExpression, { title: string; description: string; gaze: number; lift: number }> = {
  welcome: { title: 'Welcome', description: 'Choose a sample to explore.', gaze: 0, lift: 0 },
  attentive: { title: 'Attentive', description: 'Your sample is ready for a closer look.', gaze: 1, lift: -1 },
  focused: { title: 'Focused', description: 'Inspect the sample details at your own pace.', gaze: -1, lift: 1 },
  'needs-review': { title: 'Needs review', description: 'Review the sample before choosing a next step.', gaze: 1, lift: 0 },
  recovery: { title: 'Recovery', description: 'Choose a different sample or return to the start.', gaze: 0, lift: 1 },
  handback: { title: 'Handback', description: 'The next decision is yours.', gaze: 0, lift: -1 }
};
export const samplePreparationText = 'Sample prepared locally. No live tool was executed.';
