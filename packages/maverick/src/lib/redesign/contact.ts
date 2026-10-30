/** Preserve the application-wide contact modal and its existing delivery workflow. */
export function openContact(categoryId?: string) {
  window.dispatchEvent(
    new CustomEvent('openContactModal', {
      detail: categoryId && ['petrox', 'lithx'].includes(categoryId) ? { categoryId } : {}
    })
  );
}
