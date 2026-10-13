const detailKey = detail => detail.id || detail.dataset?.viewKey;

/** Preserve in-progress controls only while rendering the same logical view. */
export function captureViewState(root, active = globalThis.document?.activeElement) {
  const forms = [...(root.querySelectorAll?.('form') || [])]
    .filter(form => form.id && !['record-form', 'chat-form'].includes(form.id))
    .map(form => ({ id: form.id, hidden: form.hidden, controls: [...(form.elements || [])]
      .filter(control => control.name && ['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tagName))
      .map(control => ({ name: control.name, value: control.value, checked: control.checked })) }));
  const focus = active && root.contains?.(active) ? { id: active.id, tag: active.tagName,
    data: { ...active.dataset }, start: active.selectionStart, end: active.selectionEnd,
    direction: active.selectionDirection, scrollTop: active.scrollTop } : null;
  const introScrollTop = root.querySelector?.('.chat-intro')?.scrollTop;
  return { forms, focus, introScrollTop, details: [...(root.querySelectorAll?.('details') || [])].filter(detail => detailKey(detail)).map(detail => ({ key: detailKey(detail), open: detail.open })) };
}

export function restoreViewState(root, snapshot) {
  if (!snapshot) return;
  const forms = [...(root.querySelectorAll?.('form') || [])];
  for (const saved of snapshot.forms) {
    const form = forms.find(item => item.id === saved.id);
    if (!form) continue;
    form.hidden = saved.hidden;
    for (const value of saved.controls) {
      const control = [...(form.elements || [])].find(item => item.name === value.name);
      if (control) { control.value = value.value; if (typeof value.checked === 'boolean') control.checked = value.checked; }
    }
  }
  const details = new Map(snapshot.details.map(detail => [detail.key, detail.open]));
  for (const detail of root.querySelectorAll?.('details') || []) {
    const key = detailKey(detail);
    if (key && details.has(key)) detail.open = details.get(key);
  }
  const intro = root.querySelector?.('.chat-intro');
  if (intro && Number.isFinite(snapshot.introScrollTop)) intro.scrollTop = snapshot.introScrollTop;
  const focus = snapshot.focus;
  if (!focus) return;
  const candidates = [...(root.querySelectorAll?.('input, select, textarea, button, a, summary') || [])];
  const control = candidates.find(item => focus.id ? item.id === focus.id :
    Object.keys(focus.data).length && item.tagName === focus.tag && Object.entries(focus.data).every(([key, value]) => item.dataset?.[key] === value));
  if (!control || control.disabled) return;
  control.focus?.({ preventScroll: true });
  if (Number.isInteger(focus.start) && Number.isInteger(focus.end)) control.setSelectionRange?.(focus.start, focus.end, focus.direction);
  control.scrollTop = focus.scrollTop;
}
