/**
 * Outerfields Font Loading for Remotion
 * 
 * Loads Outerfields brand fonts via @remotion/google-fonts
 * - Space Grotesk: Primary sans-serif (brand font)
 * - Space Mono: Monospace for technical/data content
 */
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadSpaceMono } from '@remotion/google-fonts/SpaceMono';

// Load Space Grotesk with all weights
const { fontFamily: spaceGroteskFamily } = loadSpaceGrotesk();

// Load Space Mono for data/technical content
const { fontFamily: spaceMonoFamily } = loadSpaceMono();

// Export font families for use in components
export const fonts = {
  sans: spaceGroteskFamily,
  mono: spaceMonoFamily,
  // Fallback strings for CSS
  sansFallback: `${spaceGroteskFamily}, system-ui, -apple-system, sans-serif`,
  monoFallback: `${spaceMonoFamily}, 'JetBrains Mono', 'Fira Code', monospace`,
};

export default fonts;
