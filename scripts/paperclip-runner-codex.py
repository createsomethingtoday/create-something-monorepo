#!/opt/homebrew/bin/python3.14
"""Run Codex under papercliprunner and remove its staged remote home on exit.

This is the SSH environment's Codex command. It deliberately fails closed when
Paperclip does not supply a per-run CODEX_HOME under the runner workspace.
"""

import os
import re
import shutil
import signal
import stat
import subprocess
import sys
import time
from pathlib import Path


RUNNER_UID = 504
RUN_ROOT = Path("/Users/papercliprunner/Code/create-something-monorepo/.paperclip-runtime/runs")
NODE_BIN = Path("/Users/papercliprunner/.local/bin/node")
CODEX_JS = Path("/Users/papercliprunner/.local/lib/node_modules/@openai/codex/bin/codex.js")
RUN_ID = re.compile(r"[A-Za-z0-9_-]+\Z")
DIRECTORY_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW


def parse_staged_home(value: str | None, root: Path = RUN_ROOT) -> str:
    if not value:
        raise ValueError("CODEX_HOME must be a staged per-run runner path")
    try:
        parts = Path(value).relative_to(root).parts
    except ValueError as error:
        raise ValueError("CODEX_HOME is outside the runner run root") from error
    if (
        len(parts) != 5
        or not RUN_ID.fullmatch(parts[0])
        or parts[1:] != ("workspace", ".paperclip-runtime", "codex", "home")
        or value != str(root.joinpath(*parts))
    ):
        raise ValueError("CODEX_HOME does not name one exact staged run home")
    return parts[0]


def open_owned_directory_chain(root: Path, run_id: str) -> int:
    """Return an fd for the Codex parent, rejecting every symlink component."""
    parts = (*root.parts[1:], run_id, "workspace", ".paperclip-runtime", "codex")
    fd = os.open("/", DIRECTORY_FLAGS)
    try:
        for index, component in enumerate(parts):
            next_fd = os.open(component, DIRECTORY_FLAGS, dir_fd=fd)
            os.close(fd)
            fd = next_fd
            info = os.fstat(fd)
            if not stat.S_ISDIR(info.st_mode):
                raise RuntimeError("Staged Codex path component is not a directory")
            # Root-owned /Users is allowed. Everything from papercliprunner
            # downward must be runner-owned and inaccessible for group writes.
            if index >= 1:
                if info.st_uid != RUNNER_UID or info.st_mode & 0o022:
                    raise RuntimeError("Staged Codex path owner or mode changed")
        return fd
    except BaseException:
        os.close(fd)
        raise


def remove_staged_home(run_id: str, root: Path = RUN_ROOT) -> None:
    if not shutil.rmtree.avoids_symlink_attacks:
        raise RuntimeError("Safe directory removal is unavailable")
    parent_fd = open_owned_directory_chain(root, run_id)
    try:
        try:
            shutil.rmtree("home", dir_fd=parent_fd)
        except FileNotFoundError:
            pass
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)


def run(argv: list[str], *, root: Path = RUN_ROOT, node: Path = NODE_BIN, codex_js: Path = CODEX_JS) -> int:
    run_id = parse_staged_home(os.environ.get("CODEX_HOME"), root)
    child: subprocess.Popen | None = None
    received_signal: int | None = None
    signal_at: float | None = None

    def forward(signum, _frame):
        nonlocal received_signal, signal_at
        received_signal = signum
        signal_at = time.monotonic()
        if child is not None and child.poll() is None:
            try:
                os.killpg(child.pid, signum)
            except ProcessLookupError:
                pass

    previous = {sig: signal.signal(sig, forward) for sig in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM)}
    result = 74
    try:
        child = subprocess.Popen([str(node), str(codex_js), *argv], start_new_session=True)
        if received_signal is not None:
            forward(received_signal, None)
        while True:
            try:
                child.wait(timeout=0.25)
                break
            except subprocess.TimeoutExpired:
                if signal_at is not None and time.monotonic() - signal_at >= 5:
                    try:
                        os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
        result = (128 + received_signal) if received_signal is not None else (
            128 - child.returncode if child.returncode < 0 else child.returncode
        )
    finally:
        for sig, handler in previous.items():
            signal.signal(sig, handler)
        remove_staged_home(run_id, root)
    return result


if __name__ == "__main__":
    try:
        raise SystemExit(run(sys.argv[1:]))
    except (OSError, RuntimeError, ValueError) as error:
        print(f"Codex runner stopped: {error}", file=sys.stderr)
        raise SystemExit(74)
