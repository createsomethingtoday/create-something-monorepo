// Panel entry point
import { mount } from 'svelte';
import Panel from './Panel.svelte';

const app = mount(Panel, {
  target: document.getElementById('app')!,
});

export default app;
