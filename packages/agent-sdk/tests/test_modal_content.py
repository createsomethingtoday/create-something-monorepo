"""Exercise scheduled content locally without providers, volumes, or remote deployment."""


def test_modal_content_uses_shared_voice_criteria(monkeypatch):
    import modal_agents
    from create_something_agents.prompts import CONTENT_SYSTEM_PROMPT

    captured = {}
    expected = {"success": True, "output": "Offline draft fixture"}

    def offline_run(**kwargs):
        captured.update(kwargs)
        return expected

    packet = {
        "url": "https://example.invalid/source",
        "source_ref": "a" * 40,
        "sha256": "b" * 64,
        "retrieved_at": "2026-11-02T00:00:00Z",
        "verification": "repository record only; not live runtime acceptance",
        "text": "The fixture record describes a qualitative operator handoff.",
    }
    monkeypatch.setattr(modal_agents, "load_content_evidence", lambda *_: packet, raising=False)
    monkeypatch.setattr(modal_agents, "run_agent", offline_run)
    monkeypatch.setattr(modal_agents, "log_result", lambda *_: None)
    result = modal_agents.content_agent.local()
    assert result["success"] is True
    assert packet["text"] in captured["task"]
    assert packet["source_ref"] in captured["task"]
    assert captured["system_prompt"].startswith(CONTENT_SYSTEM_PROMPT)
    assert "missing evidence" in captured["task"].lower()
    assert "human final read" in captured["system_prompt"].lower()
    assert "[x]" not in captured["system_prompt"]
    assert result["evidence"]["source_ref"] == packet["source_ref"]
    assert "text" not in result["evidence"]


def test_evidence_retrieval_pins_revision_and_preserves_bytes():
    import hashlib
    import httpx
    import modal_agents

    sha = "a" * 40
    source = b"# Repository record\nA source-attributed qualitative observation."
    requests = []

    def handler(request):
        requests.append(str(request.url))
        if request.url.host == "api.github.com":
            return httpx.Response(200, json={"object": {"sha": sha}})
        assert f"/{sha}/{modal_agents.CONTENT_SOURCE_PATH}" in request.url.path
        return httpx.Response(200, content=source)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        packet = modal_agents.load_content_evidence(client)
    assert len(requests) == 2
    assert packet["source_ref"] == sha
    assert packet["sha256"] == hashlib.sha256(source).hexdigest()
    assert packet["text"] == source.decode()
    assert "not independently verified" in packet["verification"]


import pytest


@pytest.mark.parametrize(
    "failure",
    ["http", "redirect", "timeout", "bad_ref", "large_ref", "empty", "large_source", "encoding"],
)
def test_evidence_retrieval_rejects_unusable_inputs(failure):
    import httpx
    import modal_agents

    requests = []

    def handler(request):
        requests.append(str(request.url))
        if failure == "timeout":
            raise httpx.ReadTimeout("Fixture timeout", request=request)
        if failure == "http":
            return httpx.Response(503)
        if failure == "redirect":
            return httpx.Response(302, headers={"Location": "https://example.invalid/untrusted"})
        if request.url.host == "api.github.com":
            if failure == "bad_ref":
                return httpx.Response(200, json={"object": {"sha": "../../other"}})
            if failure == "large_ref":
                return httpx.Response(200, content=b"x" * 8193)
            return httpx.Response(200, json={"object": {"sha": "a" * 40}})
        body = {"empty": b"", "large_source": b"x" * 32769, "encoding": b"\xff"}[failure]
        return httpx.Response(200, content=body)

    with httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=False) as client:
        with pytest.raises((httpx.HTTPError, ValueError)):
            modal_agents.load_content_evidence(client)
    assert len(requests) <= 2


def test_missing_evidence_blocks_model_generation(monkeypatch):
    import modal_agents

    def unavailable(_client):
        raise ValueError("Fixture source unavailable")

    def forbidden_model(**_kwargs):
        pytest.fail("Model must not run without source evidence")

    logged = []
    monkeypatch.setattr(modal_agents, "load_content_evidence", unavailable)
    monkeypatch.setattr(modal_agents, "run_agent", forbidden_model)
    monkeypatch.setattr(
        modal_agents, "log_result", lambda name, result: logged.append((name, result))
    )
    result = modal_agents.content_agent.local()
    assert result["success"] is False
    assert result["status"] == "blocked_missing_evidence"
    assert result["cost_usd"] == 0
    assert logged == [("content", result)]


@pytest.fixture(autouse=True)
def offline_content_state(monkeypatch, tmp_path):
    import modal_agents

    monkeypatch.setattr(
        modal_agents, "CONTENT_STATE_PATH", str(tmp_path / "content-state.json"), raising=False
    )
    monkeypatch.setattr(modal_agents.logs_volume, "reload", lambda: None)
    monkeypatch.setattr(modal_agents.logs_volume, "commit", lambda: None)


def test_same_source_bytes_skip_after_main_ref_changes(monkeypatch):
    import modal_agents

    snapshots = iter(["a" * 40, "b" * 40])

    def evidence(_client):
        return {
            "url": "https://example.invalid/record",
            "source_ref": next(snapshots),
            "sha256": "c" * 64,
            "retrieved_at": "fixture",
            "verification": "source only",
            "text": "Fixture evidence",
        }

    calls = []

    def generate(**kwargs):
        calls.append(kwargs)
        return {"success": True, "output": "Fixture draft awaiting review"}

    monkeypatch.setattr(modal_agents, "load_content_evidence", evidence)
    monkeypatch.setattr(modal_agents, "run_agent", generate)
    monkeypatch.setattr(modal_agents, "log_result", lambda *_: None)
    first = modal_agents.content_agent.local()
    second = modal_agents.content_agent.local()
    assert first["success"] is True
    assert len(calls) == 1
    assert second["status"] == "skipped_unchanged_evidence"
    assert second["cost_usd"] == 0
    assert second["evidence"]["source_ref"] == "b" * 40


