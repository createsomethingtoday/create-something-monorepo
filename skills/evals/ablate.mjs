#!/usr/bin/env node
/**
 * With/without test for the skills in this pack.
 *
 * Runs one task in fresh, isolated Claude Code sessions: one arm with no skill,
 * one arm with the skill copied into the project, and optional extra arms (for
 * example an older copy of the skill). A judge that cannot see the arm then
 * grades each answer against the task's answer key.
 *
 *   node skills/evals/ablate.mjs run --task template-preflight [--trials 3] [--model sonnet]
 *        [--arms without,with,stale=/abs/path/to/older/skill] [--run <id>] [--parallel 3]
 *   node skills/evals/ablate.mjs judge --run <id> [--model sonnet]
 *   node skills/evals/ablate.mjs report --run <id>
 *
 * Needs the `claude` CLI, signed in. A session costs real tokens; --budget caps one session (USD).
 * Sessions get no user settings, no user skills and no MCP servers, so both arms start equal.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = resolve(HERE, '..');
const ISOLATE = [
  '--setting-sources',
  'project',
  '--strict-mcp-config',
  '--mcp-config',
  '{"mcpServers":{}}',
  '--no-session-persistence'
];

const [command, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i += 2) flags[rest[i].replace(/^--/, '')] = rest[i + 1];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const runDir = (id) => join(HERE, 'runs', id);

function claude(args, { cwd, stdin, timeoutMs = 20 * 60 * 1000 }) {
  return new Promise((done) => {
    const child = spawn('claude', args, {
      cwd,
      stdio: [stdin ? 'pipe' : 'ignore', 'pipe', 'pipe']
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    if (stdin) child.stdin.end(stdin);
    child.on('close', (code) => {
      clearTimeout(timer);
      done({ code, out, err });
    });
  });
}

/** Serve fixture/site.mjs on a free local port. Unknown paths answer 404 with the site's 404 page. */
async function serveSite(taskDir) {
  const { routes } = await import(pathToFileURL(join(taskDir, 'fixture', 'site.mjs')).href);
  const server = createServer();
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
  const base = `http://127.0.0.1:${server.address().port}`;
  const site = routes(base);
  const media = {
    svg: ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"/>'],
    jpg: ['image/jpeg', 'jpeg'],
    png: ['image/png', 'png'],
    webp: ['image/webp', 'webp']
  };
  server.on('request', (request, response) => {
    const path = new URL(request.url, base).pathname.replace(/(.)\/$/, '$1');
    const extension = path.split('.').pop();
    const hit = site.pages[path];
    if (path.startsWith('/images/') && media[extension]) {
      response.writeHead(200, { 'Content-Type': media[extension][0] }).end(media[extension][1]);
    } else if (hit === undefined) {
      response.writeHead(404, { 'Content-Type': 'text/html' }).end(site.notFound);
    } else if (typeof hit === 'string') {
      response.writeHead(200, { 'Content-Type': 'text/html' }).end(hit);
    } else {
      response.writeHead(hit.status, { 'Content-Type': hit.type }).end(hit.body);
    }
  });
  return { base, close: () => server.close() };
}

/** "without" | "with" | "name=/path/to/skill[,/path/to/another]" → { name, skillDirs } */
function parseArm(spec, expected) {
  if (spec === 'without') return { name: spec, skillDirs: [] };
  if (spec === 'with')
    return { name: spec, skillDirs: expected.skills.map((skill) => join(SKILLS, skill)) };
  const [name, paths] = spec.split('=');
  return { name, skillDirs: paths.split('+').map((path) => resolve(path)) };
}

async function session({ taskDir, expected, arm, model, budget }) {
  const work = mkdtempSync(join(tmpdir(), 'pack-eval-'));
  for (const dir of arm.skillDirs) {
    const name = /^name:\s*(.+)$/m.exec(readFileSync(join(dir, 'SKILL.md'), 'utf8'))[1].trim();
    cpSync(dir, join(work, '.claude', 'skills', name), {
      recursive: true,
      filter: (source) => !/(__pycache__|\/evals\/|\/\.git\/)/.test(source)
    });
  }
  let prompt = readFileSync(join(taskDir, 'task.md'), 'utf8').trim();
  let site = null;
  if (existsSync(join(taskDir, 'fixture', 'site.mjs'))) {
    site = await serveSite(taskDir);
    prompt = prompt.replaceAll('{{URL}}', site.base);
  } else {
    cpSync(join(taskDir, 'fixture'), join(work, 'app'), { recursive: true });
  }
  const started = Date.now();
  const { code, out, err } = await claude(
    [
      '-p',
      prompt,
      '--model',
      model,
      '--output-format',
      'stream-json',
      '--verbose',
      ...ISOLATE,
      '--max-budget-usd',
      String(budget),
      '--allowedTools',
      'Bash,Read,Grep,Glob,WebFetch,WebSearch,Skill'
    ],
    { cwd: work }
  );
  site?.close();

  const record = {
    task: expected.task,
    model,
    exitCode: code,
    wallMs: Date.now() - started,
    skillsAvailable: [],
    skillsInvoked: [],
    toolCalls: {},
    toolErrors: 0,
    answer: null
  };
  for (const line of out.split('\n')) {
    if (!line.startsWith('{')) continue;
    const event = JSON.parse(line);
    if (event.type === 'system' && event.subtype === 'init') {
      record.skillsAvailable = (event.skills ?? []).filter((skill) =>
        arm.skillDirs.some((dir) =>
          readFileSync(join(dir, 'SKILL.md'), 'utf8').includes(`name: ${skill}`)
        )
      );
    } else if (event.type === 'assistant') {
      for (const block of event.message.content ?? []) {
        if (block.type !== 'tool_use') continue;
        record.toolCalls[block.name] = (record.toolCalls[block.name] ?? 0) + 1;
        if (block.name === 'Skill') record.skillsInvoked.push(block.input?.skill);
      }
    } else if (event.type === 'user') {
      for (const block of Array.isArray(event.message?.content) ? event.message.content : []) {
        if (block.type === 'tool_result' && block.is_error) record.toolErrors += 1;
      }
    } else if (event.type === 'result') {
      Object.assign(record, {
        answer: event.result ?? null,
        resultSubtype: event.subtype,
        turns: event.num_turns,
        costUsd: event.total_cost_usd,
        durationMs: event.duration_ms,
        usage: event.usage
      });
    }
  }
  if (record.answer === null) record.error = (err || out).slice(-2000);
  return record;
}

