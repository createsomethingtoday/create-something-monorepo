/**
 * Font Loading for Remotion
 * 
 * Loads Canon fonts via @remotion/google-fonts
 * Stack Sans Notch: https://fonts.google.com/specimen/Stack+Sans+Notch
 * JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
 */
import { loadFont as loadStackSansNotch } from '@remotion/google-fonts/StackSansNotch';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// Load Stack Sans Notch with all weights we need
const { fontFamily: stackSansNotchFamily } = loadStackSansNotch();

// Load JetBrains Mono for code/data
const { fontFamily: jetBrainsMonoFamily } = loadJetBrainsMono();

// Export font families for use in components
export const fontFamily = {
  sans: stackSansNotchFamily,
  mono: jetBrainsMonoFamily,
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
};
