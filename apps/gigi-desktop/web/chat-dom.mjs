// Reconcile only the mounted drawer. Stable nodes preserve focus, IME/drafts,
// disclosures, text selection and scroll while provider snapshots arrive.
const key = node => node.nodeType === 1 ? node.id || node.getAttribute('data-chat-message-id') || node.getAttribute('data-view-key') || (node.hasAttribute('data-chat-latest') ? 'latest' : '') : '';
function patch(before, after, document) {
  if (before.isEqualNode(after)) return before;
  if (before.nodeType !== after.nodeType || before.nodeName !== after.nodeName || key(before) !== key(after)) { const replacement = after.cloneNode(true); before.replaceWith(replacement); return replacement; }
  if (before.nodeType === 3) { before.nodeValue = after.nodeValue; return; }
  if (before.nodeType !== 1) return;
  const selection = document.getSelection?.();
  if (before.classList.contains('chat-answer') && selection && !selection.isCollapsed && (before.contains(selection.anchorNode) || before.contains(selection.focusNode))) return;
  const preserveOpen = before.tagName === 'DETAILS';
  for (const attr of [...before.attributes]) if (!after.hasAttribute(attr.name) && !(preserveOpen && attr.name === 'open')) before.removeAttribute(attr.name);
  for (const attr of [...after.attributes]) if (attr.name !== 'open' && before.getAttribute(attr.name) !== attr.value) before.setAttribute(attr.name, attr.value);
  if (before.tagName === 'TEXTAREA') {
    if (before.value !== after.value && !before.matches(':focus')) before.value = after.value;
    return;
  }
  const keyed = new Map([...before.childNodes].filter(key).map(node => [key(node), node]));
  let cursor = before.firstChild;
  for (const next of [...after.childNodes]) {
    const match = key(next) ? keyed.get(key(next)) : cursor && !key(cursor) ? cursor : null;
    if (match) {
      if (match !== cursor) before.insertBefore(match, cursor);
      const updated = patch(match, next, document) || match; cursor = updated.nextSibling;
    } else { before.insertBefore(next.cloneNode(true), cursor); }
  }
  while (cursor) { const next = cursor.nextSibling; cursor.remove(); cursor = next; }
  return before;
}
export function updateChatPanel(panel, html, { draft, sessionId } = {}) {
  const document = panel.ownerDocument;
  if (!document?.createElement) { panel.innerHTML = html; return; } // minimal offline harness
  const template = document.createElement('template'); template.innerHTML = html;
  const transcript = panel.querySelector('.chat-transcript');
  const sameSession = transcript?.dataset.chatSessionId === sessionId;
  const top = transcript?.scrollTop || 0;
  const following = !sameSession || !transcript || transcript.scrollHeight - top - transcript.clientHeight < 48;
  const signature = transcript?.textContent;
  const hadNewContent = panel.querySelector('[data-chat-latest]')?.hidden === false;
  const holder = document.createElement('div'); holder.append(template.content);
  const desired = panel.cloneNode(false); desired.innerHTML = holder.innerHTML;
  patch(panel, desired, document);
  // patch expects a matching container; root attributes are managed separately.
  const next = panel.querySelector('.chat-transcript');
  if (next) next.scrollTop = following ? next.scrollHeight : top;
  const latest = panel.querySelector('[data-chat-latest]');
  if (latest) latest.hidden = following || (!hadNewContent && signature === next?.textContent);
  const composer = panel.querySelector('#chat-message');
  if (composer && composer.value !== draft && (!sameSession || draft === '')) composer.value = draft || '';
}
