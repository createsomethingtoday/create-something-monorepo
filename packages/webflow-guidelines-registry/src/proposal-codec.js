// Proposal codec — how a proposal travels through wrop comment threads.
//
// wrop caps every comment and reply at 2000 characters, so a proposal cannot
// ride in one comment (a real section edit is 3–10× that). The root comment
// carries a human summary plus a small JSON envelope; the payload itself is
// base64url-encoded and split across replies tagged `wfgr-chunk <id> <i>/<n>`.
// Readers reassemble from the replies; a thread with missing parts renders as
// incomplete instead of disappearing. Plain script (no exports) so the build
// can inline it before app.js and node tests can load it in a VM.
const ProposalCodec = (() => {
  const COMMENT_MAX = 2000;
  const CHUNK_MARK = 'wfgr-chunk';
  const ENVELOPE_VERSION = 2;

  const utf8ToB64url = (s) => {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64urlToUtf8 = (b64) => {
    let s = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };
  // FNV-1a over the JSON; only needs to tell two proposals in one thread apart.
  const shortId = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36).padStart(7, '0').slice(-7);
  };
  // Backticks inside the envelope would end the ```json fence early.
  const safe = (v) => (typeof v === 'string' ? v.replace(/`/g, "'") : v);
  const chunkHeader = (id, i, n) => `${CHUNK_MARK} ${id} ${i}/${n}`;

  function buildEnvelope(payload, id, chunks, bytes) {
    return {
      type: payload.type,
      v: ENVELOPE_VERSION,
      id,
      chunks,
      bytes,
      summary: safe(payload.summary),
      by: payload.by,
      at: payload.at,
      baseVersion: payload.baseVersion,
      baseSource: payload.baseSource,
      note: safe(payload.note),
      sections: (payload.sections || []).map((s) => ({ id: s.id, page: s.page, heading: safe(s.heading) })),
    };
  }

  function buildRootText(intro, envelope, max = COMMENT_MAX) {
    const tailFor = (env) =>
      [
        '',
        `Proposal body follows in ${env.chunks} repl${env.chunks === 1 ? 'y' : 'ies'} tagged ${CHUNK_MARK}. Open the Proposals tab in the page to review, apply, or merge.`,
        '',
        '```json',
        JSON.stringify(env),
        '```',
      ].join('\n');
    let env = envelope;
    let tail = tailFor(env);
    if (tail.length > max) {
      env = { ...env, sections: undefined, note: undefined };
      tail = tailFor(env);
    }
    if (tail.length > max) {
      env = { ...env, summary: String(env.summary || '').slice(0, 120) };
      tail = tailFor(env);
    }
    if (tail.length > max) throw new Error('proposal envelope does not fit in one comment');
    const lines = intro.map((l) => safe(String(l)));
    let text = [...lines, tail].join('\n');
    while (text.length > max && lines.length) {
      const over = text.length - max;
      const last = lines[lines.length - 1];
      if (last.length > over + 2) lines[lines.length - 1] = `${last.slice(0, last.length - over - 1)}…`;
      else lines.pop();
      text = [...lines, tail].join('\n');
    }
    return text;
  }

  function encodeProposal(payload, { intro = [], max = COMMENT_MAX } = {}) {
    const json = JSON.stringify(payload);
    const data = utf8ToB64url(json);
    const id = shortId(json + (payload.at || ''));
    const size = max - (chunkHeader(id, 9999, 9999).length + 1);
    const parts = [];
    for (let i = 0; i < data.length; i += size) parts.push(data.slice(i, i + size));
    const n = parts.length;
    const chunks = parts.map((p, i) => `${chunkHeader(id, i + 1, n)}\n${p}`);
    const envelope = buildEnvelope(payload, id, n, json.length);
    const rootText = buildRootText(intro, envelope, max);
    return { rootText, chunks, id, envelope };
  }

  function parseChunkReply(text) {
    const m = /^wfgr-chunk (\w+) (\d+)\/(\d+)\s*\n([\s\S]*)$/.exec(String(text || '').trim());
    if (!m) return null;
    return { id: m[1], i: Number(m[2]), n: Number(m[3]), data: m[4].replace(/\s+/g, '') };
  }
  function parseEnvelope(rootText) {
    const text = String(rootText || '');
    // Non-greedy first; if the JSON itself contained a fence (v1 threads
    // embedded raw payloads), fall back to the last closing fence in the text.
    for (const re of [/```json\s*([\s\S]*?)```/, /```json\s*([\s\S]*)```\s*$/]) {
      const m = text.match(re);
      if (!m) continue;
      try {
        return JSON.parse(m[1]);
      } catch {
        /* try the next shape */
      }
    }
    return null;
  }
  const stubFrom = (env) => ({
    type: env.type,
    v: env.v,
    summary: env.summary,
    by: env.by,
    at: env.at,
    baseVersion: env.baseVersion,
    baseSource: env.baseSource,
    note: env.note,
    sections: (env.sections || []).map((s) => ({ ...s })),
  });

  // Returns null when the thread is not a proposal. Otherwise
  // { payload, complete, have, need, legacy, corrupt }.
  function assemble(rootText, replyTexts, { type = 'wfgr-proposal' } = {}) {
    const env = parseEnvelope(rootText);
    if (!env || env.type !== type) return null;
    if (env.v !== ENVELOPE_VERSION) {
      // v1: the whole payload was inline in the root comment.
      return { payload: env, complete: Array.isArray(env.sections), have: 1, need: 1, legacy: true, corrupt: false };
    }
    const parts = new Map();
    for (const t of replyTexts || []) {
      const c = parseChunkReply(t);
      if (c && c.id === env.id && c.n === env.chunks && !parts.has(c.i)) parts.set(c.i, c.data);
    }
    const need = Number(env.chunks) || 0;
    const have = parts.size;
    if (need === 0 || have < need) return { payload: stubFrom(env), complete: false, have, need, legacy: false, corrupt: false };
    let data = '';
    for (let i = 1; i <= need; i += 1) data += parts.get(i);
    try {
      const payload = JSON.parse(b64urlToUtf8(data));
      return { payload, complete: true, have, need, legacy: false, corrupt: false };
    } catch {
      return { payload: stubFrom(env), complete: false, have, need, legacy: false, corrupt: true };
    }
  }

  return { COMMENT_MAX, CHUNK_MARK, ENVELOPE_VERSION, encodeProposal, buildRootText, parseChunkReply, parseEnvelope, assemble, encode: utf8ToB64url, decode: b64urlToUtf8 };
})();
