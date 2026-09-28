"""Check staged Codex-home containment and cleanup without provider access."""

import importlib.util
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch


SOURCE = Path(__file__).with_name("paperclip-runner-codex.py")
SPEC = importlib.util.spec_from_file_location("paperclip_runner_codex", SOURCE)
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class RunnerCodexTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir=str(Path.home()))
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "runs"
        self.run_id = "test-run_1"
        self.home = self.root / self.run_id / "workspace/.paperclip-runtime/codex/home"
        self.home.mkdir(parents=True)
        self.uid_patch = patch.object(runner, "RUNNER_UID", os.getuid())
        self.uid_patch.start()
        self.addCleanup(self.uid_patch.stop)

    def test_missing_traversal_and_empty_run_are_rejected(self):
        for value in (None, "", str(self.root / "workspace/.paperclip-runtime/codex/home"),
                      str(self.root / "../outside/workspace/.paperclip-runtime/codex/home"),
                      str(self.root) + "//test-run_1/workspace/.paperclip-runtime/codex/home"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                runner.parse_staged_home(value, self.root)

    def test_exact_home_removed_but_symlink_component_rejected(self):
        (self.home / "auth.json").write_text("test-only")
        self.assertEqual(runner.parse_staged_home(str(self.home), self.root), self.run_id)
        runner.remove_staged_home(self.run_id, self.root)
        self.assertFalse(self.home.exists())

        outside = Path(self.temporary.name) / "outside"
        outside.mkdir()
        (outside / "home").mkdir()
        marker = outside / "home" / "must-stay"
        marker.write_text("test-only")
        workspace = self.root / self.run_id / "workspace"
        shutil.rmtree(workspace)
        workspace.symlink_to(outside, target_is_directory=True)
        with self.assertRaises(OSError):
            runner.remove_staged_home(self.run_id, self.root)
        self.assertTrue(marker.exists())

    def test_normal_and_nonzero_exit_remove_home(self):
        fake = Path(self.temporary.name) / "fake-codex.py"
        fake.write_text("import sys; sys.exit(int(sys.argv[1]))\n")
        for status in (0, 7):
            with self.subTest(status=status):
                self.home.mkdir(parents=True, exist_ok=True)
                (self.home / "auth.json").write_text("test-only")
                with patch.dict(os.environ, {"CODEX_HOME": str(self.home)}):
                    result = runner.run([str(status)], root=self.root,
                                        node=Path(sys.executable), codex_js=fake)
                self.assertEqual(result, status)
                self.assertFalse(self.home.exists())

    def test_signal_paths_remove_home_and_stop_child(self):
        fake = Path(self.temporary.name) / "sleep-codex.py"
        pid_file = Path(self.temporary.name) / "child.pid"
        fake.write_text("import os,time; open(" + repr(str(pid_file)) + ", 'w').write(str(os.getpid())); time.sleep(60)\n")
        module_path = repr(str(SOURCE))
        for signum in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
            with self.subTest(signum=signum):
                self.home.mkdir(parents=True, exist_ok=True)
                (self.home / "auth.json").write_text("test-only")
                pid_file.unlink(missing_ok=True)
                code = (
                    "import importlib.util,os,sys; from pathlib import Path; "
                    f"s=importlib.util.spec_from_file_location('r',{module_path}); "
                    "m=importlib.util.module_from_spec(s);s.loader.exec_module(m); "
                    "m.RUNNER_UID=os.getuid(); "
                    f"sys.exit(m.run([],root=Path({repr(str(self.root))}),"
                    f"node=Path(sys.executable),codex_js=Path({repr(str(fake))})))"
                )
                env = {**os.environ, "CODEX_HOME": str(self.home)}
                process = subprocess.Popen([sys.executable, "-c", code], env=env,
                                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
                try:
                    deadline = time.monotonic() + 5
                    while not pid_file.exists() and time.monotonic() < deadline:
                        time.sleep(0.02)
                    self.assertTrue(pid_file.exists())
                    child_pid = int(pid_file.read_text())
                    process.send_signal(signum)
                    _, stderr = process.communicate(timeout=10)
                    self.assertEqual(process.returncode, 128 + signum, stderr.decode())
                    self.assertFalse(self.home.exists())
                    with self.assertRaises(ProcessLookupError):
                        os.kill(child_pid, 0)
                finally:
                    if process.poll() is None:
                        process.kill()
                        process.wait()


if __name__ == "__main__":
    unittest.main()
