import { marketingPagePortfolio } from './marketingPages';
import { usesAgencyMeasuredPublicSurface } from './publicSurfacePolicy';

export type AgencyPageChapter = {
  id: string;
  label: string;
  short: string;
  note: string;
};

export type AgencyPageFoundation = {
  label: string;
  spine: string;
  chapters: AgencyPageChapter[];
};

const chapter = (id: string, label: string, short: string, note: string): AgencyPageChapter => ({ id, label, short, note });
const foundation = (label: string, spine: string, chapters: AgencyPageChapter[] = []): AgencyPageFoundation => ({
  label,
  spine,
  chapters: [
    chapter('main-content', label, 'Start', 'Read the opening.'),
    ...chapters,
    chapter('agency-directory', 'Explore Agency', 'Explore', 'Choose the next useful destination.')
  ]
});

/* Each link names a real, stable SSR destination. Ordinals describe reading
   order only. They do not imply activity, readiness, measurements or results.
   Pages with working interfaces keep their task containers, not hidden steps. */
const foundations: Record<string, AgencyPageFoundation> = {
  '/openai-dots': foundation('OpenAI dots / Canon', 'A LITTLE MORE ROOM.', [
    chapter('why', 'The possibilities', 'Why', 'Context and follow-through, with access you choose.'),
    chapter('with-canon', 'A day with Canon', 'Example', 'Follow the illustrative Gather, Make, and Hand back sequence.'),
    chapter('your-call', 'Your call', 'Control', 'Keep permissions and consequential decisions in view.'),
    chapter('begin', 'A place to begin', 'Begin', 'Choose one useful task and a way to map it.')
  ]),
  '/arc/app-review-governance': foundation('App Review Governance', 'FOLLOW THE REVIEW.', [
    chapter('app-review-deck', 'Follow the review', 'Review', 'Explore the authored presentation and its decision path.'),
    chapter('arc-contract-title', 'Reuse the story', 'Context', 'Read how the same review supports different kinds of work.')
  ]),
  '/dfw-tech-support': foundation('DFW software support', 'KEEP IT WORKING.', [
    chapter('fit-title', 'When we can help', 'Fit', 'Check the software support boundary.'),
    chapter('proof-title', 'Inspect the evidence', 'Evidence', 'Read the evidence and its limits.'),
    chapter('next-title', 'Prepare an inquiry', 'Inquire', 'Bring the failure, without credentials.')
  ]),
  '/airtable-workflow-consulting': foundation('Airtable workflows', 'CONNECT THE WORK.', [
    chapter('fit-title', 'Check the fit', 'Fit', 'Start with the workflow that needs attention.'),
    chapter('proof-title', 'Inspect the evidence', 'Evidence', 'See the work behind the approach.'),
    chapter('next-title', 'Plan the next step', 'Next', 'Agree on the task before granting access.')
  ]),
  '/dispatch': foundation('Dispatch', 'READ THE RECORD.', [
    chapter('featured-report', 'The featured report', 'Report', 'Read what was tested and measured.'),
    chapter('reader-title', 'Choose your next step', 'Next', 'Find a useful path from the report.'),
    chapter('method-title', 'How we report', 'Method', 'Keep enough context to judge the result.')
  ]),
  '/technical-review': foundation('Technical review', 'CHECK THE WORK.', [
    chapter('fit-title', 'When a review helps', 'Fit', 'Check the situations this review serves.'),
    chapter('process-title', 'The review process', 'Process', 'Follow one workflow through the review.'),
    chapter('sample-title', 'Example findings', 'Example', 'Inspect the illustrative findings.'),
    chapter('scope-title', 'Review scope', 'Scope', 'Read what the engagement covers.')
  ]),
  '/agent-foundation': foundation('Agent Foundation', 'A USEFUL START.', [
    chapter('foundation-proof-title', 'What we build', 'Build', 'Inspect the first project and its records.'),
    chapter('foundation-boundary', 'Your handoff', 'Keep', 'See what you receive and what launch adds.'),
    chapter('foundation-fit-title', 'Check the fit', 'Fit', 'Start with the job you need the agent to do.')
  ]),
  '/services': foundation('Technical support', 'WORK TOGETHER.', [
    chapter('service-recorded-work', 'The actual work', 'Work', 'Inspect recorded work before choosing a service.'),
    chapter('membership', 'Plans and scope', 'Plans', 'Compare the agreed work and membership terms.'),
    chapter('remote-support', 'Remote support', 'Remote', 'Review how an approved support session works.')
  ]),
  '/workflow-compiler-integration': foundation('Workflow integration', 'MAKE IT CONNECT.', [
    chapter('workflow-compiler-integration-story', 'How it fits', 'Method', 'Read the integration path and its boundary.'),
    chapter('compiler-scope-title', 'Integration scope', 'Scope', 'Agree on the implementation and its limits.')
  ]),
  '/agent-readiness': foundation('Agent readiness', 'CHECK THE START.', [
    chapter('agent-readiness-audit-story', 'The readiness audit', 'Audit', 'Read what the audit checks before implementation.')
  ]),
  '/book': foundation('Workflow mapping session', 'PLAN THE NEXT STEP.', [
    chapter('first-party-scheduler', 'Choose a time', 'Time', 'Review the available session and booking details.')
  ]),
  '/contact': foundation('Start a conversation', 'A BRIEF, TOGETHER.', [
    chapter('inquiry-form', 'Prepare your brief', 'Brief', 'Review the inquiry before sending it.')
  ]),
  '/map': foundation('Map the workflow', 'DRAW THE WORK.', [
    chapter('canvas', 'The workspace', 'Map', 'Work with the actual workflow canvas.')
  ]),
  '/control': foundation('Control live work', 'KEEP IT IN BOUNDS.', [
    chapter('control-operating-story', 'How Control operates', 'Operate', 'Read the operating model, authority and evidence.')
  ]),
  '/basketball-systems-lab': foundation('Basketball Systems Lab', 'READ THE WHOLE FLOOR.', [
    chapter('lab', 'Run the lab', 'Lab', 'Use the actual prototype and its policy controls.'),
    chapter('board-report', 'Read the board report', 'Report', 'Inspect the model readback after a turn.')
  ]),
  '/proof/marketplace-workflow': foundation('Marketplace workflow proof', 'KEEP THE EVIDENCE.', [
    chapter('marketplace-proof-story', 'Read the workflow', 'Workflow', 'Inspect the preparation, review and evidence path.'),
    chapter('workflow-library-link-title', 'Go deeper', 'Guides', 'Find the related workflow guides.')
  ]),
  '/stack': foundation('What your team keeps', 'MAKE IT YOURS.', [
    chapter('stack-ownership-story', 'Ownership and handoff', 'Keep', 'Read what stays with your team.')
  ]),
  '/partners': foundation('Connected tools', 'CONNECT WITH CARE.', [
    chapter('tool-fit', 'Choose the tool fit', 'Fit', 'Begin with the task and the tools it needs.'),
    chapter('tool-deliverables', 'What you keep', 'Keep', 'Inspect the map, boundaries and evidence trail.')
  ]),
  '/for-service-providers': foundation('Use it with clients', 'BUILD WITH CLIENTS.', [
    chapter('provider-lifecycle', 'The delivery path', 'Delivery', 'Follow planning through client handover.'),
    chapter('provider-boundaries', 'Client access boundaries', 'Access', 'Reuse the approach while keeping client access separate.')
  ]),
  '/methodology': foundation('How we work', 'READ. BUILD. CHECK.', [
    chapter('methodology-argument', 'The method in practice', 'Method', 'Read the disciplines behind the working method.')
  ]),
  '/practice': foundation('Try the method', 'GIVE IT A TRY.', [
    chapter('delegation-practice-argument', 'Plan and review a task', 'Practice', 'Work through the method and its boundaries.'),
    chapter('evidence', 'Inspect the evidence', 'Evidence', 'Review the evidence before continuing.')
  ]),
  '/security': foundation('Security and access', 'CHECK BEFORE ACTING.', [
    chapter('security-controls', 'Access checks', 'Checks', 'Follow identity, entitlement, credentials and recovery.')
  ]),
  '/bearer-token-policy': foundation('Bearer token policy', 'KEEP ACCESS CLEAR.', [
    chapter('token-responsibilities', 'Your responsibilities', 'Your role', 'Read how personal credentials must be handled.'),
    chapter('token-enforcement', 'Enforcement', 'Enforce', 'Understand when access can stop.')
  ]),
  '/cloudflare': foundation('Cloudflare runtime', 'A PLACE TO RUN.', [
    chapter('cloudflare-runtime-story', 'The operating path', 'Runtime', 'Read the hosting, state and recovery model.')
  ]),
  '/products': foundation('Services and tools', 'CHOOSE YOUR PATH.', [
    chapter('product-recorded-work', 'The actual work', 'Work', 'Start with recordings of real interfaces.'),
    chapter('capabilities', 'Explore capabilities', 'Explore', 'Inspect the services and tools.'),
    chapter('choose-product', 'Choose a path', 'Choose', 'Compare the product roles and access boundaries.')
  ]),
  '/scopefield': foundation('Scopefield', 'YOUR BROWSER.', [
    chapter('focused-proof', 'How the boundary works', 'Boundary', 'Inspect the conceptual model and capability record.'),
    chapter('handoff', 'Try the beta', 'Beta', 'Read the compatibility and download checks.')
  ]),
  '/products/ground': foundation('Ground', 'EVIDENCE FIRST.', [
    chapter('ground-operating-path', 'Connect Ground', 'Connect', 'Choose the configuration for your agent client.'),
    chapter('ground-guardrail', 'How the check works', 'Check', 'Read the guardrail before relying on it.'),
    chapter('ground-proof', 'Inspect the proof', 'Proof', 'Review the evidence behind the result.'),
    chapter('ground-handoff-title', 'Put it to use', 'Use', 'Put evidence before the answer.')
  ]),
  '/products/signal': foundation('Signal', 'NOTICE WHAT CHANGED.', [
    chapter('signal-operating-boundary', 'Signal operating boundary', 'Boundary', 'Read what this view shows and what happens next.')
  ]),
  '/products/decision': foundation('Decision', 'GIVE JUDGMENT A PLACE.', [
    chapter('decision-operating-boundary', 'Decision operating boundary', 'Boundary', 'Read the decision, authority and next step.')
  ]),
  '/products/proof': foundation('Proof', 'KEEP THE RECEIPT.', [
    chapter('proof-operating-boundary', 'Proof operating boundary', 'Boundary', 'Read the record and the limits of its evidence.')
  ]),
  '/products/loom': foundation('Loom route', 'FOLLOW THE HANDOFF.', [
    chapter('loom-archive-story', 'The current path', 'Path', 'Read the current route and historical boundary.')
  ]),
  '/field-reports': foundation('Field reports', 'READ WHAT HAPPENED.', [
    chapter('reports', 'Read the reports', 'Reports', 'Choose a sourced report with its limits visible.')
  ]),
  '/field-reports/template-review': foundation('Template review field report', 'TEST. RECORD. LEARN.', [
    chapter('result', 'The measured result', 'Result', 'Read the result and what was not measured.'),
    chapter('field-context-title', 'The approval boundary', 'Boundary', 'See where preparation stops and human judgment begins.')
  ]),
  '/field-reports/upstream-contributions': foundation('Upstream contributions', 'IMPROVE THE TOOLS.', [
    chapter('contribution', 'What changed', 'Changes', 'Read the upstream contribution record.'),
    chapter('evidence', 'Inspect the evidence', 'Evidence', 'Follow the sources supporting the contribution.')
  ]),
  '/use-cases/business': foundation('AI for business tasks', 'START WITH THE WORK.', [
    chapter('business-pilot-story', 'The pilot path', 'Pilot', 'Read how a useful business task becomes a bounded pilot.')
  ]),
  '/use-cases/enterprise': foundation('Enterprise workflows', 'MAKE THE SYSTEM CLEAR.', [
    chapter('enterprise-control-story', 'The operating model', 'Operate', 'Read the enterprise workflow and control path.')
  ]),
  '/about': foundation('About the work', 'GOOD TOOLS. PEOPLE.', [
    chapter('about-letter', 'A note from Micah', 'The note', 'Read the approach behind CREATE SOMETHING.')
  ]),
  '/workflows': foundation('Workflow guides', 'FIND A USEFUL ROUTE.', [
    chapter('guides', 'Find a guide', 'Guides', 'Choose the task or boundary you want to understand.'),
    chapter('playbook-route', 'Apply the method', 'Apply', 'Use the guide with an explicit operating path.'),
    chapter('library-faq-heading', 'Common questions', 'Questions', 'Read the workflow library boundaries.')
  ]),
  '/privacy': foundation('Privacy', 'YOUR DATA. YOUR CALL.', [
    chapter('policy-content', 'Read the privacy policy', 'Policy', 'Review data handling and separate privacy choices.')
  ]),
  '/terms': foundation('Terms of service', 'READ THE TERMS.', [
    chapter('policy-content', 'Read the terms', 'Terms', 'Review the conditions for using the service.')
  ]),
  '/support-brief': foundation('Prepare a support brief', 'MAKE THE PROBLEM CLEAR.', [
    chapter('agent-heading', 'Start with your agent', 'Start', 'Import a prepared brief or write it here.'),
    chapter('brief-form', 'Write the brief', 'Write', 'Describe the work, owner, evidence and boundaries.')
  ]),
  '/ai-workflow-control': foundation('AI workflow control', 'KEEP IT IN BOUNDS.', [
    chapter('workflow-control-boundary', 'The control boundary', 'Boundary', 'Read the authority, checks and handoff.')
  ]),
  '/ai-workflow-recovery': foundation('AI workflow recovery', 'LEAVE A WAY BACK.', [
    chapter('workflow-recovery-boundary', 'The recovery path', 'Recover', 'Read how the workflow stops and recovers.')
  ]),
  '/marketplace-review-automation': foundation('Marketplace review automation', 'PREPARE. THEN REVIEW.', [
    chapter('marketplace-review-boundary', 'The review boundary', 'Review', 'Separate evidence preparation from human judgment.')
  ]),
  '/arcs': foundation('Workflow presentations', 'FOLLOW THE PLAN.', [
    chapter('arc-filter-title', 'Find a starting point', 'Find', 'Choose a task, tool or kind of presentation.')
  ]),
  '/experiments': foundation('Experiments and research', 'BUILD. TEST. LEARN.', [
    chapter('research-destinations', 'Explore research on .io', 'Research', 'Follow the experiments and papers to their owning property.')
  ])
};

