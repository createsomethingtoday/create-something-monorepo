// Component-only fixture. No Identity bypass, credentials, or live provider access.
import { mount } from 'svelte';
import Page from '../../src/routes/delivery/abundance/healthcare-analyst/+page.svelte';
import '../../src/app.css';
import type { NpgView } from '../../src/lib/npg/display';
const id = '0d0822cf-c2ac-4713-a6ba-fef887b7bccc';
let view: NpgView = { id, version: 0, status: 'idle', messages: [], sources: [], pending: null };
const mode = new URLSearchParams(location.search).get('state');
const source = {
  tool: 'search_registry_sourcing',
  data: {
    run_id: 'abnationalrun_fixture',
    total: 231,
    displayed: 1,
    source_fetched_at: '2026-11-10',
    taxonomy_scope: 'Family, Adult Health, Gerontology (OR); certification unknown',
    unresolved_count: 17,
    csv_download_url:
      'https://createsomething.agency/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X'
  }
};
if (mode) {
  view = {
    ...view,
    status: mode === 'review' ? 'review' : mode === 'ambiguous' ? 'ambiguous' : 'idle',
    messages: [
      { role: 'user', text: 'Find NPs near Springfield, MO, and keep the complete CSV.' },
      {
        role: 'assistant',
        text: '231 matching candidates in this snapshot. [Download complete CSV](https://createsomething.agency/delivery/abundance/sourcing.csv?run_id=abnationalrun_fixture&taxonomy_code=363LF0000X%2C363LA2200X). Board certification and active licensure remain unknown.'
      }
    ],
    sources: [source]
  };
}
if (mode === 'review')
  view.pending = {
    id: '1d0822cf-c2ac-4713-a6ba-fef887b7bccc',
    tool: 'estimate_registry_travel',
    arguments: {
      npis: ['1234567890'],
      clinics: [{ id: 'clinic1', address: '123 Main Street, Springfield, MO 65804' }],
      max_minutes: 30,
      clinic_match: 'any'
    },
    review: {
      provider: 'Geocodio',
      scope: 'Selected NPIs only; typical practice-to-clinic driving',
      cost: 'Exact cost unavailable. May reserve routing credits.'
    },
    expiresAt: Date.now() + 600000
  };
const listing = () => [{ id, status: view.status, updated_at: Date.now() }];
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (!String(input).startsWith('/delivery/abundance/healthcare-analyst/api'))
    return originalFetch(input, init);
  if (!init?.body)
    return Response.json(String(input).includes('?id=') ? view : { conversations: listing() });
  const command = JSON.parse(String(init.body));
  if (command.type === 'create') {
    view = { id, version: 0, status: 'idle', messages: [], sources: [], pending: null };
    return Response.json(view);
  }
  if (command.type === 'message') {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (mode === 'error')
      return Response.json(
        { error: 'Fixture interruption. Refresh the history before trying again.' },
        { status: 503 }
      );
    view = {
      ...view,
      version: view.version + 1,
      messages: [
        ...view.messages,
        { role: 'user', text: command.text },
        {
          role: 'assistant',
          text: '231 matching candidates. Certification remains unknown. <script>alert("untrusted")</script>'
        }
      ],
      sources: [source]
    };
  } else {
    view = {
      ...view,
      version: view.version + 1,
      status: 'idle',
      pending: null,
      messages: [
        ...view.messages,
        {
          role: 'assistant',
          text:
            command.type === 'reject'
              ? 'Action rejected. No action was sent.'
              : 'Fixture result only. No paid request was sent.'
        }
      ]
    };
  }
  return Response.json(view);
};
localStorage.setItem('npg-current-conversation', id);
mount(Page, {
  target: document.getElementById('app')!,
  props: { data: { conversations: listing(), pathname: location.pathname, user: undefined } }
});
