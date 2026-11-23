#!/usr/bin/env node
/** Frozen first-party metadata benchmark. No source bodies or client slices reach providers. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const paths = [
  'docs/CANON_DATABASE_LAYER_DESIGN.md',
  'docs/CREATE_SOMETHING_DATABASE_LAYER.md',
  'docs/MCP_FIRST_THESIS.md',
  'docs/MCP_HUB_CONTROL_PLANE.md',
  'docs/README.md',
  'docs/THREE_TIER_FRAMEWORK.md'
];
export const evidenceCases = Object.freeze(
  [
    {
      id: 's01',
      question:
        'Where should an operator look for design guidance for admin screens showing records, queues, cursors, and audit trails?',
      expected: [paths[0]],
      kind: 'function'
    },
    {
      id: 's02',
      question:
        'Where should an operator look to distinguish reusable workspaces, source records, workflow actions and receipts from one application instance?',
      expected: [paths[1]],
      kind: 'function'
    },
    {
      id: 's03',
      question:
        'Where should a reader look for the strategic argument that connectivity is the entry point to automation?',
      expected: [paths[2]],
      kind: 'function'
    },
    {
      id: 's04',
      question:
        'Where should an operator look for governing many servers through one gateway, grouped into bundles?',
      expected: [paths[3]],
      kind: 'function'
    },
    {
      id: 's05',
      question:
        'Where should a reader look for the structural mapping between Resources, Tools, Prompts and tiers of an agent system?',
      expected: [paths[5]],
      kind: 'function'
    },
    {
      id: 's06',
      question:
        'Which evidence source is owned by CREATE SOMETHING according to this local topology?',
      expected: [...paths],
      kind: 'ownership'
    },
    {
      id: 's07',
      question:
        'Which evidence source proves the currently deployed production Worker is healthy right now?',
      expected: ['no_match'],
      kind: 'insufficient_evidence'
    },
    {
      id: 's08',
      question: 'Which evidence source documents a lunar rover propulsion maintenance procedure?',
      expected: ['no_match'],
      kind: 'no_match'
    }
  ].map((item) => Object.freeze(item))
);

export const firstListed = ({ candidates }) => ({
  choice: candidates[0]?.id ?? 'no_match',
  model: 'first-listed-valid'
});
export function lexicalBaseline({ question, candidates }) {
  const words = (value) =>
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .split(' ')
        .filter(
          (x) =>
            x.length > 3 &&
            ![
              'which',
              'evidence',
              'source',
              'describes',
              'according',
              'this',
              'local',
              'contains',
              'explains'
            ].includes(x)
        )
    );
  const query = words(question);
  const ranked = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      score: [...words(candidate.path + ' ' + candidate.description)].filter((word) =>
        query.has(word)
      ).length
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return {
    choice: ranked[0]?.score ? ranked[0].candidate.id : 'no_match',
    model: 'lexical-overlap'
  };
}
export async function frozenPackets(prepare) {
  const review = JSON.parse(
    readFileSync(new URL('../data/create-something-operating-slice-review.json', import.meta.url))
  );
  const slice = review.slices.find((item) => item.title === 'Mixed doc Atlas coverage');
  if (!slice || JSON.stringify(slice.evidence) !== JSON.stringify(paths))
    throw new Error('Frozen evidence order changed; explicitly review and version the answer key.');
  for (const path of paths) readFileSync(new URL('../../../' + path, import.meta.url));
  return evidenceCases.map((testCase) => ({
    testCase,
    packet: prepare(slice.id, testCase.question)
  }));
}
export function studyHash(packets) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        packets.map(({ testCase, packet }) => ({
          id: testCase.id,
          question: testCase.question,
          expected: testCase.expected,
          candidates: packet.candidates
        }))
      )
    )
    .digest('hex');
}
export async function evaluateEvidence(packets, ranker) {
  const results = [];
  for (const { testCase, packet } of packets) {
    const started = performance.now();
    try {
      const raw = await ranker({
        question: testCase.question,
        candidates: structuredClone(packet.candidates)
      });
      const choice = typeof raw === 'string' ? raw : raw?.choice;
      const candidate = packet.candidates.find((item) => item.id === choice);
      if (choice !== 'no_match' && !candidate) throw new Error('Invalid candidate ID');
      const selectedPath = candidate?.path ?? 'no_match';
      const correct = testCase.expected.includes(selectedPath);
      results.push({
        id: testCase.id,
        kind: testCase.kind,
        choice,
        selectedPath,
        expectedPaths: testCase.expected,
        correct,
        mistake: !correct && choice !== 'no_match',
        abstention: choice === 'no_match',
        correctNoMatch: correct && choice === 'no_match',
        missedEvidence: !correct && choice === 'no_match',
        latencyMs: Math.round((performance.now() - started) * 100) / 100,
        providerError: null
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        kind: testCase.kind,
        choice: null,
        correct: false,
        mistake: false,
        abstention: false,
        latencyMs: Math.round((performance.now() - started) * 100) / 100,
        providerError: {
          name: error?.name ?? 'Error',
          status: Number.isInteger(error?.status) ? error.status : null,
          message: 'Ranking failed; inspect provider diagnostics locally.'
        }
      });
    }
  }
  const decisions = results.filter((item) => !item.providerError);
  return {
    totalCases: results.length,
    scoredCases: decisions.length,
    correct: decisions.filter((x) => x.correct).length,
    mistakes: decisions.filter((x) => x.mistake).length,
    abstentions: decisions.filter((x) => x.abstention).length,
    correctNoMatch: decisions.filter((x) => x.correctNoMatch).length,
    missedEvidence: decisions.filter((x) => x.missedEvidence).length,
    providerErrors: results.length - decisions.length,
    results
  };
}
export async function main(args = process.argv.slice(2)) {
  if (args.includes('--help'))
    return console.log(
      'Usage: node evaluate-slice-evidence.mjs [--live jev]\nDefault offline first-listed and lexical baselines; live sends only six approved first-party documentation metadata candidates and frozen questions.'
    );
  const provider = args[0] === '--live' ? args[1] : null;
  if (args.length && !(args.length === 2 && provider === 'jev'))
    throw new Error('Unknown arguments');
  const { prepareEvidenceReview, selectEvidence } = await import('./review-slice-evidence.mjs');
  const packets = await frozenPackets(prepareEvidenceReview);
  if (
    provider &&
    studyHash(packets) !== 'de32aef7bc89d77ed36096e1e17f7adce5331eb844c335880662f289d9c259dd'
  )
    throw new Error(
      'Frozen pilot inputs changed. Review the new evidence and questions before a live run.'
    );
  const baseline = await evaluateEvidence(packets, firstListed);
  const lexical = await evaluateEvidence(packets, lexicalBaseline);
  const shadow = provider
    ? await evaluateEvidence(packets, (input) =>
        selectEvidence(input.question, input.candidates, { provider })
      )
    : null;
  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        dataset: 'operating-slice-public-doc-metadata-v1',
        studyHash: studyHash(packets),
        provider,
        baseline,
        lexical,
        shadow,
        operatorTime: { measured: false },
        limitations: [
          'Eight answer-keyed cases from one public-facing first-party documentation slice, not a production accuracy estimate.',
          'Candidates retain the exact operating-slice packet order; provider sees metadata, never source bodies or answer keys.',
          'Ownership accepts every source with the declared owner; mapped ownership is not live operational ownership verification.',
          'Provider errors are separate from abstentions and excluded from scored decisions.',
          'Wall latency measures ranker time, not human effort; human pilot must be run separately.'
        ]
      },
      null,
      2
    )
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
