"""Exercise scheduled content locally without providers, volumes, or remote deployment."""


def test_modal_content_uses_shared_voice_criteria(monkeypatch):
    import modal_agents
    from create_something_agents.prompts import CONTENT_SYSTEM_PROMPT

    captured = {}
    expected = {"success": True, "output": "Offline draft fixture"}

    def offline_run(**kwargs):
        captured.update(kwargs)
        return expected

    monkeypatch.setattr(modal_agents, "run_agent", offline_run)
    monkeypatch.setattr(modal_agents, "log_result", lambda *_: None)
    assert modal_agents.content_agent.local() == expected
    assert captured["system_prompt"].startswith(CONTENT_SYSTEM_PROMPT)
    assert "missing evidence" in captured["task"].lower()
    assert "human final read" in captured["system_prompt"].lower()
    assert "[x]" not in captured["system_prompt"]
