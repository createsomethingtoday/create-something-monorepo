import base64
import json
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
        self.run_helper('rollback', '--apply', '--clients-closed')
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

if __name__ == '__main__':
    unittest.main()
