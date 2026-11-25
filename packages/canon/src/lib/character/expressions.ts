export const expressions = ['welcome', 'attentive', 'focused', 'needs-review', 'recovery', 'handback'] as const;
export type CanonExpression = (typeof expressions)[number];
export const expressionCopy: Record<CanonExpression, { title: string; description: string }> = {
  welcome: { title: 'Welcome', description: 'Choose a sample to explore.' },
  attentive: { title: 'Attentive', description: 'Your sample is ready for a closer look.' },
  focused: { title: 'Focused', description: 'Inspect the sample details at your own pace.' },
  'needs-review': { title: 'Needs review', description: 'Review the sample before choosing a next step.' },
  recovery: { title: 'Recovery', description: 'Choose a different sample or return to the start.' },
  handback: { title: 'Handback', description: 'The next decision is yours.' }
};
export const samplePreparationText = 'Sample prepared locally. No live tool was executed.';
