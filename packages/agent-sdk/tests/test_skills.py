"""Tests for CREATE SOMETHING Skills loader."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from create_something_agents.skills.loader import (
    discover_skills,
    find_skills_directories,
    load_skill,
)


class TestSkillsLoader:
    """Tests for skills loading system."""

    def test_find_skills_directories(self) -> None:
        """Test finding skills directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .claude/skills directory
            skills_dir = Path(tmpdir) / ".claude" / "skills"
            skills_dir.mkdir(parents=True)

            dirs = find_skills_directories(tmpdir)
            assert len(dirs) == 1
            assert dirs[0] == skills_dir

    def test_find_rules_directory_fallback(self) -> None:
        """Test falling back to .claude/rules."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create .claude/rules directory (existing convention)
            rules_dir = Path(tmpdir) / ".claude" / "rules"
            rules_dir.mkdir(parents=True)

            dirs = find_skills_directories(tmpdir)
            assert len(dirs) == 1
            assert dirs[0] == rules_dir

    def test_find_both_directories(self) -> None:
        """Test finding both skills and rules directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skills_dir = Path(tmpdir) / ".claude" / "skills"
            rules_dir = Path(tmpdir) / ".claude" / "rules"
            skills_dir.mkdir(parents=True)
            rules_dir.mkdir(parents=True)

            dirs = find_skills_directories(tmpdir)
            assert len(dirs) == 2
            # skills should be first
            assert dirs[0] == skills_dir
            assert dirs[1] == rules_dir

    def test_load_skill_basic(self) -> None:
        """Test loading a basic skill file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skills_dir = Path(tmpdir) / ".claude" / "skills"
            skills_dir.mkdir(parents=True)

            # Create skill file
            skill_file = skills_dir / "test-skill.md"
            skill_file.write_text("# Test Skill\n\nThis is a test skill.")

            content = load_skill("test-skill", tmpdir)
            assert content is not None
            assert "Test Skill" in content
            assert "This is a test skill" in content

    def test_load_skill_with_frontmatter(self) -> None:
        """Test loading skill with YAML frontmatter."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skills_dir = Path(tmpdir) / ".claude" / "skills"
            skills_dir.mkdir(parents=True)

            skill_content = """---
name: test-skill
version: 1.0.0
---

# Skill Content

This is the body content.
"""
            skill_file = skills_dir / "test-skill.md"
            skill_file.write_text(skill_content)

            content = load_skill("test-skill", tmpdir)
            assert content is not None
            # Should return body without frontmatter
            assert "Skill Content" in content
            assert "name: test-skill" not in content

    def test_load_skill_not_found(self) -> None:
        """Test loading nonexistent skill."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skills_dir = Path(tmpdir) / ".claude" / "skills"
            skills_dir.mkdir(parents=True)

            content = load_skill("nonexistent", tmpdir)
            assert content is None

    def test_load_skill_patterns_suffix(self) -> None:
        """Test loading skill with -patterns suffix."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skills_dir = Path(tmpdir) / ".claude" / "rules"
            skills_dir.mkdir(parents=True)

            # Create file with -patterns suffix (existing CREATE SOMETHING convention)
            skill_file = skills_dir / "beads-patterns.md"
            skill_file.write_text("# Beads Patterns\n\nTrack your work.")

            # Should find it without the suffix
            content = load_skill("beads", tmpdir)
            assert content is not None
            assert "Beads Patterns" in content

    def test_discover_skills(self) -> None:
        """Test discovering all available skills."""
        with tempfile.TemporaryDirectory() as tmpdir:
            skills_dir = Path(tmpdir) / ".claude" / "skills"
            skills_dir.mkdir(parents=True)

            # Create multiple skill files
            (skills_dir / "skill-a.md").write_text("Skill A")
            (skills_dir / "skill-b.md").write_text("Skill B")
            (skills_dir / "other-patterns.md").write_text("Patterns")

            skills = discover_skills(tmpdir)
            assert "skill-a" in skills
            assert "skill-b" in skills
            assert "other" in skills  # -patterns suffix stripped

    def test_load_from_current_directory(self) -> None:
        """Test loading from real .claude/rules in monorepo."""
        # This tests against the actual monorepo structure
        cwd = os.getcwd()
        rules_dir = Path(cwd) / ".claude" / "rules"

        if rules_dir.exists():
            # Try loading beads-patterns (known to exist)
            content = load_skill("beads", cwd)
            if content:
                assert "Beads" in content or "beads" in content
