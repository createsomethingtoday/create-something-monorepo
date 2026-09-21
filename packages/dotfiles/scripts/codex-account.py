#!/usr/bin/env python3
"""Explicit local policy alignment; never changes login, tasks, or managed policy."""
import argparse
import base64
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import tomllib

ACCOUNTS = {"micah@webflow.com": "wf", "micah@createsomething.io": "cs"}
POLICIES = {
    "wf": {"approval_policy": "on-request", "sandbox_mode": "workspace-write"},
    "cs": {"approval_policy": "never", "sandbox_mode": "danger-full-access"},
}


def read_private(path):
    flags = os.O_RDONLY | os.O_NOFOLLOW
    with os.fdopen(os.open(path, flags), "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_nlink != 1:
            raise ValueError("Expected an owned regular file with one link")
        if info.st_mode & 0o077:
            raise ValueError("Account/config files must be private (mode 600)")
        return stream.read()


def account_for(auth):
    # JWT payload is only a local routing hint, never proof of managed authorization.
    payload = json.loads(auth)["tokens"]["id_token"].split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    if claims.get("email_verified") is False:
        raise ValueError("Unverified email")
    account = ACCOUNTS.get(claims.get("email"))
    if account is None:
        raise ValueError("Account is not explicitly allowlisted; no changes made")
    return account


def render_policy(raw, account):
    text = raw.decode()
    config = tomllib.loads(text)
    if any(key in config for key in ("default_permissions", "permissions", "profile", "profiles")):
        raise ValueError("Profile configuration requires manual review; no legacy policy injected")
    desired = POLICIES[account]
    lines = text.splitlines(keepends=True)
    end = next((i for i, line in enumerate(lines) if line.lstrip().startswith("[")), len(lines))
    top = "".join(line for line in lines[:end]
                  if not re.match(r'^\s*(approval_policy|sandbox_mode)\s*=', line))
    result = "".join(f'{key} = "{value}"\n' for key, value in desired.items()) + top + "".join(lines[end:])
    updated = tomllib.loads(result)
    for key, value in config.items():
        if key not in desired and updated.get(key) != value:
            raise ValueError("Unrelated configuration would change")
    if any(updated.get(key) != value for key, value in desired.items()):
        raise ValueError("Unsupported policy syntax; review config manually")
    return result.encode()


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def write_private(path, raw):
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".codex-account-")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def run(args):
    directory = Path(args.directory).expanduser()
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError("Expected an existing non-symlink Codex directory")
    config_path = directory / "config.toml"
    receipt_path = directory / "codex-account-rollback.json"
    # Cooperative lock for this helper only. Other clients must be closed for mutation.
    if args.apply and not args.clients_closed:
        raise ValueError("Close Codex clients first, then supply --clients-closed")
    lock_context = contextlib.nullcontext(None)
    if args.apply:
        lock_fd = os.open(directory / ".codex-account.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        lock_context = os.fdopen(lock_fd, "r+")
    with lock_context as lock:
        if lock is not None:
            fcntl.flock(lock, fcntl.LOCK_EX)
        raw = read_private(config_path)
        if args.command == "rollback":
            receipt = json.loads(read_private(receipt_path))
            if digest(raw) != receipt["after_sha256"]:
                raise ValueError("Config changed since sync; refusing to overwrite later edits")
            restored = base64.b64decode(receipt["before"], validate=True)
            tomllib.loads(restored.decode())
            if args.apply:
                write_private(config_path, restored)
                receipt_path.unlink()
            print("Rolled back config" if args.apply else "Rollback available; pass --apply --clients-closed")
            return
        auth = read_private(directory / "auth.json")
        account = account_for(auth)
        print(f"Allowlisted account: {account}")
        if args.command == "status":
            print("Local policy: " + json.dumps({key: tomllib.loads(raw.decode()).get(key) for key in POLICIES[account]}))
            return
        target = render_policy(raw, account)
        print("Proposed policy: " + json.dumps(POLICIES[account]))
        if not args.apply:
            print("Preview only; pass --apply --clients-closed to align future sessions")
            return
        if account == "cs" and not args.allow_full_access:
            raise ValueError("Personal policy requires explicit --allow-full-access")
        if tomllib.loads(raw.decode()) == tomllib.loads(target.decode()):
            print("Already aligned; no changes")
            return
        if receipt_path.exists() or receipt_path.is_symlink():
            raise ValueError("Existing rollback receipt; review or roll back before another change")
        if read_private(directory / "auth.json") != auth or read_private(config_path) != raw:
            raise ValueError("Account or config changed during review")
        receipt = json.dumps({"before": base64.b64encode(raw).decode(), "after_sha256": digest(target)}).encode()
        write_private(receipt_path, receipt)
        write_private(config_path, target)
        print("Local config aligned; existing tasks and managed requirements unchanged")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["status", "sync", "rollback"])
    parser.add_argument("--directory", default=os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--clients-closed", action="store_true")
    parser.add_argument("--allow-full-access", action="store_true")
    args = parser.parse_args()
    try:
        run(args)
    except (ValueError, OSError, KeyError, IndexError, TypeError) as error:
        # Do not expose token payloads, full configs, or exception text from JSON parsers.
        print("Account helper refused the operation: " + (str(error) if isinstance(error, ValueError) and not isinstance(error, (json.JSONDecodeError, tomllib.TOMLDecodeError)) else type(error).__name__))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
