/**
 * @create-something/motion-studio
 * 
 * Vox-style motion graphics generation using Canon components and Remotion.
 * 
 * "The tool recedes; the explanation remains."
 * 
 * @example
 * ```typescript
 * import { KineticText, AnimatedChart, ExplainerIntro } from '@create-something/motion-studio';
 * import { Composition } from 'remotion';
 * 
 * export const RemotionRoot = () => (
 *   <Composition
 *     id="SubtractivTriad"
 *     component={ExplainerIntro}
 *     durationInFrames={150}
 *     fps={30}
 *     width={1920}
 *     height={1080}
 *   />
 * );
 * ```
 */

// Primitives - Vox-style animated components
export * from './primitives/index.js';

// Compositions - Full scene templates
export * from './compositions/index.js';

// Canon bridge - Design tokens for React
export * from './styles/index.js';

// Orchestration - Timeline and sequencing utilities
export * from './orchestration/index.js';

// Types
export type {
  VoxStyle,
  SceneConfig,
  AnimationTiming,
  TextRevealStyle,
  ChartBuildStyle,
} from './types.js';
