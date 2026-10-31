"""Disposable native process/journal smoke; never replaces an installed app."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

binary = Path(sys.argv[1]).resolve(strict=True)
output = Path(sys.argv[2]).resolve()
output.mkdir(parents=True, exist_ok=True)
profile = Path(tempfile.mkdtemp(prefix="native-owner-", dir=output))
document = {"version": "create-something.mapping-canvas.v1", "id": "canvas-synthetic",
            "title": "Synthetic current", "background": "#000000",
            "createdAt": "2026-10-08T00:00:00Z", "updatedAt": "2026-10-08T00:00:00Z",
            "viewport": {"x": 0, "y": 0, "zoom": 1}, "objects": []}
before = copy.deepcopy(document)
before["title"] = "Synthetic before"
journal = {"version": 1, "past": [{"actor": "native-mac", "before": before, "after": document}], "future": []}
seed = {"sessionId": "session-synthetic", "revision": 1, "document": document,
        "clients": {}, "applied": {}, "nativeHistory": journal, "documentEpoch": 0}
state = profile / "paired-session.json"
state.write_text(json.dumps(seed))
env = dict(os.environ, CREATE_SOMETHING_DRAW_HOME=str(profile),
           CREATE_SOMETHING_DRAW_ENABLE_LAN="0", CREATE_SOMETHING_DRAW_EPHEMERAL_WEBVIEW="1")

def launch(name):
    log = (profile / name).open("w")
    return subprocess.Popen([str(binary)], env=env, stdout=log, stderr=log), log

def stop(child):
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()

def preserved():
    current = json.loads(state.read_text())
    assert current["document"] == document and current["nativeHistory"] == journal
    assert current["sessionId"] == seed["sessionId"] and current["revision"] == 1

first, log = launch("first.log")
second = None
try:
    time.sleep(3)
    assert first.poll() is None
    preserved()
    original = state.read_bytes()
    second, second_log = launch("second.log")
    try:
        second.wait(timeout=10)
    finally:
        second_log.close()
    assert second.returncode != 0 and "already open in another native process" in (profile / "second.log").read_text()
    assert state.read_bytes() == original and first.poll() is None
    sockets = subprocess.run(["/usr/sbin/lsof", "-Pan", "-p", str(first.pid), "-i"], capture_output=True, text=True)
    assert sockets.returncode == 1 and not sockets.stdout
finally:
    if second is not None:
        stop(second)
    stop(first)
    log.close()
reopened, log = launch("reopened.log")
try:
    time.sleep(3)
    assert reopened.poll() is None
    preserved()
finally:
    stop(reopened)
    log.close()
receipt = {"synthetic": True, "binarySha256": hashlib.sha256(binary.read_bytes()).hexdigest(),
           "firstProcessPreserved": True, "secondProcessRejectedBeforeStateMutation": True,
           "lockReleasedOnExit": True, "reopenPreservesDocumentAndJournal": True,
           "networkSockets": 0, "stateMode": oct(state.stat().st_mode & 0o777),
           "homeMode": oct(profile.stat().st_mode & 0o777), "nativeUIAccepted": False,
           "realGrantActivated": False, "providerRegistered": False, "installedAppReplaced": False}
(output / "native-owner-acceptance.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt, indent=2))
