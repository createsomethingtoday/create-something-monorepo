/** Public editorial annotations; independent of WebMCP tool registration.
 * API: https://learn.chatgpt.com/docs/annotations-extensibility
 */
type Target = { selector: string; title: string; prompt: string };
export const annotationTargets: Record<string, readonly Target[]> = {
  '/': [
    { selector: '.service-journey', title: 'How support works', prompt: 'Explain how this support process moves from a problem to a checked handoff.' },
    { selector: '#membership', title: 'Support membership', prompt: 'Explain the support options and what needs agreement before work begins.' }
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
    const target = region.querySelector<HTMLElement>('header') ?? region.querySelector<HTMLElement>('h2');
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
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'agency-annotation-button';
    button.textContent = 'Ask about this';
    button.setAttribute('aria-label', `Ask about ${config.title.toLowerCase()}`);
    const status = doc.createElement('span');
    status.className = 'agency-annotation-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const request = () => {
      if (disposed || !region.isConnected) return;
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
