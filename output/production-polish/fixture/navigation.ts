import { page } from './state.svelte';
export function afterNavigate() {}
export function replaceState(url, state) { history.replaceState(state, '', url); page.state = state; }
export function goto() { throw new Error('Fixture navigation is not implemented'); }
export function invalidateAll() { throw new Error('Fixture has no provider state'); }
