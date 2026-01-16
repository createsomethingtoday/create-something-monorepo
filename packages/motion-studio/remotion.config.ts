/**
 * Remotion Configuration
 * 
 * Default settings for Vox-style motion graphics rendering.
 * "Weniger, aber besser" - purposeful motion, not decorative.
 */
import { Config } from '@remotion/cli/config';

// Point to the entry file that calls registerRoot()
Config.setEntryPoint('./src/Root.tsx');

// Standard HD output (16:9 aspect ratio)
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Vox-style typically uses 24fps for cinematic feel
// Can drop to 12fps for "choppy emphasis" segments
Config.setFrameRange([0, 150]); // Default 5 seconds at 30fps

export default Config;
