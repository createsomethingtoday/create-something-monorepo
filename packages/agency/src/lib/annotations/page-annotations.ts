/** Public editorial annotations; independent of WebMCP tool registration.
 * API: https://learn.chatgpt.com/docs/annotations-extensibility
 */
type Target = { selector: string; title: string; prompt: string; question?: string; heading?: string };
export const annotationTargets: Record<string, readonly Target[]> = {
  '/': [
    { selector: '.service-journey', title: 'How support works', prompt: 'Explain how this support process moves from a problem to a checked handoff.' },
    { selector: '#membership', title: 'Support membership', prompt: 'Explain the support options and what needs agreement before work begins.' },
    { selector: '.outerfields-story', heading: '#outerfields-title', title: 'Outerfields project story', question: 'What carried forward from this project?', prompt: 'Walk through the published Outerfields sequence: prototype, funded development, in-house handoff, and our later PCN. Separate recorded milestones from lessons this page does not spell out.' }
  ],
  '/services': [
    { selector: '#support-scope', title: 'Membership and scope', prompt: 'Explain what this support scope includes and which costs or approvals remain separate.' },
    { selector: '#remote-support', title: 'Remote support', prompt: 'Explain how this remote support process protects my approval rights.' }
  ],
  '/products': [
    { selector: '#capabilities', title: 'What your team keeps', prompt: 'Explain the deliverables shown here and the limits of their evidence.' },
    { selector: '.product-proof-shelf', title: 'Tools that check the work', prompt: 'Explain how these tools help check work and what they do not prove.' }
  ],
  '/field-reports': [
    { selector: '#reports', title: 'Public field reports', prompt: 'Explain what these field reports demonstrate and which limits I should inspect.' }
  ],
  '/practice': [
    { selector: '#evidence', title: 'Practice source evidence', prompt: 'Explain the difference between verified, review, and draft evidence in this section.' }
  ],
  '/stack': [
    { selector: '#stack-ownership-story', title: 'System ownership', prompt: 'Explain what my team owns and what each provider does in this system.' }
  ],
  '/about': [
    { selector: '#about-operating-story', title: 'Court vision and working method', question: 'What does court vision change?', prompt: 'Explain how the basketball, pressure, and continuity-of-care references connect to the method described here. Use only the published account; identify where a personal example from Micah would add detail.' }
  ],
  '/agent-foundation': [
    { selector: '.foundation-proof', title: 'Illustrative project handoff', question: 'How do I make the next change?', prompt: 'Using this illustrative meeting-notes job, explain how the repository and handoff checks help a team make its next change. Keep the example distinct from a client result.' },
    { selector: '#foundation-boundary', title: 'Ownership and production readiness', question: 'Why is launch a separate step?', prompt: 'Why is keeping the project different from being ready to launch it? Compare the delivered foundation with the separately agreed Production Promotion work.' }
  ],
  '/field-reports/template-review': [
    { selector: '#result', title: 'Evidence preparation and human judgment', question: 'Why keep the final decision human?', prompt: 'Explain why 49 of 50 completed evidence packets did not justify automated approval. Keep packet completion, the exceptional-case miss, and unmeasured reviewer time separate. Use the published report; do not invent a decision story.' }
  ],
  '/field-reports/upstream-contributions': [
    { selector: '#contribution', title: 'Public contribution path', question: 'How did the contribution evolve?', prompt: 'Trace the failure, maintainer changes, and accepted result in this public contribution record. Use the published account and linked records; identify missing detail rather than inventing motives or conversations.' },
    { selector: '#evidence', title: 'Contribution review and release records', question: 'What do these receipts establish?', prompt: 'Which linked public records establish what was accepted and released, and which proposal was superseded? Explain how a proposal, merge, release, and endorsement differ without inferring a partnership.' }
  ],
  '/workflows/human-in-the-loop-ai': [
    { selector: '#operating-path', title: 'Reviewer authority in practice', question: 'What makes this a real decision?', prompt: 'Walk through these steps for giving a reviewer a real decision. Explain what the person needs to see, what they can stop, and how exceptions get an owner. Label any added example as hypothetical.' }
  ],
  '/workflows/ai-agent-evaluation': [
    { selector: '#operating-path', title: 'Evidence before greater agent authority', question: 'Why is a working demo not enough?', prompt: 'Explain why passing a demo is not enough to grant an agent more authority. Use the cases, acceptance criteria, known misses, and recovery steps in this guide. Label any added example as hypothetical.' }
  ]
};