// Reuse the already-loaded public portfolio term rather than shipping the full
// workflow article corpus into every page's navigation bundle.
for (const entry of marketingPagePortfolio) {
  if (entry.decision === 'archive' || !entry.path.startsWith('/workflows/')) continue;
  const term = entry.requiredTerms[1];
  if (!term) continue;
  foundations[entry.path] = foundation(term, 'FOLLOW THE METHOD.', [
    chapter('signals-heading', 'When this approach helps', 'Fit', 'Check the signals before choosing the approach.'),
    chapter('operating-path', 'Follow the steps', 'Steps', 'Read the bounded operating path.'),
    chapter('artifacts-heading', 'What to keep', 'Keep', 'Inspect the documents and records to keep.'),
    chapter('proof-heading', 'Supporting examples', 'Examples', 'Read the evidence behind the approach.')
  ]);
}

export function getAgencyPageFoundation(pathname: string, bookingIntent?: string | null): AgencyPageFoundation | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  // Home retains its authored dial. Experiment details redirect to .io before
  // rendering, so do not invent an unreachable Agency reading sequence.
  if (path === '/' || /^\/experiments\/[^/]+$/.test(path) || !usesAgencyMeasuredPublicSurface(path)) return null;
  const result = foundations[path] ?? (/^\/arc\/[^/]+$/.test(path)
    ? foundation('Workflow presentation', 'FOLLOW THE PLAN.', [
        chapter('arc-presentation', 'Follow the plan', 'Plan', 'Read the registered steps and their records.'),
        chapter('registry-arc-contract-title', 'Read the full context', 'Context', 'Open the workflow plan before acting.')
      ])
    : null);
  // Publication and 404 decisions stay with the route loader. Callers also
  // suppress this presentation on error pages; no catalog import is needed.
  if(path === '/book' && result){
    const names: Record<string,string> = {'agent-foundation':'Agent Foundation fit call','technical-review':'Technical review fit call','compiler-integration':'Workflow integration fit call','system-support':'Software support discussion'};
    const label=names[bookingIntent ?? ''] ?? result.label;
    return {...result,label,spine:bookingIntent && names[bookingIntent] ? 'FIND THE FIT.' : result.spine,chapters:result.chapters.map((item,index)=>({...item,...(index===0?{label}: {})}))};
  }
  return result ? { ...result, chapters: result.chapters.map(item => ({ ...item })) } : null;
}
