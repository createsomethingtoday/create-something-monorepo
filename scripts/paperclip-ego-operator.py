#!/usr/bin/env python3
"""Run one host-owned Ego task under an exclusive, issue-bound lease.

The wrapper creates and finishes the TaskSpace. The approved task script uses
its bound `task` variable. This never grants Ego to a Paperclip agent.
"""

import argparse
import fcntl
import hashlib
import json
import os
import pwd
import signal
import stat
import subprocess
import sys
import tempfile
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID


HOST_USER = "micahjohnson"
COMPANY_ID = "1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5"
PAPERCLIP_URL = "http://127.0.0.1:3101"
EGO_CLI = Path("/Users/micahjohnson/.local/bin/ego-browser")
EGO_CLI_SHA256 = "4c944d83e8461b06406c30aa2e392891c5b04505def3ef7c0f6cdcee818e3645"
LEASE_DIR = Path("/Users/micahjohnson/Library/Application Support/CREATE SOMETHING/Paperclip Ego Operator")
APPROVAL_FILE = LEASE_DIR / "approved-task.json"


def require_host_user() -> int:
    host_uid = pwd.getpwnam(HOST_USER).pw_uid
    if os.getuid() != host_uid or Path.home() != Path(f"/Users/{HOST_USER}"):
        raise RuntimeError("Ego operator requires the named host macOS account")
    return host_uid


def operator_env() -> dict[str, str]:
    """Keep ambient shell secrets out of Ego's child process."""
    return {
        "HOME": f"/Users/{HOST_USER}",
        "USER": HOST_USER,
        "LOGNAME": HOST_USER,
        "PATH": "/usr/bin:/bin",
        "LANG": "en_US.UTF-8",
        "TMPDIR": tempfile.gettempdir().rstrip("/") + "/",
    }


def require_ego_executable() -> None:
    """Pin the CLI bytes and deny paths writable by the restricted runner."""
    runner = pwd.getpwnam("papercliprunner")
    runner_groups = set(os.getgrouplist(runner.pw_name, runner.pw_gid))
    target = EGO_CLI.resolve(strict=True)
    paths = {EGO_CLI.parent, *EGO_CLI.parents, target, *target.parents}
    for path in paths:
        info = path.stat()
        runner_can_write = (
            info.st_uid == runner.pw_uid
            or bool(info.st_mode & stat.S_IWOTH)
            or (info.st_gid in runner_groups and bool(info.st_mode & stat.S_IWGRP))
        )
        if runner_can_write:
            raise RuntimeError(f"Ego executable path writable by restricted runner: {path}")
    if hashlib.sha256(target.read_bytes()).hexdigest() != EGO_CLI_SHA256:
        raise RuntimeError("Ego executable changed; review and update the pinned identity")


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
    ):
        raise RuntimeError("Paperclip issue is not an active host-owned Ego task")
    return issue


