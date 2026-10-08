import { onMount } from 'svelte';
import { page } from './state.svelte';
export function replaceState(url: string, state: unknown) {
  history.replaceState(state, '', url);
  page.state = state;
  page.url = new URL(location.href);
}
export function goto(url: string) {
  location.assign(url);
}
export function invalidateAll() {
  return Promise.resolve();
}
export function afterNavigate(fn: any) {
  onMount(() => fn({ to: { url: page.url } }));
}
