#!/usr/bin/env node
// Judge agent findings against reviewer feedback.
//
//   node scripts/judge.mjs --arm astra [--only recX] [--force] [--relabel]
//
// Two steps, both with Claude as an independent judge (a different vendor
// from every arm under test):
//   1. Label: classify the reviewer's written feedback for a version into the
//      taxonomy codes, one label per distinct issue, quoting the feedback.
//      Cached per version in corpus/judged-labels/<versionId>.json so every
//      arm is scored against the same labels.
//   2. Match: for each reviewer label, does any agent finding cover the same
//      issue? For each agent finding, is it a true issue the reviewer named,
//      a plausible issue the reviewer did not name, or unsupported?
// Writes runs/<arm>/<versionId>/judgment.json.
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(here, '..');
const MODEL = process.env.JUDGE_MODEL ?? 'claude-opus-5-5';
const client = new Anthropic({ apiKey: process.env.WEBFLOW_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY });

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : [])).filter((p) => p.length));
const armName = args.arm ?? 'astra';
const manifest = JSON.parse(readFileSync(join(PKG, 'corpus', 'manifest.json'), 'utf8'));
const labels = JSON.parse(readFileSync(join(PKG, 'corpus', 'labels.json'), 'utf8'));
const taxonomy = JSON.parse(readFileSync(join(PKG, 'schemas', 'taxonomy.json'), 'utf8'));
const CODES = taxonomy.categories.map((c) => `${c.code}: ${c.title}`).join('\n');
mkdirSync(join(PKG, 'corpus', 'judged-labels'), { recursive: true });

const runRoot = join(PKG, 'runs', armName);
const versionIds = (args.only ? String(args.only).split(',') : existsSync(runRoot) ? readdirSync(runRoot).filter((d) => existsSync(join(runRoot, d, 'result.json'))) : []);
console.log(`judge arm=${armName} versions=${versionIds.length} judge=${MODEL}`);

for (const versionId of versionIds) {
  const v = manifest.versions.find((x) => x.versionId === versionId);
  const out = join(runRoot, versionId, 'judgment.json');
  if (existsSync(out) && !args.force) continue;
  const label = await labelReviewer(v);
  if (args['labels-only']) {
    console.log(`${v.appName} v${v.versionNumber} (${v.decision}): ${label.issues.length} issues → ${label.issues.map((i) => i.code).join(', ') || (label.only_summary ? 'summary only' : 'none')}`);
    continue;
  }
  const result = JSON.parse(readFileSync(join(runRoot, versionId, 'result.json'), 'utf8'));
  const judgment = await match(v, label, result);
  writeFileSync(out, JSON.stringify({ versionId, arm: armName, judge: MODEL, label, judgment }, null, 2));
  const m = judgment.metrics;
  console.log(`${v.appName} v${v.versionNumber}: reviewer=${label.issues.length} agent=${result.findings.length} recall=${m.recall?.toFixed(2)} precision=${m.precision?.toFixed(2)} verdict=${result.verdict}/${v.decision}`);
}

// ---------------------------------------------------------------------------

