import { mount } from 'svelte';
import App from './App.svelte';
const response = await fetch(
  '/__fixture/page?path=' + encodeURIComponent(location.pathname + location.search)
);
const data = await response.json();
mount(App, { target: document.getElementById('app')!, props: { data } });
