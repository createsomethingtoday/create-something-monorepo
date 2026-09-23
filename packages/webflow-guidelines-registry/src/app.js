/* global parsePage, serializePage, extractRules, slugify, HEADING_RE */
/*
 * Marketplace Guidelines Registry — page app.
 *
 * Runs inside the wrop viewer iframe (same origin as wrop.wf.app), so `fetch`
 * to /api/wrops/* carries the viewer's Cloudflare Access session.
 *
 *   data island  ─▶  baseline (Fern main snapshot) + working copy (+registry, changelog)
 *   drafts       ─▶  localStorage, per browser, per wrop slug
 *   proposals    ─▶  wrop comment threads carrying a JSON payload (any viewer)
 *   publish      ─▶  owner only: PUT a new wrop version with drafts merged into working
 *   WebMCP       ─▶  navigator.modelContext tools for in-browser agents
 */

const APP_VERSION = document.querySelector('meta[name="wfgr-app-version"]')?.content || 'dev';
const DATA = JSON.parse(document.getElementById('wfgr-data').textContent);
const PROPOSAL_TYPE = 'wfgr-proposal';
const SURFACES = ['all', 'designer-extension', 'data-client', 'hybrid', 'injected-script', 'listing'];
const CHECKS = ['', 'form', 'preflight', 'manual', 'appsec', 'attestation', 'none'];
const LEGAL = ['', 'approved', 'restatement', 'needs-review', 'n/a'];

// ── wrop context ──────────────────────────────────────────────────────────────
function detectWrop() {
  const m = location.pathname.match(/^\/api\/wrops\/([^/]+)\/raw\/?$/);
  if (!m) return null;
  const v = new URLSearchParams(location.search).get('v');
  return { slug: decodeURIComponent(m[1]), version: v ? Number(v) : null };
}
const WROP = detectWrop();
const STORE_KEY = `wfgr:${WROP ? WROP.slug : 'local'}:drafts`;

// ── state ─────────────────────────────────────────────────────────────────────
const state = {
  view: 'read',
  pageSlug: DATA.working.pages[0].slug,
  editing: null,
  showDiff: new Set(),
  drafts: loadDrafts(),
  me: null,
  meta: null,
  isOwner: false,
  proposals: null,
  proposalsError: null,
  filter: { q: '', check: '', legal: '', surface: '', page: '' },
  busy: false,
};

function loadDrafts() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveDrafts() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.drafts));
  } catch (e) {
    toast(`Could not save draft locally: ${e.message}`, 'err');
  }
}

// ── lookups ───────────────────────────────────────────────────────────────────
const baselineById = new Map();
for (const p of DATA.baseline.pages) for (const s of p.sections) baselineById.set(s.id, s);
function workingPage(slug) {
  return DATA.working.pages.find((p) => p.slug === slug);
}
function workingSection(id) {
  for (const p of DATA.working.pages) for (const s of p.sections) if (s.id === id) return { page: p, section: s };
  return null;
}
function effectiveRaw(id) {
  const d = state.drafts[id];
  if (d && typeof d.raw === 'string') return d.raw;
  return workingSection(id)?.section.raw ?? '';
}
function effectiveRegistry(id) {
  return { ...(DATA.working.registry[id] || {}), ...((state.drafts[id] && state.drafts[id].registry) || {}) };
}
function sectionStatus(id) {
  const w = workingSection(id)?.section;
  const b = baselineById.get(id);
  return {
    draft: Boolean(state.drafts[id]),
    unsynced: Boolean(w && (!b || b.raw !== w.raw)),
    added: !b,
  };
}
function draftCount(slug) {
  return Object.keys(state.drafts).filter((id) => id.startsWith(`${slug}/`)).length;
}
function pageWithDrafts(slug) {
  const p = workingPage(slug);
  return { ...p, sections: p.sections.map((s) => ({ ...s, raw: effectiveRaw(s.id) })) };
}

// ── helpers ───────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const h = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? vals[i] : ''), '');
const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
};
let toastTimer = null;
function toast(msg, kind = '') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    document.body.appendChild(el);
  }
  el.className = `toast ${kind}`;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 4200);
}
async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(label, 'ok');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast(label, 'ok');
  }
}
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

// ── word diff ─────────────────────────────────────────────────────────────────
function tokenize(s) {
  return s.split(/(\s+)/).filter((t) => t.length);
}
function wordDiff(a, b) {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.length * B.length > 6_000_000) {
    return [{ type: 'del', text: a }, { type: 'add', text: b }];
  }
  const n = A.length;
  const m = B.length;
  const dp = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i * (m + 1) + j] = A[i] === B[j] ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  const push = (type, text) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ type, text });
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push('eq', A[i]);
      i += 1;
      j += 1;
    } else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) {
      push('del', A[i]);
      i += 1;
    } else {
      push('add', B[j]);
      j += 1;
    }
  }
  while (i < n) push('del', A[i++]);
  while (j < m) push('add', B[j++]);
  return out;
}
function diffHtml(a, b) {
  return wordDiff(a, b)
    .map((t) => (t.type === 'eq' ? esc(t.text) : t.type === 'add' ? `<ins>${esc(t.text)}</ins>` : `<del>${esc(t.text)}</del>`))
    .join('');
}
function diffSummary(a, b) {
  const d = wordDiff(a, b);
  const added = d.filter((t) => t.type === 'add').reduce((n, t) => n + tokenize(t.text).filter((x) => x.trim()).length, 0);
  const removed = d.filter((t) => t.type === 'del').reduce((n, t) => n + tokenize(t.text).filter((x) => x.trim()).length, 0);
  return { wordsAdded: added, wordsRemoved: removed };
}

