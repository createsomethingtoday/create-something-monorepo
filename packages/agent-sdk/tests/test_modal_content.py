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
        "sha256": "fixture",
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
