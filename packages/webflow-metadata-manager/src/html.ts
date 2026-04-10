import type { StoredOverride } from './types.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRows(overrides: StoredOverride[]): string {
  return overrides
    .map((entry) => {
      const title = entry.seoTitle ? escapeHtml(entry.seoTitle) : '<span class="muted">None</span>';
      const description = entry.seoDescription ? escapeHtml(entry.seoDescription) : '<span class="muted">None</span>';
      return `<tr>
        <td><code>${escapeHtml(entry.path)}</code></td>
        <td>${title}</td>
        <td>${description}</td>
      </tr>`;
    })
    .join('');
}

export function renderApp(origin: string, overrides: StoredOverride[]): string {
  const installSnippet = `<script src="${origin}/metadata-overrides.js" defer></script>`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Webflow Metadata Manager</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f0e7;
        --panel: #fffaf1;
        --ink: #241b12;
        --muted: #756556;
        --line: #d8ccb8;
        --accent: #14532d;
        --accent-soft: #d9f5d8;
        --danger: #991b1b;
        --danger-soft: #fee2e2;
        --warning: #92400e;
        --warning-soft: #fef3c7;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(20, 83, 45, 0.08), transparent 28%),
          radial-gradient(circle at bottom right, rgba(120, 53, 15, 0.08), transparent 24%),
          var(--bg);
      }

      main {
        width: min(1100px, calc(100vw - 32px));
        margin: 24px auto 48px;
      }

      h1,
      h2 {
        margin: 0;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      p,
      li,
      code,
      pre {
        font-family: "SF Mono", "Monaco", "Consolas", monospace;
      }

      .hero {
        display: grid;
        gap: 12px;
        padding: 24px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(255, 250, 241, 0.98), rgba(244, 240, 231, 0.96));
        box-shadow: 0 24px 80px rgba(36, 27, 18, 0.08);
      }

      .hero p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .panel {
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 250, 241, 0.92);
        box-shadow: 0 16px 50px rgba(36, 27, 18, 0.06);
      }

      .stack {
        display: grid;
        gap: 14px;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
        gap: 20px;
        margin-top: 20px;
      }

      .note {
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(146, 64, 14, 0.18);
        background: var(--warning-soft);
        color: var(--warning);
      }

      .muted {
        color: var(--muted);
        line-height: 1.4;
      }

      code {
        white-space: pre-wrap;
        word-break: break-word;
      }

      pre {
        margin: 0;
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 14px;
        font-size: 14px;
        background: #1b1510;
        color: #f7f3eb;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid rgba(216, 204, 184, 0.7);
        vertical-align: top;
      }

      th {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }

      details {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.64);
      }

      summary {
        cursor: pointer;
        padding: 12px 14px;
        font-weight: 700;
      }

      details > div {
        padding: 0 14px 14px;
      }

      @media (max-width: 960px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="muted">Cloudflare Worker</div>
        <h1>Webflow Metadata Override Script</h1>
        <p>Host one external script and let it update metadata only on the exact Webflow template page paths you list in the worker config.</p>
      </section>

      <section class="layout">
        <aside class="panel stack">
          <div class="note">
            Runtime-only: this changes metadata in the browser for matching paths. It does not rewrite the server-rendered HTML coming from Webflow.
          </div>

          <div>
            <h2>Install</h2>
            <p class="muted">Add this once in the template pages head or the broader template surface where these pages live:</p>
            <pre><code>${escapeHtml(installSnippet)}</code></pre>
          </div>

          <div>
            <h2>How it scopes</h2>
            <p class="muted">The script checks <code>window.location.pathname</code> and only applies overrides when the current path matches one of the configured paths exactly.</p>
          </div>

          <div>
            <h2>Config source</h2>
            <p class="muted">Defaults live in <code>src/default-overrides.ts</code>. You can override them at deploy time with <code>DEFAULT_OVERRIDES_JSON</code>.</p>
          </div>
        </aside>

        <section class="panel stack">
          <div>
            <h2>Configured Overrides</h2>
            <p class="muted">${overrides.length} exact-path override${overrides.length === 1 ? '' : 's'} are currently embedded in the worker response.</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>SEO title</th>
                <th>SEO description</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows(overrides)}
            </tbody>
          </table>

          <details open>
            <summary>Raw JSON</summary>
            <div>
              <pre><code>${escapeHtml(JSON.stringify(overrides, null, 2))}</code></pre>
            </div>
          </details>
        </section>
      </section>
    </main>
  </body>
</html>`;
}
