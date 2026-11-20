import { mount } from 'svelte';
import '../../src/app.css';
import Harness from './Harness.svelte';
import { installFakeApi } from './fake-api';
import type { LoggedRequest } from './fake-api';

const scenario = new URLSearchParams(window.location.search).get('scenario') ?? 'default';
const requests = $state<LoggedRequest[]>([]);

installFakeApi(scenario, (entry) => requests.push(entry));
mount(Harness, { target: document.getElementById('app')!, props: { scenario, requests } });