def read_task_approval(host_uid: int, issue_id: str, space_name: str, script: bytes) -> dict:
    """Require a private, one-shot task binding with a maximum 15-minute life."""
    fd = os.open(APPROVAL_FILE, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != host_uid or stat.S_IMODE(info.st_mode) != 0o600:
            raise RuntimeError("Ego task approval must be host-owned and mode 0600")
        with os.fdopen(fd, "r") as file:
            fd = -1
            approval = json.load(file)
    finally:
        if fd >= 0:
            os.close(fd)
    required = {"approvalId", "issueId", "spaceName", "scriptSha256", "egoCliSha256",
                "issuedAt", "expiresAt", "approvedBy"}
    if set(approval) != required:
        raise RuntimeError("Ego task approval has unexpected fields")
    try:
        approval_id = str(UUID(approval["approvalId"]))
        issued = datetime.fromisoformat(approval["issuedAt"])
        expires = datetime.fromisoformat(approval["expiresAt"])
    except (AttributeError, TypeError, ValueError) as error:
        raise RuntimeError("Ego task approval ID or timestamp is invalid") from error
    now = datetime.now(timezone.utc)
    if (approval_id != approval["approvalId"] or issued.tzinfo is None or expires.tzinfo is None
            or not issued <= now < expires or expires - issued > timedelta(minutes=15)):
        raise RuntimeError("Ego task approval is outside its one-shot 15-minute window")
    if (
        approval["issueId"] != issue_id
        or approval["spaceName"] != space_name
        or approval["scriptSha256"] != hashlib.sha256(script).hexdigest()
        or approval["egoCliSha256"] != EGO_CLI_SHA256
        or approval["approvedBy"] != "local-board"
    ):
        raise RuntimeError("Ego task approval does not match this run")
    return approval


def consume_task_approval(host_uid: int, approval: dict) -> None:
    """Link to a durable consumed ledger before removing the runnable approval."""
    consumed_dir = LEASE_DIR / "consumed-approvals"
    consumed_dir.mkdir(mode=0o700, exist_ok=True)
    info = consumed_dir.stat()
    if info.st_uid != host_uid or stat.S_IMODE(info.st_mode) != 0o700:
        raise RuntimeError("Ego consumed approvals directory must be host-owned and mode 0700")
    destination = consumed_dir / f"{approval['approvalId']}.json"
    if destination.exists():
        raise RuntimeError("Ego task approval was already consumed")
    os.link(APPROVAL_FILE, destination, follow_symlinks=False)
    APPROVAL_FILE.unlink()
    for directory in (consumed_dir, LEASE_DIR):
        fd = os.open(directory, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def require_host_script(path: Path, host_uid: int) -> bytes:
    resolved = path.resolve(strict=True)
    if not resolved.is_relative_to(Path(f"/Users/{HOST_USER}")):
        raise RuntimeError("Task script must be in the host account")
    info = resolved.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != host_uid or info.st_mode & 0o022:
        raise RuntimeError("Task script must be a host-owned, non-writable regular file")
    script = resolved.read_bytes()
    if b"taskSpace(" in script or b".finish(" in script:
        raise RuntimeError("Task script must use the wrapper-owned TaskSpace without creating or finishing it")
    return script


def run_ego(script: bytes, timeout: int = 30) -> str:
    """Run a controlled Ego command and reap its complete process group on timeout."""
    process = subprocess.Popen(
        [str(EGO_CLI), "nodejs"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, env=operator_env(), start_new_session=True,
    )
    try:
        stdout, stderr = process.communicate(script, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            pass
        # The direct Ego process can exit while a child remains in its group.
        # Reconcile the group while the operator lock is still held.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            process.communicate(timeout=5)
        except subprocess.TimeoutExpired as stuck:
            raise RuntimeError("Ego process group did not terminate after SIGKILL") from stuck
        raise RuntimeError("Ego command timed out; process group was terminated") from error
    output = (stdout + b"\n" + stderr).decode("utf-8", errors="replace")
    if process.returncode != 0:
        raise RuntimeError(f"Ego command exited {process.returncode}")
    return output


def tagged_json(output: str, marker: str):
    values = [line[len(marker):] for line in output.splitlines() if line.startswith(marker)]
    if len(values) != 1:
        raise RuntimeError(f"Ego {marker} receipt missing or ambiguous")
    return json.loads(values[0])


def list_task_spaces() -> dict[int, str]:
    script = b'const spaces = await listTaskSpaces(); console.log("PAPERCLIP_LIST=" + JSON.stringify(spaces.map(s => ({id:s.id,name:s.name}))));'
    rows = tagged_json(run_ego(script), "PAPERCLIP_LIST=")
    if not isinstance(rows, list) or any(not isinstance(row, dict) or not isinstance(row.get("id"), int) or not isinstance(row.get("name"), str) for row in rows):
        raise RuntimeError("Ego TaskSpace list has invalid shape")
    spaces = {row["id"]: row["name"] for row in rows}
    if len(spaces) != len(rows):
        raise RuntimeError("Ego TaskSpace list contains duplicate IDs")
    return spaces


def write_state(path: Path, receipt: dict) -> None:
    temporary = path.with_suffix(".next")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, "w") as file:
            json.dump(receipt, file, sort_keys=True)
            file.flush()
            os.fsync(file.fileno())
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    os.replace(temporary, path)


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
    require_ego_executable()
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
        approval = read_task_approval(host_uid, args.issue_id, args.space_name, script)
        issue = read_issue(args.issue_id)
        before = list_task_spaces()
        if args.space_name in before.values():
            raise RuntimeError("Named TaskSpace already exists; reconcile before running")

        receipt = {
            "issue": issue["identifier"], "issueId": issue["id"],
            "spaceName": args.space_name,
            "scriptSha256": hashlib.sha256(script).hexdigest(),
            "approvalId": approval["approvalId"],
            "hostUid": host_uid, "pid": os.getpid(),
            "startedAt": datetime.now(timezone.utc).isoformat(),
            "stage": "starting", "outcome": "unverified",
            "taskSpaceId": None,
        }
        state_fd = os.open(state_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(state_fd, "w") as file:
            json.dump(receipt, file, sort_keys=True)
            file.flush()
            os.fsync(file.fileno())

        try:
            consume_task_approval(host_uid, approval)
            receipt.update(stage="approved_once", approvalConsumedAt=datetime.now(timezone.utc).isoformat())
            write_state(state_path, receipt)
            create_script = (
                "const task = await taskSpace(" + json.dumps(args.space_name) + "); "
                "console.log(\"PAPERCLIP_CREATED=\" + JSON.stringify({id:task.spaceId,name:task.name}));"
            ).encode()
            created = tagged_json(run_ego(create_script), "PAPERCLIP_CREATED=")
            after_create = list_task_spaces()
            added = {key: value for key, value in after_create.items() if key not in before}
            if (not isinstance(created, dict) or not isinstance(created.get("id"), int)
                    or created.get("name") != args.space_name
                    or added != {created["id"]: args.space_name}
                    or any(after_create.get(key) != value for key, value in before.items())):
                raise RuntimeError("Created TaskSpace ID/name did not match observed list delta")
            space_id = created["id"]
            receipt.update(stage="created", taskSpaceId=space_id, observedAfterCreate=True)
            write_state(state_path, receipt)

            # The approved script operates on the wrapper-owned `task` variable.
            # It must leave the TaskSpace open so the wrapper performs the one finish.
            bound_script = f"const task = await taskSpace({space_id});\n".encode() + script
            run_ego(bound_script, timeout=180)
            after_work = list_task_spaces()
            if after_work != after_create:
                raise RuntimeError("TaskSpace inventory changed during approved work")
            receipt.update(stage="work_complete", observedAfterWork=True)
            write_state(state_path, receipt)

            finish_script = f"const task = await taskSpace({space_id}); await task.finish({{ keep: [] }}); console.log(\"PAPERCLIP_FINISHED={space_id}\");".encode()
            tagged_json_output = run_ego(finish_script)
            if f"PAPERCLIP_FINISHED={space_id}" not in tagged_json_output.splitlines():
                raise RuntimeError("Ego finish did not return its controlled marker")
            after_finish = list_task_spaces()
            if after_finish != before:
                raise RuntimeError("TaskSpace inventory did not return to pre-run state")
            final_issue = read_issue(args.issue_id)
            if final_issue.get("assigneeUserId") != issue.get("assigneeUserId"):
                raise RuntimeError("Paperclip task owner changed before finish")
            receipt.update(stage="finished", outcome="passed", observedAfterFinish=True,
                           finishedAt=datetime.now(timezone.utc).isoformat())
            write_state(state_path, receipt)
            state_path.unlink()
            print(json.dumps(receipt, sort_keys=True))
            return 0
        except BaseException as error:
            receipt.update(stage="reconciliation_required", failedStage=receipt["stage"],
                           outcome="failed", failureMessage=(str(error)[:160] if isinstance(error, RuntimeError)
                                                               else type(error).__name__),
                           failureType=type(error).__name__,
                           failedAt=datetime.now(timezone.utc).isoformat())
            try:
                receipt["observedSpacesAtFailure"] = list_task_spaces()
            except BaseException:
                receipt["observedSpacesAtFailure"] = "probe_failed"
            write_state(state_path, receipt)
            raise
    finally:
        os.close(lock_fd)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Ego operator stopped: {error}", file=sys.stderr)
        sys.exit(1)
