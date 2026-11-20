import { runCli } from '../../src/cli.ts';

const [sessionPath, target] = process.argv.slice(2);
await fetch(`${target}/ready`);
process.exitCode = await runCli(['whoami'], {
  sessionPath, env: {}, out: () => {}, err: value => process.stderr.write(`${value}\n`),
  fetch: (url, init) => fetch(`${target}${new URL(String(url)).pathname}`, init),
});
