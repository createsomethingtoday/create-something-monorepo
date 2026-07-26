#!/usr/bin/env node

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const host = readArg('host') ?? process.env.OPERATOR_CHAT_AGENT_URL;

if (!host) {
  console.error('OPERATOR_CHAT_AGENT_URL or --host is required.');
  process.exit(1);
}

async function check(path) {
  const url = new URL(path, host);
  const response = await fetch(url);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${url.toString()} returned ${response.status}: ${body}`);
  }
  return {
    path,
    status: response.status,
    body: body.slice(0, 300)
  };
}

const checks = [await check('/healthz'), await check('/')];
console.log(JSON.stringify({ ok: true, checks }, null, 2));
