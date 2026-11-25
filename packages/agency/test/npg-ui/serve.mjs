// Local-only synthetic server exercises the exact production React/Astryx bundle.
// It is outside the production entry; no Identity bypass or live provider call.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderNpgDocument, NPG_DOCUMENT_HEADERS } from '../../src/lib/server/npg/document.ts';
import { fixture } from './fixtures.ts';
import { marketFixture } from './market-fixture.ts';
const sessions = new Map();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const cookie = req.headers.cookie?.match(/npgfixture=([a-f0-9-]+)/)?.[1];
    let state = cookie ? sessions.get(cookie) : null;
    if (url.searchParams.get('__reset') === '1') state = null; // local synthetic fixture only
    if (url.pathname.startsWith('/npg-chat/assets/') && !url.pathname.includes('..')) {
      const file = new URL('../../static' + url.pathname, import.meta.url);
      res.setHeader(
        'Content-Type',
        url.pathname.endsWith('.js')
          ? 'text/javascript'
          : url.pathname.endsWith('.css')
            ? 'text/css'
            : url.pathname.endsWith('.png')
              ? 'image/png'
              : 'font/woff2'
      );
      res.end(await readFile(file));
      return;
    }
    if (url.pathname === '/api/abundance/healthcare-providers/jobs') {
      res.setHeader('Content-Type', 'application/json');
      const all = [
        {
          id: 'fixture-tx',
          title: 'Nurse Practitioner, Primary Care',
          employer: 'Synthetic Health Texas',
          city: 'Austin',
          state: 'TX',
          specialty: 'Primary Care',
          employment_type: 'Full time',
          source_url: 'https://example.com/jobs/tx',
          last_seen_at: new Date().toISOString(),
          fetched_at: new Date().toISOString(),
          posted_at: '2026-11-01T00:00:00Z',
          status: 'open'
        },
        {
          id: 'fixture-ca',
          title: 'Nurse Practitioner, Behavioral Health',
          employer: 'Synthetic Health California',
          city: 'Sacramento',
          state: 'CA',
          specialty: 'Behavioral Health',
          source_url: 'https://example.com/jobs/ca',
          last_seen_at: '2025-01-01T00:00:00Z',
          fetched_at: new Date().toISOString(),
          status: 'open'
        }
      ];
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const base = all.filter(
        (job) =>
          (!q || JSON.stringify(job).toLowerCase().includes(q)) &&
          (!url.searchParams.get('specialty') ||
            job.specialty === url.searchParams.get('specialty'))
      );
      const jobs = base.filter(
        (job) => !url.searchParams.get('state') || job.state === url.searchParams.get('state')
      );
      res.end(
        JSON.stringify({
          success: true,
          data: {
            jobs,
            total: jobs.length,
            limit: 25,
            offset: 0,
            states: [...new Set(base.map((job) => job.state))].map((state) => ({
              state,
              count: base.filter((job) => job.state === state).length
            })),
            specialties: all.map((job) => ({ specialty: job.specialty, count: 1 })),
            freshness: {
              lastSeenAt: jobs[0]?.last_seen_at || null,
              fetchedAt: jobs[0]?.fetched_at || null
            }
          }
        })
      );
      return;
    }
    if (url.pathname === '/__fixture/commands') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(state?.commands ?? []));
      return;
    }
    if (url.pathname === '/delivery/abundance/healthcare-analyst/api') {
      if (!state) {
        res.statusCode = 401;
        res.end();
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      if (url.searchParams.get('view') === 'market') {
        res.end(JSON.stringify(marketFixture(state.listing().length === 0)));
        return;
      }
      if (req.method === 'POST') {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const result = await state.command(JSON.parse(raw));
        res.statusCode = result.status;
        res.end(JSON.stringify(result.data));
        return;
      }
      res.end(
        JSON.stringify(
          url.searchParams.has('id') ? state.read() : { conversations: state.listing() }
        )
      );
      return;
    }
    if (
      url.pathname !== '/' &&
      url.pathname !== '/delivery/abundance/healthcare-analyst' &&
      url.pathname !== '/delivery/abundance/healthcare-analyst/'
    ) {
      res.statusCode = 404;
      res.end();
      return;
    }
    // Retain the same synthetic durable conversation across actual reloads.
    if (!state) {
      const session = crypto.randomUUID();
      state = fixture(url.searchParams.get('state'));
      sessions.set(session, state);
      res.setHeader('Set-Cookie', 'npgfixture=' + session + '; Path=/; SameSite=Strict; HttpOnly');
    }
    const assets = JSON.parse(
      await readFile(
        new URL('../../src/lib/server/npg/astryx-assets.generated.json', import.meta.url),
        'utf8'
      )
    );
    for (const [key, value] of Object.entries(NPG_DOCUMENT_HEADERS)) res.setHeader(key, value);
    res.end(renderNpgDocument({ owner: 'fixture', conversations: state.listing() }, assets));
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
const port = Number(process.env.NPG_UI_PORT || 4227);
server.listen(port, '127.0.0.1', () =>
  console.log('NPG exact React/Astryx bundle fixture: http://127.0.0.1:' + port)
);
