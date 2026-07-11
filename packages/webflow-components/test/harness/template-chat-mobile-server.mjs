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

function displayEvent(spotlight) {
  const items = (spotlight ? [template(0)] : names.map((_, index) => template(index))).map((item) => ({
    template_slug: item.template_slug,
    reason: spotlight ? 'A focused documentation starting point.' : undefined,
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

function html() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Template Chat mobile verifier</title>
<style>html,body,#root{width:100%;height:100%;margin:0}body{min-height:140vh;background:linear-gradient(#f5f5f5,#dbeafe);font-family:system-ui}</style>
</head><body><div id="root"></div><script src="/app.js"></script></body></html>`;
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
  if (url.pathname === '/api/templates/agent/chat' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body || '{}');
    const lastMessage = parsed.messages?.at(-1)?.content ?? '';
    const spotlight = /spotlight|one template/i.test(lastMessage);
    const events = [
      { type: 'text_delta', text: spotlight ? 'Here is one strong starting point.' : 'Here are three popular starting points.' },
      displayEvent(spotlight),
      { type: 'done' },
    ];
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    for (const event of events) response.write(`data: ${JSON.stringify(event)}\n\n`);
    response.end();
    return;
  }
  if (url.pathname.startsWith('/preview/')) {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:32px;font:16px system-ui;background:#eef5ff}main{max-width:42rem;margin:auto;background:white;padding:24px;border-radius:16px}</style><main><h1>Live template preview</h1><p>Deterministic mobile verification content.</p></main>');
    return;
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html());
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Template Chat mobile harness: http://127.0.0.1:${PORT}`);
});
