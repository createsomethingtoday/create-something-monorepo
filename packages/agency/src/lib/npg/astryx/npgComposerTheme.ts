// Only the question-entry surface gets the action accent. Paid decisions retain
// their separate Neutral approval treatment. All dimensions reuse framework tokens.
import { defineTheme } from '@astryxdesign/core/theme';
import { npgTheme } from './npgTheme';
export const npgComposerTheme = defineTheme({
  name: 'npg-composer',
  extends: npgTheme,
  tokens: {
    '--text-body-size': '1.0625rem',
    '--radius-chat': 'var(--spacing-4)',
    '--color-accent': 'var(--color-text-info)',
    '--color-accent-muted': 'var(--color-info-muted)',
    '--color-text-accent': 'var(--color-text-info)',
    '--color-icon-accent': 'var(--color-icon-info)',
    '--focus-outline-color': 'var(--color-text-info)',
    '--focus-outline-offset': 'var(--spacing-0)'
  },
  adaptations: {
    rules: [
      {
        when: { width: { below: 'lg' } },
        value: { tokens: { '--text-body-size': '1.0625rem' } }
      }
    ]
  }
});
