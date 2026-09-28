#!/usr/bin/env python3
"""Run one host-owned Ego task under an exclusive, issue-bound lease.

The task script must create and finish its named TaskSpace. This wrapper never
grants Ego to a Paperclip agent; it runs only as the Mac's named host operator.
"""

import argparse
import fcntl
import hashlib
import json
import os
import pwd
import re
import stat
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID


HOST_USER = "micahjohnson"
COMPANY_ID = "1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5"
PAPERCLIP_URL = "http://127.0.0.1:3101"
EGO_CLI = Path("/Users/micahjohnson/.local/bin/ego-browser")
LEASE_DIR = Path("/Users/micahjohnson/Library/Application Support/CREATE SOMETHING/Paperclip Ego Operator")


def require_host_user() -> int:
    host_uid = pwd.getpwnam(HOST_USER).pw_uid
    if os.getuid() != host_uid or Path.home() != Path(f"/Users/{HOST_USER}"):
        raise RuntimeError("Ego operator requires the named host macOS account")
    return host_uid


def read_issue(issue_id: str) -> dict:
    issue_id = str(UUID(issue_id))
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(f"{PAPERCLIP_URL}/api/issues/{issue_id}", timeout=5) as response:
        issue = json.load(response)
    if (
        issue.get("id") != issue_id
        or issue.get("companyId") != COMPANY_ID
        or issue.get("assigneeUserId") != "local-board"
        or issue.get("assigneeAgentId") is not None
        or issue.get("status") != "in_progress"
        or "Ego" not in issue.get("title", "")
    ):
        raise RuntimeError("Paperclip issue is not an active host-owned Ego task")
    return issue


def require_host_script(path: Path, host_uid: int) -> bytes:
    resolved = path.resolve(strict=True)
    if not resolved.is_relative_to(Path(f"/Users/{HOST_USER}")):
        raise RuntimeError("Task script must be in the host account")
    info = resolved.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != host_uid or info.st_mode & 0o022:
        raise RuntimeError("Task script must be a host-owned, non-writable regular file")
    return resolved.read_bytes()


def task_space_present(name: str) -> bool:
    probe = (
        "const spaces = await listTaskSpaces(); "
        "console.log(JSON.stringify(spaces.map(space => space.name)));"
    )
    result = subprocess.run(
        [str(EGO_CLI), "nodejs", "-e", probe],
        check=True,
        capture_output=True,
        text=True,
        timeout=20,
    )
    for line in reversed((result.stdout + "\n" + result.stderr).splitlines()):
        try:
            names = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(names, list) and all(isinstance(item, str) for item in names):
            return name in names
    raise RuntimeError("Ego TaskSpace probe returned no valid list")


def make_private_dir(host_uid: int) -> None:
    LEASE_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    info = LEASE_DIR.stat()
    if info.st_uid != host_uid or stat.S_IMODE(info.st_mode) != 0o700:
        raise RuntimeError("Ego lease directory must be owned by the host and mode 0700")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--issue-id", required=True)
    parser.add_argument("--space-name", required=True)
    parser.add_argument("--task-script", required=True, type=Path)
    args = parser.parse_args()

    host_uid = require_host_user()
    script = require_host_script(args.task_script, host_uid)
    make_private_dir(host_uid)
    lock_path = LEASE_DIR / "operator.lock"
    lock_fd = os.open(lock_path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    try:
        lock_info = os.fstat(lock_fd)
        if not stat.S_ISREG(lock_info.st_mode) or lock_info.st_uid != host_uid or stat.S_IMODE(lock_info.st_mode) != 0o600:
            raise RuntimeError("Ego lease lock must be host-owned and mode 0600")
        try:
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError("Another Ego operator task holds the lease") from error

        state_path = LEASE_DIR / "active.json"
        if state_path.exists():
            raise RuntimeError("Previous Ego lease requires manual TaskSpace reconciliation")
        issue = read_issue(args.issue_id)
        if task_space_present(args.space_name):
            raise RuntimeError("Named TaskSpace already exists; reconcile before running")

        receipt = {
            "issue": issue["identifier"],
            "issueId": issue["id"],
            "spaceName": args.space_name,
            "scriptSha256": hashlib.sha256(script).hexdigest(),
            "hostUid": host_uid,
            "pid": os.getpid(),
            "startedAt": datetime.now(timezone.utc).isoformat(),
        }
        state_fd = os.open(state_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(state_fd, "w") as file:
            json.dump(receipt, file)
            file.flush()
            os.fsync(file.fileno())

        result = subprocess.run(
            [str(EGO_CLI), "nodejs"], input=script, capture_output=True, timeout=180, check=False
        )
        output = (result.stdout + b"\n" + result.stderr).decode("utf-8", errors="replace")
        created = re.findall(r"^OPERATOR_TASKSPACE_CREATED=(\d+)$", output, re.MULTILINE)
        finished = re.findall(r"^OPERATOR_TASKSPACE_FINISHED=(\d+)$", output, re.MULTILINE)
        absent = not task_space_present(args.space_name)
        lifecycle = len(created) == len(finished) == 1 and created[0] == finished[0]
        receipt.update({
            "exitCode": result.returncode,
            "taskSpaceId": created[0] if lifecycle else None,
            "spaceAbsentAfterRun": absent,
            "lifecycleMarkersMatch": lifecycle,
        })
        if result.returncode == 0 and absent and lifecycle:
            state_path.unlink()
            print(json.dumps(receipt))
            return 0
        raise RuntimeError("Ego task failed or left a TaskSpace; lease state retained for reconciliation")
    finally:
        os.close(lock_fd)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Ego operator stopped: {error}", file=sys.stderr)
        sys.exit(1)
