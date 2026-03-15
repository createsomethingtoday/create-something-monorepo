/**
 * Animation Specs
 * 
 * Shared animation specifications that define WHAT happens.
 * Both Svelte (web) and Remotion (video) renderers interpret these specs.
 */

// Types
export * from './types';

// Specs
export { toolRrecedingSpec } from './tool-receding';
export { ideVsTerminalSpec } from './ide-vs-terminal';
export { canonRevealStyles, getCanonRevealStyle, type CanonRevealStyle } from './canon-reveals';

// Registry for looking up specs by ID
import { toolRrecedingSpec } from './tool-receding';
import { ideVsTerminalSpec } from './ide-vs-terminal';
import type { AnimationSpec } from './types';

export const animationSpecs: Record<string, AnimationSpec> = {
  'tool-receding': toolRrecedingSpec,
  'ToolReceding': toolRrecedingSpec, // Alias for backwards compatibility
  'ide-vs-terminal': ideVsTerminalSpec,
  'IDEvsTerminal': ideVsTerminalSpec, // Alias for backwards compatibility
};

export function getAnimationSpec(id: string): AnimationSpec | undefined {
  return animationSpecs[id];
}