async function pool(jobs, size) {
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length) await queue.shift()();
    })
  );
}

async function run() {
  const taskDir = join(HERE, 'tasks', flags.task);
  const expected = readJson(join(taskDir, 'expected.json'));
  const id = flags.run ?? new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const out = join(runDir(id), flags.task);
  mkdirSync(out, { recursive: true });
  const keyPath = join(out, 'key.json');
  const key = existsSync(keyPath) ? readJson(keyPath) : {};
  const model = flags.model ?? 'sonnet';
  const jobs = [];
  for (const spec of (flags.arms ?? 'without,with').split(',')) {
    const arm = parseArm(spec, expected);
    for (let trial = 1; trial <= Number(flags.trials ?? 3); trial += 1) {
      jobs.push(async () => {
        const blind = randomBytes(5).toString('hex');
        const record = await session({
          taskDir,
          expected,
          arm,
          model,
          budget: Number(flags.budget ?? 3)
        });
        writeFileSync(join(out, `${blind}.json`), JSON.stringify(record, null, '\t'));
        key[blind] = { task: flags.task, arm: arm.name, trial };
        writeFileSync(keyPath, JSON.stringify(key, null, '\t'));
        console.log(
          `${flags.task} ${arm.name} #${trial}: ${record.answer ? 'answered' : 'NO ANSWER'} in ${Math.round(record.wallMs / 1000)}s, $${(record.costUsd ?? 0).toFixed(2)}`
        );
      });
    }
  }
  await pool(jobs, Number(flags.parallel ?? 3));
  console.log(`run id: ${id}`);
}

const JUDGE_SCHEMA = {
  type: 'object',
  required: ['planted', 'traps', 'inverted', 'other_findings'],
  properties: {
    planted: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'caught', 'quote'],
        properties: {
          id: { type: 'string' },
          caught: { type: 'boolean' },
          quote: { type: 'string' }
        }
      }
    },
    traps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'flagged', 'quote'],
        properties: {
          id: { type: 'string' },
          flagged: { type: 'boolean' },
          quote: { type: 'string' }
        }
      }
    },
    inverted: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'given', 'quote'],
        properties: {
          id: { type: 'string' },
          given: { type: 'boolean' },
          quote: { type: 'string' }
        }
      }
    },
    other_findings: { type: 'integer' }
  }
};

const judgePrompt = (
  expected,
  answer
) => `You grade one answer against an answer key. You do not know how the answer was produced. Grade only what the answer says.

Rules:
- planted: "caught" is true only when the answer identifies that specific problem, as "counts_as_caught_when" describes. A general category with no specific problem is not caught.
- traps: "flagged" is true only when the answer tells the reader it is a problem to fix or something that blocks approval, as "flagged_when" describes. Saying it is fine, optional or not required is not flagged. Not mentioning it is not flagged.
- inverted: "given" is true only when the answer recommends that advice. Return an empty list when the key has none.
- For each true value, "quote" holds at most 20 words copied from the answer. For false, "quote" is "".
- other_findings: the number of distinct problems the answer reports that are in neither list.
- Return one entry for every id in the key.

ANSWER KEY:
${JSON.stringify({ planted: expected.planted, traps: expected.traps, inverted_advice: expected.inverted_advice ?? [] }, null, 1)}

ANSWER TO GRADE:
<<<
${answer}
>>>`;