export type AnnotationDocument = Document & { oai?: { annotation?: {
  request: (target: Element, options: { initialComment: string; metadata: Record<string, string> }) => { accepted: boolean };
} } };

export function installPageAnnotations(root: HTMLElement, pathname: string): () => void {
  const doc = root.ownerDocument as AnnotationDocument;
  const targets = Object.hasOwn(annotationTargets, pathname) ? annotationTargets[pathname] : undefined;
  if (!targets || !doc.defaultView || doc.defaultView.top !== doc.defaultView || typeof doc.oai?.annotation?.request !== 'function') return () => {};
  const undo: Array<() => void> = [];
  const installed: Element[] = [];
  let disposed = false;
  for (const config of targets) {
    const region = root.querySelector<HTMLElement>(config.selector);
    // Never annotate a form, editable workspace, or an existing annotation region.
    if (!region || region.closest('form, [contenteditable], [oai-annotation-container], [oai-annotatable]') || region.querySelector('form, input, textarea, select, [contenteditable], [oai-annotation-container], [oai-annotatable]') || installed.some((other) => other.contains(region) || region.contains(other))) continue;
    const target = config.heading ? region.querySelector<HTMLElement>(config.heading) : region.querySelector<HTMLElement>('header') ?? region.querySelector<HTMLElement>('h2');
    if (!target || target === region) continue;
    installed.push(region);
    // Static reviewed metadata only: no DOM text, URLs with queries, or user values.
    const metadata = { title: config.title, route: pathname, kind: 'public editorial context' };
    const attributes: Array<[Element, string, string]> = [
      [region, 'oai-annotation-container', ''],
      [target, 'oai-annotatable', config.title],
      [target, 'oai-annotation-metadata', JSON.stringify(metadata)]
    ];
    for (const [element, name, value] of attributes) {
      const previous = element.getAttribute(name);
      element.setAttribute(name, value);
      undo.push(() => { if (element.getAttribute(name) === value) { if (previous === null) element.removeAttribute(name); else element.setAttribute(name, previous); } });
    }
    const controls = doc.createElement('div');
    controls.className = 'agency-annotation-controls';
    controls.setAttribute('data-analytics-ignore', '');
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'agency-annotation-button';
    button.textContent = config.question ?? 'Ask about this';
    button.setAttribute('aria-label', config.question ? `Ask: ${config.question}` : `Ask about ${config.title.toLowerCase()}`);
    button.setAttribute('title', 'Open an editable question in your browser. Review before sending.');
    button.setAttribute('data-no-track', '');
    const status = doc.createElement('span');
    status.className = 'agency-annotation-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const request = () => {
      if (disposed || !region.isConnected) return;
      // A reviewed region may change after installation (for example, a scene).
      if (region.closest('form, [contenteditable]') || region.querySelector('form, input, textarea, select, [contenteditable]')) {
        status.textContent = 'Request unavailable. You can still read this section.';
        return;
      }
      // Synchronous within the click: no automatic editor opening or message send.
      try {
        const accepted = doc.oai?.annotation?.request(region, { initialComment: config.prompt, metadata })?.accepted;
        status.textContent = accepted
          ? 'Request accepted. Review and send your comment in the browser.'
          : 'Request unavailable. You can still read this section.';
      } catch { status.textContent = 'Request unavailable. You can still read this section.'; }
    };
    button.addEventListener('click', request);
    controls.appendChild(button);
    controls.appendChild(status);
    target.parentNode?.insertBefore(controls, target.nextSibling);
    undo.push(() => { button.removeEventListener('click', request); controls.remove(); });
  }
  return () => { disposed = true; for (const cleanup of undo.reverse()) cleanup(); };
}
