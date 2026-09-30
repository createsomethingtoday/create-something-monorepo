import { runOperation, type RunnerRequest } from './runner.ts';

async function main(): Promise<void> {
  let raw = '';
  for await (const chunk of process.stdin) {
    raw += chunk.toString('utf8');
    if (raw.length > 65_536) {
      process.stdout.write(JSON.stringify({ ok: false, error: { operation: 'unknown', reason: 'invalid_request' } }) + '\n');
      return;
    }
  }
  let request: RunnerRequest;
  try { request = JSON.parse(raw) as RunnerRequest; }
  catch {
    process.stdout.write(JSON.stringify({ ok: false, error: { operation: 'unknown', reason: 'invalid_request' } }) + '\n');
    return;
  }
  const controller = new AbortController();
  process.once('SIGTERM', () => controller.abort());
  const result = await runOperation(request, { signal: controller.signal });
  process.stdout.write(JSON.stringify(result) + '\n');
}

await main();
