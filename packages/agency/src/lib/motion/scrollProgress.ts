/** Keep decorative reading progress below the real header, including responsive sizing. */
export function alignScrollProgress(root: HTMLElement) {
  const view = root.ownerDocument.defaultView!;
  const progress = root.querySelector<HTMLElement>('.page-progress');
  const navigation = root.ownerDocument.querySelector<HTMLElement>('.nav-fixed');
  if (!progress || !navigation) return { destroy() {} };
  const property = '--agency-navigation-bottom';
  const original = progress.style.getPropertyValue(property);
  const align = () => progress.style.setProperty(property, `${navigation.getBoundingClientRect().bottom}px`);
  const observer = new view.ResizeObserver(align);
  observer.observe(navigation);
  view.addEventListener('resize', align);
  align();
  return { destroy() {
    observer.disconnect();
    view.removeEventListener('resize', align);
    if (original) progress.style.setProperty(property, original);
    else progress.style.removeProperty(property);
  } };
}
