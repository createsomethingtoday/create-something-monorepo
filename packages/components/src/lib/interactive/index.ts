/**
 * Interactive Pattern Library
 *
 * Interaction components with Canon tokens.
 * All patterns respect reduced motion preferences.
 *
 * @example
 * import { GlassCard, HoverCard, TimelineEditor } from '@create-something/components/interactive';
 * import { LiquidGlass, LiquidGlassIcon, IntegrationFlow } from '@create-something/components/interactive';
 * import { InteractiveExperimentCTA, TrackedExperimentBadge } from '@create-something/components/interactive';
 */

// Glass components
export { default as GlassCard } from './GlassCard.svelte';
export { default as HoverCard } from './HoverCard.svelte';

// Liquid Glass - Apple-style refraction effects
// Philosophy: The cockpit of the automation vehicle.
// Like the 930's driver-centric layout: minimal, focused, controls recede.
export { default as LiquidGlass } from './LiquidGlass.svelte';
export { default as LiquidGlassIcon } from './LiquidGlassIcon.svelte';
export { default as IntegrationFlow } from './IntegrationFlow.svelte';

// Timeline editor
export { default as TimelineEditor } from './TimelineEditor.svelte';

// Experiment tracking components
export { default as InteractiveExperimentCTA } from './InteractiveExperimentCTA.svelte';
export { default as TrackedExperimentBadge } from './TrackedExperimentBadge.svelte';
