export function dashboardHtml(options: { shareMode?: boolean } = {}): string {
  const shareMode = options.shareMode === true;
  const title = shareMode ? 'Code Similarity Share' : 'Code Similarity Dashboard';
  const controls = shareMode
    ? `
          <div class="empty">Public aggregate view. Source paths, code snippets, semantic probes, and bundle hashes are not exposed.</div>
          <div class="field">
            <label for="bundleSelect">Bundle</label>
            <select id="bundleSelect"></select>
          </div>
          <div class="field">
            <label for="minSize">Exact Match Minimum Bytes</label>
            <input id="minSize" type="number" min="0" step="50" value="200">
          </div>
          <button id="overlapButton">Update Graph</button>
          <div id="selectedBundle" class="empty">No bundle selected</div>`
    : `
          <div class="field">
            <label for="tokenInput">API Key</label>
            <input id="tokenInput" type="password" autocomplete="off" placeholder="Required for dashboard data">
          </div>
          <div class="field">
            <label for="queryInput">Semantic Query</label>
            <textarea id="queryInput">SEO metadata audit title description sitemap canonical redirects</textarea>
          </div>
          <div class="row">
            <select id="languageFilter" title="Filter semantic search by language">
              <option value="">All languages</option>
            </select>
            <button class="primary" id="searchButton">Search</button>
          </div>
          <div class="field">
            <label for="bundleSelect">Bundle Probe</label>
            <select id="bundleSelect"></select>
          </div>
          <div class="row">
            <select id="sampleCount" title="Representative chunks to sample">
              <option value="3">3 samples</option>
              <option value="5">5 samples</option>
              <option value="8">8 samples</option>
            </select>
            <button id="probeButton">Probe</button>
          </div>
          <div class="field">
            <label for="minSize">Exact Match Minimum Bytes</label>
            <input id="minSize" type="number" min="0" step="50" value="200">
          </div>
          <button id="overlapButton">Update Graph</button>
          <div id="selectedBundle" class="empty">No bundle selected</div>`;
  const semanticTabButton = shareMode ? '' : '<button class="tab" data-tab="semantic">Semantic</button>';
  const semanticTabPanel = shareMode ? '' : '<div id="semanticTab" class="scroll" hidden></div>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --surface: #ffffff;
      --surface-2: #eef1f4;
      --line: #d7dde4;
      --text: #17202a;
      --muted: #66717f;
      --accent: #0f766e;
      --accent-2: #2563eb;
      --warn: #a16207;
      --danger: #b42318;
      --shadow: 0 1px 2px rgba(15, 23, 42, .07), 0 10px 24px rgba(15, 23, 42, .05);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-width: 320px;
      overflow-x: hidden;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.4 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    button, input, select, textarea { font: inherit; }

    button {
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--text);
      min-height: 36px;
      padding: 0 12px;
      border-radius: 7px;
      cursor: pointer;
    }

    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: .55;
    }

    input, select, textarea {
      width: 100%;
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #fff;
      color: var(--text);
      padding: 7px 9px;
    }

    textarea {
      min-height: 78px;
      resize: vertical;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th, td {
      padding: 8px 9px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    td {
      overflow-wrap: anywhere;
    }

    .app-shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .topbar {
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, .92);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .topbar-inner {
      max-width: 1480px;
      margin: 0 auto;
      padding: 14px 18px;
      display: grid;
      grid-template-columns: minmax(220px, 1fr) auto;
      gap: 18px;
      align-items: center;
    }

    h1, h2, h3, p { margin: 0; }

    h1 {
      font-size: 20px;
      letter-spacing: 0;
    }

    h2 {
      font-size: 15px;
      letter-spacing: 0;
    }

    .subtle {
      color: var(--muted);
      font-size: 13px;
    }

    .stats {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(92px, auto);
      gap: 8px;
    }

    .stat {
      border: 1px solid var(--line);
      border-radius: 7px;
      background: var(--surface);
      padding: 7px 10px;
      min-width: 92px;
    }

    .stat-value {
      font-weight: 800;
      font-size: 16px;
    }

    .stat-label {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }

    .layout {
      max-width: 1480px;
      width: 100%;
      margin: 0 auto;
      padding: 18px;
      display: grid;
      grid-template-columns: 340px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .layout > * {
      min-width: 0;
    }

    .panel {
      min-width: 0;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .panel-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .panel-body {
      padding: 14px;
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .field {
      display: grid;
      gap: 6px;
    }

    label {
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
    }

    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .row > * { min-width: 0; }

    .tabs {
      display: inline-flex;
      border: 1px solid var(--line);
      border-radius: 7px;
      overflow: hidden;
      background: var(--surface-2);
    }

    .tab {
      border: 0;
      border-radius: 0;
      min-height: 32px;
      background: transparent;
    }

    .tab.active {
      background: var(--surface);
      color: var(--accent);
      font-weight: 800;
    }

    .main-grid {
      display: grid;
      gap: 16px;
      min-width: 0;
    }

    .graph-wrap {
      height: min(58vh, 620px);
      min-height: 420px;
      position: relative;
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
      background: #fbfcfd;
    }

    .node-label {
      font-size: 11px;
      fill: #25313f;
      pointer-events: none;
    }

    .edge {
      stroke: #9aa9b8;
      stroke-opacity: .55;
    }

    .node {
      stroke: #fff;
      stroke-width: 2;
      cursor: pointer;
    }

    .node.selected {
      stroke: #0f172a;
      stroke-width: 3;
    }

    .legend {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 12px;
    }

    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      display: inline-block;
    }

    .split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, .72fr);
      gap: 16px;
      min-width: 0;
    }

    .scroll {
      overflow: auto;
      max-height: 410px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--surface-2);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }

    .score {
      font-variant-numeric: tabular-nums;
      font-weight: 800;
      color: var(--accent-2);
    }

    .code {
      margin-top: 6px;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #f8fafc;
      color: #1f2937;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      max-height: 118px;
      overflow: auto;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .empty {
      padding: 18px;
      color: var(--muted);
      text-align: center;
      border: 1px dashed var(--line);
      border-radius: 7px;
      background: #fbfcfd;
      overflow-wrap: anywhere;
    }

    .busy {
      color: var(--warn);
    }

    .error {
      color: var(--danger);
    }

    @media (max-width: 1040px) {
      .topbar-inner, .layout, .split {
        grid-template-columns: 1fr;
      }

      .stats {
        grid-auto-flow: row;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .graph-wrap {
        min-height: 360px;
        height: 460px;
      }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <div>
          <h1>${title}</h1>
          <p class="subtle" id="statusLine">Loading corpus</p>
        </div>
        <div class="stats" id="stats"></div>
      </div>
    </header>

    <main class="layout">
      <aside class="panel">
        <div class="panel-header">
          <h2>Controls</h2>
          <button id="refreshButton" title="Refresh dashboard data">Refresh</button>
        </div>
        <div class="panel-body stack">
${controls}
        </div>
      </aside>

      <section class="main-grid">
        <section class="panel">
          <div class="panel-header">
            <h2>Bundle Graph</h2>
            <div class="legend" id="legend"></div>
          </div>
          <div class="graph-wrap">
            <svg id="graph" role="img" aria-label="Bundle similarity graph"></svg>
          </div>
        </section>

        <section class="split">
          <div class="panel">
            <div class="panel-header">
              <h2>Similarity</h2>
              <div class="tabs">
                <button class="tab active" data-tab="edges">Exact</button>
                ${semanticTabButton}
              </div>
            </div>
            <div class="panel-body">
              <div id="edgesTab" class="scroll"></div>
              ${semanticTabPanel}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <h2>Bundles</h2>
              <span class="pill" id="bundleCount">0</span>
            </div>
            <div class="scroll" id="bundleTable"></div>
          </div>
        </section>
      </section>
    </main>
  </div>

  <script>
    const shareMode = ${JSON.stringify(shareMode)};
    const state = {
      summary: null,
      bundles: [],
      languages: [],
      overlaps: [],
      selectedBundleId: null,
      activeTab: 'edges'
    };

    const tokenStorageKey = 'codebase-vector-dashboard-token';

    const colors = {
      javascript: '#2563eb',
      typescript: '#0f766e',
      css: '#d97706',
      html: '#7c3aed',
      json: '#64748b',
      txt: '#be123c',
      other: '#475569'
    };

    const $ = (id) => document.getElementById(id);

    function fmt(value) {
      return Number(value || 0).toLocaleString();
    }

    function bytes(value) {
      const size = Number(value || 0);
      if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB';
      if (size >= 1024) return (size / 1024).toFixed(1) + ' KB';
      return fmt(size) + ' B';
    }

    function nameFor(bundle) {
      return bundle?.appName || shortId(bundle?.id || '');
    }

    function shortId(id) {
      return id.replace('code_bundle_', '').slice(0, 10);
    }

    function esc(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    }

    async function api(path, options) {
      const token = shareMode ? '' : $('tokenInput')?.value.trim();
      const headers = new Headers(options?.headers || {});
      if (token) headers.set('X-API-Key', token);
      const response = await fetch(path, { ...options, headers });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(payload?.error || response.statusText);
      return payload;
    }

    async function loadDashboard() {
      const token = shareMode ? '' : $('tokenInput')?.value.trim();
      if (!shareMode && !token) {
        localStorage.removeItem(tokenStorageKey);
        $('stats').innerHTML = '';
        $('bundleTable').innerHTML = '<div class="empty">Enter an API key to load dashboard data</div>';
        $('edgesTab').innerHTML = '<div class="empty">Enter an API key to load similarity data</div>';
        $('graph').innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#66717f">Enter an API key</text>';
        $('statusLine').textContent = 'API key required';
        $('statusLine').className = 'subtle busy';
        return;
      }
      if (!shareMode) localStorage.setItem(tokenStorageKey, token);
      setBusy('Loading corpus');
      const minSize = Number($('minSize').value || 200);
      const dataPrefix = shareMode ? '/api/share' : '/api/dashboard';
      const [summary, bundles, languages, overlaps] = await Promise.all([
        api(dataPrefix + '/summary'),
        api(dataPrefix + '/bundles'),
        api(dataPrefix + '/languages'),
        api(dataPrefix + '/overlaps?minSize=' + encodeURIComponent(minSize) + '&limit=120')
      ]);
      state.summary = summary;
      state.bundles = bundles;
      state.languages = languages;
      state.overlaps = overlaps;
      renderAll();
      setReady();
    }

    async function refreshOverlaps() {
      setBusy('Updating graph');
      const minSize = Number($('minSize').value || 200);
      const dataPrefix = shareMode ? '/api/share' : '/api/dashboard';
      state.overlaps = await api(dataPrefix + '/overlaps?minSize=' + encodeURIComponent(minSize) + '&limit=120');
      renderGraph();
      renderEdges();
      setReady();
    }

    function setBusy(text) {
      $('statusLine').textContent = text;
      $('statusLine').className = 'subtle busy';
    }

    function setReady() {
      const latest = state.summary?.latestIndexedAt ? new Date(state.summary.latestIndexedAt).toLocaleString() : 'No ingest timestamp';
      $('statusLine').textContent = 'Latest index: ' + latest;
      $('statusLine').className = 'subtle';
    }

    function showError(error) {
      $('statusLine').textContent = error instanceof Error ? error.message : String(error);
      $('statusLine').className = 'subtle error';
    }

    function renderAll() {
      renderStats();
      renderFilters();
      renderLegend();
      renderGraph();
      renderEdges();
      renderBundles();
      renderSelectedBundle();
    }

    function renderStats() {
      const summary = state.summary || {};
      $('stats').innerHTML = [
        ['Bundles', summary.bundles],
        ['Chunks', summary.chunks],
        ['Vectors', summary.chunks],
        ['Languages', summary.languages]
      ].map(([label, value]) => '<div class="stat"><div class="stat-value">' + fmt(value) + '</div><div class="stat-label">' + label + '</div></div>').join('');
    }

    function renderFilters() {
      const bundleOptions = state.bundles
        .slice()
        .sort((a, b) => nameFor(a).localeCompare(nameFor(b)))
        .map((bundle) => '<option value="' + esc(bundle.id) + '">' + esc(nameFor(bundle)) + '</option>')
        .join('');
      if ($('bundleSelect')) $('bundleSelect').innerHTML = bundleOptions;
      if (!state.selectedBundleId && state.bundles[0]) state.selectedBundleId = state.bundles[0].id;
      if (state.selectedBundleId && $('bundleSelect')) $('bundleSelect').value = state.selectedBundleId;

      const languageOptions = '<option value="">All languages</option>' + state.languages
        .map((item) => '<option value="' + esc(item.language) + '">' + esc(item.language) + ' (' + fmt(item.chunks) + ')</option>')
        .join('');
      const languageFilter = $('languageFilter');
      if (languageFilter) {
        const currentLanguage = languageFilter.value;
        languageFilter.innerHTML = languageOptions;
        languageFilter.value = currentLanguage;
      }
    }

    function renderLegend() {
      const top = state.languages.slice(0, 6);
      $('legend').innerHTML = top.map((item) => {
        const color = colors[item.language] || colors.other;
        return '<span><span class="swatch" style="background:' + color + '"></span> ' + esc(item.language) + '</span>';
      }).join('');
    }

    function graphNodesAndEdges() {
      const byId = new Map(state.bundles.map((bundle) => [bundle.id, { ...bundle }]));
      const edges = state.overlaps.filter((edge) => byId.has(edge.bundleA) && byId.has(edge.bundleB));
      const connected = new Set();
      edges.forEach((edge) => {
        connected.add(edge.bundleA);
        connected.add(edge.bundleB);
      });
      const nodes = Array.from(byId.values()).filter((bundle) => connected.has(bundle.id) || state.bundles.length <= 40);
      return { nodes, edges: edges.filter((edge) => connected.has(edge.bundleA) && connected.has(edge.bundleB)) };
    }

    function renderGraph() {
      const svg = $('graph');
      const width = svg.clientWidth || 900;
      const height = svg.clientHeight || 480;
      const { nodes, edges } = graphNodesAndEdges();
      if (!nodes.length) {
        svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle" fill="#66717f">No graph data</text>';
        return;
      }

      const nodeMap = new Map(nodes.map((node, index) => {
        const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
        const radius = Math.min(width, height) * .34;
        return [node.id, {
          ...node,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0
        }];
      }));

      for (let tick = 0; tick < 180; tick++) {
        const values = Array.from(nodeMap.values());
        for (let i = 0; i < values.length; i++) {
          for (let j = i + 1; j < values.length; j++) {
            const a = values[i];
            const b = values[j];
            const dx = b.x - a.x || .01;
            const dy = b.y - a.y || .01;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.min(1.4, 900 / (distance * distance));
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        for (const edge of edges) {
          const a = nodeMap.get(edge.bundleA);
          const b = nodeMap.get(edge.bundleB);
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = Math.max(80, 210 - Math.min(edge.exactChunkMatches, 80));
          const force = (distance - target) * .006;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
        for (const node of nodeMap.values()) {
          node.vx += (width / 2 - node.x) * .004;
          node.vy += (height / 2 - node.y) * .004;
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= .82;
          node.vy *= .82;
          node.x = Math.max(34, Math.min(width - 34, node.x));
          node.y = Math.max(34, Math.min(height - 34, node.y));
        }
      }

      const edgeMarkup = edges.map((edge) => {
        const a = nodeMap.get(edge.bundleA);
        const b = nodeMap.get(edge.bundleB);
        if (!a || !b) return '';
        const width = Math.max(1, Math.min(8, Math.sqrt(edge.exactChunkMatches)));
        return '<line class="edge" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke-width="' + width + '"><title>' +
          esc((edge.appA || shortId(edge.bundleA)) + ' / ' + (edge.appB || shortId(edge.bundleB)) + ': ' + edge.exactChunkMatches + ' exact matches') +
          '</title></line>';
      }).join('');

      const nodeMarkup = Array.from(nodeMap.values()).map((node) => {
        const radius = Math.max(7, Math.min(24, 5 + Math.sqrt(node.chunkCount || 1) / 1.7));
        const color = colors[node.primaryLanguage] || colors.other;
        const selected = node.id === state.selectedBundleId ? ' selected' : '';
        return '<g><circle class="node' + selected + '" data-id="' + esc(node.id) + '" cx="' + node.x + '" cy="' + node.y + '" r="' + radius + '" fill="' + color + '">' +
          '<title>' + esc(nameFor(node) + ' / ' + fmt(node.chunkCount) + ' chunks') + '</title></circle>' +
          '<text class="node-label" x="' + (node.x + radius + 4) + '" y="' + (node.y + 4) + '">' + esc(nameFor(node).slice(0, 22)) + '</text></g>';
      }).join('');

      svg.innerHTML = edgeMarkup + nodeMarkup;
      svg.querySelectorAll('.node').forEach((node) => {
        node.addEventListener('click', () => {
          state.selectedBundleId = node.getAttribute('data-id');
          $('bundleSelect').value = state.selectedBundleId;
          renderSelectedBundle();
          renderGraph();
        });
      });
    }

    function renderEdges() {
      if (!state.overlaps.length) {
        $('edgesTab').innerHTML = '<div class="empty">No exact overlaps at this threshold</div>';
        return;
      }
      $('edgesTab').innerHTML = '<table><thead><tr><th>Bundle Pair</th><th>Exact</th><th>Bytes</th></tr></thead><tbody>' +
        state.overlaps.map((edge) => '<tr><td>' + esc(edge.appA || shortId(edge.bundleA)) + '<br><span class="subtle">' + esc(edge.appB || shortId(edge.bundleB)) + '</span></td><td>' + fmt(edge.exactChunkMatches) + '</td><td>' + bytes(edge.sharedBytes) + '</td></tr>').join('') +
        '</tbody></table>';
    }

    function renderBundles() {
      $('bundleCount').textContent = fmt(state.bundles.length);
      $('bundleTable').innerHTML = '<table><thead><tr><th>Name</th><th>Chunks</th><th>Lang</th></tr></thead><tbody>' +
        state.bundles.map((bundle) => '<tr data-id="' + esc(bundle.id) + '"><td><strong>' + esc(nameFor(bundle)) + '</strong><br><span class="subtle">' + esc(shortId(bundle.id)) + '</span></td><td>' + fmt(bundle.chunkCount) + '</td><td>' + esc(bundle.primaryLanguage || '') + '</td></tr>').join('') +
        '</tbody></table>';
      $('bundleTable').querySelectorAll('tr[data-id]').forEach((row) => {
        row.addEventListener('click', () => {
          state.selectedBundleId = row.getAttribute('data-id');
          $('bundleSelect').value = state.selectedBundleId;
          renderSelectedBundle();
          renderGraph();
        });
      });
    }

    function renderSelectedBundle() {
      const bundle = state.bundles.find((item) => item.id === state.selectedBundleId);
      if (!bundle) {
        $('selectedBundle').innerHTML = 'No bundle selected';
        return;
      }
      $('selectedBundle').innerHTML = '<strong>' + esc(nameFor(bundle)) + '</strong>' +
        '<div class="subtle">' + esc(bundle.id) + '</div>' +
        '<div style="margin-top:8px">' + fmt(bundle.chunkCount) + ' chunks / ' + bytes(bundle.totalBytes) + '</div>' +
        (bundle.sourceUri ? '<div class="subtle">' + esc(bundle.sourceUri) + '</div>' : '');
    }

    async function runSearch() {
      if (shareMode) return;
      const query = $('queryInput').value.trim();
      if (!query) return;
      setBusy('Searching Vectorize');
      setActiveTab('semantic');
      const language = $('languageFilter').value;
      const response = await api('/api/code-bundles/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 12, ...(language ? { language } : {}) })
      });
      const bundles = new Map(state.bundles.map((bundle) => [bundle.id, bundle]));
      $('semanticTab').innerHTML = renderSemanticResults(response.results || [], bundles);
      setReady();
    }

    function renderSemanticResults(results, bundles) {
      if (!results.length) return '<div class="empty">No semantic matches</div>';
      return results.map((result) => {
        const bundle = bundles.get(result.bundleId);
        return '<div style="padding:10px 0;border-bottom:1px solid var(--line)">' +
          '<div class="row" style="justify-content:space-between"><strong>' + esc(nameFor(bundle)) + '</strong><span class="score">' + Number(result.score).toFixed(4) + '</span></div>' +
          '<div class="subtle">' + esc(result.filePath) + ':' + result.startLine + '-' + result.endLine + ' / ' + esc(result.language) + '</div>' +
          '<div class="code">' + esc(result.content.slice(0, 900)) + '</div>' +
          '</div>';
      }).join('');
    }

    async function runProbe() {
      if (shareMode) return;
      const bundleId = $('bundleSelect').value;
      if (!bundleId) return;
      state.selectedBundleId = bundleId;
      renderSelectedBundle();
      renderGraph();
      setBusy('Probing semantic neighbors');
      setActiveTab('semantic');
      const samples = $('sampleCount').value;
      const language = $('languageFilter').value;
      const response = await api('/api/dashboard/semantic-neighbors?bundleId=' + encodeURIComponent(bundleId) + '&samples=' + encodeURIComponent(samples) + '&limit=8' + (language ? '&language=' + encodeURIComponent(language) : ''));
      const bundles = new Map(state.bundles.map((bundle) => [bundle.id, bundle]));
      $('semanticTab').innerHTML = '<table><thead><tr><th>Neighbor</th><th>Best</th><th>Matches</th></tr></thead><tbody>' +
        response.neighbors.map((neighbor) => '<tr><td><strong>' + esc(neighbor.appName || shortId(neighbor.bundleId)) + '</strong><br><span class="subtle">' + esc(shortId(neighbor.bundleId)) + '</span></td><td class="score">' + Number(neighbor.bestScore).toFixed(4) + '</td><td>' + fmt(neighbor.matchCount) + '</td></tr>').join('') +
        '</tbody></table>' +
        '<div style="margin-top:12px">' + response.neighbors.slice(0, 3).map((neighbor) => renderSemanticResults(neighbor.topMatches.slice(0, 2), bundles)).join('') + '</div>';
      setReady();
    }

    function setActiveTab(tab) {
      state.activeTab = tab;
      document.querySelectorAll('.tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
      $('edgesTab').hidden = tab !== 'edges';
      if ($('semanticTab')) $('semanticTab').hidden = tab !== 'semantic';
    }

    $('refreshButton').addEventListener('click', () => loadDashboard().catch(showError));
    if ($('tokenInput')) $('tokenInput').addEventListener('change', () => loadDashboard().catch(showError));
    $('overlapButton').addEventListener('click', () => refreshOverlaps().catch(showError));
    if ($('searchButton')) $('searchButton').addEventListener('click', () => runSearch().catch(showError));
    if ($('probeButton')) $('probeButton').addEventListener('click', () => runProbe().catch(showError));
    $('bundleSelect').addEventListener('change', (event) => {
      state.selectedBundleId = event.target.value;
      renderSelectedBundle();
      renderGraph();
    });
    document.querySelectorAll('.tab').forEach((button) => {
      button.addEventListener('click', () => setActiveTab(button.dataset.tab));
    });

    if ($('tokenInput')) $('tokenInput').value = localStorage.getItem(tokenStorageKey) || '';
    loadDashboard().catch(showError);
  </script>
</body>
</html>`;
}
