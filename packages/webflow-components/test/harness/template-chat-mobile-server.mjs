import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(tmpdir(), 'template-chat-mobile-harness');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'app.js');
const PORT = Number(process.env.PORT || 4179);
const attempts = new Map();

await mkdir(OUTPUT_DIR, { recursive: true });
await build({
  entryPoints: [path.join(HERE, 'template-chat-mobile.tsx')],
  outfile: OUTPUT_FILE,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  jsx: 'automatic',
  sourcemap: false,
});

const colors = ['146EF5', '7C3AED', '059669'];
const names = ['FlowGuide', 'Notate', 'KnowledgeHub X'];

function imageData(index) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 199"><rect width="150" height="199" fill="#${colors[index]}"/><rect x="18" y="22" width="114" height="12" rx="3" fill="white" opacity=".9"/><rect x="18" y="48" width="82" height="6" rx="3" fill="white" opacity=".55"/><rect x="18" y="72" width="114" height="82" rx="6" fill="white" opacity=".16"/><circle cx="32" cy="176" r="8" fill="white" opacity=".8"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function template(index) {
  const slug = names[index].toLowerCase().replace(/\s+/g, '-');
  return {
    template_slug: slug,
    name: names[index],
    url: `/template/${slug}`,
    website_url: `/preview/${slug}`,
    purchase_url: `/template/${slug}`,
    creator_name: `Creator ${index + 1}`,
    creator_profile_url: null,
    creator_avatar_url: null,
    creator_avatar_alt: null,
    thumbnail_image_url: imageData(index),
    price: 49 + index * 30,
    is_free: false,
    features: ['CMS'],
    cumulative_purchases: 100 - index * 20,
  };
}

function displayEvent(spotlight, restaurant = false) {
  const items = (spotlight ? [template(0)] : names.map((_, index) => template(index))).map((item) => ({
    template_slug: item.template_slug,
    reason: restaurant
      ? `${item.name} pairs a clear menu-ready structure with easy CMS editing.`
      : spotlight
        ? 'A focused documentation starting point.'
        : `${item.name} is a strong starting point with flexible CMS support.`,
    item,
  }));
  return {
    type: 'display',
    payload: {
      layout: spotlight ? 'spotlight' : 'gallery',
      title: spotlight ? 'Spotlight template' : 'Popular templates',
      items,
      followups: ['Show free options', 'Compare the top two', 'Try a darker style'],
    },
  };
}

function html(showConsent) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Combined Template library verifier</title>
<style>html,body,#root{width:100%;height:100%;margin:0}body{min-height:140vh;background:#fff;font-family:Inter,system-ui,sans-serif;color:#080808}.harness-combined{max-width:1240px;margin:0 auto;padding:64px 32px 180px}.harness-heading{margin-bottom:32px}.harness-heading p{margin:0 0 8px;color:#146ef5;font-size:14px;font-weight:600}.harness-heading h1{margin:0;font-size:44px;line-height:1.05;letter-spacing:-.035em}.harness-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:16px;height:720px}.harness-consent{position:fixed;z-index:2147483647;left:0;right:0;bottom:0;padding:20px;background:#111;color:#fff;box-shadow:0 -8px 30px rgba(0,0,0,.28)}.harness-consent button{min-height:44px;margin-top:12px;padding:0 18px;border:0;border-radius:8px;background:#fff;color:#111;font-weight:700}@media(max-width:640px){.harness-combined{padding:32px 16px 120px}.harness-heading h1{font-size:36px}}</style>
</head><body><div id="root"></div>${showConsent ? '<div id="transcend-consent-manager" class="harness-consent" role="dialog" aria-label="Cookie preferences"><strong>Cookie preferences</strong><div>The host consent layer owns interaction until dismissed.</div><button type="button" onclick="this.parentElement.remove()">Accept necessary cookies</button></div>' : ''}<script src="/app.js"></script></body></html>`;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  if (url.pathname === '/app.js') {
    response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    response.end(await readFile(OUTPUT_FILE));
    return;
  }
  if (url.pathname === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{"ok":true}');
    return;
  }
  if (url.pathname === '/missing-campaign-video.mp4') {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Missing campaign video verifier');
    return;
  }
  if (url.pathname === '/delayed-campaign-video.mp4') {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Delayed campaign video verifier');
    return;
  }
  if (url.pathname === '/api/templates/agent/session' && request.method === 'POST') {
    await new Promise((resolve) => setTimeout(resolve, 700));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ session_token: 's'.repeat(64) }));
    return;
  }
  if (url.pathname === '/api/templates/agent/chat' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body || '{}');
    const lastMessage = parsed.messages?.at(-1)?.content ?? '';
    const spotlight = /spotlight|one template/i.test(lastMessage);
    const stress = /stress|performance/i.test(lastMessage);
    const slow = /slow|delayed/i.test(lastMessage);
    const failOnce = /fail once|failure once/i.test(lastMessage);
    const restaurant = /restaurant|menu/i.test(lastMessage);
    const attempt = (attempts.get(lastMessage) ?? 0) + 1;
    attempts.set(lastMessage, attempt);
    if (failOnce && attempt === 1) {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end('{"error":"Deterministic first-attempt failure"}');
      return;
    }
    const sequence = stress
      ? [
          { event: { type: 'status', label: 'searching' }, delay: 0 },
          ...Array.from({ length: 240 }, (_, index) => ({
            event: {
              type: 'text_delta',
              text: index === 0 ? 'Performance response ' : `${index} `,
            },
            delay: 0,
          })),
          { event: { type: 'page_action', payload: { q: 'portfolio', highlight_slugs: ['missing-template'] } }, delay: 0 },
          { event: displayEvent(false), delay: 0 },
          { event: { type: 'done' }, delay: 0 },
        ]
      : [
          { event: { type: 'status', label: 'thinking' }, delay: 800 },
          { event: { type: 'status', label: 'searching' }, delay: slow ? 9500 : 1200 },
          // The production Worker begins every model/tool loop with thinking.
          // Keep the backtracking event in the fixture so the client must make
          // progress monotonic rather than relying on an idealized sequence.
          { event: { type: 'status', label: 'thinking' }, delay: 400 },
          {
            event: {
              type: 'page_action',
              payload: restaurant
                ? { category_group_slug: 'food-and-drink', highlight_slugs: ['flowguide', 'notate', 'knowledgehub-x'] }
                : { highlight_slugs: ['flowguide', 'notate', 'knowledgehub-x'] },
            },
            delay: 900,
          },
          { event: { type: 'status', label: 'curating' }, delay: 900 },
          { event: { type: 'status', label: 'thinking' }, delay: 300 },
          {
            event: {
              type: 'text_delta',
              text: spotlight ? 'Here is one strong starting point.' : 'Here are three popular starting points.',
            },
            delay: 700,
          },
          { event: displayEvent(spotlight, restaurant), delay: 300 },
          { event: { type: 'done' }, delay: 0 },
        ];
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    for (const { event, delay } of sequence) {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    response.end();
    return;
  }
  if (url.pathname.startsWith('/preview/')) {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:32px;font:16px system-ui;background:#eef5ff}main{max-width:42rem;margin:auto;background:white;padding:24px;border-radius:16px}</style><main><h1>Live template preview</h1><p>Deterministic mobile verification content.</p></main>');
    return;
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html(url.searchParams.has('consent')));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Template Chat mobile harness: http://127.0.0.1:${PORT}`);
});