async function judge() {
  const dir = runDir(flags.run);
  const jobs = [];
  for (const task of readdirSync(dir).filter((name) => !name.includes('.'))) {
    const expected = readJson(join(HERE, 'tasks', task, 'expected.json'));
    for (const file of readdirSync(join(dir, task)).filter(
      (name) => name.endsWith('.json') && name !== 'key.json'
    )) {
      const path = join(dir, task, file);
      const record = readJson(path);
      if (record.judgement || !record.answer) continue;
      jobs.push(async () => {
        const { out } = await claude(
          [
            '-p',
            '--model',
            flags.model ?? 'sonnet',
            '--output-format',
            'json',
            '--json-schema',
            JSON.stringify(JUDGE_SCHEMA),
            ...ISOLATE
          ],
          {
            cwd: mkdtempSync(join(tmpdir(), 'pack-judge-')),
            stdin: judgePrompt(expected, record.answer)
          }
        );
        const reply = JSON.parse(out.slice(out.indexOf('{')));
        record.judgement =
          reply.structured_output ?? JSON.parse(reply.result.replace(/^```json\n?|```$/g, ''));
        writeFileSync(path, JSON.stringify(record, null, '\t'));
        console.log(`judged ${task}/${basename(file)}`);
      });
    }
  }
  await pool(jobs, Number(flags.parallel ?? 4));
}

function report() {
  const dir = runDir(flags.run);
  const lines = [`# With/without results, run ${flags.run}`, ''];
  const summary = {};
  for (const task of readdirSync(dir).filter((name) => !name.includes('.'))) {
    const expected = readJson(join(HERE, 'tasks', task, 'expected.json'));
    const key = readJson(join(dir, task, 'key.json'));
    const arms = {};
    for (const file of readdirSync(join(dir, task)).filter(
      (name) => name.endsWith('.json') && name !== 'key.json'
    )) {
      const record = readJson(join(dir, task, file));
      const { arm } = key[basename(file, '.json')];
      (arms[arm] ??= []).push(record);
    }
    const mean = (values) =>
      values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const sum = (object) => Object.values(object).reduce((a, b) => a + b, 0);
    lines.push(
      `## ${task}`,
      '',
      `Planted problems: ${expected.planted.length}. Traps: ${expected.traps.length}. Model: ${Object.values(arms)[0][0].model}.`,
      ''
    );
    lines.push(
      '| Arm | Caught (each session) | Traps flagged | Wrong advice | Skill used | Tool calls | Tool errors | Time | Cost |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    );
    summary[task] = { planted: expected.planted.length, traps: expected.traps.length, arms: {} };
    for (const [arm, records] of Object.entries(arms)) {
      const graded = records.filter((record) => record.judgement);
      const caught = graded.map(
        (record) => record.judgement.planted.filter((item) => item.caught).length
      );
      const traps = graded.map(
        (record) => record.judgement.traps.filter((item) => item.flagged).length
      );
      const inverted = graded.map(
        (record) => record.judgement.inverted.filter((item) => item.given).length
      );
      const used = records.filter((record) => record.skillsInvoked.length).length;
      summary[task].arms[arm] = {
        sessions: records.length,
        graded: graded.length,
        caught,
        traps,
        inverted,
        skillUsed: used,
        toolCalls: mean(records.map((record) => sum(record.toolCalls))),
        toolErrors: mean(records.map((record) => record.toolErrors)),
        seconds: mean(records.map((record) => record.wallMs / 1000)),
        costUsd: mean(records.map((record) => record.costUsd ?? 0))
      };
      const row = summary[task].arms[arm];
      lines.push(
        `| ${arm} | ${caught.join(', ')} of ${expected.planted.length} | ${traps.join(', ')} of ${expected.traps.length} | ${inverted.join(', ')} | ${used}/${records.length} | ${row.toolCalls.toFixed(0)} | ${row.toolErrors.toFixed(1)} | ${row.seconds.toFixed(0)} s | $${row.costUsd.toFixed(2)} |`
      );
    }
    lines.push(
      '',
      '| Item | ' + Object.keys(arms).join(' | ') + ' |',
      '| --- | ' +
        Object.keys(arms)
          .map(() => '---')
          .join(' | ') +
        ' |'
    );
    const cell = (records, list, id, field) =>
      `${records.filter((record) => record.judgement?.[list].find((item) => item.id === id)?.[field]).length}/${records.filter((record) => record.judgement).length}`;
    for (const item of expected.planted)
      lines.push(
        `| ${item.id} ${item.title} | ${Object.values(arms)
          .map((records) => cell(records, 'planted', item.id, 'caught'))
          .join(' | ')} |`
      );
    for (const item of expected.traps)
      lines.push(
        `| ${item.id} trap: ${item.title} | ${Object.values(arms)
          .map((records) => cell(records, 'traps', item.id, 'flagged'))
          .join(' | ')} |`
      );
    for (const item of expected.inverted_advice ?? [])
      lines.push(
        `| ${item.id} wrong advice: ${item.advice} | ${Object.values(arms)
          .map((records) => cell(records, 'inverted', item.id, 'given'))
          .join(' | ')} |`
      );
    lines.push('');
  }
  writeFileSync(join(dir, 'REPORT.md'), lines.join('\n'));
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary, null, '\t'));
  console.log(lines.join('\n'));
}

const commands = { run, judge, report };
if (!commands[command]) {
  console.error('usage: ablate.mjs run|judge|report (see the header of this file)');
  process.exit(2);
}
await commands[command]();
