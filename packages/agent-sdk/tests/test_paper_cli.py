"""Exercise the CLI's embedded Python with offline providers and fixture work items."""

from pathlib import Path
from types import SimpleNamespace
import sys

import pytest


@pytest.mark.asyncio
@pytest.mark.parametrize("model", ["sonnet", "flash"])
async def test_paper_cli_uses_shared_evidence_rules(monkeypatch, tmp_path, model):
    from agents.paper_agent import SYSTEM_PROMPT
    import create_something_agents

    captured = {}

    class ClaudeFixture:
        def __init__(self, config):
            captured["task"] = config.task
            captured["system_prompt"] = config.system_prompt

        async def run(self):
            return SimpleNamespace(success=True, model="offline", output="fixture", cost_usd=0)

    class GeminiFixture:
        def __init__(self, **_kwargs):
            pass

        async def execute(self, config):
            captured["task"] = config.task
            captured["system_prompt"] = config.system_prompt
            return SimpleNamespace(success=True, model="offline", output="fixture", cost_usd=0)

    monkeypatch.setattr(create_something_agents, "CreateSomethingAgent", ClaudeFixture)
    monkeypatch.setitem(
        sys.modules,
        "create_something_agents.providers.gemini_tools",
        SimpleNamespace(GeminiToolsProvider=GeminiFixture),
    )
    for key, value in {
        "ISSUE_ID": "CRE-123",
        "FORCE_MODEL": model,
        "MONOREPO_DIR": str(tmp_path),
    }.items():
        monkeypatch.setenv(key, value)
    script = (Path(__file__).parents[1] / "scripts/run-paper.sh").read_text()
    source = script.split("python3 << 'PYTHON_SCRIPT'\n", 1)[1].split("\nPYTHON_SCRIPT", 1)[0]
    source = source.replace("sys.exit(asyncio.run(main()))", "")
    namespace = {}
    exec(compile(source, "run-paper.sh", "exec"), namespace)
    namespace["get_linear_issue"] = lambda _id: {
        "title": "Qualitative findings",
        "description": "No measurements available.",
        "labels": [],
    }
    assert await namespace["main"]() == 0
    assert captured["system_prompt"] == SYSTEM_PROMPT
    assert "comparison with specific numbers" not in captured["task"].lower()
    assert "4+ stat metrics" not in captured["task"].lower()
    assert "evidence or an honest limit" in captured["system_prompt"].lower()
