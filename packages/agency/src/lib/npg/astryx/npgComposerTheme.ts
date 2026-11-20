// The writing surface inherits NPG action and focus colors from the app theme.
// Status colors remain independent of branding. Dimensions reuse framework tokens.
import { defineTheme } from '@astryxdesign/core/theme';
import { npgTheme } from './npgTheme';
export const npgComposerTheme = defineTheme({
  name: 'npg-composer',
  extends: npgTheme,
  tokens: {
    '--text-body-size': '1.0625rem',
    '--radius-chat': 'var(--spacing-4)',
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
