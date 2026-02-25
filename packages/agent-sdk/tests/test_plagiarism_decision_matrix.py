"""Unit tests for strict plagiarism comparison matrix thresholds."""

from __future__ import annotations

from agents.plagiarism_visual_agent import (
    apply_visual_spike_override,
    build_pair_id,
    classify_agent_recommendation,
    classify_interaction_level,
    classify_snippet_status,
    classify_vector_level,
    classify_visual_level,
)


def test_pair_id_is_deterministic() -> None:
    pair_a = build_pair_id("https://a.example", "https://b.example")
    pair_b = build_pair_id("https://a.example", "https://b.example")
    pair_c = build_pair_id("https://b.example", "https://a.example")

    assert pair_a == pair_b
    assert pair_a != pair_c


def test_vector_thresholds() -> None:
    assert classify_vector_level(0.64, "vectorize") == "pass"
    assert classify_vector_level(0.66, "vectorize") == "warn"
    assert classify_vector_level(0.80, "vectorize") == "fail_major"


def test_vector_non_vectorize_source_is_warn_even_if_low() -> None:
    assert classify_vector_level(0.22, "local_proxy") == "warn"
    assert classify_vector_level(0.10, "unavailable") == "warn"


def test_visual_thresholds() -> None:
    assert classify_visual_level(0.69, 0.59, sections_analyzed=3) == "pass"
    assert classify_visual_level(0.72, 0.40, sections_analyzed=3) == "warn"
    assert classify_visual_level(0.62, 0.61, sections_analyzed=3) == "warn"
    assert classify_visual_level(0.85, 0.40, sections_analyzed=3) == "fail_major"


def test_visual_no_sections_is_warn() -> None:
    assert classify_visual_level(0.0, 0.0, sections_analyzed=0) == "warn"


def test_visual_single_section_spike_override_downgrades_to_warn() -> None:
    effective_level, applied = apply_visual_spike_override(
        visual_level="fail_major",
        visual_max_section=0.88,
        visual_avg=0.42,
        vector_score_overall=0.30,
        interaction_similarity=45.0,
        shared_interaction_ids=0,
        convergence_sections_high=0,
    )
    assert applied is True
    assert effective_level == "warn"


def test_visual_single_section_spike_override_not_applied_when_interaction_risk_high() -> None:
    effective_level, applied = apply_visual_spike_override(
        visual_level="fail_major",
        visual_max_section=0.88,
        visual_avg=0.42,
        vector_score_overall=0.30,
        interaction_similarity=82.0,
        shared_interaction_ids=0,
        convergence_sections_high=0,
    )
    assert applied is False
    assert effective_level == "fail_major"


def test_interaction_thresholds() -> None:
    assert classify_interaction_level(69.0, 0, 0, 0) == "pass"
    assert classify_interaction_level(75.0, 0, 0, 0) == "warn"
    assert classify_interaction_level(81.0, 0, 0, 0) == "fail_major"
    assert classify_interaction_level(10.0, 1, 0, 0) == "fail_major"
    assert classify_interaction_level(10.0, 0, 2, 0) == "fail_major"
    assert classify_interaction_level(20.0, 0, 0, 1) == "warn"


def test_snippet_thresholds() -> None:
    hard_fail = classify_snippet_status(
        {
            "snippet_present": False,
            "version_ok": False,
            "smoke_ok": False,
            "ix2_available": False,
            "ix3_available": False,
        },
        interactions_exist=True,
    )
    assert hard_fail == "fail_hard"

    soft_fail = classify_snippet_status(
        {
            "snippet_present": True,
            "version_ok": True,
            "smoke_ok": True,
            "ix2_available": False,
            "ix3_available": False,
        },
        interactions_exist=True,
    )
    assert soft_fail == "fail_soft"

    passed = classify_snippet_status(
        {
            "snippet_present": True,
            "version_ok": True,
            "smoke_ok": True,
            "ix2_available": True,
            "ix3_available": False,
        },
        interactions_exist=True,
    )
    assert passed == "pass"


def test_agent_recommendation_precedence() -> None:
    assert (
        classify_agent_recommendation("fail_hard", "pass", "pass", "pass")
        == "block_submission"
    )
    assert (
        classify_agent_recommendation("pass", "fail_major", "pass", "pass")
        == "escalate_major"
    )
    assert (
        classify_agent_recommendation("fail_soft", "pass", "pass", "pass")
        == "escalate_minor"
    )
    assert classify_agent_recommendation("pass", "pass", "pass", "pass") == "pass"
