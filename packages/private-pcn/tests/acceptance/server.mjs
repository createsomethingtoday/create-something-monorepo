// Opt-in, loopback-only component acceptance fixture. Never imported by src/.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { createServer } = await import(require.resolve('vite'));
const { svelte } = await import('@sveltejs/vite-plugin-svelte');
const root = fileURLToPath(new URL('.', import.meta.url));
const pkg = resolve(root, '../..');
let sqlite,
  role = 'member',
  scenario = '',
  progressCalls = 0;
function reset(nextRole, nextScenario) {
  sqlite?.close();
  sqlite = new DatabaseSync(':memory:');
  // Same transient schema bootstrap as tests/api.test.ts; no persistent DB or migration command.
  for (const file of [
    '0001_private_pcn.sql',
    '0002_network_ownership.sql',
    '0003_resource_limits.sql',
    '0006_builder_assets.sql',
    '0008_creator_admission.sql',
    '0010_company_support.sql',
    '0014_lesson_material.sql',
    '0015_guided_learning.sql'
  ])
    sqlite.exec(readFileSync(resolve(pkg, 'migrations', file), 'utf8'));
  role = ['member', 'admin', 'blocked', 'anonymous'].includes(nextRole) ? nextRole : 'anonymous';
  scenario = nextScenario || '';
  progressCalls = 0;
  if (!['empty', 'suspended-empty'].includes(scenario)) {
    sqlite
      .prepare(
        "INSERT INTO videos(id,stream_uid,title,description,series,visibility,access,ingest_status,duration) VALUES(?,?,?,?,?,'published','members','ready',120)"
      )
      .run(
        'lesson-1',
        'synthetic-stream',
        'Synthetic: Review an agent handoff',
        'Practice with a fictional handoff. No recording is provided by this fixture.',
        'Synthetic workshop'
      );
    sqlite.exec(
      "INSERT INTO lesson_material(video_id,network_id,outcome,prerequisites,tools,transcript,practice) VALUES('lesson-1','default','Review a synthetic handoff','No real accounts needed','Local fixtures','Synthetic transcript for interface review.','Review the fictional handoff.');"
    );
    sqlite.exec(
      "INSERT INTO learning_paths(id,network_id,title,outcome,estimated_minutes,lesson_ids,visibility) VALUES('path-1','default','Synthetic: First workflow','Review the handoff',10,'[\"lesson-1\"]','published');"
    );
    sqlite.exec(
      "INSERT INTO lesson_progress(network_id,subject,video_id,position) VALUES('default','fixture-member','lesson-1',42);"
    );
  }
}
const statement = (sql, values = []) => ({
  bind: (...args) => statement(sql, args),
  first: async () => sqlite.prepare(sql).get(...values),
  all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
  run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...values).changes } })
});
const db = {
  prepare: statement,
  batch: async (statements) => {
    sqlite.exec('BEGIN');
    try {
      const result = [];
      for (const s of statements) result.push(await s.run());
      sqlite.exec('COMMIT');
      return result;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  }
};
const locals = () => ({
  identity:
    role === 'anonymous'
      ? null
      : { subject: `fixture-${role}`, email: `${role}@example.invalid`, role },
  network: {
    id: 'default',
    slug: scenario === 'suspended-empty' ? 'synthetic-workshop' : 'create-something',
    name: 'Synthetic workshop',
    status: scenario === 'suspended-empty' ? 'suspended' : 'active',
    kind: 'creator'
  },
  impersonation: null
});
let vite;
async function api(path, method = 'GET', body) {
  const handlers = await vite.ssrLoadModule(resolve(pkg, 'src/lib/server/content-api.ts'));
  return handlers[method]({
    params: { path },
    locals: locals(),
    platform: { env: { DB: db } },
    request: new Request(`http://127.0.0.1:5185/api/${path}`, {
      method,
      headers: { origin: 'http://127.0.0.1:5185', 'content-type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {})
    }),
    cookies: { get: () => undefined, set: () => {}, delete: () => {} },
    fetch: () => {
      throw new Error('External service unavailable in fixture');
    }
  });
}
async function pageData(path) {
  const current = locals();
  const data = {
    ...current,
    foundation: null,
    selfServiceEnabled: false,
    reviewer: false,
    approved: role === 'admin',
    networks: [],
    remainingNetworks: 3
  };
  const url = new URL(
    path
      .replace('/n/synthetic-workshop/studio', '/admin')
      .replace('/n/synthetic-workshop/paths', '/paths')
      .replace('/n/synthetic-workshop', '/library'),
    'http://127.0.0.1:5185'
  );
  if (url.pathname === '/admin') {
    const { load } = await vite.ssrLoadModule(resolve(pkg, 'src/routes/admin/+page.server.ts'));
    try {
      load({ locals: current });
    } catch (e) {
      data.denied = e.body?.message || 'Administrator access required.';
    }
  }
  if (url.pathname.startsWith('/lessons/') || url.pathname.startsWith('/paths')) {
    const name = url.pathname.startsWith('/lessons/') ? 'lesson-page' : 'path-page';
    const { load } = await vite.ssrLoadModule(resolve(pkg, `src/lib/server/${name}.ts`));
    Object.assign(
      data,
      await load({
        url,
        params: { id: url.pathname.split('/')[2] },
        locals: current,
        setHeaders: () => {},
        fetch: (input) => api(input.replace('/api/', ''))
      })
    );
  }
  return data;
}
const respond = (res, data, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};
reset('member', '');
vite = await createServer({
  configFile: false,
  root,
  publicDir: resolve(pkg, 'static'),
  plugins: [
    svelte({ configFile: false, compilerOptions: { dev: true } }),
    {
      name: 'synthetic-pcn-fixtures',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            const url = new URL(req.url, 'http://127.0.0.1:5185');
            if (url.pathname === '/__fixture/reset' && req.method === 'POST') {
              reset(url.searchParams.get('role'), url.searchParams.get('scenario'));
              return respond(res, { ok: true });
            }
            if (url.pathname === '/__fixture/page')
              return respond(res, await pageData(url.searchParams.get('path') || '/start'));
            if (url.pathname === '/__fixture/transfer') {
              if (scenario === 'upload-interrupted')
                return respond(res, { error: 'Interrupted' }, 503);
              sqlite.exec("DELETE FROM upload_reservations WHERE id='fixture-reservation'");
              sqlite
                .prepare(
                  "INSERT OR REPLACE INTO videos(id,stream_uid,title,visibility,access,ingest_status) VALUES('new-draft','fixture-upload','Synthetic draft','draft','members','processing')"
                )
                .run();
              return respond(res, { ok: true });
            }
            if (!url.pathname.startsWith('/api/')) return next();
            const path = url.pathname.slice(5).replace(/^networks\/synthetic-workshop\//, '');
            let raw = '';
            for await (const chunk of req) raw += chunk;
            const body = raw ? JSON.parse(raw) : undefined;
            if (path === 'login') {
              role = 'member';
              return respond(res, { ok: true });
            }
            if (path === 'logout') {
              role = 'anonymous';
              return respond(res, { ok: true });
            }
            if (path === 'videos' && scenario === 'catalog-error')
              return respond(res, { error: 'Synthetic library unavailable' }, 503);
            if (path === 'impact') return respond(res, { ok: true });
            if (
              path === 'learning/continue' &&
              scenario === 'progress-retry' &&
              progressCalls++ === 0
            ) {
              await new Promise((r) => setTimeout(r, 500));
              return respond(res, { error: 'Synthetic unavailable progress' }, 503);
            }
            if (path === 'playback')
              return respond(
                res,
                { error: 'Synthetic fixture: no recorded media is available.' },
                503
              );
            if (path === 'uploads' && role === 'admin') {
              sqlite.exec(
                "INSERT OR REPLACE INTO upload_reservations(id,network_id,title,state) VALUES('fixture-reservation','default','Synthetic draft','uncertain')"
              );
              return respond(res, { id: 'new-draft', uploadUrl: '/__fixture/transfer' });
            }
            if (path === 'videos/status' && role === 'admin')
              return respond(res, { error: 'Synthetic readiness check unavailable' }, 503);
            if (
              !['videos', 'admin', 'learning/continue'].includes(path) &&
              !path.startsWith('learning/progress') &&
              !path.startsWith('learning/paths') &&
              !path.startsWith('lessons/')
            )
              return respond(res, { error: 'Operation disabled in local fixture.' }, 403);
            if (req.method !== 'GET' && path !== 'learning/progress') {
              return respond(res, { error: 'Operation disabled in local fixture.' }, 403);
            }
            const response = await api(path, req.method, body);
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(await response.text());
          } catch (error) {
            respond(res, { error: error.message }, 500);
            console.error(error);
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      $lib: resolve(pkg, 'src/lib'),
      '$app/state': resolve(root, 'state.svelte.ts'),
      '$app/navigation': resolve(root, 'navigation.ts'),
      'tus-js-client': resolve(root, 'upload.ts')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5185,
    strictPort: true,
    fs: { allow: [resolve(pkg, '../..')] }
  },
  cacheDir: resolve(pkg, 'node_modules/.vite-acceptance')
});
await vite.listen();
console.log('Synthetic PCN fixture: http://127.0.0.1:5185/start');
