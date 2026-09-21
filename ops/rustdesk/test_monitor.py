"""Exercise the installed monitor's shell flow without network or real credentials."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("check-and-pull.sh")


class MonitorTest(unittest.TestCase):
    def run_monitor(self, failure):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            base = home / "Library/Application Support/CREATE SOMETHING/RustDesk Operations"
            base.mkdir(parents=True)
            (base / "status.txt").write_text("PASS: previous run\n")
            mocks = home / "mock-commands.sh"
            mocks.write_text("""
# Bound output even when running the historical self-copying ERR trap.
ulimit -f 128
nc() { return 0; }
ssh() {
  if [[ "$MONITOR_TEST_FAILURE" == ssh ]]; then
    printf 'Permission denied (publickey).\\n' >&2
    return 255
  fi
  printf 'active\\n'
}
rsync() {
  if [[ "$MONITOR_TEST_FAILURE" == rsync ]]; then
    printf 'copy failed\\n' >&2
    return 23
  fi
  printf 'mock encrypted archive' > "$BASE/backups/rustdesk-test.tar.age"
}
""")
            result = subprocess.run(
                ["/bin/bash", str(SCRIPT)],
                env={**os.environ, "HOME": directory, "BASH_ENV": str(mocks),
                     "MONITOR_TEST_FAILURE": failure},
                capture_output=True, text=True, timeout=10,
            )
            temporary = base / "status.tmp"
            return (
                result,
                (base / "status.txt").read_text(),
                temporary.read_text() if temporary.exists() else None,
                (base / "backups/rustdesk-test.tar.age").exists(),
            )

    def test_ssh_failure_is_bounded_and_replaces_previous_success(self):
        result, status, diagnostic, copied = self.run_monitor("ssh")
        self.assertEqual(result.returncode, 255)
        self.assertTrue(status.startswith("FAILED "))
        self.assertIn("status.tmp", status)
        self.assertLess(len(diagnostic), 1024)
        self.assertEqual(diagnostic.count("Permission denied"), 1)
        self.assertFalse(copied)

    def test_copy_failure_is_bounded_and_never_reports_success(self):
        result, status, diagnostic, copied = self.run_monitor("rsync")
        self.assertEqual(result.returncode, 23)
        self.assertTrue(status.startswith("FAILED "))
        self.assertLess(len(diagnostic), 1024)
        self.assertEqual(diagnostic.count("copy failed"), 1)
        self.assertFalse(copied)

    def test_success_publishes_receipt_after_copy(self):
        result, status, diagnostic, copied = self.run_monitor("")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("PASS: ports, containers, backup freshness, off-host copy", status)
        self.assertIsNone(diagnostic)
        self.assertTrue(copied)
        self.assertEqual(result.stdout, status)


if __name__ == "__main__":
    unittest.main()
