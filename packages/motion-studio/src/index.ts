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
export * from './primitives';

// Compositions - Full scene templates
export * from './compositions';

// Canon bridge - Design tokens for React
export * from './styles';

// Orchestration - Timeline and sequencing utilities
export * from './orchestration';

// Types
export type {
  VoxStyle,
  SceneConfig,
  AnimationTiming,
  TextRevealStyle,
  ChartBuildStyle,
} from './types';

// Remotion Root export
export { RemotionRoot } from './Root';
