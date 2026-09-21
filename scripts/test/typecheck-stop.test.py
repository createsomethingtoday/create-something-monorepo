"""Exercise the stop hook with real Git changes and controlled checker exits."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HOOK = Path(__file__).resolve().parents[2] / '.claude/hooks/typecheck-stop.sh'


class TypecheckStopTests(unittest.TestCase):
    def run_hook(self, *, svelte=False, checker_exit=0, tsc_exit=0, sync_exit=0, indirect=False, active=False):
        with tempfile.TemporaryDirectory(prefix='typecheck hook ') as directory:
            root = Path(directory)
            package = root / 'packages/example'
            package.mkdir(parents=True)
            (package / 'node_modules').mkdir()
            (package / 'tsconfig.json').write_text(json.dumps({'extends': './.svelte-kit/tsconfig.json'} if svelte else {}))
            (package / 'package.json').write_text(json.dumps({'scripts': {
                'check': ('pnpm package && svelte-check' if indirect else 'svelte-kit sync && svelte-check') if svelte else 'tsc --noEmit'
            }, 'devDependencies': {'@sveltejs/kit': '^2.0.0'} if svelte else {}}))
            source = package / ('Example.svelte' if svelte else 'example.ts')
            source.write_text('before\n')
            for args in [['init', '-q'], ['add', '.'], ['-c', 'user.name=Fixture', '-c',
                         'user.email=fixture@example.test', 'commit', '-qm', 'fixture']]:
                subprocess.run(['git', *args], cwd=root, check=True, capture_output=True)
            source.write_text('after\n')
            binary = root / 'bin'
            binary.mkdir()
            pnpm = binary / 'pnpm'
            pnpm.write_text('''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
with open(os.environ['CHECKER_CALLS'], 'a') as file:
    file.write(json.dumps(sys.argv[1:]) + '\\n')
if '--version' in sys.argv: sys.exit(0)
if 'svelte-kit' in sys.argv:
    code = int(os.environ['SYNC_EXIT'])
    if code:
        print('SvelteKit setup failed', file=sys.stderr)
        sys.exit(code)
    Path('.svelte-kit').mkdir(exist_ok=True)
    Path('.svelte-kit/tsconfig.json').write_text('{}')
    sys.exit(0)
if 'svelte-check' in sys.argv and not Path('.svelte-kit/tsconfig.json').exists():
    print('Missing generated SvelteKit config', file=sys.stderr)
    sys.exit(1)
code = int(os.environ['CHECKER_EXIT'] if 'svelte-check' in sys.argv else os.environ['TSC_EXIT'])
if code: print('Checker failed: invalid component or configuration', file=sys.stderr)
sys.exit(code)
''')
            pnpm.chmod(0o755)
            calls = root / 'calls.jsonl'
            env = dict(os.environ, CLAUDE_PROJECT_DIR=str(root),
                       PATH=str(binary) + os.pathsep + os.environ['PATH'],
                       CHECKER_CALLS=str(calls), CHECKER_EXIT=str(checker_exit), TSC_EXIT=str(tsc_exit), SYNC_EXIT=str(sync_exit))
            result = subprocess.run(['bash', str(HOOK)], cwd=root, env=env,
                                    input=json.dumps({'cwd': str(root), 'stop_hook_active': active}),
                                    text=True, capture_output=True)
            commands = [json.loads(line) for line in calls.read_text().splitlines()] if calls.exists() else []
            return result, commands

    def test_svelte_component_error_blocks_stop(self):
        result, commands = self.run_hook(svelte=True, checker_exit=1)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('invalid component', result.stderr)
        self.assertIn(['exec', 'svelte-check', '--tsconfig', './tsconfig.json', '--threshold', 'error'], commands)

    def test_svelte_success_does_not_run_raw_tsc(self):
        result, commands = self.run_hook(svelte=True, tsc_exit=1)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(commands)
        self.assertFalse(any('tsc' in command for command in commands))

    def test_fresh_sveltekit_package_generates_config_before_checking(self):
        result, commands = self.run_hook(svelte=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(commands[0], ['exec', 'svelte-kit', 'sync'])
        self.assertIn('svelte-check', commands[1])

    def test_indirect_sveltekit_setup_generates_config(self):
        result, commands = self.run_hook(svelte=True, indirect=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(commands[0], ['exec', 'svelte-kit', 'sync'])
        self.assertIn('svelte-check', commands[1])

    def test_failed_sveltekit_setup_blocks_without_running_checker(self):
        result, commands = self.run_hook(svelte=True, sync_exit=1)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('SvelteKit setup failed', result.stderr)
        self.assertEqual(commands, [['exec', 'svelte-kit', 'sync']])

    def test_plain_checker_failure_without_ts_diagnostic_blocks_stop(self):
        result, _ = self.run_hook(tsc_exit=1)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn('configuration', result.stderr)

    def test_plain_checker_success_allows_stop(self):
        result, _ = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_active_stop_hook_does_not_recurse(self):
        result, commands = self.run_hook(svelte=True, checker_exit=1, active=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(commands, [])


if __name__ == '__main__':
    unittest.main()
