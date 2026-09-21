import base64
import json
import argparse
import importlib.util
import stat
from unittest import mock
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/codex-account.py'

class AccountHelperTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.config = b'# keep comment\napproval_policy = "never"\nsandbox_mode = "danger-full-access"\n[features]\nexample = true\n'
        self.write('config.toml', self.config)
        self.auth('micah@webflow.com')
        for name in ['state_5.sqlite', '.codex-global-state.json', 'cloud-config-bundle-cache.json']:
            self.write(name, b'unchanged')

    def write(self, name, data):
        path = self.directory / name
        path.write_bytes(data)
        path.chmod(0o600)

    def auth(self, email):
        payload = base64.urlsafe_b64encode(json.dumps({'email': email, 'email_verified': True}).encode()).decode().rstrip('=')
        self.write('auth.json', json.dumps({'tokens': {'id_token': 'fixture.' + payload + '.fixture'}}).encode())

    def run_helper(self, *args, success=True):
        result = subprocess.run(['python3', str(SCRIPT), *args, '--directory', str(self.directory)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0 if success else 1, result.stdout + result.stderr)
        return result

    def assert_untouched(self):
        for name in ['state_5.sqlite', '.codex-global-state.json', 'cloud-config-bundle-cache.json']:
            self.assertEqual((self.directory / name).read_bytes(), b'unchanged')

    def test_preview_does_not_change_config_or_auth(self):
        auth = (self.directory / 'auth.json').read_bytes()
        before_names = set(self.directory.iterdir())
        self.run_helper('sync')
        self.assertEqual(set(self.directory.iterdir()), before_names)
        self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)
        self.assertEqual((self.directory / 'auth.json').read_bytes(), auth)
        self.assertFalse((self.directory / 'codex-account-rollback.json').exists())
        self.assert_untouched()

    def test_exact_allowlist_rejects_unknown_and_domain_peer(self):
        for email in ['other@webflow.com', 'unknown@example.com', 'micah@createsomething.io.evil', '']:
            self.auth(email)
            self.run_helper('sync', '--apply', '--clients-closed', '--allow-full-access', success=False)
            self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)
        self.assert_untouched()

    def test_explicit_sync_and_byte_exact_rollback(self):
        self.run_helper('sync', '--apply', '--clients-closed')
        updated = (self.directory / 'config.toml').read_text()
        self.assertIn('sandbox_mode = "workspace-write"', updated)
        self.assertIn('# keep comment', updated)
        self.assertIn('[features]\nexample = true', updated)
        self.assertEqual((self.directory / 'config.toml').stat().st_mode & 0o777, 0o600)
        self.run_helper('rollback', '--apply', '--clients-closed', '--allow-full-access')
        self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)
        self.assert_untouched()

    def test_full_access_requires_separate_explicit_flag(self):
        self.auth('micah@createsomething.io')
        self.write('config.toml', b'sandbox_mode = "workspace-write"\n')
        self.run_helper('sync', '--apply', '--clients-closed', success=False)
        self.run_helper('sync', '--apply', '--clients-closed', '--allow-full-access')
        self.assertIn('danger-full-access', (self.directory / 'config.toml').read_text())
        self.assert_untouched()

    def test_rollback_refuses_later_edits(self):
        self.run_helper('sync', '--apply', '--clients-closed')
        updated = (self.directory / 'config.toml').read_bytes() + b'# later edit\n'
        self.write('config.toml', updated)
        self.run_helper('rollback', '--apply', '--clients-closed', success=False)
        self.assertEqual((self.directory / 'config.toml').read_bytes(), updated)

    def test_profiles_and_quoted_duplicate_keys_fail_without_writes(self):
        for raw in [b'default_permissions = ":workspace"\n', b'[permissions.custom]\nextends = ":workspace"\n', b'"sandbox_mode" = "read-only"\n']:
            self.write('config.toml', raw)
            self.run_helper('sync', '--apply', '--clients-closed', success=False)
            self.assertEqual((self.directory / 'config.toml').read_bytes(), raw)

    def test_mutation_requires_clients_closed(self):
        self.run_helper('sync', '--apply', success=False)
        self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)

    def test_symlink_and_public_auth_rejected(self):
        auth = self.directory / 'auth.json'
        auth.chmod(0o644)
        self.run_helper('sync', success=False)
        auth.chmod(0o600)
        auth.rename(self.directory / 'saved.json')
        auth.symlink_to(self.directory / 'saved.json')
        self.run_helper('sync', success=False)
        self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)

    def test_installer_is_opt_in_and_preserves_existing_target(self):
        installer = SCRIPT.with_name('install-codex-account.sh')
        target_directory = self.directory / 'bin'
        first = subprocess.run(['bash', str(installer), str(target_directory)], capture_output=True)
        self.assertEqual(first.returncode, 0)
        target = target_directory / 'codex-account'
        self.assertEqual(target.resolve(), SCRIPT)
        second = subprocess.run(['bash', str(installer), str(target_directory)], capture_output=True)
        self.assertEqual(second.returncode, 0)
        target.unlink()
        target.write_text('existing helper')
        refused = subprocess.run(['bash', str(installer), str(target_directory)], capture_output=True)
        self.assertNotEqual(refused.returncode, 0)
        self.assertEqual(target.read_text(), 'existing helper')

    def test_second_sync_is_noop_and_keeps_original_rollback(self):
        self.run_helper('sync', '--apply', '--clients-closed')
        receipt = (self.directory / 'codex-account-rollback.json').read_bytes()
        self.run_helper('sync', '--apply', '--clients-closed')
        self.assertEqual((self.directory / 'codex-account-rollback.json').read_bytes(), receipt)

    def test_rollback_recovers_interrupted_apply_before_config_replace(self):
        self.run_helper('sync', '--apply', '--clients-closed')
        # Durable state if killed after receipt replacement but before config replacement.
        self.write('config.toml', self.config)
        self.run_helper('rollback', '--apply', '--clients-closed')
        self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)
        self.assertFalse((self.directory / 'codex-account-rollback.json').exists())
        self.run_helper('sync', '--apply', '--clients-closed')
        self.assert_untouched()

    def test_receipt_is_durable_before_config_and_rollback_removal(self):
        spec = importlib.util.spec_from_file_location('account_helper', SCRIPT)
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        events = []
        real_fsync, real_replace, real_unlink = os.fsync, os.replace, Path.unlink
        def fsync(fd):
            events.append(('fsync', 'directory' if stat.S_ISDIR(os.fstat(fd).st_mode) else 'file'))
            return real_fsync(fd)
        def replace(source, target):
            events.append(('replace', Path(target).name))
            return real_replace(source, target)
        def unlink(path, *args, **kwargs):
            events.append(('unlink', path.name))
            return real_unlink(path, *args, **kwargs)
        args = argparse.Namespace(directory=str(self.directory), command='sync', apply=True,
                                  clients_closed=True, allow_full_access=False)
        with mock.patch.object(helper.os, 'fsync', fsync), mock.patch.object(helper.os, 'replace', replace), mock.patch.object(Path, 'unlink', unlink):
            helper.run(args)
            self.assertEqual(events, [
                ('fsync', 'file'), ('replace', 'codex-account-rollback.json'), ('fsync', 'directory'),
                ('fsync', 'file'), ('replace', 'config.toml'), ('fsync', 'directory')])
            events.clear()
            args.command = 'rollback'
            args.allow_full_access = True
            helper.run(args)
            self.assertEqual(events, [
                ('fsync', 'file'), ('replace', 'config.toml'), ('fsync', 'directory'),
                ('unlink', 'codex-account-rollback.json'), ('fsync', 'directory')])

    def test_status_rejects_profile_based_permissions(self):
        for raw in [b'default_permissions = ":workspace"\n', b'profile = "managed"\n', b'[profiles.managed]\nsandbox_mode = "workspace-write"\n', b'[permissions.custom]\nextends = ":workspace"\n']:
            self.write('config.toml', raw)
            self.run_helper('status', success=False)
            self.assertEqual((self.directory / 'config.toml').read_bytes(), raw)

    def test_rollback_to_full_access_requires_explicit_opt_in(self):
        self.run_helper('sync', '--apply', '--clients-closed')
        aligned = (self.directory / 'config.toml').read_bytes()
        self.run_helper('rollback', '--apply', '--clients-closed', success=False)
        self.assertEqual((self.directory / 'config.toml').read_bytes(), aligned)
        self.run_helper('rollback', '--apply', '--clients-closed', '--allow-full-access')
        self.assertEqual((self.directory / 'config.toml').read_bytes(), self.config)

if __name__ == '__main__':
    unittest.main()
