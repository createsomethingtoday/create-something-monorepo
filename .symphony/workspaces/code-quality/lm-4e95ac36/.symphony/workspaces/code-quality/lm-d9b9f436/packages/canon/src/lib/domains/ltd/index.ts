/**
 * Canon Domain: .ltd (Philosophy/Canon)
 * 
 * Components specific to createsomething.ltd that don't depend on ltd-specific types.
 * 
 * Components that depend on $lib/types or $lib/taste/* have been moved to
 * packages/ltd/src/lib/components/ where they can access ltd-specific modules.
 */

// Taste components (self-contained, no $lib dependencies)
export { default as CollectionEditor } from './taste/CollectionEditor.svelte';
export { default as CollectionGrid } from './taste/CollectionGrid.svelte';
export { default as CollectionPicker } from './taste/CollectionPicker.svelte';
export { default as ContributeBlock } from './taste/ContributeBlock.svelte';

// Main components (self-contained)
export { default as PatternPage } from './PatternPage.svelte';
export { default as Presentation } from './Presentation.svelte';
export { default as Slide } from './Slide.svelte';
export { default as SubtractiveTriadAnimation } from './SubtractiveTriadAnimation.svelte';

// Components moved to packages/ltd/src/lib/components/:
// - MasterCard (depends on $lib/types.Master)
// - PrincipleCard (depends on $lib/types.Principle)
// - TasteProfileCard (depends on $lib/taste/insights)
// - TrackedPattern (depends on $lib/utils/tracking)
// - ImageLightbox (depends on $lib/types.Example)
// - ReadingProgress (depends on $lib/taste/insights)
