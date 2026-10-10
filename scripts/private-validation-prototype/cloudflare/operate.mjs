// Operator-only adapter. Secret values never enter arguments, logs or evidence.
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, symlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
const here = path.dirname(fileURLToPath(import.meta.url));
const directory = path.join(here, '.operator');
await mkdir(directory, { recursive: true, mode: 0o700 });
await mkdir(path.join(directory, 'docker'), { recursive: true, mode: 0o700 });
const dockerConfigPath = path.join(directory, 'docker/config.json');
let dockerConfig = {};
try { dockerConfig = JSON.parse(await readFile(dockerConfigPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
dockerConfig.cliPluginsExtraDirs = [path.join(process.env.DOCKER_CONFIG ?? path.join(os.homedir(), '.docker'), 'cli-plugins')];
await writeFile(dockerConfigPath, JSON.stringify(dockerConfig), { mode: 0o600 });
const dockerHost = process.env.DOCKER_HOST ?? execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8' }).trim();
const bin = path.join(directory, 'bin');
await mkdir(bin, { recursive: true });
for (const [name, executable] of [['node', process.execPath], ['docker', execFileSync('/usr/bin/which', ['docker'], { encoding: 'utf8' }).trim()]]) {
  try { await symlink(executable, path.join(bin, name)); } catch (error) { if (error.code !== 'EEXIST') throw error; }
}
const key = execFileSync('infisical', ['secrets', 'get', 'CLOUDFLARE_WORKERS_API_TOKEN', '--env=prod', '--plain',
  '--projectId=e1532079-2f2b-46b5-8972-cf7a025eb803'], { encoding: 'utf8', timeout: 15000 }).trim();
if (!key) throw new Error('Cloudflare credential unavailable');
const [action, ...args] = process.argv.slice(2);
if (action === 'preflight') {
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/9645bd52e640b8a4f40a3a55ff1dd75a/containers/applications', {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  console.log(JSON.stringify({ status: response.status, success: data.success, errors: data.errors }));
  if (!response.ok) process.exitCode = 1;
} else {
  let input, command;
  if (action === 'set-operator-token') {
    const tokenPath = path.join(directory, 'token');
    try { input = await readFile(tokenPath, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      input = randomBytes(32).toString('hex');
      await writeFile(tokenPath, input, { mode: 0o600, flag: 'wx' });
    }
    command = ['secret', 'put', 'OPERATOR_TOKEN'];
  } else if (action === 'wrangler' && ['whoami', 'deploy', 'deployments', 'containers'].includes(args[0])) command = args;
  else throw new Error('Use preflight, set-operator-token, or wrangler whoami/deploy/deployments/containers');
  const child = spawn(path.join(here, 'node_modules/.bin/wrangler'), command, {
    cwd: here, stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'],
    env: { ...process.env, CLOUDFLARE_API_TOKEN: key, CLOUDFLARE_ACCOUNT_ID: '9645bd52e640b8a4f40a3a55ff1dd75a',
      XDG_CONFIG_HOME: directory, DOCKER_CONFIG: path.join(directory, 'docker'), DOCKER_HOST: dockerHost,
      PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
      WRANGLER_LOG_PATH: path.join(directory, 'logs'), WRANGLER_SEND_METRICS: 'false' },
  });
  if (input) child.stdin.end(input);
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
