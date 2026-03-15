"""
Skills loader - Progressive context disclosure.

Skills are markdown files that provide domain-specific context to agents.
They load from .claude/rules/ (existing) or .claude/skills/ (new) directories.
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml


def find_skills_directories(cwd: str | None = None) -> list[Path]:
    """
    Find all skill directories in the project.

    Searches for:
    - .claude/skills/ (new convention)
    - .claude/rules/ (existing CREATE SOMETHING patterns)

    Args:
        cwd: Working directory to search from

    Returns:
        List of paths to skill directories
    """
    base = Path(cwd or os.getcwd())
    dirs: list[Path] = []

    # Check .claude/skills first (new)
    skills_dir = base / ".claude" / "skills"
    if skills_dir.is_dir():
        dirs.append(skills_dir)

    # Fall back to .claude/rules (existing)
    rules_dir = base / ".claude" / "rules"
    if rules_dir.is_dir():
        dirs.append(rules_dir)

    return dirs


def load_skill(skill_name: str, cwd: str | None = None) -> str | None:
    """
    Load a skill file and return its content.

    Args:
        skill_name: Name of the skill (without .md extension)
        cwd: Working directory to search from

    Returns:
        Skill content as string, or None if not found
    """
    skill_dirs = find_skills_directories(cwd)

    # Try each directory
    for skill_dir in skill_dirs:
        skill_path = skill_dir / f"{skill_name}.md"

        if not skill_path.exists():
            # Try with common variations
            variations = [
                skill_dir / f"{skill_name}-patterns.md",
                skill_dir / f"{skill_name.replace('-', '_')}.md",
                skill_dir / f"{skill_name.replace('_', '-')}.md",
            ]
            for var_path in variations:
                if var_path.exists():
                    skill_path = var_path
                    break
            else:
                continue

        try:
            content = skill_path.read_text(encoding="utf-8")

            # Parse YAML frontmatter if present
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    # Has frontmatter
                    try:
                        _frontmatter = yaml.safe_load(parts[1])
                        body = parts[2].strip()
                        return body
                    except yaml.YAMLError:
                        # Invalid frontmatter, return full content
                        pass

            return content

        except OSError:
            continue

    return None


def discover_skills(cwd: str | None = None) -> list[str]:
    """
    Discover all available skills.

    Args:
        cwd: Working directory to search from

    Returns:
        List of skill names (without .md extension)
    """
    skill_dirs = find_skills_directories(cwd)
    skills: set[str] = set()

    for skill_dir in skill_dirs:
        if not skill_dir.is_dir():
            continue

        for path in skill_dir.glob("*.md"):
            name = path.stem
            # Normalize name
            if name.endswith("-patterns"):
                name = name[:-9]
            skills.add(name)

    return sorted(skills)


def load_skills_as_context(skill_names: list[str], cwd: str | None = None) -> str:
    """
    Load multiple skills and format them as system context.

    Args:
        skill_names: List of skill names to load
        cwd: Working directory to search from

    Returns:
        Formatted string with all skill contents
    """
    parts: list[str] = []

    for name in skill_names:
        content = load_skill(name, cwd)
        if content:
            parts.append(f"## {name}\n\n{content}")

    return "\n\n---\n\n".join(parts)