def source_packet(text="Fixture evidence", ref="a" * 40):
    import hashlib

    return {
        "url": "https://example.invalid/record",
        "source_ref": ref,
        "sha256": hashlib.sha256(text.encode()).hexdigest(),
        "retrieved_at": "fixture",
        "verification": "source only",
        "text": text,
    }


def prepare_content_job(monkeypatch, packets, generate):
    import modal_agents

    values = iter(packets)
    monkeypatch.setattr(modal_agents, "load_content_evidence", lambda *_: next(values))
    monkeypatch.setattr(modal_agents, "run_agent", generate)
    monkeypatch.setattr(modal_agents, "log_result", lambda *_: None)


def test_new_source_bytes_allow_another_attempt(monkeypatch):
    import modal_agents

    calls = []

    def generate(**kwargs):
        calls.append(kwargs)
        return {"success": True, "output": "Fixture draft"}

    prepare_content_job(monkeypatch, [source_packet("first"), source_packet("second")], generate)
    assert modal_agents.content_agent.local()["success"] is True
    assert modal_agents.content_agent.local()["success"] is True
    assert len(calls) == 2
    assert len(modal_agents.load_content_source_state()["attempts"]) == 2


def test_reservation_is_committed_before_model_call(monkeypatch):
    import json
    from pathlib import Path
    import modal_agents

    events = []
    packet = source_packet()

    def commit():
        state = json.loads(Path(modal_agents.CONTENT_STATE_PATH).read_text())
        events.append(state["attempts"][packet["sha256"]]["status"])

    def generate(**_kwargs):
        events.append("model")
        return {"success": True, "output": "Fixture draft"}

    monkeypatch.setattr(modal_agents.logs_volume, "commit", commit)
    prepare_content_job(monkeypatch, [packet], generate)
    modal_agents.content_agent.local()
    assert events == ["reserved", "model", "processed"]


@pytest.mark.parametrize("failure", ["exception", "failure", "empty"])
def test_unresolved_attempt_is_not_automatically_replayed(monkeypatch, failure):
    import modal_agents

    calls = []
    packet = source_packet()

    def generate(**_kwargs):
        calls.append(1)
        if failure == "exception":
            raise RuntimeError("Fixture response outcome unknown")
        return {"success": failure == "empty", "output": "", "error": "Fixture failed"}

    prepare_content_job(monkeypatch, [packet, packet], generate)
    first = modal_agents.content_agent.local()
    second = modal_agents.content_agent.local()
    assert first["success"] is False
    assert second["status"] == "blocked_source_attempt_unresolved"
    assert second["cost_usd"] == 0
    assert len(calls) == 1


def test_failed_reservation_commit_prevents_model_call(monkeypatch):
    import modal_agents

    def fail_commit():
        raise RuntimeError("Fixture volume commit failed")

    def generate(**_kwargs):
        pytest.fail("No billed request before reservation acknowledgement")

    monkeypatch.setattr(modal_agents.logs_volume, "commit", fail_commit)
    prepare_content_job(monkeypatch, [source_packet()], generate)
    result = modal_agents.content_agent.local()
    assert result["status"] == "blocked_content_state"
    assert result["cost_usd"] == 0


def test_failed_final_checkpoint_does_not_replay_model(monkeypatch):
    import modal_agents

    commits = []
    calls = []
    packet = source_packet()

    def commit():
        commits.append(1)
        if len(commits) == 2:
            raise RuntimeError("Fixture final commit outcome unknown")

    def generate(**_kwargs):
        calls.append(1)
        return {"success": True, "output": "Fixture draft retained for review"}

    monkeypatch.setattr(modal_agents.logs_volume, "commit", commit)
    prepare_content_job(monkeypatch, [packet, packet], generate)
    first = modal_agents.content_agent.local()
    second = modal_agents.content_agent.local()
    assert first["status"] == "blocked_state_commit_uncertain"
    assert "retained" in first["output"]
    assert second["status"] in {"skipped_unchanged_evidence", "blocked_source_attempt_unresolved"}
    assert len(calls) == 1


@pytest.mark.parametrize("raw", [b"invalid json", b'{"version":9,"attempts":{}}', b"x" * 1048577])
def test_corrupt_state_is_preserved_and_blocks_generation(monkeypatch, raw):
    from pathlib import Path
    import modal_agents

    path = Path(modal_agents.CONTENT_STATE_PATH)
    path.write_bytes(raw)

    def generate(**_kwargs):
        pytest.fail("Malformed state must not be replaced or bypassed")

    prepare_content_job(monkeypatch, [source_packet()], generate)
    result = modal_agents.content_agent.local()
    assert result["status"] == "blocked_content_state"
    assert path.read_bytes() == raw


def test_atomic_state_failure_preserves_previous_ledger(monkeypatch):
    import os
    from pathlib import Path
    import modal_agents

    path = Path(modal_agents.CONTENT_STATE_PATH)
    previous = b'{"version":1,"attempts":{}}'
    path.write_bytes(previous)

    def fail_replace(*_args):
        raise OSError("Fixture replacement failed")

    monkeypatch.setattr(os, "replace", fail_replace)
    with pytest.raises(OSError):
        modal_agents.persist_content_source_state({"version": 1, "attempts": {}})
    assert path.read_bytes() == previous
    assert not list(path.parent.glob(".source-attempt-*"))
