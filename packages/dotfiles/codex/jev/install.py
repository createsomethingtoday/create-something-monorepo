#!/usr/bin/env python3
"""Install a checksum-pinned upstream MCP and only its Codex skill/config."""

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import shutil
import sys
import tarfile
import tempfile
import tomllib
import urllib.request

VERSION = "v0.4.3"
SHA256 = {
    "darwin-arm64": "9e1c25f88939f9e762f9e25baadc3e4dfa6232cd848c59246c01b1bb84ca668c",
    "darwin-amd64": "1f20e6e7ced9015691a1bdf9d858423283e53ce8e7bbe2e2007ea233db942ea4",
    "linux-arm64": "eaf87a9936a712ecb64bad5a3630ea5a3a4a5712e010b49b0c7f0e090082620a",
    "linux-amd64": "a8ea8ec53d57c384bb5d0973896bda8494bf4a57b273ed06d5ac33600e6ab73a",
}
SOURCE = Path(__file__).resolve().parent


def checked_binary(archive, digest):
    if hashlib.sha256(archive).hexdigest() != digest:
        raise ValueError("Upstream release checksum mismatch")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
        member = bundle.getmember("evaluate")
        if not member.isfile():
            raise ValueError("Release evaluate entry is not a regular file")
        return bundle.extractfile(member).read()


def atomic_write(path, content, mode=0o600):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(content)
    try:
        temporary.chmod(mode)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def registration(old, python, launcher):
    expected = {"command": python, "args": [str(launcher)], "enabled_tools": ["evaluate"],
                "startup_timeout_sec": 20, "tool_timeout_sec": 5, "required": False}
    parsed = tomllib.loads(old)
    servers = parsed.get("mcp_servers", {})
    if "jev" in servers:
        if servers["jev"] != expected:
            raise ValueError("Existing mcp_servers.jev differs; inspect it before changing configuration")
        return old
    for name, server in servers.items():
        identity = " ".join([name, str(server.get("command", "")), str(server.get("args", ""))]).lower()
        if "typesafe" in identity or "evaluate" in identity:
            raise ValueError("An existing Jev/evaluate MCP may already be configured; inspect it first")
    block = "\n\n# CREATE SOMETHING advisory Jev MCP (CRE-2058)\n[mcp_servers.jev]\n"
    for key, value in expected.items():
        block += key + " = " + json.dumps(value) + "\n"
    tomllib.loads(old + block)
    return old + block


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex-home", type=Path, default=Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")))
    parser.add_argument("--runtime-dir", type=Path, default=Path.home() / ".local/share/create-something/jev")
    parser.add_argument("--archive", type=Path, help="Use a previously downloaded archive; checksum is still mandatory")
    args = parser.parse_args()
    target = args.runtime_dir.expanduser().resolve()
    codex_home = args.codex_home.expanduser().resolve()
    config_path = codex_home / "config.toml"
    old = config_path.read_text() if config_path.exists() else ""
    infisical = shutil.which("infisical")
    if not infisical:
        raise ValueError("Infisical must be installed and authenticated before installation")
    new = registration(old, sys.executable, target / "launch.py")
    backup = codex_home / "config.toml.before-jev"
    if new != old and config_path.exists() and backup.exists():
        raise ValueError("Rollback backup already exists; inspect before retrying registration")
    skill_source = SOURCE.parent / "skills/jev-coding-assist"
    skill_target = codex_home / "skills/jev-coding-assist"
    if skill_target.is_symlink() or (skill_target.exists() and not (skill_target / ".managed-jev").exists()):
        raise ValueError("Existing jev-coding-assist skill is unmanaged; preserve and inspect it first")
    arch = {"aarch64": "arm64", "x86_64": "amd64"}.get(platform.machine(), platform.machine())
    release_platform = platform.system().lower() + "-" + arch
    if release_platform not in SHA256:
        raise ValueError("Unsupported release platform: " + release_platform)
    if args.archive:
        archive = args.archive.read_bytes()
    else:
        url = f"https://github.com/itsmostafa/typesafe-mcp/releases/download/{VERSION}/evaluate-{release_platform}.tar.gz"
        with urllib.request.urlopen(url, timeout=30) as response:
            archive = response.read()
    binary = checked_binary(archive, SHA256[release_platform])
    binary_path = target / VERSION / "evaluate"
    atomic_write(binary_path, binary, 0o700)
    atomic_write(target / "launch.py", (SOURCE / "launch.py").read_bytes(), 0o700)
    runtime = {"binary": str(binary_path), "infisical": infisical, "version": VERSION,
               "archive_sha256": SHA256[release_platform], "binary_sha256": hashlib.sha256(binary).hexdigest()}
    atomic_write(target / "runtime.json", (json.dumps(runtime, indent=2) + "\n").encode())
    for source in skill_source.rglob("*"):
        if source.is_file():
            atomic_write(skill_target / source.relative_to(skill_source), source.read_bytes(), 0o644)
    atomic_write(skill_target / ".managed-jev", b"Managed by packages/dotfiles/codex/jev/install.py\n")
    if new != old:
        # Keep a private exact rollback copy, including existing config permissions.
        if config_path.exists():
            atomic_write(backup, old.encode())
        # Refuse to overwrite another process's intervening config edit.
        if (config_path.read_text() if config_path.exists() else "") != old:
            raise ValueError("Codex config changed during installation; rerun after inspection")
        atomic_write(config_path, new.encode())
    print(json.dumps({"version": VERSION, "runtime": str(target), "skill": str(skill_target),
                      "config": str(config_path), "credentials_stored": False}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, tarfile.TarError) as error:
        sys.exit(str(error))
