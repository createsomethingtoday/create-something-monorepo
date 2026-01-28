/**
 * Canon Domain: .space (Experiments)
 * 
 * Components specific to createsomething.space that don't depend on space-specific modules.
 * 
 * Components that depend on $lib/services or $lib/types have been moved to
 * packages/space/src/lib/components/ where they can access space-specific modules.
 */

// Routing components
export { default as ExperimentsChart } from './routing/ExperimentsChart.svelte';

// Main components (self-contained)
export { default as ArticleContent } from './ArticleContent.svelte';
export { default as BeadsGraph } from './BeadsGraph.svelte';
export { default as CodeEditor } from './CodeEditor.svelte';
export { default as InteractiveExperimentCTA } from './InteractiveExperimentCTA.svelte';
export { default as LearningPathsSection } from './LearningPathsSection.svelte';
export { default as NextExperimentCard } from './NextExperimentCard.svelte';
export { default as RelatedResearch } from './RelatedResearch.svelte';
export { default as Terminal3DBackground } from './Terminal3DBackground.svelte';
export { default as TerminalExperience } from './TerminalExperience.svelte';

// Components moved to packages/space/src/lib/components/:
// - ArticleHeader, ContextualHint, ExperimentCodeEditor, ExperimentRuntime,
// - HeroSection, RelatedPapersCard, ResumePrompt, Terminal, TrackedExperimentBadge
// (all depend on $lib/services or $lib/types)
