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


def test_shared_paper_builder_parses_on_supported_python311():
    import subprocess
    import shutil

    python311 = sys.executable if sys.version_info[:2] == (3, 11) else shutil.which("python3.11")
    if not python311:
        pytest.skip("Run this compatibility check in the Python 3.11 test matrix")
    path = Path(__file__).parents[1] / "agents/paper_agent.py"
    subprocess.run(
        [
            python311,
            "-c",
            "import sys; from pathlib import Path; p=Path(sys.argv[1]); compile(p.read_text(),str(p),'exec')",
            str(path),
        ],
        check=True,
    )


@pytest.mark.parametrize("content_type", ["paper", "experiment"])
def test_required_paper_searches_are_allowed_by_gemini(tmp_path, content_type):
    from agents.paper_agent import PaperConfig, build_paper_task
    from create_something_agents.providers.gemini_tools import GeminiToolsProvider

    task = build_paper_task(
        PaperConfig(issue_id="CRE-123", content_type=content_type, monorepo_path=tmp_path),
        issue={"title": "Qualitative findings", "description": "No measurements", "labels": []},
    )
    search = task.split("### Step 1:", 1)[1].split("### Step 2:", 1)[0]
    commands = [line[2:] for line in search.splitlines() if line.startswith("- ")]
    assert len(commands) == 3
    provider = object.__new__(GeminiToolsProvider)
    provider.working_dir = str(tmp_path)
    (tmp_path / ".claude/rules").mkdir(parents=True)
    (tmp_path / ".claude/rules/evidence.md").write_text("qualitative fixture observation")
    (tmp_path / "packages").mkdir()
    (tmp_path / "packages/evidence.py").write_text("# qualitative fixture source")
    for command in commands:
        safe, reason = provider._is_command_safe(command)
        assert safe, (command, reason)
        output = provider._execute_bash(command)
        assert "blocked for safety" not in output.lower()
        assert "not found" not in output.lower()
        assert "evidence" in output.lower()