async function labelReviewer(v) {
  const cache = join(PKG, 'corpus', 'judged-labels', `${v.versionId}.json`);
  const text = `${labels[v.versionId]?.rejectionFeedback ?? ''}\n\n${labels[v.versionId]?.reviewFeedback ?? ''}`.trim();
  // The cache is keyed on its inputs: feedback text, taxonomy and judge model. A corpus refresh
  // that edits the feedback, a taxonomy change or a model change relabels. Files written before
  // this key existed are accepted once and stamped, because the corpus has not been rebuilt since;
  // pass --relabel to force.
  const inputsHash = createHash('sha256').update(`${MODEL}\n${CODES}\n${text}`).digest('hex').slice(0, 16);
  if (existsSync(cache) && !args.relabel) {
    const cached = JSON.parse(readFileSync(cache, 'utf8'));
    if (cached.inputsHash === inputsHash) return cached;
    if (cached.inputsHash === undefined) {
      cached.inputsHash = inputsHash;
      writeFileSync(cache, JSON.stringify(cached, null, 2));
      return cached;
    }
    console.log(`relabel ${v.appName} v${v.versionNumber}: inputs changed`);
  }
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    system: 'You classify Webflow Marketplace App review feedback into a fixed taxonomy. You never add issues the reviewer did not write. You quote the reviewer verbatim for each issue.',
    messages: [
      {
        role: 'user',
        content: `Taxonomy codes:\n${CODES}\n\nApp: ${v.appName} (${v.capability}, ${v.reviewType}, decision ${v.decision}${v.reason ? `, reason ${v.reason}` : ''}).\n\nReviewer feedback:\n"""\n${text}\n"""\n\nList every distinct issue the reviewer raised. Process notes about suspensions or resubmission timing get POLICY. Skip pleasantries and boilerplate ("Detailed feedback has been sent in a separate email" is not an issue; if the feedback only says that, return an empty list and set only_summary=true).`,
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['issues', 'only_summary'],
          properties: {
            only_summary: { type: 'boolean' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['code', 'quote', 'gist', 'severity'],
                properties: {
                  code: { type: 'string' },
                  quote: { type: 'string' },
                  gist: { type: 'string' },
                  severity: { type: 'string', enum: ['blocker', 'required', 'suggested', 'process'] },
                },
              },
            },
          },
        },
      },
    },
  });
  const parsed = res.parsed_output ?? res.parsed ?? firstJson(res);
  parsed.inputsHash = inputsHash;
  writeFileSync(cache, JSON.stringify(parsed, null, 2));
  return parsed;
}

async function match(v, label, result) {
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 12000,
    system: 'You compare an automated reviewer\'s findings against a human reviewer\'s issues for the same Webflow Marketplace App version. Be literal: two items match only if they describe the same defect, not merely the same category. Judge evidence quality harshly: a finding with a file path and snippet or exact listing text is "specific"; a finding that only names a pattern is "vague".',
    messages: [
      {
        role: 'user',
        content: `App: ${v.appName} (${v.capability}, ${v.reviewType}).\n\nHUMAN REVIEWER ISSUES (ground truth):\n${JSON.stringify(label.issues, null, 1)}\n\nAGENT RESULT:\n${JSON.stringify({ verdict: result.verdict, summary: result.summary, findings: result.findings }, null, 1)}\n\nFor each human issue, say whether an agent finding covers it (give the agent finding index) or not. For each agent finding, classify: "matched" (covers a human issue), "plausible_new" (a real-looking issue the human did not write down, with specific evidence), "unsupported" (no verifiable evidence, or contradicts the taxonomy guidance like treating the React error-decoder URL as a dev build), or "out_of_scope" (true but not something review acts on). Then compute recall = covered human issues / human issues (excluding POLICY and process severity), precision = (matched + plausible_new) / agent findings.`,
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['human_issues', 'agent_findings', 'metrics', 'notes'],
          properties: {
            human_issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['index', 'code', 'covered', 'by_agent_finding'], properties: { index: { type: 'integer' }, code: { type: 'string' }, covered: { type: 'boolean' }, by_agent_finding: { type: ['integer', 'null'] } } } },
            agent_findings: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['index', 'code', 'class', 'evidence_quality'], properties: { index: { type: 'integer' }, code: { type: 'string' }, class: { type: 'string', enum: ['matched', 'plausible_new', 'unsupported', 'out_of_scope'] }, evidence_quality: { type: 'string', enum: ['specific', 'vague'] } } } },
            metrics: { type: 'object', additionalProperties: false, required: ['recall', 'precision', 'human_actionable', 'matched', 'plausible_new', 'unsupported'], properties: { recall: { type: ['number', 'null'] }, precision: { type: ['number', 'null'] }, human_actionable: { type: 'integer' }, matched: { type: 'integer' }, plausible_new: { type: 'integer' }, unsupported: { type: 'integer' } } },
            notes: { type: 'string' },
          },
        },
      },
    },
  });
  return res.parsed_output ?? res.parsed ?? firstJson(res);
}

function firstJson(res) {
  const text = res.content?.find((b) => b.type === 'text')?.text ?? '';
  return JSON.parse(text.slice(text.indexOf('{')));
}
