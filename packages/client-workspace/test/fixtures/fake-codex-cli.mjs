const mode = process.env.FAKE_CODEX_MODE ?? 'ready';
const args = process.argv.slice(2);

if (args.includes('--version')) {
  console.log(mode === 'outdated' ? 'codex-cli 0.120.0' : 'codex-cli 0.142.5');
  process.exit(0);
}

if (args[0] === 'login' && args[1] === 'status') {
  if (mode === 'unauthenticated') {
    console.error('Not logged in');
    process.exit(1);
  }
  console.log('Logged in using ChatGPT');
  process.exit(0);
}

process.exit(2);
