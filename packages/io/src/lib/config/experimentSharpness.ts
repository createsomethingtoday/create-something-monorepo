export interface ExperimentGuide {
  question: string;
  action: string;
  evidence: string;
  limit: string;
  nextLabel: string;
  nextHref: string;
}

export const experimentGuides: Record<string, ExperimentGuide> = {
  'experiments/[slug]': {
    question: 'What did this experiment test, and what did it show?',
    action: 'Read the result first. Open the full record only when you need the method or source.',
    evidence: 'The result, method, limits, and source record are kept together.',
    limit: 'An experiment is evidence from one bounded test, not a universal rule.',
    nextLabel: 'Browse all experiments',
    nextHref: '/experiments'
  },
  'experiments/agent-operations': {
    question: 'Are the operating agents running successfully right now?',
    action: 'Check availability first, then inspect failures and recent runs.',
    evidence: 'Live status, run counts, costs, deployments, and incident records.',
    limit: 'Missing upstream data is reported as unavailable, never as success.',
    nextLabel: 'Browse all experiments',
    nextHref: '/experiments'
  },
  'experiments/agentic-visualization': {
    question: 'Can a chart component make sound display choices from the data it receives?',
    action: 'Compare the examples, then open the full research record for the method.',
    evidence: 'Eight display components tested with controlled sample data.',
    limit:
      'The examples demonstrate component behavior; they do not prove every dataset will be clear.',
    nextLabel: 'Explore data patterns',
    nextHref: '/experiments/data-patterns'
  },
  'experiments/ai-native-filtering': {
    question: 'Can a shopper describe what they want instead of learning a filter menu?',
    action: 'Try a plain request and compare the result with the manual filters.',
    evidence: 'The request, interpreted filters, matching products, and explanation stay visible.',
    limit: 'Results depend on the available catalog and the quality of the interpreted filters.',
    nextLabel: 'Browse all experiments',
    nextHref: '/experiments'
  },
  'experiments/ascii-renderer': {
    question: 'Can text preserve the recognizable shape and contrast of an image?',
    action: 'Choose an image, adjust the controls, and compare the output with the source.',
    evidence:
      'The renderer exposes its character matching and contrast controls beside the result.',
    limit: 'Fine detail and color are deliberately reduced to a text grid.',
    nextLabel: 'Explore text revelation',
    nextHref: '/experiments/text-revelation'
  },
  'experiments/awwwards-patterns': {
    question: 'Which motion and layout patterns remain useful after decoration is removed?',
    action: 'Review each pattern, then open the full record for implementation notes.',
    evidence: 'Monochrome examples isolate scale, borders, entrances, and transitions.',
    limit: 'These are reusable observations, not a formula for award-winning work.',
    nextLabel: 'Explore kinetic type',
    nextHref: '/experiments/kinetic-typography'
  },
  'experiments/canvas-interactivity': {
    question: 'Can direct manipulation make complex visual data easier to inspect?',
    action: 'Try one canvas, change its controls, and export or copy a result.',
    evidence: 'Each example pairs visible controls with a canvas response and export path.',
    limit: 'These are interaction prototypes, not production data editors.',
    nextLabel: 'Explore diagram components',
    nextHref: '/experiments/diagrams'
  },
  'experiments/data-patterns': {
    question: 'Which visual forms reveal change, distribution, and failure most quickly?',
    action: 'Compare the six patterns and note which question each one answers.',
    evidence: 'Controlled data demonstrates trends, distributions, degradation, and health.',
    limit: 'Sample data proves rendering behavior, not a live operating condition.',
    nextLabel: 'Explore chart decisions',
    nextHref: '/experiments/agentic-visualization'
  },
  'experiments/diagrams': {
    question: 'Can a small set of components explain flows, sequences, and relationships?',
    action: 'Choose the diagram that matches the relationship you need to explain.',
    evidence: 'Flow, sequence, hierarchy, and themed examples share one component vocabulary.',
    limit: 'The examples cover common structures, not every specialized notation.',
    nextLabel: 'Try canvas interactions',
    nextHref: '/experiments/canvas-interactivity'
  },
  'experiments/hybrid-scheduling': {
    question: 'Where should scheduled work run when one system is fast and another is durable?',
    action: 'Read the decision first, then open the full comparison and implementation record.',
    evidence: 'The comparison covers timing, durability, cost, failure recovery, and deployment.',
    limit: 'The recommendation reflects this workload and its measured constraints.',
    nextLabel: 'Inspect agent operations',
    nextHref: '/experiments/agent-operations'
  },
  'experiments/ic-mvp-pipeline': {
    question: 'Can a component move from idea to a verified release through one visible path?',
    action: 'Review the pipeline result, then open the full record for every validation step.',
    evidence: 'Bundle scanning, checks, previews, and release evidence appear in order.',
    limit: 'The pipeline validates the defined checks; it cannot prove every user outcome.',
    nextLabel: 'Browse all experiments',
    nextHref: '/experiments'
  },
  'experiments/kinetic-typography': {
    question: 'Can motion clarify how words assemble without making them harder to read?',
    action: 'Watch the examples once, then open the full record for timing and evaluation.',
    evidence: 'Each motion pattern is paired with its purpose and implementation.',
    limit: 'Motion is decorative unless it improves comprehension or orientation.',
    nextLabel: 'Explore text revelation',
    nextHref: '/experiments/text-revelation'
  },
  'experiments/living-arena': {
    question: 'Can one live model coordinate an arena while keeping people and safety visible?',
    action: 'Choose a scenario and watch how crowd, access, lighting, and alerts respond.',
    evidence: 'The arena view connects scenario changes to system state and incident messages.',
    limit: 'This is a simulated operating model, not a live venue control system.',
    nextLabel: 'Compare the GPU version',
    nextHref: '/experiments/living-arena-gpu'
  },
  'experiments/living-arena-gpu': {
    question: 'Can the arena simulation remain readable with thousands of moving people?',
    action: 'Choose a crowd scenario and compare movement, density, and response.',
    evidence: 'The GPU view renders crowd behavior and scenario changes at larger scale.',
    limit: 'The crowd model is simulated and does not predict real human behavior.',
    nextLabel: 'Open the system view',
    nextHref: '/experiments/living-arena'
  },
  'experiments/render-preview': {
    question: 'Can a floor-plan preview show what an image model will actually receive?',
    action: 'Load a demo or upload a plan, then compare the preview with the render result.',
    evidence: 'The source plan, conditioning image, result, and validation state stay visible.',
    limit: 'A matching input does not guarantee a useful generated image.',
    nextLabel: 'Open the render studio',
    nextHref: '/experiments/render-studio'
  },
  'experiments/render-studio': {
    question: 'Can someone edit a floor plan and test its render path in one workspace?',
    action: 'Load the demo, edit the plan, then send it to the preview.',
    evidence: 'The editor, saved plan, and preview handoff use the same source data.',
    limit: 'The editor demonstrates the workflow; it is not a complete drafting tool.',
    nextLabel: 'Test the render preview',
    nextHref: '/experiments/render-preview'
  },
  'experiments/spritz': {
    question: 'Can showing one word at a time make a passage faster to scan?',
    action: 'Start slowly, adjust the speed, and check whether you still understand the passage.',
    evidence: 'The reader exposes word position, punctuation timing, and speed controls.',
    limit: 'Reading faster is useful only when comprehension remains intact.',
    nextLabel: 'Explore text revelation',
    nextHref: '/experiments/text-revelation'
  },
  'experiments/text-revelation': {
    question: 'Can removing and revealing words direct attention without losing meaning?',
    action: 'Review the sequence, then open the full record for each technique and its use.',
    evidence: 'The page demonstrates staged reveal, erasure, emphasis, and reconstruction.',
    limit: 'The effect supports a message; it cannot replace a clear message.',
    nextLabel: 'Try the speed reader',
    nextHref: '/experiments/spritz'
  },
  'visualizations/arena-scale': {
    question: 'How can a small team supervise many venues without watching every workflow?',
    action: 'Move through the three steps: set authority, map the work, then inspect proof.',
    evidence: 'Each step pairs an operating decision with a visible signal and proof state.',
    limit: 'The model explains a control pattern; it does not connect to a live venue.',
    nextLabel: 'Open the arena simulation',
    nextHref: '/experiments/living-arena'
  }
};
