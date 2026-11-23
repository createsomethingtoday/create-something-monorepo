import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { tsImport } from 'tsx/esm/api';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
// Only the explicit metadata allowlist is disclosed. Never open an evidence path.
const sanitize = (value) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/(?:Bearer\s+\S+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+)/gi, '[redacted]')
    .replace(/https?:\/\/\S+/g, '[url omitted]')
    .slice(0, 100);

export function prepareEvidenceReview(
  sliceId,
  question,
  {
    review = read('create-something-operating-slice-review.json'),
    topology = read('create-something-internal-topology.json')
  } = {}
) {
  if (typeof question !== 'string' || !question.trim() || Buffer.byteLength(question) > 2000)
    throw new Error('Question must contain 1–2000 UTF-8 bytes');
  const slice = review.slices.find((item) => item.id === sliceId);
  if (!slice) throw new Error('Unknown operating slice');
  const candidates = slice.evidence.map((evidencePath, index) => {
    const nodes = topology.nodes.filter((node) => node.path === evidencePath);
    const metadata = nodes
      .slice(0, 1)
      .map((node) =>
        Object.fromEntries(
          ['title', 'summary', 'tier', 'surface', 'owner'].map((key) => [key, sanitize(node[key])])
        )
      );
    return {
      id: `evidence-${index + 1}`,
      path: evidencePath,
      description: JSON.stringify({ path: sanitize(evidencePath), metadata }).slice(0, 600)
    };
  });
  const packet = {
    schema: 'operating-slice-evidence-review/v1',
    authority: 'advisory_only',
    sliceId,
    question,
    candidates,
    baselineOrder: candidates.map((item) => item.id),
    disclosure:
      'Bounded topology metadata only; no evidence file contents. --live opts into provider disclosure.',
    sourceHash: hash({ review, topology })
  };
  return { ...packet, requestHash: hash(packet) };
}

export async function selectEvidence(question, candidates, options = {}) {
  if ((options.provider ?? 'jev') !== 'jev') throw new Error('Only the jev provider is supported');
  if (typeof question !== 'string' || !question.trim() || Buffer.byteLength(question) > 2000)
    throw new Error('Invalid evidence question');
  if (
    !Array.isArray(candidates) ||
    !candidates.length ||
    candidates.length > 16 ||
    candidates.some(
      (c) =>
        typeof c.id !== 'string' ||
        !c.id ||
        c.id === 'no_match' ||
        typeof c.description !== 'string' ||
        !c.description ||
        c.description.length > 2000
    ) ||
    new Set(candidates.map((c) => c.id)).size !== candidates.length
  )
    throw new Error('Invalid evidence candidates');
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30000)
    throw new Error('Invalid timeout');
  const providers = await tsImport(
    '../../owned-agent-runtime/src/decision-providers.ts',
    import.meta.url
  );
  const transport = options.evaluate
    ? null
    : await tsImport('../../owned-agent-runtime/src/decision-transport.ts', import.meta.url);
  const selector = options.evaluate
    ? providers.createJevDecisionSelector(options.evaluate)
    : transport.createJevHttpDecisionSelector(
        options.apiKey ?? process.env.TYPESAFE_API_KEY,
        options.fetch ?? globalThis.fetch
      );
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  let timer;
  try {
    const request = {
      id: 'slice-evidence',
      scope: 'operating-slice-review',
      policyVersion: 'metadata-only-v1',
      stateVersion: hash(candidates),
      question: `Which supplied evidence source should the operator inspect first to answer this question? Choose no_match if none helps or the question requires runtime proof that topology metadata cannot establish. Metadata is orientation only, never proof of live behavior. Question: ${question}`,
      candidates: candidates.map(({ id, description }) => ({ id, description })),
      fallbackId: candidates[0].id,
      mode: 'fresh'
    };
    const result = await Promise.race([
      selector.select(request, controller.signal),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Evidence selection timeout'));
        }, timeoutMs);
      })
    ]);
    if (result?.choice === null) return 'no_match';
    if (!candidates.some((c) => c.id === result?.choice))
      throw new Error('Invalid evidence selection');
    return result.choice;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function reviewEvidence(packet, options = {}) {
  const base = {
    ...packet,
    selectedId: null,
    selectedPath: null,
    status: 'preview',
    orderedCandidates: packet.candidates
  };
  if (!options.live) return base;
  const prepare = options.prepare ?? prepareEvidenceReview;
  const current = prepare(packet.sliceId, packet.question);
  const { requestHash, ...body } = packet;
  if (hash(body) !== requestHash || current.requestHash !== requestHash)
    return { ...base, status: 'fallback', reason: 'stale_packet' };
  try {
    if (!packet.candidates.length) return { ...base, status: 'fallback', reason: 'no_candidates' };
    const selectedId = await selectEvidence(packet.question, packet.candidates, options);
    const after = prepare(packet.sliceId, packet.question);
    if (after.requestHash !== requestHash)
      return { ...base, status: 'fallback', reason: 'stale_packet' };
    if (selectedId === 'no_match') return { ...base, status: 'fallback', reason: 'no_match' };
    const selected = packet.candidates.find((c) => c.id === selectedId);
    return {
      ...base,
      status: 'suggested',
      selectedId,
      selectedPath: selected.path,
      orderedCandidates: [selected, ...packet.candidates.filter((c) => c.id !== selectedId)]
    };
  } catch {
    return {
      ...base,
      status: 'fallback',
      reason: 'provider_failure',
      orderedCandidates: packet.candidates
    };
  }
}

async function main(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--') continue;
    if (args[i] === '--live') {
      opts.live = true;
      continue;
    }
    if (!['--slice', '--question', '--provider'].includes(args[i]) || !args[i + 1])
      throw new Error('Use --slice ID --question question [--live] [--provider jev]');
    opts[args[i].slice(2)] = args[++i];
  }
  if ((opts.provider ?? 'jev') !== 'jev') throw new Error('Only the jev provider is supported');
  console.log(
    JSON.stringify(
      await reviewEvidence(prepareEvidenceReview(opts.slice, opts.question), opts),
      null,
      2
    )
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(() => {
    console.error('Evidence review failed; check arguments and local artifacts');
    process.exitCode = 1;
  });