// ── MDX → HTML (Fern-flavoured subset, for reading not parity) ────────────────
const BLOCK_TAGS = new Set(['Note', 'Warning', 'Info', 'Tip', 'Callout', 'Steps', 'Step', 'Tabs', 'Tab', 'Accordion', 'AccordionGroup', 'Frame', 'Card', 'CardGroup', 'Aside']);
function attrs(str) {
  const out = {};
  for (const m of (str || '').matchAll(/([A-Za-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g)) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
function inline(text) {
  const parts = text.split(/(<\/?(?:a|br|img|Button|sup|sub|kbd|b|i|strong|em)\b[^>]*>)/);
  let html = '';
  for (let k = 0; k < parts.length; k += 1) {
    const part = parts[k];
    if (k % 2 === 1) {
      if (/^<Button/i.test(part)) html += '<span class="btn-doc">';
      else if (/^<\/Button/i.test(part)) html += '</span>';
      else if (/^<img/i.test(part)) {
        const a = attrs(part);
        html += /^https?:/.test(a.src || '') ? `<img src="${esc(a.src)}" alt="${esc(a.alt || '')}" style="max-height:24px;vertical-align:middle">` : `<span class="img-chip">🖼 ${esc(a.alt || a.src || 'image')}</span>`;
      } else if (/^<a\b/i.test(part)) {
        const a = attrs(part);
        html += `<a href="${esc(a.href || '#')}" target="_blank" rel="noopener">`;
      } else html += part.replace(/\s+style="[^"]*"/g, '');
      continue;
    }
    let s = esc(part);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return ` ${codes.length - 1} `;
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, url) => {
      if (url.startsWith('#')) return `<a class="anchor" href="${esc(url)}" data-anchor="${esc(url.slice(1))}">${t}</a>`;
      return `<a href="${esc(url)}" target="_blank" rel="noopener">${t}</a>`;
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[\s(])_([^_\s][^_]*?)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
    s = s.replace(/ (\d+) /g, (_, i) => `<code>${codes[Number(i)]}</code>`);
    html += s;
  }
  return html;
}
function renderMdx(raw) {
  const lines = raw.split('\n');
  let i = 0;
  const isBlockStart = (line) =>
    /^\s*(```|~~~)/.test(line) || HEADING_RE.test(line) || /^\s*---\s*$/.test(line) || /^\s*\|/.test(line) || /^\s*([-*]|\d+\.)\s+/.test(line) || /^\s*<[A-Za-z]/.test(line);

  function parseList() {
    const items = [];
    const stack = [{ indent: -1, items, ordered: false }];
    while (i < lines.length) {
      const line = lines[i];
      const m = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
      if (!m) {
        if (line.trim() === '') {
          const next = lines[i + 1];
          if (next && /^(\s*)([-*]|\d+\.)\s+/.test(next)) {
            i += 1;
            continue;
          }
          break;
        }
        const cont = line.match(/^(\s+)(.*)$/);
        if (cont && stack.length && stack[stack.length - 1].items.length) {
          const last = stack[stack.length - 1].items;
          last[last.length - 1].text += `<br>${inline(cont[2])}`;
          i += 1;
          continue;
        }
        break;
      }
      const indent = m[1].length;
      const ordered = /\d/.test(m[2]);
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
      let top = stack[stack.length - 1];
      if (indent > top.indent && top.items.length && top.indent !== -1) {
        const parent = top.items[top.items.length - 1];
        parent.children = parent.children || { ordered, items: [] };
        stack.push({ indent, items: parent.children.items, ordered });
        top = stack[stack.length - 1];
      } else if (top.indent === -1) {
        top.indent = indent;
        top.ordered = ordered;
      }
      top.items.push({ text: inline(m[3]), children: null });
      i += 1;
    }
    const render = (list) => `<${list.ordered ? 'ol' : 'ul'}>${list.items.map((it) => `<li>${it.text}${it.children ? render(it.children) : ''}</li>`).join('')}</${list.ordered ? 'ol' : 'ul'}>`;
    return render(stack[0]);
  }

  function parseTable() {
    const rows = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      rows.push(lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
      i += 1;
    }
    if (!rows.length) return '';
    const body = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
    const [head, ...rest] = body;
    return `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function parseUntil(closeRe) {
    let html = '';
    while (i < lines.length) {
      const line = lines[i];
      if (closeRe && closeRe.test(line)) {
        lines[i] = line.replace(closeRe, '');
        if (lines[i].trim() === '') i += 1;
        return html;
      }
      if (line.trim() === '') {
        i += 1;
        continue;
      }
      const fence = line.match(/^\s*(```|~~~)\s*(\w+)?/);
      if (fence) {
        i += 1;
        const buf = [];
        while (i < lines.length && !lines[i].startsWith(fence[1])) buf.push(lines[i++]);
        i += 1;
        html += `<pre><code class="lang-${esc(fence[2] || '')}">${esc(buf.join('\n'))}</code></pre>`;
        continue;
      }
      const hd = line.match(HEADING_RE);
      if (hd) {
        const lvl = hd[1].length;
        html += `<h${lvl} id="h-${slugify(hd[2])}">${inline(hd[2])}</h${lvl}>`;
        i += 1;
        continue;
      }
      if (/^\s*---\s*$/.test(line)) {
        html += '<hr>';
        i += 1;
        continue;
      }
      if (/^\s*\|/.test(line)) {
        html += parseTable();
        continue;
      }
      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        html += parseList();
        continue;
      }
      const open = line.match(/^\s*<([A-Z][A-Za-z]*)(\s[^>]*)?>\s*(.*)$/);
      if (open && BLOCK_TAGS.has(open[1])) {
        const tag = open[1];
        const a = attrs(open[2]);
        const rest = open[3] || '';
        const sameLineClose = rest.match(new RegExp(`^(.*)<\\/${tag}>\\s*$`));
        i += 1;
        let inner;
        if (sameLineClose) inner = `<p>${inline(sameLineClose[1])}</p>`;
        else {
          if (rest.trim()) lines.splice(i, 0, rest);
          inner = parseUntil(new RegExp(`^\\s*<\\/${tag}>\\s*`));
        }
        html += wrapBlock(tag, a, inner);
        continue;
      }
      if (/^\s*<\/[A-Z][A-Za-z]*>/.test(line)) {
        i += 1;
        continue;
      }
      if (/^\s*<img\b/i.test(line)) {
        const a = attrs(line);
        html += /^https?:/.test(a.src || '') ? `<p><img src="${esc(a.src)}" alt="${esc(a.alt || '')}"></p>` : `<p><span class="img-chip">🖼 ${esc(a.alt || 'image')} <span style="opacity:.6">${esc(a.src || '')}</span></span></p>`;
        i += 1;
        continue;
      }
      if (/^\s*<a\b/i.test(line)) {
        const buf = [line];
        i += 1;
        while (i < lines.length && !/<\/a>/.test(buf[buf.length - 1])) buf.push(lines[i++]);
        html += `<p>${inline(buf.join(' '))}</p>`;
        continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() !== '' && !(buf.length && isBlockStart(lines[i])) && !(closeRe && closeRe.test(lines[i]))) buf.push(lines[i++]);
      if (!buf.length) {
        buf.push(lines[i++]);
      }
      html += `<p>${inline(buf.join(' '))}</p>`;
    }
    return html;
  }

  function wrapBlock(tag, a, inner) {
    switch (tag) {
      case 'Note':
      case 'Warning':
      case 'Info':
      case 'Tip':
      case 'Callout': {
        const kind = tag.toLowerCase();
        const title = a.title || (tag === 'Note' ? '' : tag);
        return `<div class="callout ${kind}">${title ? `<div class="ct">${esc(title)}</div>` : ''}<div class="inner">${inner}</div></div>`;
      }
      case 'Steps':
        return `<ol class="steps">${inner}</ol>`;
      case 'Step':
        return `<li>${a.title ? `<div class="step-title">${esc(a.title)}</div>` : ''}${inner}</li>`;
      case 'Tabs': {
        const panels = [];
        const re = /<section data-tab="([^"]*)">([\s\S]*?)<\/section>/g;
        for (const m of inner.matchAll(re)) panels.push({ title: m[1], html: m[2] });
        if (!panels.length) return inner;
        const id = Math.random().toString(36).slice(2, 8);
        return `<div class="tabs-c" data-tabs="${id}"><div class="tabbar">${panels.map((p, k) => `<button data-tab-btn="${k}" class="${k === 0 ? 'active' : ''}">${p.title}</button>`).join('')}</div>${panels.map((p, k) => `<div class="tabpanel" data-tab-panel="${k}" ${k ? 'hidden' : ''}>${p.html}</div>`).join('')}</div>`;
      }
      case 'Tab':
        return `<section data-tab="${esc(a.title || 'Tab')}">${inner}</section>`;
      case 'Accordion':
        return `<details><summary>${esc(a.title || 'Details')}</summary>${inner}</details>`;
      case 'Frame':
        return `<figure class="frame">${inner || '<span class="img-chip">🖼 frame</span>'}</figure>`;
      default:
        return `<div class="block-${tag.toLowerCase()}">${inner}</div>`;
    }
  }
  return `<div class="md">${parseUntil(null)}</div>`;
}

// ── render: shell ─────────────────────────────────────────────────────────────
const root = document.getElementById('app');
function render() {
  const main = root.querySelector('main');
  const scrollY = window.scrollY;
  const totalDrafts = Object.keys(state.drafts).length;
  root.innerHTML = h`
    <header class="top">
      <div class="top-row">
        <h1>Marketplace Guidelines Registry</h1>
        <div class="sub">
          <span title="Fern source baseline">${DATA.meta.source.repo}@<a href="https://github.com/${DATA.meta.source.repo}/commit/${DATA.meta.source.sha}" target="_blank" rel="noopener">${DATA.meta.source.sha.slice(0, 8)}</a></span>
          ${WROP ? `<span>wrop v${WROP.version ?? '?'}${state.meta && state.meta.latest_version && state.meta.latest_version !== WROP.version ? ` <span style="color:var(--amber)">(latest v${state.meta.latest_version})</span>` : ''}</span>` : '<span style="color:var(--amber)">offline preview</span>'}
          ${state.me ? `<span>${esc(state.me.email)}${state.isOwner ? ' <span class="chip owner">owner</span>' : ''}</span>` : ''}
        </div>
        <div class="spacer"></div>
        <nav class="tabs">
          ${['read', 'registry', 'proposals', 'changelog', 'export'].map((v) => `<button data-view="${v}" class="${state.view === v ? 'active' : ''}">${v[0].toUpperCase() + v.slice(1)}${v === 'read' && totalDrafts ? `<span class="count">${totalDrafts}</span>` : ''}</button>`).join('')}
        </nav>
        <div class="actions">
          ${WROP && window.top !== window ? `<a class="btn ghost" href="/api/wrops/${esc(WROP.slug)}/raw?v=${WROP.version ?? ''}" target="_blank" rel="noopener" title="WebMCP tools register in this document, not in the wrop viewer around it. Open this view directly for agent use.">Agent view ↗</a>` : ''}
          <button class="btn" data-act="propose" ${totalDrafts && WROP && state.me ? '' : 'disabled'} title="Post your drafts as a proposal comment on this wrop">Propose drafts${totalDrafts ? ` (${totalDrafts})` : ''}</button>
          ${state.isOwner ? `<button class="btn primary" data-act="publish" ${totalDrafts ? '' : 'disabled'} title="Merge your drafts into the working copy and mint a new wrop version">Publish version</button>` : ''}
        </div>
      </div>
    </header>
    <div class="body">
      <aside class="side">${renderSidebar()}</aside>
      <main>${renderMain()}</main>
    </div>`;
  if (main) window.scrollTo(0, scrollY);
}

function renderSidebar() {
  const page = workingPage(state.pageSlug);
  return h`
    <h3>Pages</h3>
    ${DATA.working.pages
      .map((p) => {
        const n = draftCount(p.slug);
        const changed = p.sections.filter((s) => sectionStatus(s.id).unsynced).length;
        return `<button class="page ${p.slug === state.pageSlug ? 'active' : ''}" data-page="${p.slug}">${esc(p.title)}<span class="n ${n ? 'draft' : ''}">${n ? `${n} draft${n > 1 ? 's' : ''}` : changed ? `<span style="color:var(--violet)">${changed} unsynced</span>` : p.sections.length}</span></button>`;
      })
      .join('')}
    <h3>Outline</h3>
    <div class="outline">
      ${page.sections
        .filter((s) => s.heading)
        .map((s) => {
          const st = sectionStatus(s.id);
          return `<button class="l${s.level} ${st.draft ? 'has-draft' : st.unsynced ? 'changed' : ''}" data-goto="${s.id}" title="${esc(s.heading)}">${esc(s.heading.replace(/\*\*/g, ''))}</button>`;
        })
        .join('')}
    </div>
    <h3>Legend</h3>
    <div style="padding:0 8px;color:var(--fg3);font-size:12px;line-height:1.7">
      <span class="chip draft">draft</span> in this browser only<br>
      <span class="chip unsynced">unsynced</span> in the working copy, not yet in Fern<br>
      <span class="chip check-form">form</span> <span class="chip check-preflight">preflight</span> <span class="chip check-manual">manual</span> who checks it<br>
      <span class="chip seed">seed</span> metadata nobody has confirmed yet
    </div>`;
}

function renderMain() {
  switch (state.view) {
    case 'registry':
      return renderRegistry();
    case 'proposals':
      return renderProposals();
    case 'changelog':
      return renderChangelog();
    case 'export':
      return renderExport();
    default:
      return renderRead();
  }
}

// ── render: read / edit ───────────────────────────────────────────────────────
function chipsFor(id) {
  const r = effectiveRegistry(id);
  const st = sectionStatus(id);
  const out = [];
  if (st.draft) out.push('<span class="chip draft">draft</span>');
  if (st.unsynced && !st.draft) out.push('<span class="chip unsynced">unsynced</span>');
  if (r.check) out.push(`<span class="chip check-${esc(r.check)}">${esc(r.check)}</span>`);
  if (r.owner) out.push(`<span class="chip">${esc(r.owner)}</span>`);
  if (r.legal) out.push(`<span class="chip legal-${esc(r.legal)}">legal: ${esc(r.legal)}</span>`);
  if (r.surface && r.surface.length) out.push(`<span class="chip">${r.surface.map(esc).join(' · ')}</span>`);
  if (r.v13) out.push(`<span class="chip">V1.3 ${esc(r.v13)}</span>`);
  if (r.confidence === 'seed' && (r.check || r.owner || r.legal)) out.push('<span class="chip seed" title="Seeded from the Aug 2026 triage; confirm in the editor">seed</span>');
  return out.join('');
}

function renderRead() {
  const page = workingPage(state.pageSlug);
  const offline = !WROP ? '<div class="notice warn">Offline preview: drafts save to this browser, but proposals and publishing need the page served from wrop.wf.app.</div>' : '';
  const stale = WROP && state.meta && state.meta.latest_version && state.meta.latest_version !== WROP.version ? `<div class="notice warn">You are viewing v${WROP.version}; the latest version is v${state.meta.latest_version}. <a href="/w/${esc(WROP.slug)}" target="_top">Open latest</a> before proposing.</div>` : '';
  return h`
    <div class="page-head">
      <h2>${esc(page.title)}</h2>
      <div class="meta">
        <a href="${esc(page.docUrl)}" target="_blank" rel="noopener">${esc(page.docUrl.replace('https://', ''))}</a>
        <span>${esc(page.sourcePath)}</span>
        <span>${page.sections.length} sections</span>
      </div>
    </div>
    ${offline}${stale}
    ${page.sections.map((s) => renderSection(s)).join('')}`;
}

function renderSection(s) {
  const st = sectionStatus(s.id);
  const raw = effectiveRaw(s.id);
  const editing = state.editing === s.id;
  const base = baselineById.get(s.id);
  const showDiff = state.showDiff.has(s.id);
  const canDiff = base && base.raw !== raw;
  const rules = s.heading ? extractRules(raw) : [];
  const empty = !raw.trim();
  if (empty && !s.heading) return '';
  return h`
    <article class="section level-${s.level} ${st.draft ? 'has-draft' : ''} ${st.unsynced ? 'changed' : ''}" id="sec-${esc(s.id)}" data-section="${esc(s.id)}">
      <div class="bar">
        ${s.heading ? `<span class="lvl">H${s.level}</span><span class="h">${inline(s.heading)}</span>` : '<span class="h intro">Intro (before the first heading)</span>'}
        <div class="chips">${chipsFor(s.id)}</div>
        <span class="spacer"></span>
        <div class="tools">
          ${canDiff ? `<button class="btn ghost sm" data-act="diff" data-id="${esc(s.id)}">${showDiff ? 'Hide diff' : 'Diff vs Fern'}</button>` : ''}
          <button class="btn ghost sm" data-act="copy-mdx" data-id="${esc(s.id)}">Copy MDX</button>
          ${st.draft ? `<button class="btn ghost sm" data-act="discard" data-id="${esc(s.id)}" style="color:var(--red)">Discard draft</button>` : ''}
          <button class="btn sm ${editing ? 'ghost' : ''}" data-act="edit" data-id="${esc(s.id)}">${editing ? 'Close' : 'Edit'}</button>
        </div>
      </div>
      ${editing ? renderEditor(s) : `<div class="content">${renderMdx(s.heading ? raw.replace(/^[^\n]*\n?/, '') : raw) || '<p style="color:var(--fg3)">(heading only)</p>'}</div>${rules.length ? `<div class="rules-note">${rules.length} rule${rules.length > 1 ? 's' : ''} in this group</div>` : ''}`}
      ${showDiff && canDiff ? `<div class="diff"><span class="lbl">Fern main → ${st.draft ? 'your draft' : 'working copy'} (word diff)</span>${diffHtml(base.raw, raw)}</div>` : ''}
    </article>`;
}

function renderEditor(s) {
  const d = state.drafts[s.id] || {};
  const raw = effectiveRaw(s.id);
  const r = effectiveRegistry(s.id);
  const surfaces = new Set(r.surface || []);
  return h`
    <div class="editor" data-editor="${esc(s.id)}">
      <div class="row">
        <div>
          <label>MDX source — heading line included; Fern components stay as written</label>
          <textarea class="mdx" data-field="raw" spellcheck="false">${esc(raw)}</textarea>
        </div>
        <div>
          <label>Preview</label>
          <div class="preview" data-preview>${renderMdx(raw)}</div>
        </div>
      </div>
      <div class="fields">
        <div><label>Check</label><select data-field="check">${CHECKS.map((c) => `<option value="${c}" ${r.check === c ? 'selected' : ''}>${c || '— unset —'}</option>`).join('')}</select></div>
        <div><label>Owner / tool</label><input data-field="owner" value="${esc(r.owner || '')}" placeholder="Marketplace Review, Submission form, Preflight…"></div>
        <div><label>Legal status</label><select data-field="legal">${LEGAL.map((c) => `<option value="${c}" ${r.legal === c ? 'selected' : ''}>${c || '— unset —'}</option>`).join('')}</select></div>
        <div><label>V1.3 rows</label><input data-field="v13" value="${esc(r.v13 || '')}" placeholder="e.g. 53, 61-62"></div>
        <div><label>Confidence</label><select data-field="confidence"><option value="seed" ${r.confidence === 'seed' ? 'selected' : ''}>seed (unconfirmed)</option><option value="confirmed" ${r.confidence === 'confirmed' ? 'selected' : ''}>confirmed by reviewer</option></select></div>
      </div>
      <div>
        <label>Surfaces</label>
        <div class="surfaces">${SURFACES.map((x) => `<button type="button" data-surface="${x}" class="${surfaces.has(x) ? 'on' : ''}">${x}</button>`).join('')}</div>
      </div>
      <div class="row">
        <div><label>Registry notes (who checks it, tooling, open questions)</label><textarea data-field="notes" style="min-height:64px">${esc(r.notes || '')}</textarea></div>
        <div><label>Rationale for this change (travels with the proposal and into the PR body)</label><textarea data-field="rationale" style="min-height:64px" placeholder="Why this change? Link the decision, Slack thread, V1.3 row, or rejection data.">${esc(d.rationale || '')}</textarea></div>
      </div>
      <div class="foot">
        <button class="btn primary" data-act="save" data-id="${esc(s.id)}">Save draft</button>
        <button class="btn" data-act="edit" data-id="${esc(s.id)}">Cancel</button>
        <span class="hint">Drafts live in this browser (<code>localStorage</code>) until proposed or published. <kbd>Esc</kbd> closes.</span>
      </div>
    </div>`;
}

// ── render: registry table ────────────────────────────────────────────────────
function registryRows() {
  const rows = [];
  for (const p of DATA.working.pages) {
    for (const s of p.sections) {
      if (!s.heading || s.level < 3) continue;
      const r = effectiveRegistry(s.id);
      const rules = extractRules(effectiveRaw(s.id));
      rows.push({ page: p, section: s, r, rules: rules.length, status: sectionStatus(s.id) });
    }
  }
  return rows;
}
function renderRegistry() {
  const f = state.filter;
  const all = registryRows();
  const q = f.q.trim().toLowerCase();
  const rows = all.filter(
    (row) =>
      (!f.page || row.page.slug === f.page) &&
      (!f.check || (f.check === 'unset' ? !row.r.check : row.r.check === f.check)) &&
      (!f.legal || row.r.legal === f.legal) &&
      (!f.surface || (row.r.surface || []).includes(f.surface)) &&
      (!q || `${row.section.heading} ${row.r.owner} ${row.r.notes} ${effectiveRaw(row.section.id)}`.toLowerCase().includes(q)),
  );
  const totalRules = all.reduce((n, r) => n + r.rules, 0);
  const unset = all.filter((r) => !r.r.check).length;
  const legalReview = all.filter((r) => r.r.legal === 'needs-review').length;
  const seed = all.filter((r) => r.r.confidence !== 'confirmed').length;
  return h`
    <div class="page-head"><h2>Registry</h2><div class="meta"><span>Every rule group: what checks it, who owns the check, legal status. Edit cells inline — they save as drafts.</span></div></div>
    <div class="stats">
      <div class="kpi"><div class="v">${all.length}</div><div class="l">rule groups</div></div>
      <div class="kpi"><div class="v">${totalRules}</div><div class="l">numbered rules / bullets</div></div>
      <div class="kpi ${unset ? 'warn' : ''}"><div class="v">${unset}</div><div class="l">groups with no check owner</div></div>
      <div class="kpi ${legalReview ? 'alert' : ''}"><div class="v">${legalReview}</div><div class="l">need legal review</div></div>
      <div class="kpi ${seed ? 'warn' : ''}"><div class="v">${seed}</div><div class="l">unconfirmed (seed) rows</div></div>
    </div>
    <div class="filters">
      <input data-filter="q" placeholder="Search heading, owner, notes, rule text…" value="${esc(f.q)}">
      <select data-filter="page"><option value="">All pages</option>${DATA.working.pages.map((p) => `<option value="${p.slug}" ${f.page === p.slug ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select>
      <select data-filter="check"><option value="">Any check</option><option value="unset" ${f.check === 'unset' ? 'selected' : ''}>unset</option>${CHECKS.filter(Boolean).map((c) => `<option ${f.check === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select data-filter="legal"><option value="">Any legal status</option>${LEGAL.filter(Boolean).map((c) => `<option ${f.legal === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select data-filter="surface"><option value="">Any surface</option>${SURFACES.map((c) => `<option ${f.surface === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    </div>
    <table class="reg">
      <thead><tr><th>Rule group</th><th>Rules</th><th>Check</th><th>Owner / tool</th><th>Legal</th><th>Surfaces</th><th>Notes</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr data-row="${esc(row.section.id)}">
          <td><div class="sec" data-goto="${esc(row.section.id)}">${inline(row.section.heading)}</div><div class="pg">${esc(row.page.slug)} ${row.status.draft ? '<span class="chip draft">draft</span>' : ''}${row.status.unsynced && !row.status.draft ? '<span class="chip unsynced">unsynced</span>' : ''}${row.r.confidence !== 'confirmed' ? '<span class="chip seed">seed</span>' : ''}</div></td>
          <td class="mono">${row.rules}</td>
          <td class="cell"><select data-reg="check" data-id="${esc(row.section.id)}">${CHECKS.map((c) => `<option value="${c}" ${row.r.check === c ? 'selected' : ''}>${c || '—'}</option>`).join('')}</select></td>
          <td class="cell"><input data-reg="owner" data-id="${esc(row.section.id)}" value="${esc(row.r.owner || '')}" placeholder="—"></td>
          <td class="cell"><select data-reg="legal" data-id="${esc(row.section.id)}">${LEGAL.map((c) => `<option value="${c}" ${row.r.legal === c ? 'selected' : ''}>${c || '—'}</option>`).join('')}</select></td>
          <td><div class="chips">${(row.r.surface || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('') || '<span style="color:var(--fg3)">—</span>'}</div></td>
          <td class="notes">${esc(row.r.notes || '')}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
    ${rows.length ? '' : '<div class="empty">No rule groups match these filters.</div>'}`;
}

// ── proposals (wrop comment threads) ─────────────────────────────────────────
function parseProposal(thread) {
  const comments = thread.comments || [];
  const root = comments[0];
  if (!root) return null;
  const rest = comments.slice(1);
  const assembled = ProposalCodec.assemble(root.text || '', rest.map((c) => c.text || ''), { type: PROPOSAL_TYPE });
  if (!assembled) return null;
  const isChunk = (c) => Boolean(ProposalCodec.parseChunkReply(c.text || ''));
  return {
    thread,
    payload: assembled.payload,
    incomplete: assembled.complete ? null : { have: assembled.have, need: assembled.need, corrupt: assembled.corrupt },
    legacy: assembled.legacy,
    author: root.author,
    createdAt: root.createdAt || thread.createdAt,
    resolved: Boolean(thread.resolved),
    replies: rest.filter((c) => !isChunk(c)),
  };
}
async function loadProposals() {
  if (!WROP) return;
  state.proposals = null;
  state.proposalsError = null;
  render();
  try {
    const versions = await api(`/api/wrops/${WROP.slug}/versions`);
    const found = [];
    for (const v of versions) {
      const res = await api(`/api/wrops/${WROP.slug}/comments?v=${v.version}`);
      for (const t of res.threads || []) {
        const p = parseProposal(t);
        if (p) found.push({ ...p, version: v.version });
      }
    }
    found.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    state.proposals = found;
  } catch (e) {
    state.proposalsError = e.message;
    state.proposals = [];
  }
  render();
}
function renderProposals() {
  if (!WROP) return '<div class="page-head"><h2>Proposals</h2></div><div class="notice warn">Proposals are wrop comment threads; open this page on wrop.wf.app to use them.</div>';
  if (state.proposals === null) {
    loadProposals();
    return '<div class="page-head"><h2>Proposals</h2></div><div class="empty">Loading comment threads…</div>';
  }
  const list = state.proposals;
  return h`
    <div class="page-head"><h2>Proposals</h2><div class="meta"><span>Each proposal is a comment thread on this wrop carrying the proposed MDX + registry changes. ${state.isOwner ? 'As owner you can apply them to your drafts and publish.' : 'The owner applies and publishes; you can apply any proposal into your own drafts to build on it.'}</span></div></div>
    <div style="display:flex;gap:8px;margin-bottom:14px"><button class="btn" data-act="reload-proposals">Refresh</button><span style="color:var(--fg3);font-size:12px;align-self:center">${list.length} proposal${list.length === 1 ? '' : 's'} across all versions · new comments can take a few seconds to appear</span></div>
    ${state.proposalsError ? `<div class="notice err">${esc(state.proposalsError)}</div>` : ''}
    ${list.length ? '' : '<div class="empty">No proposals yet. Edit a section, save a draft, then use “Propose drafts”.</div>'}
    ${list
      .map(
        (p, k) => `<div class="card ${p.resolved ? 'resolved' : ''}">
        <h3>${esc(p.payload.summary || `${p.payload.sections.length} section change${p.payload.sections.length === 1 ? '' : 's'}`)} ${p.resolved ? '<span class="chip legal-approved">merged / resolved</span>' : p.incomplete ? `<span class="chip draft" title="${p.incomplete.corrupt ? 'The reassembled body did not parse' : 'Some reply parts have not arrived'}">incomplete · ${p.incomplete.have}/${p.incomplete.need} parts</span>` : '<span class="chip draft">open</span>'}</h3>
        ${p.incomplete ? `<div class="notice warn" style="margin-top:8px">${p.incomplete.corrupt ? 'The proposal body could not be decoded. Ask the author to propose again.' : 'The body of this proposal travels in tagged replies and not all of them have arrived. Refresh in a few seconds; if it stays incomplete, ask the author to propose again.'}</div>` : ''}
        <div class="meta"><span>${esc(p.author || 'unknown')}</span><span>${fmtTime(p.createdAt)}</span><span>on v${p.version}</span><span>thread ${esc(String(p.thread.id))}</span>${p.replies.length ? `<span>${p.replies.length} repl${p.replies.length === 1 ? 'y' : 'ies'}</span>` : ''}${p.legacy ? '<span title="Posted by an older app version with the body inline">v1 format</span>' : ''}</div>
        ${p.payload.note ? `<p style="margin-top:8px;color:var(--fg2)">${esc(p.payload.note)}</p>` : ''}
        <ul class="plain">${p.payload.sections
          .map((s) => {
            const cur = workingSection(s.id)?.section.raw ?? '';
            const ds = typeof s.raw === 'string' ? diffSummary(cur, s.raw) : null;
            return `<li><strong>${esc(s.heading || s.id)}</strong> <span class="mono" style="color:var(--fg3)">${esc(s.id)}</span>${ds ? ` — <span style="color:var(--green)">+${ds.wordsAdded}</span> <span style="color:var(--red)">−${ds.wordsRemoved}</span> words` : ''}${s.registry ? ` · registry: ${Object.keys(s.registry).map(esc).join(', ')}` : ''}${s.rationale ? `<br><em style="color:var(--fg3)">${esc(s.rationale)}</em>` : ''}</li>`;
          })
          .join('')}</ul>
        <div class="foot">
          <button class="btn sm" data-act="proposal-diff" data-k="${k}">${state.showDiff.has(`proposal:${k}`) ? 'Hide diffs' : 'Show diffs'}</button>
          <button class="btn sm" data-act="proposal-apply" data-k="${k}" ${p.incomplete ? 'disabled title="Incomplete proposal"' : ''}>Apply to my drafts</button>
          ${state.isOwner && !p.resolved ? `<button class="btn sm" data-act="proposal-resolve" data-k="${k}" title="Mark this thread resolved (merged)">Mark merged</button>` : ''}
          <a class="btn sm ghost" href="/w/${esc(WROP.slug)}?v=${p.version}" target="_top">Open thread on v${p.version}</a>
        </div>
        ${
          state.showDiff.has(`proposal:${k}`)
            ? p.payload.sections
                .filter((s) => typeof s.raw === 'string')
                .map((s) => `<div class="diff" style="margin-top:10px;border-radius:8px;border:1px solid var(--border)"><span class="lbl">${esc(s.heading || s.id)} — working copy → proposal</span>${diffHtml(workingSection(s.id)?.section.raw ?? '', s.raw)}</div>`)
                .join('')
            : ''
        }
      </div>`,
      )
      .join('')}`;
}

function buildProposalPayload(ids, note) {
  const sections = ids.map((id) => {
    const d = state.drafts[id];
    const ws = workingSection(id);
    return {
      id,
      page: ws?.page.slug,
      heading: ws?.section.heading,
      raw: typeof d.raw === 'string' ? d.raw : undefined,
      registry: d.registry,
      rationale: d.rationale || undefined,
    };
  });
  return {
    type: PROPOSAL_TYPE,
    v: 1,
    app: APP_VERSION,
    by: state.me?.email,
    at: new Date().toISOString(),
    baseVersion: WROP?.version,
    baseSource: DATA.meta.source.sha,
    summary: `${sections.length} section change${sections.length === 1 ? '' : 's'}: ${sections.map((s) => s.heading || s.id).slice(0, 3).join(', ')}${sections.length > 3 ? '…' : ''}`,
    note: note || undefined,
    sections,
  };
}
async function proposeDrafts(ids, note) {
  if (!WROP) throw new Error('Proposals need the page served from wrop.wf.app');
  if (!ids.length) throw new Error('No drafts to propose');
  if (!state.me?.email) throw new Error('Not signed in to wrop — reload this page and sign in with Okta before proposing.');
  const payload = buildProposalPayload(ids, note);
  const intro = [
    `📝 Guidelines proposal — ${payload.summary}`,
    `by ${payload.by || 'unknown'} · base v${payload.baseVersion} · Fern ${payload.baseSource.slice(0, 8)}`,
    ...payload.sections.map((s) => `• ${s.heading || s.id}${s.rationale ? ` — ${s.rationale}` : ''}`),
    note ? `\n${note}` : '',
  ];
  // wrop caps comments and replies at 2000 chars: the root carries a summary + envelope, the body rides in tagged replies.
  const { rootText, chunks } = ProposalCodec.encodeProposal(payload, { intro });
  // wrop pins are percentages of the document (0–100); anchor near the first changed section.
  const first = document.getElementById(`sec-${ids[0]}`);
  const docH = Math.max(1, document.documentElement.scrollHeight);
  const top = first ? first.getBoundingClientRect().top + window.scrollY : 0;
  const y = Math.min(99, Math.max(1, Math.round((top / docH) * 100)));
  const res = await api(`/api/wrops/${WROP.slug}/comments?v=${WROP.version}`, { method: 'POST', body: JSON.stringify({ x: 4, y, text: rootText }) });
  const rootThread = res?.thread ?? res;
  const threadId = rootThread?.id ?? null;
  if (!threadId) throw new Error('wrop accepted the comment but returned no thread id');
  let latest = rootThread;
  for (let i = 0; i < chunks.length; i += 1) {
    try {
      const r = await api(`/api/wrops/${WROP.slug}/comments/${threadId}/replies?v=${WROP.version}`, { method: 'POST', body: JSON.stringify({ text: chunks[i] }) });
      latest = r?.thread ?? latest;
    } catch (e) {
      // Do not leave a half-posted proposal behind; the reader would show it as incomplete forever.
      try {
        await api(`/api/wrops/${WROP.slug}/comments/${threadId}?v=${WROP.version}`, { method: 'DELETE' });
      } catch {
        /* best effort */
      }
      throw new Error(`Proposal upload failed on part ${i + 2} of ${chunks.length + 1}: ${e.message}. The partial thread was removed — your drafts are intact, try again.`);
    }
  }
  for (const id of ids) state.drafts[id] = { ...state.drafts[id], proposedThread: threadId, proposedAt: payload.at };
  saveDrafts();
  // The comments list is eventually consistent (a few seconds); show the new
  // thread optimistically instead of re-fetching and finding nothing.
  const optimistic = latest?.comments?.length === chunks.length + 1 ? latest : { ...rootThread, comments: [{ ...(rootThread.comments?.[0] || {}), text: rootText, author: state.me?.email }, ...chunks.map((text, k) => ({ id: `local-${k}`, text }))] };
  const parsed = parseProposal(optimistic);
  if (parsed) {
    if (!state.proposals) state.proposals = [];
    state.proposals.unshift({ ...parsed, version: WROP.version });
  }
  return { threadId, sections: ids.length, parts: chunks.length + 1, url: `/w/${WROP.slug}?v=${WROP.version}` };
}
function applyProposal(p) {
  if (p.incomplete) throw new Error(`This proposal is incomplete (${p.incomplete.have}/${p.incomplete.need} parts) — refresh in a few seconds, or ask the author to propose again.`);
  let n = 0;
  for (const s of p.payload.sections) {
    if (!workingSection(s.id)) continue;
    const d = state.drafts[s.id] || {};
    state.drafts[s.id] = {
      ...d,
      raw: typeof s.raw === 'string' ? s.raw : d.raw,
      registry: s.registry ? { ...(d.registry || {}), ...s.registry } : d.registry,
      rationale: s.rationale || d.rationale,
      fromProposal: { thread: p.thread.id, by: p.author, at: p.createdAt },
      updatedAt: new Date().toISOString(),
    };
    n += 1;
  }
  saveDrafts();
  return n;
}

// ── publish (owner) ──────────────────────────────────────────────────────────
function mergedData() {
  const next = JSON.parse(JSON.stringify(DATA));
  const now = new Date().toISOString();
  for (const [id, d] of Object.entries(state.drafts)) {
    const ws = (() => {
      for (const p of next.working.pages) for (const s of p.sections) if (s.id === id) return s;
      return null;
    })();
    if (!ws) continue;
    const before = ws.raw;
    if (typeof d.raw === 'string') ws.raw = d.raw;
    if (d.registry) next.working.registry[id] = { ...(next.working.registry[id] || {}), ...d.registry };
    const summaryBits = [];
    if (typeof d.raw === 'string' && d.raw !== before) {
      const ds = diffSummary(before, d.raw);
      summaryBits.push(`text +${ds.wordsAdded}/−${ds.wordsRemoved} words`);
    }
    if (d.registry) summaryBits.push(`registry: ${Object.keys(d.registry).join(', ')}`);
    next.working.changelog.push({
      at: now,
      by: state.me?.email || 'unknown',
      sectionId: id,
      summary: summaryBits.join('; ') || 'no-op',
      rationale: d.rationale || '',
      fromProposal: d.fromProposal || null,
      wropVersionFrom: WROP?.version ?? null,
    });
  }
  next.meta.generatedAt = now;
  next.meta.publishedFrom = { wropVersion: WROP?.version ?? null, by: state.me?.email || null };
  return next;
}
async function publishVersion() {
  if (!WROP || !state.isOwner) throw new Error('Only the wrop owner can publish');
  const ids = Object.keys(state.drafts);
  if (!ids.length) throw new Error('Nothing to publish');
  const html = await fetch(`/api/wrops/${WROP.slug}/raw?v=${WROP.version}`).then((r) => r.text());
  const next = mergedData();
  const json = JSON.stringify(next).replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
  const re = /<script id="wfgr-data" type="application\/json">[\s\S]*?<\/script>/;
  if (!re.test(html)) throw new Error('Could not find the data island in the current version');
  const newHtml = html.replace(re, () => `<script id="wfgr-data" type="application/json">${json}</script>`);
  const res = await api(`/api/wrops/${WROP.slug}`, { method: 'PUT', body: JSON.stringify({ html: newHtml }) });
  const proposed = new Set(ids.map((id) => state.drafts[id].proposedThread).filter(Boolean));
  state.drafts = {};
  saveDrafts();
  return { version: res.latest_version, sections: ids.length, threads: [...proposed] };
}

// ── changelog / export views ─────────────────────────────────────────────────
function renderChangelog() {
  const log = [...(DATA.working.changelog || [])].reverse();
  return h`
    <div class="page-head"><h2>Changelog</h2><div class="meta"><span>Every publish appends here — who changed which section, with the rationale. Travels into the PR body on export.</span></div></div>
    ${log.length ? '' : '<div class="empty">No published changes yet. The working copy equals Fern main.</div>'}
    ${log
      .map(
        (e) => `<div class="card"><h3>${esc(workingSection(e.sectionId)?.section.heading || e.sectionId)}</h3>
        <div class="meta"><span>${esc(e.by)}</span><span>${fmtTime(e.at)}</span><span class="mono">${esc(e.sectionId)}</span>${e.wropVersionFrom != null ? `<span>from v${e.wropVersionFrom}</span>` : ''}${e.fromProposal ? `<span>proposal by ${esc(e.fromProposal.by || '?')}</span>` : ''}</div>
        <p style="margin-top:8px;color:var(--fg2)">${esc(e.summary)}</p>
        ${e.rationale ? `<p style="margin-top:6px"><em>${esc(e.rationale)}</em></p>` : ''}
        <div class="foot"><button class="btn sm ghost" data-goto="${esc(e.sectionId)}">Open section</button></div></div>`,
      )
      .join('')}`;
}
function changedSections() {
  const out = [];
  for (const p of DATA.working.pages) {
    for (const s of p.sections) {
      const raw = effectiveRaw(s.id);
      const b = baselineById.get(s.id);
      if (!b || b.raw !== raw) out.push({ page: p, section: s, raw, base: b ? b.raw : '' });
    }
  }
  return out;
}
function prSummary() {
  const changed = changedSections();
  const lines = [
    '## Marketplace docs update',
    '',
    `Baseline: ${DATA.meta.source.repo}@${DATA.meta.source.sha} (${DATA.meta.source.committedAt}).`,
    `Prepared in the Marketplace Guidelines Registry${WROP ? ` (wrop ${WROP.slug} v${WROP.version})` : ''}.`,
    '',
    `### Changed sections (${changed.length})`,
    ...changed.map((c) => {
      const ds = diffSummary(c.base, c.raw);
      const d = state.drafts[c.section.id];
      const log = (DATA.working.changelog || []).filter((e) => e.sectionId === c.section.id);
      const rationale = d?.rationale || log.map((e) => e.rationale).filter(Boolean).pop() || '';
      const r = effectiveRegistry(c.section.id);
      return `- **${c.page.slug}.mdx → ${c.section.heading || 'intro'}** (+${ds.wordsAdded}/−${ds.wordsRemoved} words)${rationale ? ` — ${rationale}` : ''}${r.legal ? ` · legal: ${r.legal}` : ''}${r.check ? ` · check: ${r.check}${r.owner ? ` (${r.owner})` : ''}` : ''}`;
    }),
    '',
    '### Review routing',
    '- Docs review: jamesmosier (DevRel). Policy framing: adrocknaphobia (Adam).',
    '- Legal pass required for any row marked `legal: needs-review`.',
    '- Guideline changes ship with a developer announcement (changelog entry under fern/products/home/changelog/).',
    '',
  ];
  return lines.join('\n');
}
function renderExport() {
  const changed = changedSections();
  return h`
    <div class="page-head"><h2>Export</h2><div class="meta"><span>Lossless MDX for each page with your drafts applied. Unchanged sections are byte-identical to Fern main, so the PR diff is only what you changed.</span></div></div>
    <div class="notice">Transfer path: download the changed <code>.mdx</code> files → branch in <code>webflow/openapi-internal</code> → PR (Fern preview builds per PR) → jamesmosier / Adam review → merge publishes to developers.webflow.com. From a terminal, <code>pnpm export</code> in <code>packages/webflow-guidelines-registry</code> pulls the published working copy and writes all files plus <code>CHANGES.md</code>.</div>
    <div class="card">
      <h3>Changed vs Fern main: ${changed.length} section${changed.length === 1 ? '' : 's'}</h3>
      <ul class="plain">${changed.map((c) => `<li><strong>${esc(c.page.slug)}.mdx</strong> → ${esc(c.section.heading || 'intro')} ${state.drafts[c.section.id] ? '<span class="chip draft">draft</span>' : '<span class="chip unsynced">working copy</span>'}</li>`).join('') || '<li>Nothing changed.</li>'}</ul>
      <div class="foot">
        <button class="btn primary" data-act="copy-pr">Copy PR summary</button>
        <button class="btn" data-act="download-bundle">Download bundle (.json)</button>
        <button class="btn" data-act="download-all">Download all .mdx</button>
      </div>
    </div>
    ${DATA.working.pages
      .map((p) => {
        const n = p.sections.filter((s) => {
          const b = baselineById.get(s.id);
          return !b || b.raw !== effectiveRaw(s.id);
        }).length;
        return `<div class="card"><h3>${esc(p.title)} <span class="mono" style="color:var(--fg3);font-weight:400;font-size:12px">${esc(p.sourcePath)}</span></h3>
        <div class="meta"><span>${p.sections.length} sections</span><span>${n ? `<span style="color:var(--violet)">${n} changed</span>` : 'unchanged'}</span></div>
        <div class="foot"><button class="btn sm" data-act="copy-page" data-page="${p.slug}">Copy MDX</button><button class="btn sm" data-act="download-page" data-page="${p.slug}">Download ${esc(p.slug)}.mdx</button></div></div>`;
      })
      .join('')}`;
}

// ── api ───────────────────────────────────────────────────────────────────────
async function api(path, init = {}) {
  let res;
  try {
    res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
  } catch (e) {
    // A TypeError here ("Failed to fetch") is the browser refusing the request before any response — most often an expired Okta/Access session redirecting to login.
    throw new Error(`Could not reach wrop (${e.message}). Your Okta session may have expired — reload this page, sign in, and try again.`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`wrop returned non-JSON (HTTP ${res.status}) — is your Okta session still valid?`);
  }
  if (!res.ok) throw new Error(body?.error?.message || `${init.method || 'GET'} ${path} → HTTP ${res.status}`);
  return body;
}
async function loadIdentity() {
  if (!WROP) return;
  try {
    const [me, meta] = await Promise.all([api('/api/wrops/whoami'), api(`/api/wrops/${WROP.slug}`)]);
    state.me = me;
    state.meta = meta;
    state.isOwner = Boolean(me.email && meta.created_by && me.email === meta.created_by);
  } catch (e) {
    toast(`Could not load identity: ${e.message}`, 'err');
  }
  render();
}

// ── draft mutations ───────────────────────────────────────────────────────────
function setDraft(id, patch) {
  const ws = workingSection(id);
  if (!ws) throw new Error(`Unknown section ${id}`);
  const d = { ...(state.drafts[id] || {}) };
  if (typeof patch.raw === 'string') {
    if (patch.raw === ws.section.raw) delete d.raw;
    else d.raw = patch.raw;
  }
  if (patch.registry) {
    const merged = { ...(d.registry || {}), ...patch.registry };
    for (const [k, v] of Object.entries(merged)) {
      const cur = (DATA.working.registry[id] || {})[k];
      if (JSON.stringify(cur ?? '') === JSON.stringify(v ?? '')) delete merged[k];
    }
    d.registry = Object.keys(merged).length ? merged : undefined;
    if (!d.registry) delete d.registry;
  }
  if (typeof patch.rationale === 'string') {
    if (patch.rationale.trim()) d.rationale = patch.rationale.trim();
    else delete d.rationale;
  }
  d.updatedAt = new Date().toISOString();
  if (typeof d.raw !== 'string' && !d.registry) delete state.drafts[id];
  else state.drafts[id] = d;
  saveDrafts();
  return state.drafts[id] || null;
}
function readEditor(id) {
  const ed = root.querySelector(`[data-editor="${CSS.escape(id)}"]`);
  if (!ed) return null;
  const get = (f) => ed.querySelector(`[data-field="${f}"]`)?.value ?? '';
  const surface = [...ed.querySelectorAll('[data-surface].on')].map((b) => b.dataset.surface);
  return {
    raw: get('raw'),
    registry: { check: get('check'), owner: get('owner').trim(), legal: get('legal'), v13: get('v13').trim(), confidence: get('confidence'), notes: get('notes').trim(), surface },
    rationale: get('rationale'),
  };
}

// ── events ────────────────────────────────────────────────────────────────────
function gotoSection(id) {
  const ws = workingSection(id);
  if (!ws) return;
  state.view = 'read';
  state.pageSlug = ws.page.slug;
  render();
  requestAnimationFrame(() => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}
async function guarded(fn, okMsg) {
  if (state.busy) return;
  state.busy = true;
  try {
    const r = await fn();
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok');
    return r;
  } catch (e) {
    toast(e.message, 'err');
    return null;
  } finally {
    state.busy = false;
    render();
  }
}

root.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-view],[data-page],[data-goto],[data-act],[data-tab-btn],[data-surface],[data-anchor]');
  if (!t) return;
  if (t.dataset.tabBtn !== undefined) {
    const box = t.closest('.tabs-c');
    box.querySelectorAll('[data-tab-btn]').forEach((b) => b.classList.toggle('active', b === t));
    box.querySelectorAll('[data-tab-panel]').forEach((p) => (p.hidden = p.dataset.tabPanel !== t.dataset.tabBtn));
    return;
  }
  if (t.dataset.surface !== undefined) {
    ev.preventDefault();
    t.classList.toggle('on');
    return;
  }
  if (t.dataset.anchor !== undefined) {
    ev.preventDefault();
    const page = workingPage(state.pageSlug);
    const target = page.sections.find((s) => s.heading && slugify(s.heading) === t.dataset.anchor);
    if (target) gotoSection(target.id);
    else toast(`Anchor #${t.dataset.anchor} is on another page`, '');
    return;
  }
  if (t.dataset.view) {
    state.view = t.dataset.view;
    state.editing = null;
    render();
    return;
  }
  if (t.dataset.page) {
    state.pageSlug = t.dataset.page;
    state.view = 'read';
    state.editing = null;
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (t.dataset.goto) {
    gotoSection(t.dataset.goto);
    return;
  }
  const { act, id } = t.dataset;
  switch (act) {
    case 'edit': {
      if (state.editing && state.editing !== id) {
        const pending = readEditor(state.editing);
        if (pending && pending.raw !== effectiveRaw(state.editing) && !confirm('Discard unsaved changes in the open editor?')) return;
      }
      state.editing = state.editing === id ? null : id;
      render();
      if (state.editing) document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 'save': {
      const values = readEditor(id);
      if (!values) return;
      setDraft(id, values);
      state.editing = null;
      render();
      toast('Draft saved in this browser', 'ok');
      break;
    }
    case 'discard':
      if (confirm('Discard this draft? The working copy is unaffected.')) {
        delete state.drafts[id];
        saveDrafts();
        render();
      }
      break;
    case 'diff':
      if (state.showDiff.has(id)) state.showDiff.delete(id);
      else state.showDiff.add(id);
      render();
      break;
    case 'copy-mdx':
      copyText(effectiveRaw(id), 'Section MDX copied');
      break;
    case 'propose': {
      const ids = Object.keys(state.drafts);
      const note = prompt(`Propose ${ids.length} draft${ids.length === 1 ? '' : 's'} as a comment thread on this wrop.\n\nOptional note for the owner:`, '');
      if (note === null) return;
      await guarded(() => proposeDrafts(ids, note), (r) => `Proposal posted (${r.sections} section${r.sections === 1 ? '' : 's'}, ${r.parts} comment${r.parts === 1 ? '' : 's'}). The owner can apply and publish it.`);
      break;
    }
    case 'publish': {
      const ids = Object.keys(state.drafts);
      if (!confirm(`Publish a new wrop version with ${ids.length} section change${ids.length === 1 ? '' : 's'} merged into the working copy?\n\nThis does not touch developers.webflow.com — use Export to open the openapi-internal PR.`)) return;
      const r = await guarded(publishVersion);
      if (r) {
        toast(`Published v${r.version}. Reloading…`, 'ok');
        setTimeout(() => {
          try {
            window.top.location.href = `/w/${WROP.slug}`;
          } catch {
            location.href = `/api/wrops/${WROP.slug}/raw`;
          }
        }, 900);
      }
      break;
    }
    case 'reload-proposals':
      loadProposals();
      break;
    case 'proposal-diff': {
      const key = `proposal:${t.dataset.k}`;
      if (state.showDiff.has(key)) state.showDiff.delete(key);
      else state.showDiff.add(key);
      render();
      break;
    }
    case 'proposal-apply': {
      const p = state.proposals[Number(t.dataset.k)];
      if (p.incomplete) {
        toast(`Incomplete proposal (${p.incomplete.have}/${p.incomplete.need} parts) — refresh, or ask the author to propose again.`, 'err');
        break;
      }
      const n = applyProposal(p);
      render();
      toast(`Applied ${n} section${n === 1 ? '' : 's'} into your drafts`, 'ok');
      break;
    }
    case 'proposal-resolve': {
      const p = state.proposals[Number(t.dataset.k)];
      await guarded(() => api(`/api/wrops/${WROP.slug}/comments/${p.thread.id}?v=${p.version}`, { method: 'PATCH', body: JSON.stringify({ resolved: true }) }), 'Thread marked merged');
      state.proposals = null;
      render();
      break;
    }
    case 'copy-pr':
      copyText(prSummary(), 'PR summary copied');
      break;
    case 'download-bundle': {
      const bundle = { exportedAt: new Date().toISOString(), by: state.me?.email || null, meta: DATA.meta, pages: DATA.working.pages.map((p) => pageWithDrafts(p.slug)), registry: Object.fromEntries(DATA.working.pages.flatMap((p) => p.sections.map((s) => [s.id, effectiveRegistry(s.id)]))), drafts: state.drafts, changelog: DATA.working.changelog };
      download('marketplace-guidelines-registry.json', JSON.stringify(bundle, null, 2), 'application/json');
      break;
    }
    case 'download-all':
      for (const p of DATA.working.pages) download(`${p.slug}.mdx`, serializePage(pageWithDrafts(p.slug)), 'text/markdown');
      break;
    case 'copy-page':
      copyText(serializePage(pageWithDrafts(t.dataset.page)), `${t.dataset.page}.mdx copied`);
      break;
    case 'download-page':
      download(`${t.dataset.page}.mdx`, serializePage(pageWithDrafts(t.dataset.page)), 'text/markdown');
      break;
    default:
      break;
  }
});

let previewTimer = null;
root.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.field === 'raw') {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const prev = t.closest('.editor')?.querySelector('[data-preview]');
      if (prev) prev.innerHTML = renderMdx(t.value);
    }, 180);
    return;
  }
  if (t.dataset.filter) {
    state.filter[t.dataset.filter] = t.value;
    if (t.dataset.filter === 'q') {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        const pos = t.selectionStart;
        render();
        const again = root.querySelector('[data-filter="q"]');
        if (again) {
          again.focus();
          again.setSelectionRange(pos, pos);
        }
      }, 200);
    } else render();
  }
});
root.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.reg) {
    const patch = {};
    patch[t.dataset.reg] = t.value.trim();
    patch.confidence = 'confirmed';
    setDraft(t.dataset.id, { registry: patch });
    render();
    toast('Registry draft saved', 'ok');
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && state.editing) {
    state.editing = null;
    render();
  }
});

// ── WebMCP tools ──────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'list_pages',
    description: 'List the Marketplace developer-docs pages in this registry with section counts and draft counts.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    readOnly: true,
    execute: () => DATA.working.pages.map((p) => ({ slug: p.slug, title: p.title, docUrl: p.docUrl, sections: p.sections.length, drafts: draftCount(p.slug), unsynced: p.sections.filter((s) => sectionStatus(s.id).unsynced).length })),
  },
  {
    name: 'get_page_outline',
    description: 'Section outline of one page: ids, heading levels, registry metadata (check/owner/legal/surfaces), draft and unsynced flags.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Page slug from list_pages' } }, required: ['slug'], additionalProperties: false },
    readOnly: true,
    execute: ({ slug }) => {
      const p = workingPage(slug);
      if (!p) throw new Error(`Unknown page ${slug}`);
      return p.sections.map((s) => ({ id: s.id, level: s.level, heading: s.heading, rules: extractRules(effectiveRaw(s.id)).length, registry: effectiveRegistry(s.id), ...sectionStatus(s.id) }));
    },
  },
  {
    name: 'get_section',
    description: 'Full MDX of a section (draft applied if present), the Fern-main baseline, registry metadata, numbered rules, and any local draft.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Section id, e.g. marketplace-guidelines/token-security' } }, required: ['id'], additionalProperties: false },
    readOnly: true,
    execute: ({ id }) => {
      const ws = workingSection(id);
      if (!ws) throw new Error(`Unknown section ${id}`);
      return { id, page: ws.page.slug, heading: ws.section.heading, level: ws.section.level, mdx: effectiveRaw(id), workingMdx: ws.section.raw, baselineMdx: baselineById.get(id)?.raw ?? null, registry: effectiveRegistry(id), rules: extractRules(effectiveRaw(id)), draft: state.drafts[id] || null, ...sectionStatus(id) };
    },
  },
  {
    name: 'search_guidelines',
    description: 'Case-insensitive search across all sections (headings, rule text, registry notes). Returns matching section ids with snippets.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 50 } }, required: ['query'], additionalProperties: false },
    readOnly: true,
    execute: ({ query, limit = 20 }) => {
      const q = String(query).toLowerCase();
      const out = [];
      for (const p of DATA.working.pages) {
        for (const s of p.sections) {
          const raw = effectiveRaw(s.id);
          const hay = `${s.heading || ''}\n${raw}\n${effectiveRegistry(s.id).notes || ''}`;
          const at = hay.toLowerCase().indexOf(q);
          if (at >= 0) out.push({ id: s.id, page: p.slug, heading: s.heading, snippet: hay.slice(Math.max(0, at - 80), at + 160).replace(/\s+/g, ' ') });
          if (out.length >= limit) return out;
        }
      }
      return out;
    },
  },
  {
    name: 'get_registry_table',
    description: 'All rule groups (### and #### sections) with check type, owner, legal status, surfaces, V1.3 refs and notes. Optional filters.',
    inputSchema: { type: 'object', properties: { page: { type: 'string' }, check: { type: 'string', enum: CHECKS.filter(Boolean).concat(['unset']) }, legal: { type: 'string', enum: LEGAL.filter(Boolean) }, surface: { type: 'string', enum: SURFACES } }, additionalProperties: false },
    readOnly: true,
    execute: (f = {}) =>
      registryRows()
        .filter((row) => (!f.page || row.page.slug === f.page) && (!f.check || (f.check === 'unset' ? !row.r.check : row.r.check === f.check)) && (!f.legal || row.r.legal === f.legal) && (!f.surface || (row.r.surface || []).includes(f.surface)))
        .map((row) => ({ id: row.section.id, page: row.page.slug, heading: row.section.heading, rules: row.rules, ...row.r, ...row.status })),
  },
  {
    name: 'update_section',
    description: 'Save a local draft for a section: replacement MDX (must keep the heading line), registry fields, and a rationale. Drafts stay in this browser until proposed or published. Returns a word-diff summary.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        mdx: { type: 'string', description: 'Full replacement MDX for the section including its heading line. Omit to leave text unchanged.' },
        registry: { type: 'object', properties: { check: { type: 'string', enum: CHECKS }, owner: { type: 'string' }, legal: { type: 'string', enum: LEGAL }, v13: { type: 'string' }, notes: { type: 'string' }, surface: { type: 'array', items: { type: 'string', enum: SURFACES } }, confidence: { type: 'string', enum: ['seed', 'confirmed'] } }, additionalProperties: false },
        rationale: { type: 'string', description: 'Why — decision link, Slack thread, V1.3 row, rejection data.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    readOnly: false,
    execute: ({ id, mdx, registry, rationale }) => {
      const ws = workingSection(id);
      if (!ws) throw new Error(`Unknown section ${id}`);
      if (typeof mdx === 'string' && ws.section.heading) {
        const first = mdx.split('\n')[0];
        const hm = first.match(HEADING_RE);
        if (!hm) throw new Error('mdx must start with the section heading line (e.g. "#### Token security")');
        if (hm[1].length !== ws.section.level) throw new Error(`Heading level must stay H${ws.section.level}`);
        if (/^#{2,5}\s/m.test(mdx.split('\n').slice(1).join('\n'))) throw new Error('mdx must contain a single heading; split into multiple update_section calls or edit the parent section');
      }
      const before = effectiveRaw(id);
      const d = setDraft(id, { raw: mdx, registry, rationale });
      state.editing = null;
      render();
      return { id, draft: d, diff: typeof mdx === 'string' ? diffSummary(before, mdx) : null };
    },
  },
  {
    name: 'list_drafts',
    description: 'Local drafts in this browser, with diff summaries against the working copy.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    readOnly: true,
    execute: () => Object.entries(state.drafts).map(([id, d]) => ({ id, heading: workingSection(id)?.section.heading, hasText: typeof d.raw === 'string', diff: typeof d.raw === 'string' ? diffSummary(workingSection(id)?.section.raw ?? '', d.raw) : null, registry: d.registry || null, rationale: d.rationale || null, proposedThread: d.proposedThread || null, updatedAt: d.updatedAt })),
  },
  {
    name: 'discard_draft',
    description: 'Delete a local draft, restoring the working copy for that section.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    readOnly: false,
    execute: ({ id }) => {
      const had = Boolean(state.drafts[id]);
      delete state.drafts[id];
      saveDrafts();
      render();
      return { id, discarded: had };
    },
  },
  {
    name: 'diff_section',
    description: 'Word-level diff of a section between Fern main (baseline) and the effective text (draft or working copy), as +[added] -[removed] markup.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    readOnly: true,
    execute: ({ id }) => {
      const b = baselineById.get(id)?.raw ?? '';
      const cur = effectiveRaw(id);
      return { id, summary: diffSummary(b, cur), diff: wordDiff(b, cur).map((t) => (t.type === 'eq' ? t.text : t.type === 'add' ? `+[${t.text}]` : `-[${t.text}]`)).join('') };
    },
  },
  {
    name: 'propose_drafts',
    description: 'Post the current local drafts (or a subset) as a proposal comment thread on this wrop so the owner can review, apply and publish. Requires the page to be served from wrop.wf.app.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } }, additionalProperties: false },
    readOnly: false,
    execute: async ({ ids, note }) => {
      const all = Object.keys(state.drafts);
      const chosen = ids && ids.length ? ids.filter((i) => all.includes(i)) : all;
      const r = await proposeDrafts(chosen, note);
      render();
      return r;
    },
  },
  {
    name: 'list_proposals',
    description: 'Proposals posted as comment threads on this wrop (all versions), newest first.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    readOnly: true,
    execute: async () => {
      if (!WROP) return [];
      if (state.proposals === null) await loadProposals();
      return state.proposals.map((p) => ({ threadId: p.thread.id, version: p.version, author: p.author, createdAt: p.createdAt, resolved: p.resolved, complete: !p.incomplete, parts: p.incomplete ? `${p.incomplete.have}/${p.incomplete.need}` : null, summary: p.payload.summary, note: p.payload.note || null, sections: p.payload.sections.map((s) => ({ id: s.id, heading: s.heading, hasText: typeof s.raw === 'string', registry: s.registry || null, rationale: s.rationale || null })) }));
    },
  },
  {
    name: 'export_page_mdx',
    description: 'Full MDX file for a page with local drafts applied — byte-identical to Fern main where unchanged. Paste into fern/products/data/pages/MARKETPLACE/<slug>.mdx.',
    inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'], additionalProperties: false },
    readOnly: true,
    execute: ({ slug }) => {
      const p = workingPage(slug);
      if (!p) throw new Error(`Unknown page ${slug}`);
      return { slug, path: p.sourcePath, mdx: serializePage(pageWithDrafts(slug)) };
    },
  },
  {
    name: 'get_pr_summary',
    description: 'Markdown PR body: changed sections vs Fern main with word counts, rationale, legal/check routing.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    readOnly: true,
    execute: () => ({ markdown: prSummary() }),
  },
  {
    name: 'publish_version',
    description: 'OWNER ONLY. Merge the local drafts into the working copy and mint a new wrop version (the URL stays the same; the previous version stays at ?v=N). Does not touch developers.webflow.com. Requires confirm: true. Ask the user before calling.',
    inputSchema: { type: 'object', properties: { confirm: { type: 'boolean', description: 'Must be true. The user has approved publishing these drafts.' } }, required: ['confirm'], additionalProperties: false },
    readOnly: false,
    execute: async ({ confirm }) => {
      if (confirm !== true) throw new Error('Set confirm: true after the user approves publishing');
      if (!WROP) throw new Error('Publishing needs the page served from wrop.wf.app');
      if (!state.isOwner) throw new Error(`Only the wrop owner (${state.meta?.created_by || 'unknown'}) can publish; propose_drafts instead`);
      const r = await publishVersion();
      render();
      return { ...r, url: `/w/${WROP.slug}`, note: 'Reload the page to work on the new version.' };
    },
  },
  {
    name: 'focus_section',
    description: 'Scroll the page to a section so the user can see what you are referring to.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    readOnly: false,
    execute: ({ id }) => {
      if (!workingSection(id)) throw new Error(`Unknown section ${id}`);
      gotoSection(id);
      return { id, focused: true };
    },
  },
];
function toWebMcpTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { readOnlyHint: tool.readOnly },
    execute: async (input) => {
      try {
        const result = await tool.execute(input || {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (e) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
      }
    },
  };
}
function registerWebMcp() {
  const mc = navigator.modelContext || document.modelContext;
  if (!mc) return { api: 'none', registered: 0 };
  const tools = TOOLS.map(toWebMcpTool);
  if (typeof mc.registerTool === 'function') {
    let n = 0;
    for (const t of tools) {
      try {
        mc.registerTool(t);
        n += 1;
      } catch (e) {
        console.warn('[wfgr] registerTool failed', t.name, e);
      }
    }
    return { api: 'registerTool', registered: n };
  }
  if (typeof mc.provideContext === 'function') {
    mc.provideContext({ tools });
    return { api: 'provideContext', registered: tools.length };
  }
  return { api: 'none', registered: 0 };
}

// ── boot ──────────────────────────────────────────────────────────────────────
render();
loadIdentity();
const reg = registerWebMcp();
window.__guidelineRegistry = {
  version: APP_VERSION,
  webmcp: reg,
  listTools: () => TOOLS.map((t) => ({ name: t.name, readOnly: t.readOnly, description: t.description })),
  call: (name, input) => {
    const t = TOOLS.find((x) => x.name === name);
    if (!t) throw new Error(`Unknown tool ${name}`);
    return t.execute(input || {});
  },
  state,
  data: DATA,
};
console.info(`[wfgr] Marketplace Guidelines Registry ${APP_VERSION} — WebMCP ${reg.api} (${reg.registered} tools) — ${WROP ? `wrop ${WROP.slug} v${WROP.version}` : 'offline'}`);
