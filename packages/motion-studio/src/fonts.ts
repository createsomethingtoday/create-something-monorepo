/**
 * Font Loading for Remotion
 * 
 * Loads Canon fonts via @remotion/google-fonts
 * Stack Sans Notch: https://fonts.google.com/specimen/Stack+Sans+Notch
 * JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
 */
import { loadFont as loadStackSansNotch } from '@remotion/google-fonts/StackSansNotch';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

const fontLoadOptions = {
  subsets: ['latin'] as string[],
  ignoreTooManyRequestsWarning: true,
};

// Load only the weights/styles used in the compositions.
const { fontFamily: stackSansNotchFamily } = loadStackSansNotch('normal', {
  ...fontLoadOptions,
  weights: ['400', '500', '700'],
});

// Load JetBrains Mono for code/data
const { fontFamily: jetBrainsMonoFamily } = loadJetBrainsMono('normal', {
  ...fontLoadOptions,
  weights: ['400', '500', '700'],
});

// Export font families for use in components
export const fontFamily = {
  sans: stackSansNotchFamily,
  mono: jetBrainsMonoFamily,
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
};
