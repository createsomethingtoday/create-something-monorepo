"""Verify config preservation without running the full installer or touching HOME."""
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
INSTALLER = ROOT / 'packages/dotfiles/scripts/install-zellij-config.sh'
SOURCE = ROOT / 'packages/dotfiles/zellij/config.kdl'


class ZellijInstallTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='zellij config ')
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.target = self.directory / 'config.kdl'

    def install(self):
        return subprocess.run(['bash', str(INSTALLER), str(self.directory)], capture_output=True, text=True)

    def assert_installed(self):
        self.assertTrue(self.target.is_symlink())
        self.assertEqual(self.target.readlink(), SOURCE)

    def test_new_config_and_repeat_are_idempotent(self):
        self.assertEqual(self.install().returncode, 0)
        self.assertEqual(self.install().returncode, 0)
        self.assert_installed()
        self.assertEqual(list(self.directory.glob('config.kdl.backup.*')), [])

    def test_preserves_user_file_and_prior_backup(self):
        self.target.write_text('user settings')
        older = self.directory / 'config.kdl.backup'
        older.write_text('older settings')
        self.assertEqual(self.install().returncode, 0)
        self.assert_installed()
        backups = list(self.directory.glob('config.kdl.backup.*/config.kdl'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_text(), 'user settings')
        self.assertEqual(older.read_text(), 'older settings')
        self.assertEqual(self.install().returncode, 0)
        self.assertEqual(len(list(self.directory.glob('config.kdl.backup.*'))), 1)

    def test_preserves_other_symlink_and_its_target(self):
        other = self.directory / 'personal.kdl'
        other.write_text('personal settings')
        self.target.symlink_to(other)
        self.assertEqual(self.install().returncode, 0)
        self.assert_installed()
        backup = next(self.directory.glob('config.kdl.backup.*/config.kdl'))
        self.assertTrue(backup.is_symlink())
        self.assertEqual(backup.readlink(), other)
        self.assertEqual(other.read_text(), 'personal settings')

    def test_preserves_dangling_symlink(self):
        self.target.symlink_to('missing-personal.kdl')
        self.assertEqual(self.install().returncode, 0)
        backup = next(self.directory.glob('config.kdl.backup.*/config.kdl'))
        self.assertTrue(backup.is_symlink())
        self.assertEqual(str(backup.readlink()), 'missing-personal.kdl')
        self.assert_installed()

    def test_refuses_to_replace_directory(self):
        self.target.mkdir()
        (self.target / 'keep').write_text('preserve')
        self.assertNotEqual(self.install().returncode, 0)
        self.assertEqual((self.target / 'keep').read_text(), 'preserve')
        self.assertFalse(self.target.is_symlink())


if __name__ == '__main__':
    unittest.main()
