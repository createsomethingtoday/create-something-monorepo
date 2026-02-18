/**
 * Interaction Atlas MCP Server — Cloudflare Worker entry point
 *
 * Multi-account: resolves AccountContext per-request from headers/session.
 * Uses handleRequest() which creates a scoped server per request.
 */

import { createServer } from '../src/server.js';
import type { InteractionAtlasEnv } from '../src/auth.js';
import { getBuiltWorkflowTemplate, getWorkflowMermaid, listWorkflowSummaries, validateBuiltWorkflow } from '../src/workflows/index.js';

interface Env extends InteractionAtlasEnv {}

const server = createServer();

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    const JSON_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    function esc(s: string): string {
      return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }, null, 2), { headers: JSON_HEADERS });
    }

    // JSON API
    if (url.pathname === '/api/workflows') {
      return new Response(JSON.stringify({ workflows: listWorkflowSummaries() }, null, 2), { headers: JSON_HEADERS });
    }

    const apiWorkflowMatch = url.pathname.match(/^\/api\/workflows\/([a-z0-9-]+)$/i);
    if (apiWorkflowMatch) {
      const workflowId = apiWorkflowMatch[1];
      const template = getBuiltWorkflowTemplate(workflowId);
      if (!template) return new Response(JSON.stringify({ error: 'Not found', workflowId }, null, 2), { status: 404, headers: JSON_HEADERS });
      const validation = validateBuiltWorkflow(template);
      return new Response(JSON.stringify({ workflowId, valid: validation.valid, invalidIds: validation.invalidIds, workflow: template }, null, 2), { headers: JSON_HEADERS });
    }

    // Human viewer
    if (url.pathname === '/workflows') {
      const workflows = listWorkflowSummaries();
      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Interaction Atlas — Workflows</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header { padding: 2rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; background: radial-gradient(1000px 600px at 15% 10%, #111827, transparent), #0b0b10; }
      h1 { margin: 0 0 0.25rem 0; font-size: 1.4rem; letter-spacing: 0.01em; }
      p { margin: 0.25rem 0 0 0; color: #9ca3af; line-height: 1.4; }
      main { padding: 1rem 1.5rem 2rem; max-width: 980px; }
      .card { border: 1px solid #1f2937; background: #0f172a; border-radius: 14px; padding: 1rem; margin: 0.75rem 0; }
      .meta { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem; }
      .pill { font-size: 0.75rem; color: #cbd5e1; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; background: rgba(15, 23, 42, 0.6); }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.875em; color: #e2e8f0; }
      footer { padding: 1rem 1.5rem 2rem; color: #6b7280; border-top: 1px solid #111827; }
    </style>
  </head>
  <body>
    <header>
      <h1>Interaction Atlas — Workflow Viewer</h1>
      <p>Read-only agentic workflows mapped into <code>@quietloudlab/ai-interaction-atlas</code> terms.</p>
    </header>
    <main>
      ${workflows.map(w => {
        const tags = (w.tags ?? []).slice(0, 8);
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
            <div>
              <div style="font-size:1.05rem;font-weight:600;"><a href="/workflows/${esc(w.id)}">${esc(w.name)}</a></div>
              <div style="margin-top:0.25rem;color:#9ca3af;">${esc(w.description)}</div>
              <div style="margin-top:0.5rem;color:#cbd5e1;"><span style="color:#64748b;">Use case:</span> ${esc(w.primaryUseCase)}</div>
            </div>
            <div style="text-align:right;">
              <div class="pill"><code>${esc(w.id)}</code></div>
            </div>
          </div>
          ${tags.length > 0 ? `<div class="meta">${tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}
    </main>
    <footer>
      MCP endpoint: <code>/mcp</code> · JSON API: <code>/api/workflows</code>
    </footer>
  </body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const wfMatch = url.pathname.match(/^\/workflows\/([a-z0-9-]+)$/i);
    if (wfMatch) {
      const workflowId = wfMatch[1];
      const template = getBuiltWorkflowTemplate(workflowId);
      if (!template) return new Response('Not found', { status: 404 });

      const mermaid = getWorkflowMermaid(workflowId) ?? 'error: mermaid generation failed';
      const validation = validateBuiltWorkflow(template);

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Workflow — ${esc(workflowId)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; background: #0b0b10; color: #e5e7eb; }
      a { color: #93c5fd; text-decoration: none; }
      a:hover { text-decoration: underline; }
      header { padding: 1.75rem 1.5rem 1rem; border-bottom: 1px solid #1f2937; background: radial-gradient(1000px 600px at 15% 10%, #111827, transparent), #0b0b10; }
      h1 { margin: 0 0 0.25rem 0; font-size: 1.35rem; letter-spacing: 0.01em; }
      p { margin: 0.25rem 0 0 0; color: #9ca3af; line-height: 1.4; }
      main { padding: 1rem 1.5rem 2rem; max-width: 1100px; }
      .row { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.75rem; }
      .pill { font-size: 0.75rem; color: #cbd5e1; border: 1px solid #334155; border-radius: 999px; padding: 0.15rem 0.55rem; background: rgba(15, 23, 42, 0.6); }
      .panel { border: 1px solid #1f2937; background: #0f172a; border-radius: 14px; padding: 1rem; margin: 0.75rem 0; }
      details { border: 1px solid #1f2937; background: #0b1220; border-radius: 12px; padding: 0.75rem 0.9rem; }
      summary { cursor: pointer; color: #cbd5e1; font-weight: 600; }
      pre { overflow: auto; padding: 0.75rem; border-radius: 10px; background: #020617; border: 1px solid #111827; color: #e2e8f0; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.9em; }
      .ok { color: #34d399; }
      .bad { color: #f87171; }
    </style>
  </head>
  <body>
    <header>
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;">
        <div>
          <h1>${esc(template.name)} <span style="font-weight:500;color:#64748b;">(${esc(workflowId)})</span></h1>
          <p>${esc(template.description)}</p>
          <div class="row">
            <span class="pill">${esc(template.primary_use_case)}</span>
            ${(template.tags ?? []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}
          </div>
        </div>
        <div style="text-align:right;">
          <a href="/workflows">All workflows</a>
          <div style="margin-top:0.5rem;">
            <span class="pill">${validation.valid ? `<span class="ok">valid</span>` : `<span class="bad">invalid</span>`}</span>
          </div>
        </div>
      </div>
    </header>
    <main>
      <div class="panel">
        <div style="color:#9ca3af;margin-bottom:0.5rem;">Mermaid diagram</div>
        <pre class="mermaid">${esc(mermaid)}</pre>
      </div>

      ${validation.valid ? '' : `<div class="panel"><div class="bad" style="font-weight:600;">Invalid Atlas IDs</div><div style="margin-top:0.5rem;color:#cbd5e1;"><code>${esc(validation.invalidIds.join(', '))}</code></div></div>`}

      <details>
        <summary>Workflow JSON (Atlas WorkflowTemplate)</summary>
        <pre><code>${esc(JSON.stringify(template, null, 2))}</code></pre>
      </details>
    </main>

    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "base" });
    </script>
  </body>
</html>`;

      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // MCP endpoint (Streamable HTTP)
    if (url.pathname === '/mcp') {
      return server.handleRequest(request, _env);
    }

    // Default: info JSON
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: 'interaction-atlas-mcp',
        version: '0.1.0',
        endpoints: {
          mcp: '/mcp',
          workflows: '/workflows',
          workflowsApi: '/api/workflows',
          health: '/health',
        },
      }, null, 2), { headers: JSON_HEADERS });
    }

    return new Response('Not Found', { status: 404 });
  },
};
