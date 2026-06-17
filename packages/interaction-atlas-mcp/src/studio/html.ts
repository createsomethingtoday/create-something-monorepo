export function renderStudioHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CREATE SOMETHING Atlas Studio</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f7f4;
        --panel: #ffffff;
        --line: #dfdfda;
        --line-strong: #c9c9c2;
        --text: #0a0e19;
        --muted: #686860;
        --ink: #0a0e19;
        --green: #183f2f;
        --red: #ba3048;
        --radius: 8px;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(to right, rgba(10, 14, 25, 0.055) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(10, 14, 25, 0.045) 1px, transparent 1px),
          var(--bg);
        background-size: 72px 72px;
        color: var(--text);
        font-family: ABCDiatype, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      button, input, select, textarea { font: inherit; }

      button {
        border: 1px solid var(--line);
        border-radius: 7px;
        background: var(--panel);
        color: var(--text);
        cursor: pointer;
      }

      button:hover { border-color: var(--line-strong); }

      .shell {
        display: grid;
        grid-template-rows: 64px minmax(0, 1fr) 64px;
        height: 100vh;
      }

      header, .output-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0 1rem;
        border-bottom: 1px solid var(--line);
        background: rgba(247, 247, 244, 0.9);
        backdrop-filter: blur(10px);
      }

      .output-bar {
        border-top: 1px solid var(--line);
        border-bottom: 0;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
      }

      .mark {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        background: linear-gradient(135deg, #101521 0%, #101521 55%, #b7c5ff 56%, #b7c5ff 100%);
      }

      .brand strong, .panel-title strong {
        display: block;
        font-size: 0.92rem;
      }

      .brand span, .panel-title span, .meta {
        color: var(--muted);
        font-size: 0.78rem;
      }

      .workspace {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr) 360px;
        min-height: 0;
      }

      aside {
        min-height: 0;
        overflow: auto;
        border-right: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.72);
      }

      .inspector {
        border-right: 0;
        border-left: 1px solid var(--line);
      }

      .panel {
        padding: 1rem;
        border-bottom: 1px solid var(--line);
      }

      .panel-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.85rem;
      }

      .canvas-wrap {
        position: relative;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
      }

      svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      .edge {
        stroke: #b7b7af;
        stroke-width: 1.5;
        fill: none;
      }

      .edge-label {
        fill: var(--muted);
        font-size: 11px;
        paint-order: stroke;
        stroke: var(--bg);
        stroke-width: 4px;
      }

      .node rect {
        rx: 8;
        ry: 8;
        stroke-width: 1;
        filter: drop-shadow(0 10px 20px rgba(10, 14, 25, 0.08));
      }

      .node text { pointer-events: none; }

      .node-kind {
        fill: var(--muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .node-label {
        fill: var(--text);
        font-size: 15px;
        font-weight: 700;
      }

      .node-note {
        fill: var(--muted);
        font-size: 12px;
      }

      .node.selected rect {
        stroke: #0a0e19;
        stroke-width: 2;
      }

      .status {
        display: inline-flex;
        align-items: center;
        height: 1.55rem;
        padding: 0 0.45rem;
        border-radius: 5px;
        border: 1px solid var(--line);
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .status.run {
        background: #ecf7f0;
        color: var(--green);
        border-color: #cfe7d8;
      }

      .status.wait {
        background: #eef2ff;
        color: #1f2d69;
        border-color: #dbe2ff;
      }

      .status.stop {
        background: #fff0f2;
        color: var(--red);
        border-color: #ffd8df;
      }

      .stack { display: grid; gap: 0.6rem; }

      .card {
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--panel);
        padding: 0.75rem;
      }

      .card p {
        margin: 0.25rem 0 0;
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.35;
      }

      .palette {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .palette button, .output-bar a, .output-bar button, header button {
        min-height: 2.35rem;
        padding: 0 0.7rem;
        font-weight: 700;
      }

      .primary {
        background: var(--ink);
        color: white;
        border-color: var(--ink);
      }

      textarea, input, select {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: var(--panel);
        color: var(--text);
        padding: 0.7rem;
      }

      textarea {
        min-height: 92px;
        resize: vertical;
      }

      label {
        display: grid;
        gap: 0.35rem;
        color: var(--muted);
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .field-grid { display: grid; gap: 0.65rem; }

      .actions {
        display: flex;
        gap: 0.45rem;
        flex-wrap: wrap;
      }

      .actions button {
        min-height: 2.2rem;
        padding: 0 0.65rem;
      }

      .empty {
        color: var(--muted);
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .terminal {
        overflow: auto;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: #101521;
        color: #f4f4ef;
        padding: 0.75rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.78rem;
        white-space: pre-wrap;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      @media (max-width: 1100px) {
        .workspace { grid-template-columns: 280px minmax(0, 1fr); }
        .inspector { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <div class="brand">
          <div class="mark" aria-hidden="true"></div>
          <div>
            <strong>CREATE SOMETHING Atlas Studio</strong>
            <span id="session-title">Loading session...</span>
          </div>
        </div>
        <div class="actions">
          <button id="refresh-button" type="button">Refresh</button>
          <button id="copy-command-button" type="button">Copy agent command</button>
        </div>
      </header>

      <main class="workspace">
        <aside>
          <section class="panel">
            <div class="panel-title">
              <div>
                <strong>Call Rail</strong>
                <span>Live notes and agent suggestions</span>
              </div>
            </div>
            <form id="observation-form" class="stack">
              <label>
                Observation
                <textarea id="observation-input" placeholder="Capture what the client says. Mention approval, data, systems, risk, or touchpoints."></textarea>
              </label>
              <button class="primary" type="submit">Add observation</button>
            </form>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
                <strong>Suggestions</strong>
                <span>Agent-generated, review before truth</span>
              </div>
            </div>
            <div id="suggestions" class="stack"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
                <strong>Recent Notes</strong>
                <span>Shared session memory</span>
              </div>
            </div>
            <div id="observations" class="stack"></div>
          </section>
        </aside>

        <section class="canvas-wrap" aria-label="Atlas workflow canvas">
          <svg id="canvas" viewBox="0 0 1040 720" role="img" aria-label="Live Atlas session map">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#b7b7af"></path>
              </marker>
            </defs>
            <g id="edge-layer"></g>
            <g id="node-layer"></g>
          </svg>
        </section>

        <aside class="inspector">
          <section class="panel">
            <div class="panel-title">
              <div>
                <strong>Inspector</strong>
                <span id="inspector-subtitle">Select a node</span>
              </div>
            </div>
            <div id="inspector" class="field-grid"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
                <strong>Palette</strong>
                <span>Add Atlas primitives</span>
              </div>
            </div>
            <div class="palette" id="palette"></div>
          </section>

          <section class="panel">
            <div class="panel-title">
              <div>
                <strong>Agent Console</strong>
                <span>Terminal mutation path</span>
              </div>
            </div>
            <div id="agent-command" class="terminal"></div>
          </section>
        </aside>
      </main>

      <div class="output-bar">
        <div>
          <strong id="canvas-counts">0 nodes . 0 edges</strong>
          <span class="meta" id="updated-at"></span>
        </div>
        <div class="actions">
          <a id="markdown-export" class="status" href="#">Client summary</a>
          <a id="json-export" class="status" href="#">JSON</a>
        </div>
      </div>
    </div>

    <script>
      const sessionId = location.pathname.match(/\/sessions\/([^/]+)/)?.[1] ?? '';
      const kindFill = {
        actor: '#ffffff',
        human: '#eef2ff',
        ai: '#ecf7f0',
        system: '#f1f1ee',
        data: '#fff8dc',
        constraint: '#fff0f2',
        touchpoint: '#efe3f8'
      };
      let session = null;
      let palette = null;
      let selectedNodeId = null;
      let dragging = null;
      let saveTimer = null;

      function esc(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;');
      }

      async function requestJson(url, options = {}) {
        const res = await fetch(url, {
          ...options,
          headers: {
            'content-type': 'application/json',
            ...(options.headers ?? {})
          }
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      }

      async function loadSession() {
        session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId));
        render();
      }

      async function loadPalette() {
        palette = await requestJson('/api/palette');
        renderPalette();
      }

      function nodeCenter(node) {
        return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
      }

      function renderEdges() {
        const layer = document.getElementById('edge-layer');
        const nodeById = new Map(session.canvas.nodes.map((node) => [node.id, node]));
        layer.innerHTML = session.canvas.edges
          .map((edge) => {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);
            if (!source || !target) return '';
            const a = nodeCenter(source);
            const b = nodeCenter(target);
            const labelX = (a.x + b.x) / 2;
            const labelY = (a.y + b.y) / 2 - 8;
            return '<path class="edge" marker-end="url(#arrow)" d="M' + a.x + ',' + a.y + ' C' + (a.x + 120) + ',' + a.y + ' ' + (b.x - 120) + ',' + b.y + ' ' + b.x + ',' + b.y + '"></path>' +
              (edge.label ? '<text class="edge-label" x="' + labelX + '" y="' + labelY + '" text-anchor="middle">' + esc(edge.label) + '</text>' : '');
          })
          .join('');
      }

      function renderNodes() {
        const layer = document.getElementById('node-layer');
        layer.innerHTML = session.canvas.nodes
          .map((node) => {
            const selected = node.id === selectedNodeId ? ' selected' : '';
            const fill = kindFill[node.kind] ?? '#ffffff';
            return '<g class="node' + selected + '" data-node-id="' + esc(node.id) + '" transform="translate(' + node.x + ' ' + node.y + ')">' +
              '<rect width="' + node.width + '" height="' + node.height + '" fill="' + fill + '" stroke="#d8d8d2"></rect>' +
              '<text class="node-kind" x="14" y="22">' + esc(node.kind) + ' / ' + esc(node.status) + '</text>' +
              '<text class="node-label" x="14" y="46">' + esc(node.label.slice(0, 25)) + '</text>' +
              '<text class="node-note" x="14" y="66">' + esc((node.owner || node.notes || '').slice(0, 31)) + '</text>' +
              '</g>';
          })
          .join('');

        layer.querySelectorAll('.node').forEach((element) => {
          element.addEventListener('pointerdown', (event) => {
            const node = session.canvas.nodes.find((item) => item.id === element.dataset.nodeId);
            if (!node) return;
            selectedNodeId = node.id;
            dragging = { node, startX: event.clientX, startY: event.clientY, originalX: node.x, originalY: node.y };
            element.setPointerCapture(event.pointerId);
            render();
          });
        });
      }

      function renderLists() {
        const suggestions = document.getElementById('suggestions');
        const queued = session.suggestions.filter((item) => item.status === 'queued');
        suggestions.innerHTML = queued.length
          ? queued.slice(0, 8).map((item) =>
              '<div class="card"><strong>' + esc(item.payload.label) + '</strong> <span class="status ' + esc(item.payload.status) + '">' + esc(item.payload.kind) + '</span><p>' + esc(item.reason) + '</p><div class="actions"><button data-accept="' + esc(item.id) + '" type="button">Accept</button></div></div>'
            ).join('')
          : '<p class="empty">No queued suggestions yet. Add observations from the call or let Codex write to the session.</p>';
        suggestions.querySelectorAll('[data-accept]').forEach((button) => {
          button.addEventListener('click', async () => {
            session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/suggestions/' + encodeURIComponent(button.dataset.accept) + '/accept', { method: 'POST', body: '{}' });
            render();
          });
        });

        const observations = document.getElementById('observations');
        observations.innerHTML = session.observations.length
          ? session.observations.slice(0, 8).map((item) => '<div class="card"><strong>' + esc(item.source) + '</strong><p>' + esc(item.text) + '</p></div>').join('')
          : '<p class="empty">No observations captured yet.</p>';
      }

      function renderInspector() {
        const node = session.canvas.nodes.find((item) => item.id === selectedNodeId);
        const inspector = document.getElementById('inspector');
        document.getElementById('inspector-subtitle').textContent = node ? node.id : 'Select a node';
        if (!node) {
          inspector.innerHTML = '<p class="empty">Select a canvas node to edit label, owner, status, notes, and evidence.</p>';
          return;
        }

        inspector.innerHTML =
          '<label>Label<input id="field-label" value="' + esc(node.label) + '"></label>' +
          '<label>Owner<input id="field-owner" value="' + esc(node.owner ?? '') + '"></label>' +
          '<label>Status<select id="field-status">' +
          ['unknown', 'run', 'wait', 'stop'].map((status) => '<option value="' + status + '"' + (node.status === status ? ' selected' : '') + '>' + status + '</option>').join('') +
          '</select></label>' +
          '<label>Notes<textarea id="field-notes">' + esc(node.notes ?? '') + '</textarea></label>' +
          '<label>Evidence<textarea id="field-evidence">' + esc(node.evidence ?? '') + '</textarea></label>' +
          '<button class="primary" id="save-node" type="button">Save node</button>';
        document.getElementById('save-node').addEventListener('click', async () => {
          session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/nodes/' + encodeURIComponent(node.id), {
            method: 'PATCH',
            body: JSON.stringify({
              label: document.getElementById('field-label').value,
              owner: document.getElementById('field-owner').value,
              status: document.getElementById('field-status').value,
              notes: document.getElementById('field-notes').value,
              evidence: document.getElementById('field-evidence').value
            })
          });
          render();
        });
      }

      function renderPalette() {
        if (!palette) return;
        const target = document.getElementById('palette');
        target.innerHTML = Object.keys(palette)
          .map((kind) => '<button data-kind="' + esc(kind) + '" type="button">' + esc(kind) + '</button>')
          .join('');
        target.querySelectorAll('[data-kind]').forEach((button) => {
          button.addEventListener('click', async () => {
            session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/nodes', {
              method: 'POST',
              body: JSON.stringify({ kind: button.dataset.kind, createdBy: 'operator' })
            });
            selectedNodeId = session.canvas.nodes.at(-1)?.id ?? selectedNodeId;
            render();
          });
        });
      }

      function renderMeta() {
        document.getElementById('session-title').textContent = session.client + ' / ' + session.workflow;
        document.getElementById('canvas-counts').textContent = session.canvas.nodes.length + ' nodes . ' + session.canvas.edges.length + ' edges';
        document.getElementById('updated-at').textContent = 'Updated ' + new Date(session.updatedAt).toLocaleTimeString();
        document.getElementById('markdown-export').href = '/api/sessions/' + encodeURIComponent(sessionId) + '/export.md';
        document.getElementById('json-export').href = '/api/sessions/' + encodeURIComponent(sessionId);
        const command = 'pnpm atlas:studio observe --session ' + sessionId + ' --suggest --text "client says..."';
        document.getElementById('agent-command').textContent = command;
      }

      function render() {
        if (!session) return;
        renderMeta();
        renderEdges();
        renderNodes();
        renderLists();
        renderInspector();
      }

      document.getElementById('canvas').addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = (event.clientX - dragging.startX) * 1040 / document.getElementById('canvas').clientWidth;
        const dy = (event.clientY - dragging.startY) * 720 / document.getElementById('canvas').clientHeight;
        dragging.node.x = Math.round(dragging.originalX + dx);
        dragging.node.y = Math.round(dragging.originalY + dy);
        renderEdges();
        renderNodes();
      });

      document.getElementById('canvas').addEventListener('pointerup', async () => {
        if (!dragging) return;
        const node = dragging.node;
        dragging = null;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/nodes/' + encodeURIComponent(node.id), {
            method: 'PATCH',
            body: JSON.stringify({ x: node.x, y: node.y })
          });
          render();
        }, 80);
      });

      document.getElementById('observation-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = document.getElementById('observation-input');
        const text = input.value.trim();
        if (!text) return;
        session = await requestJson('/api/sessions/' + encodeURIComponent(sessionId) + '/observations', {
          method: 'POST',
          body: JSON.stringify({ text, source: 'operator', suggest: true })
        });
        input.value = '';
        render();
      });

      document.getElementById('refresh-button').addEventListener('click', loadSession);
      document.getElementById('copy-command-button').addEventListener('click', async () => {
        await navigator.clipboard.writeText(document.getElementById('agent-command').textContent);
      });

      setInterval(() => {
        if (!dragging) loadSession().catch(console.error);
      }, 1500);

      Promise.all([loadSession(), loadPalette()]).catch((error) => {
        document.body.innerHTML = '<pre>' + esc(error.stack || error.message) + '</pre>';
      });
    </script>
  </body>
</html>`;
}
