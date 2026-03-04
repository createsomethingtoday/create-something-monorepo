"""Tests for Loom-integrated paper agent policy and task retrieval."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from agents import paper_agent


def test_parse_lm_show_output_parses_metadata_and_description() -> None:
    output = """ID:          lm-123abc
Title:       Experiment: Loom Resume Validation
Status:      Ready
Priority:    Normal
Type:        Task
Agent:       -
Labels:      ["experiment", "policy", "brand"]
Parent:      -
Repo:        csm
Evidence:    -
Created:     2026-03-01 00:00:00 UTC
Updated:     2026-03-01 00:00:00 UTC

Description:
Validate Loom remote MCP parity for paper generation.
Confirm policy aligns with voice canon.
"""
    parsed = paper_agent._parse_lm_show_output(output)
    assert parsed is not None
    assert parsed["id"] == "lm-123abc"
    assert parsed["title"] == "Experiment: Loom Resume Validation"
    assert parsed["status"] == "Ready"
    assert parsed["labels"] == ["experiment", "policy", "brand"]
    assert "voice canon" in parsed["description"].lower()


def test_get_issue_details_prefers_remote_mcp(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    remote_task = {
        "id": "lm-remote1",
        "title": "Paper: MCP-first Policy Alignment",
        "description": "Use Loom remote MCP and brand canon references.",
        "labels": ["paper", "policy", "brand"],
        "status": "ready",
    }

    monkeypatch.setattr(
        paper_agent,
        "_call_loom_remote_tool",
        lambda _tool, _args: remote_task,
    )

    def should_not_run(*_args: object, **_kwargs: object) -> None:
        raise AssertionError("subprocess.run should not be called when remote MCP succeeds")

    monkeypatch.setattr(paper_agent.subprocess, "run", should_not_run)

    issue = paper_agent.get_issue_details("lm-remote1", tmp_path)
    assert issue is not None
    assert issue["id"] == "lm-remote1"
    assert issue["labels"] == ["paper", "policy", "brand"]


def test_get_issue_details_falls_back_to_lm_show(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        paper_agent,
        "_call_loom_remote_tool",
        lambda _tool, _args: None,
    )

    lm_output = """ID:          lm-local1
Title:       Paper: Voice Canon Update
Status:      Ready
Labels:      ["paper", "voice"]

Description:
Update policy to match voice canon and three-tier language.
"""

    def fake_run(
        cmd: list[str],
        *,
        capture_output: bool,
        text: bool,
        cwd: Path,
    ) -> subprocess.CompletedProcess[str]:
        assert capture_output is True
        assert text is True
        assert cwd == tmp_path
        if cmd[:2] == ["lm", "show"]:
            return subprocess.CompletedProcess(cmd, 0, stdout=lm_output, stderr="")
        raise AssertionError(f"unexpected command: {cmd}")

    monkeypatch.setattr(paper_agent.subprocess, "run", fake_run)

    issue = paper_agent.get_issue_details("lm-local1", tmp_path)
    assert issue is not None
    assert issue["id"] == "lm-local1"
    assert issue["title"] == "Paper: Voice Canon Update"
    assert issue["labels"] == ["paper", "voice"]


def test_system_prompt_contains_brand_policy_markers() -> None:
    prompt = paper_agent.SYSTEM_PROMPT
    assert "Clarity Over Cleverness" in prompt
    assert "docs/MCP_FIRST_THESIS.md" in prompt
    assert "Three-Tier Framework" in prompt
    assert ".claude/rules/voice-canon.md" in prompt


def test_create_paper_agent_task_includes_loom_completion_and_brand_docs(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(
        paper_agent,
        "get_issue_details",
        lambda _task_id, _root: {
            "id": "lm-task1",
            "title": "Paper: Loom Remote MCP Policy",
            "description": "Confirm policy aligns with brand.",
            "labels": ["paper", "policy"],
        },
    )

    agent = paper_agent.create_paper_agent(
        paper_agent.PaperConfig(
            issue_id="lm-task1",
            monorepo_path=tmp_path,
        )
    )
    task = agent.config.task
    assert "loom_complete" in task
    assert "lm done lm-task1 --evidence" in task
    assert "docs/THREE_TIER_FRAMEWORK.md" in task
    assert ".claude/rules/voice-canon.md" in task
