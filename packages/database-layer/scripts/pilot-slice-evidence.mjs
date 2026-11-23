#!/usr/bin/env node
/** Local, participant-blinded pilot. No recruitment or external writes. */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { frozenPackets, studyHash } from './evaluate-slice-evidence.mjs';
import { prepareEvidenceReview } from './review-slice-evidence.mjs';

const args = process.argv.slice(2);
if (args.length !== 3 || !/^\d+$/.test(args[0])) {
  console.log(
    'Usage: node pilot-slice-evidence.mjs <anonymous-participant-index> <evaluation-report.json> <new-output.json>\nUse a completed evaluation report with shadow results. The facilitator keeps condition allocation private. Participants inspect supplied local sources, answer a displayed source number or no_match; skip censors the trial. No feedback until all eight trials finish.'
  );
  process.exit(args.includes('--help') ? 0 : 1);
}
const index = Number(args[0]);
const report = JSON.parse(readFileSync(args[1], 'utf8'));
if (!report.shadow || report.shadow.results.some((x) => x.providerError))
  throw new Error('Pilot requires successful recorded shadow rankings for all cases.');
const packets = await frozenPackets(prepareEvidenceReview);
if (
  report.dataset !== 'operating-slice-public-doc-metadata-v1' ||
  report.studyHash !== studyHash(packets)
)
  throw new Error(
    'Recorded report does not match frozen questions, answer key and source metadata'
  );
if (
  report.shadow.results.length !== packets.length ||
  new Set(report.shadow.results.map((item) => item.id)).size !== packets.length
)
  throw new Error('Recorded report must contain exactly one result per frozen case');
const rotation = Math.floor(index / 2) % packets.length;
const ordered = [...packets.slice(rotation), ...packets.slice(0, rotation)];
const rl = createInterface({ input: stdin, output: stdout });
const results = [];
try {
  console.log(
    'Inspect the local sources. Choose the best supported source; use no_match if this evidence cannot support the request. Enter skip to leave a trial unanswered.'
  );
  for (let position = 0; position < ordered.length; position++) {
    const { testCase, packet } = ordered[position];
    const arm = (position + index) % 2 === 0 ? 'baseline' : 'shadow';
    const choice = report.shadow.results.find((x) => x.id === testCase.id)?.choice;
    if (!choice || (choice !== 'no_match' && !packet.candidates.some((item) => item.id === choice)))
      throw new Error('Recorded report has a missing or invalid frozen-case choice');
    const display = [...packet.candidates];
    if (arm === 'shadow' && choice !== 'no_match')
      display.sort((a, b) => (b.id === choice) - (a.id === choice));
    await rl.question('\nPress Enter when ready for the next timed trial.');
    const started = performance.now();
    console.log('\n' + testCase.question);
    display.forEach((candidate, i) =>
      console.log(`${i + 1}. ${candidate.path}\n   ${candidate.description}`)
    );
    // A no_match recommendation is shown without revealing its generating condition.
    console.log(
      'Suggested first inspection: ' +
        (arm === 'shadow' && choice === 'no_match' ? 'insufficient evidence / no_match' : '1')
    );
    let answer;
    do {
      answer = (await rl.question('Source number, no_match, or skip: ')).trim();
    } while (!['no_match', 'skip'].includes(answer) && !/^[1-6]$/.test(answer));
    const elapsedMs = Math.round(performance.now() - started);
    const selected =
      answer === 'no_match' ? 'no_match' : (display[Number(answer) - 1]?.path ?? null);
    const correct = testCase.expected.includes(selected);
    results.push({
      caseId: testCase.id,
      condition: arm,
      position,
      answer: selected,
      skipped: answer === 'skip',
      correct,
      errors: answer === 'skip' ? 0 : Number(!correct),
      elapsedMs,
      timeToCorrectMs: correct ? elapsedMs : null,
      censored: !correct
    });
  }
} finally {
  rl.close();
}
const summaries = Object.fromEntries(
  ['baseline', 'shadow'].map((arm) => {
    const trials = results.filter((x) => x.condition === arm);
    const correct = trials.filter((x) => x.correct);
    return [
      arm,
      {
        trials: trials.length,
        correct: correct.length,
        errors: trials.reduce((sum, x) => sum + x.errors, 0),
        censored: trials.filter((x) => x.censored).length,
        meanTimeToCorrectMs: correct.length
          ? Math.round(correct.reduce((sum, x) => sum + x.timeToCorrectMs, 0) / correct.length)
          : null
      }
    ];
  })
);
writeFileSync(
  args[2],
  JSON.stringify(
    {
      schemaVersion: 1,
      participantIndex: index,
      dataset: report.dataset,
      assignment:
        'alternating condition by position plus participant parity; rotate case order by floor(participant index / 2)',
      results,
      summaries,
      limitations: [
        'Participant sees no condition names or answer keys during trials; facilitator and analyst are not blinded.',
        'Each case appears once per participant to avoid within-person answer recall. Counterbalance across participant indices 0 through 15.',
        'Time begins at question reveal and includes local source inspection. Incorrect/skipped trials are censored, never reported as time-to-correct.',
        'Small convenience pilot; report per-case errors and censoring with timing, and avoid population claims.'
      ]
    },
    null,
    2
  ),
  { flag: 'wx' }
);
console.log('Pilot complete. Local results saved.');
